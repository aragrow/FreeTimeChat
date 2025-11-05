/**
 * Semantic Memory Service
 *
 * Uses embeddings to enable semantic search and similarity matching
 * - Message embeddings for semantic search
 * - Similar conversation finding
 * - Context-aware recommendations
 *
 * NOTE: This is a foundation service. In production, integrate with:
 * - OpenAI embeddings API
 * - Pinecone vector database
 * - PostgreSQL pgvector extension
 */

import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { Message } from '../generated/prisma-client';

export interface EmbeddingMetadata {
  messageId: string;
  conversationId: string;
  userId: string;
  embedding: number[];
  createdAt: Date;
}

export interface SimilarMessage {
  message: Message;
  similarity: number;
}

export interface SemanticSearchResult {
  message: Message;
  score: number;
  context?: {
    before?: Message[];
    after?: Message[];
  };
}

export class SemanticMemoryService {
  private readonly EMBEDDING_DIMENSION = 1536; // OpenAI ada-002 dimension

  constructor(private prisma: ClientPrismaClient) {}

  /**
   * Generate embedding for text
   * NOTE: Placeholder - integrate with OpenAI embeddings API in production
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Placeholder implementation
    // In production, call OpenAI embeddings API:
    // const response = await openai.embeddings.create({
    //   model: 'text-embedding-ada-002',
    //   input: text,
    // });
    // return response.data[0].embedding;

    // For now, return a mock embedding
    console.warn('Using mock embeddings - integrate with OpenAI in production');
    return this.mockEmbedding(text);
  }

  /**
   * Store message embedding
   */
  async storeMessageEmbedding(messageId: string, embedding: number[]): Promise<boolean> {
    try {
      // Update message metadata with embedding
      await this.prisma.message.update({
        where: { id: messageId },
        data: {
          metadata: {
            embedding,
            embeddingModel: 'mock',
            embeddingTimestamp: new Date().toISOString(),
          },
        },
      });

      return true;
    } catch (error) {
      console.error('Failed to store message embedding:', error);
      return false;
    }
  }

  /**
   * Process and store embedding for a message
   */
  async processMessage(messageId: string): Promise<boolean> {
    try {
      const message = await this.prisma.message.findUnique({
        where: { id: messageId },
      });

      if (!message) {
        return false;
      }

      // Generate embedding
      const embedding = await this.generateEmbedding(message.content);

      // Store embedding in message metadata
      await this.storeMessageEmbedding(messageId, embedding);

      return true;
    } catch (error) {
      console.error('Failed to process message:', error);
      return false;
    }
  }

  /**
   * Semantic search across user's messages
   */
  async semanticSearch(
    userId: string,
    query: string,
    limit: number = 5
  ): Promise<SemanticSearchResult[]> {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);

      // Get all messages with embeddings for this user
      const messages = await this.prisma.message.findMany({
        where: {
          conversation: { userId },
          metadata: {
            path: ['embedding'],
            not: undefined,
          },
        },
        take: 100, // Limit for performance
        orderBy: { createdAt: 'desc' },
      });

      // Calculate similarity scores
      const scoredMessages = messages
        .map((message) => {
          const metadata = message.metadata as { embedding?: number[] } | null;
          const embedding = metadata?.embedding;

          if (!embedding) {
            return null;
          }

          const similarity = this.cosineSimilarity(queryEmbedding, embedding);

          return {
            message,
            score: similarity,
          };
        })
        .filter((item): item is { message: Message; score: number } => item !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Add context messages (before/after)
      const results: SemanticSearchResult[] = [];

      for (const { message, score } of scoredMessages) {
        const context = await this.getMessageContext(message.id);

        results.push({
          message,
          score,
          context,
        });
      }

      return results;
    } catch (error) {
      console.error('Failed to perform semantic search:', error);
      return [];
    }
  }

  /**
   * Find similar messages to a given message
   */
  async findSimilarMessages(messageId: string, limit: number = 5): Promise<SimilarMessage[]> {
    try {
      const targetMessage = await this.prisma.message.findUnique({
        where: { id: messageId },
        include: { conversation: true },
      });

      if (!targetMessage) {
        return [];
      }

      const metadata = targetMessage.metadata as { embedding?: number[] } | null;
      const targetEmbedding = metadata?.embedding;

      if (!targetEmbedding) {
        // Generate embedding if not exists
        const embedding = await this.generateEmbedding(targetMessage.content);
        await this.storeMessageEmbedding(messageId, embedding);
        return this.findSimilarMessages(messageId, limit);
      }

      // Get all messages from the same user (excluding the target)
      const messages = await this.prisma.message.findMany({
        where: {
          conversation: { userId: targetMessage.conversation.userId },
          id: { not: messageId },
          metadata: {
            path: ['embedding'],
            not: undefined,
          },
        },
        take: 100,
        orderBy: { createdAt: 'desc' },
      });

      // Calculate similarity
      const similar = messages
        .map((message) => {
          const msgMetadata = message.metadata as { embedding?: number[] } | null;
          const embedding = msgMetadata?.embedding;

          if (!embedding) {
            return null;
          }

          const similarity = this.cosineSimilarity(targetEmbedding, embedding);

          return {
            message,
            similarity,
          };
        })
        .filter((item): item is SimilarMessage => item !== null)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return similar;
    } catch (error) {
      console.error('Failed to find similar messages:', error);
      return [];
    }
  }

  /**
   * Get conversation context around a message
   */
  async getMessageContext(
    messageId: string
  ): Promise<{ before?: Message[]; after?: Message[] } | undefined> {
    try {
      const message = await this.prisma.message.findUnique({
        where: { id: messageId },
      });

      if (!message) {
        return undefined;
      }

      const [before, after] = await Promise.all([
        // Get 2 messages before
        this.prisma.message.findMany({
          where: {
            conversationId: message.conversationId,
            createdAt: { lt: message.createdAt },
          },
          orderBy: { createdAt: 'desc' },
          take: 2,
        }),
        // Get 2 messages after
        this.prisma.message.findMany({
          where: {
            conversationId: message.conversationId,
            createdAt: { gt: message.createdAt },
          },
          orderBy: { createdAt: 'asc' },
          take: 2,
        }),
      ]);

      return {
        before: before.reverse(),
        after,
      };
    } catch (error) {
      console.error('Failed to get message context:', error);
      return undefined;
    }
  }

  /**
   * Batch process embeddings for a conversation
   */
  async processConversationEmbeddings(conversationId: string): Promise<number> {
    try {
      const messages = await this.prisma.message.findMany({
        where: {
          conversationId,
          metadata: {
            path: ['embedding'],
            equals: undefined,
          },
        },
      });

      let processedCount = 0;

      for (const message of messages) {
        const success = await this.processMessage(message.id);
        if (success) {
          processedCount++;
        }
      }

      return processedCount;
    } catch (error) {
      console.error('Failed to process conversation embeddings:', error);
      return 0;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Mock embedding generation (for development)
   * Replace with actual OpenAI API call in production
   */
  private mockEmbedding(text: string): number[] {
    // Generate a deterministic mock embedding based on text hash
    const hash = this.simpleHash(text);
    const embedding: number[] = [];

    for (let i = 0; i < this.EMBEDDING_DIMENSION; i++) {
      // Use hash to generate pseudo-random values
      const value = Math.sin(hash + i) * 0.5;
      embedding.push(value);
    }

    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / norm);
  }

  /**
   * Simple string hash function
   */
  private simpleHash(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}
