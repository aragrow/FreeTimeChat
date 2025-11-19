/**
 * Conversation Service
 *
 * Handles conversation management operations for client or main databases
 */

import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { Conversation } from '../generated/prisma-client';

export interface CreateConversationData {
  userId: string;
  title?: string;
}

export interface UpdateConversationData {
  title?: string;
  isActive?: boolean;
}

export interface ListConversationsOptions {
  skip?: number;
  take?: number;
  userId?: string;
  isActive?: boolean;
}

export class ConversationService {
  constructor(private prisma: ClientPrismaClient) {}

  /**
   * Start a new conversation
   */
  async startConversation(data: CreateConversationData): Promise<Conversation> {
    return this.prisma.conversation.create({
      data: {
        userId: data.userId,
        title: data.title,
        isActive: true,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Get conversation by ID
   */
  async getConversation(id: string): Promise<Conversation | null> {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * List conversations with pagination and filters
   */
  async listConversations(options: ListConversationsOptions = {}): Promise<Conversation[]> {
    const { skip = 0, take = 20, userId, isActive } = options;

    return this.prisma.conversation.findMany({
      where: {
        ...(userId && { userId }),
        ...(isActive !== undefined && { isActive }),
      },
      skip,
      take,
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get last message for preview
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });
  }

  /**
   * Count conversations
   */
  async count(userId?: string, isActive?: boolean): Promise<number> {
    return this.prisma.conversation.count({
      where: {
        ...(userId && { userId }),
        ...(isActive !== undefined && { isActive }),
      },
    });
  }

  /**
   * Update conversation
   */
  async updateConversation(id: string, data: UpdateConversationData): Promise<Conversation> {
    return this.prisma.conversation.update({
      where: { id },
      data,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Archive conversation (set isActive to false)
   */
  async archiveConversation(id: string): Promise<Conversation> {
    return this.updateConversation(id, { isActive: false });
  }

  /**
   * Restore archived conversation
   */
  async restoreConversation(id: string): Promise<Conversation> {
    return this.updateConversation(id, { isActive: true });
  }

  /**
   * Delete conversation permanently
   */
  async deleteConversation(id: string): Promise<Conversation> {
    return this.prisma.conversation.delete({
      where: { id },
    });
  }

  /**
   * Get user's active conversation (most recent)
   */
  async getActiveConversation(userId: string): Promise<Conversation | null> {
    return this.prisma.conversation.findFirst({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Get conversation statistics for a user
   */
  async getUserStats(userId: string): Promise<{
    totalConversations: number;
    activeConversations: number;
    totalMessages: number;
  }> {
    const [totalConversations, activeConversations, messagesResult] = await Promise.all([
      this.prisma.conversation.count({
        where: { userId },
      }),
      this.prisma.conversation.count({
        where: { userId, isActive: true },
      }),
      this.prisma.message.aggregate({
        where: {
          conversation: {
            userId,
          },
        },
        _count: true,
      }),
    ]);

    return {
      totalConversations,
      activeConversations,
      totalMessages: messagesResult._count,
    };
  }
}
