/**
 * Short-Term Memory Service
 *
 * Uses Redis to store recent conversation context and temporary chat data
 * - Recent messages (last N messages per conversation)
 * - User session state
 * - Active conversation references
 * - Typing indicators and presence
 */

import { CacheService } from './redis.service';
import type { Message } from '../generated/prisma-client';

export interface ConversationContext {
  conversationId: string;
  userId: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
  }>;
  lastUpdated: string;
}

export interface UserSession {
  userId: string;
  activeConversationId?: string;
  lastActivity: string;
  preferences?: {
    timezone?: string;
    language?: string;
  };
}

export class ShortTermMemoryService {
  private cache: CacheService;
  private readonly CONTEXT_TTL = 3600; // 1 hour
  private readonly SESSION_TTL = 7200; // 2 hours
  private readonly TYPING_TTL = 10; // 10 seconds
  private readonly MAX_CONTEXT_MESSAGES = 20;

  constructor() {
    this.cache = new CacheService();
  }

  /**
   * Store recent conversation context in Redis
   */
  async storeConversationContext(
    conversationId: string,
    userId: string,
    messages: Message[]
  ): Promise<boolean> {
    try {
      // Take only the most recent messages
      const recentMessages = messages.slice(-this.MAX_CONTEXT_MESSAGES).map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
        metadata: msg.metadata as Record<string, unknown> | undefined,
      }));

      const context: ConversationContext = {
        conversationId,
        userId,
        messages: recentMessages,
        lastUpdated: new Date().toISOString(),
      };

      const key = this.getContextKey(conversationId);
      return await this.cache.set(key, context, this.CONTEXT_TTL);
    } catch (error) {
      console.error('Failed to store conversation context:', error);
      return false;
    }
  }

  /**
   * Get conversation context from Redis
   */
  async getConversationContext(conversationId: string): Promise<ConversationContext | null> {
    try {
      const key = this.getContextKey(conversationId);
      return await this.cache.get<ConversationContext>(key);
    } catch (error) {
      console.error('Failed to get conversation context:', error);
      return null;
    }
  }

  /**
   * Append a single message to conversation context
   */
  async appendMessage(conversationId: string, userId: string, message: Message): Promise<boolean> {
    try {
      // Get existing context
      const existingContext = await this.getConversationContext(conversationId);

      const messages = existingContext?.messages || [];

      // Add new message
      messages.push({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        metadata: message.metadata as Record<string, unknown> | undefined,
      });

      // Keep only most recent messages
      const recentMessages = messages.slice(-this.MAX_CONTEXT_MESSAGES);

      const context: ConversationContext = {
        conversationId,
        userId,
        messages: recentMessages,
        lastUpdated: new Date().toISOString(),
      };

      const key = this.getContextKey(conversationId);
      return await this.cache.set(key, context, this.CONTEXT_TTL);
    } catch (error) {
      console.error('Failed to append message to context:', error);
      return false;
    }
  }

  /**
   * Clear conversation context from Redis
   */
  async clearConversationContext(conversationId: string): Promise<boolean> {
    try {
      const key = this.getContextKey(conversationId);
      return await this.cache.delete(key);
    } catch (error) {
      console.error('Failed to clear conversation context:', error);
      return false;
    }
  }

  /**
   * Store user session state
   */
  async storeUserSession(userId: string, session: Partial<UserSession>): Promise<boolean> {
    try {
      const existing = await this.getUserSession(userId);

      const updatedSession: UserSession = {
        userId,
        activeConversationId: session.activeConversationId ?? existing?.activeConversationId,
        lastActivity: new Date().toISOString(),
        preferences: {
          ...existing?.preferences,
          ...session.preferences,
        },
      };

      const key = this.getSessionKey(userId);
      return await this.cache.set(key, updatedSession, this.SESSION_TTL);
    } catch (error) {
      console.error('Failed to store user session:', error);
      return false;
    }
  }

  /**
   * Get user session state
   */
  async getUserSession(userId: string): Promise<UserSession | null> {
    try {
      const key = this.getSessionKey(userId);
      return await this.cache.get<UserSession>(key);
    } catch (error) {
      console.error('Failed to get user session:', error);
      return null;
    }
  }

  /**
   * Update user's active conversation
   */
  async setActiveConversation(userId: string, conversationId: string): Promise<boolean> {
    return await this.storeUserSession(userId, { activeConversationId: conversationId });
  }

  /**
   * Get user's active conversation
   */
  async getActiveConversation(userId: string): Promise<string | null> {
    const session = await this.getUserSession(userId);
    return session?.activeConversationId || null;
  }

  /**
   * Clear user session
   */
  async clearUserSession(userId: string): Promise<boolean> {
    try {
      const key = this.getSessionKey(userId);
      return await this.cache.delete(key);
    } catch (error) {
      console.error('Failed to clear user session:', error);
      return false;
    }
  }

  /**
   * Set typing indicator for a user in a conversation
   */
  async setTypingIndicator(conversationId: string, userId: string): Promise<boolean> {
    try {
      const key = this.getTypingKey(conversationId, userId);
      return await this.cache.set(key, { typing: true }, this.TYPING_TTL);
    } catch (error) {
      console.error('Failed to set typing indicator:', error);
      return false;
    }
  }

  /**
   * Clear typing indicator for a user
   */
  async clearTypingIndicator(conversationId: string, userId: string): Promise<boolean> {
    try {
      const key = this.getTypingKey(conversationId, userId);
      return await this.cache.delete(key);
    } catch (error) {
      console.error('Failed to clear typing indicator:', error);
      return false;
    }
  }

  /**
   * Check if user is typing in a conversation
   */
  async isUserTyping(conversationId: string, userId: string): Promise<boolean> {
    try {
      const key = this.getTypingKey(conversationId, userId);
      return await this.cache.exists(key);
    } catch (error) {
      console.error('Failed to check typing indicator:', error);
      return false;
    }
  }

  /**
   * Store temporary data with custom TTL
   */
  async storeTemporary(key: string, data: unknown, ttlSeconds: number): Promise<boolean> {
    try {
      const fullKey = this.getTempKey(key);
      return await this.cache.set(fullKey, data, ttlSeconds);
    } catch (error) {
      console.error('Failed to store temporary data:', error);
      return false;
    }
  }

  /**
   * Get temporary data
   */
  async getTemporary<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.getTempKey(key);
      return await this.cache.get<T>(fullKey);
    } catch (error) {
      console.error('Failed to get temporary data:', error);
      return null;
    }
  }

  /**
   * Clear all conversation contexts for a user
   */
  async clearUserContexts(userId: string): Promise<number> {
    try {
      const pattern = `chat:context:*`;
      const keys = await this.getAllKeys(pattern);

      // Filter keys that match this user
      let deletedCount = 0;
      for (const key of keys) {
        const context = await this.cache.get<ConversationContext>(key);
        if (context && context.userId === userId) {
          await this.cache.delete(key);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Failed to clear user contexts:', error);
      return 0;
    }
  }

  /**
   * Get all keys matching a pattern
   */
  private async getAllKeys(pattern: string): Promise<string[]> {
    try {
      // This is a simplified version - in production, use SCAN instead of KEYS
      // to avoid blocking Redis on large datasets
      const redis = this.cache['redis'];
      return await redis.keys(pattern);
    } catch (error) {
      console.error('Failed to get keys:', error);
      return [];
    }
  }

  /**
   * Get statistics about short-term memory usage
   */
  async getMemoryStats(): Promise<{
    totalKeys: number;
    contextKeys: number;
    sessionKeys: number;
    typingKeys: number;
    tempKeys: number;
  }> {
    try {
      const [contextKeys, sessionKeys, typingKeys, tempKeys] = await Promise.all([
        this.getAllKeys('chat:context:*'),
        this.getAllKeys('chat:session:*'),
        this.getAllKeys('chat:typing:*'),
        this.getAllKeys('chat:temp:*'),
      ]);

      return {
        totalKeys: contextKeys.length + sessionKeys.length + typingKeys.length + tempKeys.length,
        contextKeys: contextKeys.length,
        sessionKeys: sessionKeys.length,
        typingKeys: typingKeys.length,
        tempKeys: tempKeys.length,
      };
    } catch (error) {
      console.error('Failed to get memory stats:', error);
      return {
        totalKeys: 0,
        contextKeys: 0,
        sessionKeys: 0,
        typingKeys: 0,
        tempKeys: 0,
      };
    }
  }

  // Key generation helpers
  private getContextKey(conversationId: string): string {
    return `chat:context:${conversationId}`;
  }

  private getSessionKey(userId: string): string {
    return `chat:session:${userId}`;
  }

  private getTypingKey(conversationId: string, userId: string): string {
    return `chat:typing:${conversationId}:${userId}`;
  }

  private getTempKey(key: string): string {
    return `chat:temp:${key}`;
  }
}
