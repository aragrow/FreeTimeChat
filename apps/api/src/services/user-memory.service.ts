/**
 * User Memory Service
 *
 * Unified memory system combining:
 * - Short-term memory (Redis): Recent context, session state
 * - Long-term memory (PostgreSQL): Historical patterns, user facts
 * - Semantic memory (Embeddings): Semantic search, similar conversations
 *
 * Provides a single interface for all memory operations
 */

import { LongTermMemoryService } from './long-term-memory.service';
import { SemanticMemoryService } from './semantic-memory.service';
import { ShortTermMemoryService } from './short-term-memory.service';
import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { Message } from '../generated/prisma-client';

export interface MemoryContext {
  shortTerm?: {
    recentMessages: Array<{
      id: string;
      role: string;
      content: string;
      createdAt: string;
    }>;
    sessionState?: {
      activeConversationId?: string;
      lastActivity: string;
    };
  };
  longTerm?: {
    conversationSummaries: Array<{
      conversationId: string;
      summary: string;
      keyTopics: string[];
    }>;
    userPatterns?: {
      preferredWorkHours?: { start: number; end: number };
      mostActiveProjects?: Array<{ project: string; hours: number }>;
    };
    userFacts: Array<{
      factType: string;
      fact: string;
      confidence: number;
    }>;
  };
  semantic?: {
    relevantMessages: Array<{
      message: Message;
      score: number;
    }>;
  };
}

export class UserMemoryService {
  private shortTerm: ShortTermMemoryService;
  private longTerm: LongTermMemoryService;
  private semantic: SemanticMemoryService;

  constructor(private prisma: ClientPrismaClient) {
    this.shortTerm = new ShortTermMemoryService();
    this.longTerm = new LongTermMemoryService(prisma);
    this.semantic = new SemanticMemoryService(prisma);
  }

  /**
   * Get comprehensive memory context for a user
   */
  async getMemoryContext(userId: string, includeSemanticSearch?: string): Promise<MemoryContext> {
    const context: MemoryContext = {};

    // Get short-term memory (recent messages and session)
    const [conversationContext, userSession] = await Promise.all([
      this.getActiveConversationContext(userId),
      this.shortTerm.getUserSession(userId),
    ]);

    if (conversationContext || userSession) {
      context.shortTerm = {
        recentMessages: conversationContext?.messages || [],
        sessionState: userSession
          ? {
              activeConversationId: userSession.activeConversationId,
              lastActivity: userSession.lastActivity,
            }
          : undefined,
      };
    }

    // Get long-term memory (patterns and facts)
    const [summaries, patterns, facts] = await Promise.all([
      this.longTerm.getUserConversationHistory(userId, 5),
      this.longTerm.analyzeUserWorkPatterns(userId),
      this.longTerm.getUserFacts(userId),
    ]);

    context.longTerm = {
      conversationSummaries: summaries.map((s) => ({
        conversationId: s.conversationId,
        summary: s.summary,
        keyTopics: s.keyTopics,
      })),
      userPatterns: {
        preferredWorkHours: patterns.preferredWorkHours,
        mostActiveProjects: patterns.mostActiveProjects,
      },
      userFacts: facts.map((f) => ({
        factType: f.factType,
        fact: f.fact,
        confidence: f.confidence,
      })),
    };

    // Get semantic memory (if search query provided)
    if (includeSemanticSearch) {
      const relevantMessages = await this.semantic.semanticSearch(userId, includeSemanticSearch, 5);

      context.semantic = {
        relevantMessages: relevantMessages.map((r) => ({
          message: r.message,
          score: r.score,
        })),
      };
    }

    return context;
  }

  /**
   * Store a new message in all memory layers
   */
  async storeMessage(conversationId: string, userId: string, message: Message): Promise<void> {
    // Store in short-term memory (Redis)
    await this.shortTerm.appendMessage(conversationId, userId, message);

    // Process for semantic search (embeddings)
    // Only process user and assistant messages
    if (message.role === 'USER' || message.role === 'ASSISTANT') {
      await this.semantic.processMessage(message.id);
    }

    // Long-term memory is already stored in PostgreSQL via Prisma
  }

  /**
   * Get active conversation context from short-term memory
   */
  async getActiveConversationContext(userId: string) {
    const activeConversationId = await this.shortTerm.getActiveConversation(userId);

    if (!activeConversationId) {
      return null;
    }

    return await this.shortTerm.getConversationContext(activeConversationId);
  }

  /**
   * Start a new conversation session
   */
  async startConversation(userId: string, conversationId: string): Promise<void> {
    // Set active conversation in short-term memory
    await this.shortTerm.setActiveConversation(userId, conversationId);

    // Store conversation in session
    await this.shortTerm.storeUserSession(userId, {
      activeConversationId: conversationId,
      preferences: {
        // Can be used for personalization
      },
    });
  }

  /**
   * End conversation session
   */
  async endConversation(userId: string, conversationId: string): Promise<void> {
    // Generate and store conversation summary
    await this.longTerm.generateConversationSummary(conversationId);

    // Clear short-term context
    await this.shortTerm.clearConversationContext(conversationId);

    // Clear active conversation if it matches
    const session = await this.shortTerm.getUserSession(userId);
    if (session?.activeConversationId === conversationId) {
      await this.shortTerm.storeUserSession(userId, {
        activeConversationId: undefined,
      });
    }
  }

  /**
   * Learn from user interaction
   */
  async learnFromInteraction(
    userId: string,
    message: string,
    response: string,
    success: boolean
  ): Promise<void> {
    if (!success) {
      return;
    }

    // Extract potential user facts
    // Example: "I prefer working on frontend tasks"
    if (message.toLowerCase().includes('prefer') || message.toLowerCase().includes('like')) {
      await this.longTerm.storeUserFact(userId, 'preference', message, 'explicit', 0.9);
    }

    // Learn from time entries
    if (message.toLowerCase().includes('worked') || message.toLowerCase().includes('log')) {
      const hours = message.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)/i);
      const project = message.match(
        /(?:on|for|in)\s+(?:project\s+)?["']?([A-Za-z0-9\s-]+?)["']?\s+(?:project|$)/i
      );

      if (hours && project) {
        const fact = `User typically logs ${hours[1]} hours for ${project[1]}`;
        await this.longTerm.storeUserFact(userId, 'work_pattern', fact, 'inferred', 0.7);
      }
    }
  }

  /**
   * Search across all memory layers
   */
  async searchMemory(
    userId: string,
    query: string
  ): Promise<{
    recentMessages: Message[];
    historicalMessages: Message[];
    semanticMatches: Array<{ message: Message; score: number }>;
  }> {
    const [recent, historical, semantic] = await Promise.all([
      // Short-term: Get from active conversation
      this.getRecentMessagesFromActive(userId, query),

      // Long-term: Search historical messages
      this.longTerm.searchConversationHistory(userId, query, 5),

      // Semantic: Find by meaning
      this.semantic.semanticSearch(userId, query, 5),
    ]);

    return {
      recentMessages: recent,
      historicalMessages: historical,
      semanticMatches: semantic.map((r) => ({
        message: r.message,
        score: r.score,
      })),
    };
  }

  /**
   * Get recent messages from active conversation
   */
  private async getRecentMessagesFromActive(userId: string, query: string): Promise<Message[]> {
    const context = await this.getActiveConversationContext(userId);

    if (!context) {
      return [];
    }

    // Simple text filtering
    const filtered = context.messages.filter((msg) =>
      msg.content.toLowerCase().includes(query.toLowerCase())
    );

    // Map to Message type
    return filtered.map((msg) => ({
      id: msg.id,
      conversationId: context.conversationId,
      role: msg.role as 'USER' | 'ASSISTANT' | 'SYSTEM',
      content: msg.content,
      metadata: msg.metadata || null,
      createdAt: new Date(msg.createdAt),
    })) as Message[];
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(userId: string): Promise<{
    shortTerm: {
      activeContexts: number;
      sessionActive: boolean;
    };
    longTerm: {
      totalConversations: number;
      totalMessages: number;
      totalFacts: number;
    };
    semantic: {
      embeddedMessages: number;
    };
  }> {
    const [memoryStats, patterns, facts] = await Promise.all([
      this.shortTerm.getMemoryStats(),
      this.longTerm.analyzeUserWorkPatterns(userId),
      this.longTerm.getUserFacts(userId),
    ]);

    const session = await this.shortTerm.getUserSession(userId);

    // Count embedded messages
    const embeddedMessages = await this.prisma.message.count({
      where: {
        conversation: { userId },
        metadata: {
          path: ['embedding'],
          not: null,
        },
      },
    });

    return {
      shortTerm: {
        activeContexts: memoryStats.contextKeys,
        sessionActive: session !== null,
      },
      longTerm: {
        totalConversations: patterns.totalConversations,
        totalMessages: patterns.totalMessages,
        totalFacts: facts.length,
      },
      semantic: {
        embeddedMessages,
      },
    };
  }

  /**
   * Clear all memory for a user (GDPR compliance)
   */
  async clearUserMemory(userId: string): Promise<void> {
    // Clear short-term memory
    await this.shortTerm.clearUserSession(userId);
    await this.shortTerm.clearUserContexts(userId);

    // Clear long-term memory
    // Note: This would typically soft-delete or anonymize data
    // rather than permanent deletion for audit purposes

    // In production, implement proper GDPR deletion
    console.log(`User ${userId} memory cleared (implement GDPR deletion)`);
  }
}
