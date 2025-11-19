/**
 * Message Service
 *
 * Handles message management operations for client or main databases
 */

import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { Message, MessageRole } from '../generated/prisma-client';
import type { PrismaClient as MainPrismaClient } from '../generated/prisma-main';

export interface AddMessageData {
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata?: {
    intent?: string;
    entities?: Record<string, unknown>;
    confidence?: number;
    embedding?: number[];
    [key: string]: unknown;
  };
}

export interface GetMessagesOptions {
  skip?: number;
  take?: number;
  role?: MessageRole;
  fromDate?: Date;
  toDate?: Date;
}

export class MessageService {
  constructor(private prisma: ClientPrismaClient | MainPrismaClient) {}

  /**
   * Add a message to a conversation
   */
  async addMessage(data: AddMessageData): Promise<Message> {
    // Update conversation's updatedAt timestamp
    await this.prisma.conversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() },
    });

    return this.prisma.message.create({
      data: {
        conversationId: data.conversationId,
        role: data.role,
        content: data.content,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: data.metadata as any,
      },
    });
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string, options: GetMessagesOptions = {}): Promise<Message[]> {
    const { skip = 0, take = 50, role, fromDate, toDate } = options;

    return this.prisma.message.findMany({
      where: {
        conversationId,
        ...(role && { role }),
        ...(fromDate && { createdAt: { gte: fromDate } }),
        ...(toDate && { createdAt: { lte: toDate } }),
      },
      skip,
      take,
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get a single message by ID
   */
  async getMessage(id: string): Promise<Message | null> {
    return this.prisma.message.findUnique({
      where: { id },
    });
  }

  /**
   * Count messages in a conversation
   */
  async countMessages(
    conversationId: string,
    role?: MessageRole,
    fromDate?: Date,
    toDate?: Date
  ): Promise<number> {
    return this.prisma.message.count({
      where: {
        conversationId,
        ...(role && { role }),
        ...(fromDate && { createdAt: { gte: fromDate } }),
        ...(toDate && { createdAt: { lte: toDate } }),
      },
    });
  }

  /**
   * Get the last N messages from a conversation
   */
  async getLastMessages(conversationId: string, count: number = 10): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: count,
    });
  }

  /**
   * Get recent user messages for context
   */
  async getRecentUserMessages(conversationId: string, count: number = 5): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: {
        conversationId,
        role: 'USER',
      },
      orderBy: { createdAt: 'desc' },
      take: count,
    });
  }

  /**
   * Update message metadata (e.g., add embeddings)
   */
  async updateMessageMetadata(id: string, metadata: Record<string, unknown>): Promise<Message> {
    const message = await this.getMessage(id);
    if (!message) {
      throw new Error('Message not found');
    }

    // Merge new metadata with existing
    const updatedMetadata = {
      ...(message.metadata as Record<string, unknown>),
      ...metadata,
    };

    return this.prisma.message.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { metadata: updatedMetadata as any },
    });
  }

  /**
   * Delete a message
   */
  async deleteMessage(id: string): Promise<Message> {
    return this.prisma.message.delete({
      where: { id },
    });
  }

  /**
   * Delete all messages in a conversation
   */
  async deleteConversationMessages(conversationId: string): Promise<number> {
    const result = await this.prisma.message.deleteMany({
      where: { conversationId },
    });

    return result.count;
  }

  /**
   * Search messages by content (simple text search)
   */
  async searchMessages(
    conversationId: string,
    query: string,
    options: GetMessagesOptions = {}
  ): Promise<Message[]> {
    const { skip = 0, take = 20 } = options;

    return this.prisma.message.findMany({
      where: {
        conversationId,
        content: {
          contains: query,
          mode: 'insensitive',
        },
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get conversation context (system + recent messages)
   */
  async getConversationContext(
    conversationId: string,
    messageCount: number = 10
  ): Promise<Message[]> {
    // Get system messages and recent messages
    const [systemMessages, recentMessages] = await Promise.all([
      this.prisma.message.findMany({
        where: {
          conversationId,
          role: 'SYSTEM',
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.message.findMany({
        where: {
          conversationId,
          role: { not: 'SYSTEM' },
        },
        orderBy: { createdAt: 'desc' },
        take: messageCount,
      }),
    ]);

    // Combine and sort by creation date
    return [...systemMessages, ...recentMessages.reverse()].sort((a, b) =>
      a.createdAt > b.createdAt ? 1 : -1
    );
  }
}
