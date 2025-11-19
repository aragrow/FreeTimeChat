/**
 * Embeddings Service
 *
 * Provides vector embeddings with multi-provider support:
 * - Google Gemini text-embedding-004 (768 dimensions)
 * - OpenAI text-embedding-3-small (1536 dimensions)
 * - Tenant-specific and system-wide configurations
 * - Fallback to mock embeddings in development
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { LLMConfigService } from './llm-config.service';
import type { LLMProvider as PrismaLLMProvider } from '../generated/prisma-main';

export interface EmbeddingOptions {
  /**
   * Task type for embedding generation (Google Gemini specific)
   * - RETRIEVAL_QUERY: For search queries
   * - RETRIEVAL_DOCUMENT: For documents to be searched
   * - SEMANTIC_SIMILARITY: For similarity comparison
   * - CLASSIFICATION: For text classification
   */
  taskType?: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION';

  /**
   * Optional title for the text (helps with context - Google Gemini specific)
   */
  title?: string;
}

export interface EmbeddingProvider {
  generateEmbedding(text: string, options?: EmbeddingOptions): Promise<number[]>;
  getDimension(): number;
  getModelName(): string;
}

/**
 * Google Gemini Embedding Provider
 */
class GoogleGeminiEmbeddingProvider implements EmbeddingProvider {
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model || 'text-embedding-004';
  }

  async generateEmbedding(text: string, options: EmbeddingOptions = {}): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
    });

    // Build the request with proper typing for Google Gemini API
    const embeddingRequest: any = {
      content: { parts: [{ text }] },
    };

    if (options.taskType) {
      embeddingRequest.taskType = options.taskType;
    }

    if (options.title) {
      embeddingRequest.title = options.title;
    }

    const result = await model.embedContent(embeddingRequest);

    if (!result.embedding || !result.embedding.values) {
      throw new Error('Invalid embedding response from Google Gemini API');
    }

    return result.embedding.values;
  }

  getDimension(): number {
    return 768; // text-embedding-004 dimension
  }

  getModelName(): string {
    return this.model;
  }
}

/**
 * OpenAI Embedding Provider
 */
class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private openai: OpenAI;
  private model: string;

  constructor(apiKey: string, model?: string, organization?: string) {
    this.openai = new OpenAI({
      apiKey,
      organization: organization || undefined,
    });
    this.model = model || 'text-embedding-3-small';
  }

  async generateEmbedding(text: string, _options: EmbeddingOptions = {}): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: this.model,
      input: text,
      encoding_format: 'float',
    });

    if (!response.data || !response.data[0] || !response.data[0].embedding) {
      throw new Error('Invalid embedding response from OpenAI API');
    }

    return response.data[0].embedding;
  }

  getDimension(): number {
    // text-embedding-3-small: 1536, text-embedding-3-large: 3072
    return this.model === 'text-embedding-3-large' ? 3072 : 1536;
  }

  getModelName(): string {
    return this.model;
  }
}

/**
 * Mock Embedding Provider (for development/testing)
 */
class MockEmbeddingProvider implements EmbeddingProvider {
  private dimension: number;

  constructor(dimension: number = 768) {
    this.dimension = dimension;
  }

  async generateEmbedding(text: string, _options: EmbeddingOptions = {}): Promise<number[]> {
    const hash = this.simpleHash(text);
    const embedding: number[] = [];

    for (let i = 0; i < this.dimension; i++) {
      const value = Math.sin(hash + i) * 0.5;
      embedding.push(value);
    }

    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / norm);
  }

  getDimension(): number {
    return this.dimension;
  }

  getModelName(): string {
    return 'mock-embedding';
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

/**
 * Provider cache entry
 */
interface ProviderCacheEntry {
  provider: EmbeddingProvider;
  timestamp: number;
}

/**
 * Main Embeddings Service
 */
export class EmbeddingsService {
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private providerCache: Map<string, ProviderCacheEntry> = new Map();
  private llmConfigService: LLMConfigService;
  private environmentProvider: EmbeddingProvider | null = null;

  constructor() {
    this.llmConfigService = new LLMConfigService();
    this.initializeEnvironmentProvider();
  }

  /**
   * Initialize provider from environment variables
   */
  private initializeEnvironmentProvider(): void {
    const provider = process.env.LLM_PROVIDER;
    const apiKey = process.env.LLM_API_KEY;

    if (!apiKey) {
      return;
    }

    try {
      if (provider === 'google-gemini') {
        this.environmentProvider = new GoogleGeminiEmbeddingProvider(
          apiKey,
          process.env.LLM_DEFAULT_MODEL
        );
      } else if (provider === 'openai') {
        this.environmentProvider = new OpenAIEmbeddingProvider(
          apiKey,
          process.env.LLM_DEFAULT_MODEL,
          process.env.LLM_ORGANIZATION
        );
      }
    } catch (error) {
      console.error('Failed to initialize environment embedding provider:', error);
      this.environmentProvider = null;
    }
  }

  /**
   * Get embedding provider for a tenant
   * Priority: Tenant config → System-wide config → Environment → Mock
   */
  async getProviderForTenant(tenantId: string | null): Promise<EmbeddingProvider> {
    const cacheKey = `tenant:${tenantId || 'system'}`;

    // Check cache first
    const cached = this.providerCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < EmbeddingsService.CACHE_TTL) {
      return cached.provider;
    }

    try {
      // Try to load from database using the raw config method
      // which includes apiKeyEncrypted and embedding settings
      const config = await this.llmConfigService.getActiveConfigRaw(tenantId);

      if (config && config.embeddingEnabled) {
        const apiKey = this.llmConfigService.decryptApiKey(config.apiKeyEncrypted);
        let provider: EmbeddingProvider;

        switch (config.provider) {
          case 'GOOGLE_GEMINI':
            provider = new GoogleGeminiEmbeddingProvider(
              apiKey,
              config.embeddingModel || undefined
            );
            break;

          case 'OPENAI':
            provider = new OpenAIEmbeddingProvider(
              apiKey,
              config.embeddingModel || undefined,
              config.organization || undefined
            );
            break;

          default:
            // Provider doesn't support embeddings, fall through
            provider = this.getFallbackProvider();
        }

        // Cache the provider
        this.providerCache.set(cacheKey, {
          provider,
          timestamp: Date.now(),
        });

        return provider;
      }
    } catch (error) {
      console.error('Failed to load embedding provider from database:', error);
    }

    // Fall back to environment provider or mock
    return this.getFallbackProvider();
  }

  /**
   * Get fallback provider (environment or mock)
   */
  private getFallbackProvider(): EmbeddingProvider {
    if (this.environmentProvider) {
      return this.environmentProvider;
    }

    console.warn(
      'Using mock embeddings - configure LLM provider with embeddings enabled for real embeddings'
    );
    return new MockEmbeddingProvider(768); // Default to 768 dimensions (Google Gemini size)
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(
    text: string,
    tenantId: string | null,
    options: EmbeddingOptions = {}
  ): Promise<number[]> {
    try {
      const provider = await this.getProviderForTenant(tenantId);
      return await provider.generateEmbedding(text, options);
    } catch (error) {
      console.error('Failed to generate embedding, falling back to mock:', error);
      const mockProvider = new MockEmbeddingProvider(768);
      return await mockProvider.generateEmbedding(text, options);
    }
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async generateEmbeddings(
    texts: string[],
    tenantId: string | null,
    options: EmbeddingOptions = {}
  ): Promise<number[][]> {
    return Promise.all(texts.map((text) => this.generateEmbedding(text, tenantId, options)));
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  /**
   * Get embedding dimension for a tenant's configured provider
   */
  async getDimension(tenantId: string | null): Promise<number> {
    const provider = await this.getProviderForTenant(tenantId);
    return provider.getDimension();
  }

  /**
   * Clear provider cache (useful for testing or when config changes)
   */
  clearCache(tenantId?: string | null): void {
    if (tenantId !== undefined) {
      this.providerCache.delete(`tenant:${tenantId || 'system'}`);
    } else {
      this.providerCache.clear();
    }
  }

  /**
   * Get default embedding model for a provider
   */
  static getDefaultEmbeddingModel(provider: PrismaLLMProvider): string {
    switch (provider) {
      case 'GOOGLE_GEMINI':
        return 'text-embedding-004';
      case 'OPENAI':
        return 'text-embedding-3-small';
      default:
        return 'text-embedding-004'; // Default fallback
    }
  }

  /**
   * Get embedding dimension for a provider
   */
  static getEmbeddingDimension(provider: PrismaLLMProvider, model?: string): number {
    switch (provider) {
      case 'GOOGLE_GEMINI':
        return 768; // text-embedding-004
      case 'OPENAI':
        return model === 'text-embedding-3-large' ? 3072 : 1536; // text-embedding-3-small default
      default:
        return 768; // Default fallback
    }
  }
}

// Export singleton instance
export const embeddingsService = new EmbeddingsService();
