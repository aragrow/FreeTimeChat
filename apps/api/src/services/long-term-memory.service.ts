/**
 * Long-Term Memory Service
 *
 * Uses PostgreSQL to store persistent conversation data and user patterns
 * - Conversation summaries
 * - User preferences and patterns
 * - Historical context
 * - User memory facts
 */

import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { Message } from '../generated/prisma-client';
import type { PrismaClient as MainPrismaClient } from '../generated/prisma-main';

export interface ConversationSummary {
  conversationId: string;
  summary: string;
  keyTopics: string[];
  messageCount: number;
  startDate: Date;
  endDate: Date;
  projects?: string[];
  totalHours?: number;
}

export interface UserPattern {
  userId: string;
  patternType: 'work_hours' | 'project_preference' | 'communication_style' | 'task_frequency';
  pattern: Record<string, unknown>;
  confidence: number;
  lastUpdated: Date;
}

export interface UserMemoryFact {
  userId: string;
  factType: string;
  fact: string;
  source: 'explicit' | 'inferred';
  confidence: number;
  createdAt: Date;
  lastReinforced?: Date;
}

export class LongTermMemoryService {
  constructor(private prisma: ClientPrismaClient | MainPrismaClient) {}

  /**
   * Generate and store conversation summary
   */
  async generateConversationSummary(conversationId: string): Promise<ConversationSummary | null> {
    try {
      // Get conversation with all messages
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation || conversation.messages.length === 0) {
        return null;
      }

      // Extract key topics from messages
      const keyTopics = this.extractKeyTopics(conversation.messages);

      // Extract projects mentioned
      const projects = this.extractProjectReferences(conversation.messages);

      // Extract total hours mentioned
      const totalHours = this.extractTotalHours(conversation.messages);

      // Generate simple summary (in a real implementation, use LLM)
      const summary = this.generateSimpleSummary(conversation.messages);

      return {
        conversationId,
        summary,
        keyTopics,
        messageCount: conversation.messages.length,
        startDate: conversation.createdAt,
        endDate: conversation.updatedAt,
        projects,
        totalHours,
      };
    } catch (error) {
      console.error('Failed to generate conversation summary:', error);
      return null;
    }
  }

  /**
   * Get conversation history for a user
   */
  async getUserConversationHistory(
    userId: string,
    limit: number = 10
  ): Promise<ConversationSummary[]> {
    try {
      const conversations = await this.prisma.conversation.findMany({
        where: { userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      });

      const summaries: ConversationSummary[] = [];

      for (const conversation of conversations) {
        const keyTopics = this.extractKeyTopics(conversation.messages);
        const projects = this.extractProjectReferences(conversation.messages);
        const totalHours = this.extractTotalHours(conversation.messages);
        const summary = this.generateSimpleSummary(conversation.messages);

        summaries.push({
          conversationId: conversation.id,
          summary,
          keyTopics,
          messageCount: conversation._count.messages,
          startDate: conversation.createdAt,
          endDate: conversation.updatedAt,
          projects,
          totalHours,
        });
      }

      return summaries;
    } catch (error) {
      console.error('Failed to get user conversation history:', error);
      return [];
    }
  }

  /**
   * Search conversation history by keywords
   */
  async searchConversationHistory(
    userId: string,
    query: string,
    limit: number = 5
  ): Promise<Message[]> {
    try {
      return await this.prisma.message.findMany({
        where: {
          conversation: { userId },
          content: {
            contains: query,
            mode: 'insensitive',
          },
        },
        include: {
          conversation: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (error) {
      console.error('Failed to search conversation history:', error);
      return [];
    }
  }

  /**
   * Get recent messages across all user conversations
   */
  async getRecentUserMessages(userId: string, limit: number = 50): Promise<Message[]> {
    try {
      return await this.prisma.message.findMany({
        where: {
          conversation: { userId },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          conversation: true,
        },
      });
    } catch (error) {
      console.error('Failed to get recent user messages:', error);
      return [];
    }
  }

  /**
   * Analyze user's work patterns from historical data
   */
  async analyzeUserWorkPatterns(userId: string): Promise<{
    preferredWorkHours?: { start: number; end: number };
    mostActiveProjects?: Array<{ project: string; hours: number }>;
    averageSessionDuration?: number;
    totalConversations: number;
    totalMessages: number;
  }> {
    try {
      const [conversations, recentMessages] = await Promise.all([
        this.prisma.conversation.count({ where: { userId } }),
        this.prisma.message.findMany({
          where: { conversation: { userId } },
          select: { createdAt: true, metadata: true },
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
      ]);

      // Analyze work hours
      const hourCounts = new Array(24).fill(0);
      for (const msg of recentMessages) {
        const hour = msg.createdAt.getHours();
        hourCounts[hour]++;
      }

      // Find peak hours
      let maxCount = 0;
      let peakStart = 9;
      for (let i = 0; i < 24; i++) {
        if (hourCounts[i] > maxCount) {
          maxCount = hourCounts[i];
          peakStart = i;
        }
      }

      // Extract project information from metadata
      const projectHours: Record<string, number> = {};
      for (const msg of recentMessages) {
        const metadata = msg.metadata as { project?: string; hours?: number } | null;
        if (metadata?.project) {
          projectHours[metadata.project] =
            (projectHours[metadata.project] || 0) + (metadata.hours || 0);
        }
      }

      const mostActiveProjects = Object.entries(projectHours)
        .map(([project, hours]) => ({ project, hours }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 5);

      return {
        preferredWorkHours: {
          start: peakStart,
          end: (peakStart + 8) % 24,
        },
        mostActiveProjects,
        averageSessionDuration: recentMessages.length > 0 ? 30 : 0, // Placeholder
        totalConversations: conversations,
        totalMessages: recentMessages.length,
      };
    } catch (error) {
      console.error('Failed to analyze user work patterns:', error);
      return {
        totalConversations: 0,
        totalMessages: 0,
      };
    }
  }

  /**
   * Store user memory fact
   */
  async storeUserFact(
    userId: string,
    factType: string,
    fact: string,
    source: 'explicit' | 'inferred' = 'inferred',
    confidence: number = 0.8
  ): Promise<boolean> {
    try {
      // In a real implementation, this would be stored in a dedicated table
      // For now, we'll use conversation metadata

      // Create a special "memory" conversation if it doesn't exist
      let memoryConversation = await this.prisma.conversation.findFirst({
        where: {
          userId,
          title: '__USER_MEMORY__',
        },
      });

      if (!memoryConversation) {
        memoryConversation = await this.prisma.conversation.create({
          data: {
            userId,
            title: '__USER_MEMORY__',
            isActive: false,
          },
        });
      }

      // Store fact as a message
      await this.prisma.message.create({
        data: {
          conversationId: memoryConversation.id,
          role: 'SYSTEM',
          content: fact,
          metadata: {
            factType,
            source,
            confidence,
            createdAt: new Date().toISOString(),
          },
        },
      });

      return true;
    } catch (error) {
      console.error('Failed to store user fact:', error);
      return false;
    }
  }

  /**
   * Get user memory facts
   */
  async getUserFacts(userId: string, factType?: string): Promise<UserMemoryFact[]> {
    try {
      const memoryConversation = await this.prisma.conversation.findFirst({
        where: {
          userId,
          title: '__USER_MEMORY__',
        },
        include: {
          messages: {
            where: factType
              ? {
                  metadata: {
                    path: ['factType'],
                    equals: factType,
                  },
                }
              : undefined,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!memoryConversation) {
        return [];
      }

      return memoryConversation.messages.map((msg) => {
        const metadata = msg.metadata as {
          factType?: string;
          source?: 'explicit' | 'inferred';
          confidence?: number;
        } | null;

        return {
          userId,
          factType: metadata?.factType || 'general',
          fact: msg.content,
          source: metadata?.source || 'inferred',
          confidence: metadata?.confidence || 0.5,
          createdAt: msg.createdAt,
        };
      });
    } catch (error) {
      console.error('Failed to get user facts:', error);
      return [];
    }
  }

  /**
   * Extract key topics from messages
   */
  private extractKeyTopics(messages: Message[]): string[] {
    const topics = new Set<string>();

    // Simple keyword extraction (in production, use NLP)
    const keywords = [
      'project',
      'meeting',
      'development',
      'bug',
      'feature',
      'review',
      'deployment',
      'testing',
    ];

    for (const message of messages) {
      const content = message.content.toLowerCase();
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          topics.add(keyword);
        }
      }
    }

    return Array.from(topics);
  }

  /**
   * Extract project references from messages
   */
  private extractProjectReferences(messages: Message[]): string[] {
    const projects = new Set<string>();

    for (const message of messages) {
      const metadata = message.metadata as { project?: string } | null;
      if (metadata?.project) {
        projects.add(metadata.project);
      }

      // Also try to extract from content
      const match = message.content.match(
        /(?:on|for|in)\s+(?:project\s+)?["']?([A-Za-z0-9\s-]+?)["']?\s+(?:project|today|yesterday|$)/i
      );
      if (match && match[1]) {
        projects.add(match[1].trim());
      }
    }

    return Array.from(projects);
  }

  /**
   * Extract total hours from messages
   */
  private extractTotalHours(messages: Message[]): number {
    let total = 0;

    for (const message of messages) {
      const metadata = message.metadata as { hours?: number } | null;
      if (metadata?.hours) {
        total += metadata.hours;
      }

      // Also try to extract from content
      const match = message.content.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)/i);
      if (match) {
        total += parseFloat(match[1]);
      }
    }

    return total;
  }

  /**
   * Generate simple summary of conversation
   */
  private generateSimpleSummary(messages: Message[]): string {
    if (messages.length === 0) {
      return 'Empty conversation';
    }

    const userMessages = messages.filter((m) => m.role === 'USER');
    const assistantMessages = messages.filter((m) => m.role === 'ASSISTANT');

    const topics = this.extractKeyTopics(messages);
    const projects = this.extractProjectReferences(messages);
    const hours = this.extractTotalHours(messages);

    let summary = `Conversation with ${userMessages.length} user messages and ${assistantMessages.length} responses.`;

    if (topics.length > 0) {
      summary += ` Topics: ${topics.join(', ')}.`;
    }

    if (projects.length > 0) {
      summary += ` Projects: ${projects.join(', ')}.`;
    }

    if (hours > 0) {
      summary += ` Total hours discussed: ${hours.toFixed(2)}.`;
    }

    return summary;
  }
}
