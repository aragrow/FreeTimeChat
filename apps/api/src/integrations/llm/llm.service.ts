/**
 * LLM Service
 *
 * Singleton service for managing LLM provider instances
 * Supports both environment-based and database-based configurations
 */

import { llmConfigService } from '../../services/llm-config.service';
import { createLLMProviderFromEnv } from './llm.factory';
import type { BaseLLMProvider } from './base-provider';
import type { LLMMessage, LLMRequestConfig, LLMResponse, LLMStreamChunk } from './types';

class LLMService {
  private static instance: LLMService;
  private provider: BaseLLMProvider | null = null;
  private initialized = false;
  private providerCache: Map<string, { provider: BaseLLMProvider; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  /**
   * Initialize the LLM service (from environment variables - legacy mode)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.provider = createLLMProviderFromEnv();

      if (this.provider) {
        console.log(`LLM Provider initialized from env: ${this.provider.getProviderName()}`);

        // Validate configuration
        try {
          await this.provider.validateConfig();
          console.log(`LLM Provider validated successfully`);
        } catch (error) {
          console.error('LLM Provider validation failed:', error);
          this.provider = null;
        }
      } else {
        console.warn('No LLM provider configured in environment. Will check database on demand.');
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize LLM service:', error);
      this.provider = null;
      this.initialized = true;
    }
  }

  /**
   * Get provider for a specific tenant/user context
   * Checks database first, then falls back to environment config
   * @param tenantId - Tenant ID (null for system-wide)
   * @returns Provider instance or null
   */
  async getProviderForTenant(tenantId: string | null): Promise<BaseLLMProvider | null> {
    const cacheKey = `tenant:${tenantId || 'system'}`;

    // Check cache first
    const cached = this.providerCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.provider;
    }

    try {
      // Try to load from database
      const provider = await llmConfigService.getActiveProvider(tenantId);

      if (provider) {
        // Cache the provider
        this.providerCache.set(cacheKey, {
          provider,
          timestamp: Date.now(),
        });
        return provider;
      }

      // Fall back to environment config for both system-wide and tenant users
      // This ensures tenant users can use the system LLM provider until they configure their own
      if (this.provider) {
        return this.provider;
      }

      return null;
    } catch (error) {
      console.error('Error loading LLM provider from database:', error);

      // Fall back to environment config for system-wide
      if (tenantId === null && this.provider) {
        return this.provider;
      }

      return null;
    }
  }

  /**
   * Clear the provider cache
   * Call this when LLM configurations are updated
   */
  clearCache(): void {
    this.providerCache.clear();
  }

  /**
   * Clear cached provider for a specific tenant
   * @param tenantId - Tenant ID (null for system-wide)
   */
  clearCacheForTenant(tenantId: string | null): void {
    const cacheKey = `tenant:${tenantId || 'system'}`;
    this.providerCache.delete(cacheKey);
  }

  /**
   * Check if LLM is configured and ready
   */
  isConfigured(): boolean {
    return this.provider !== null && this.provider.isConfigured();
  }

  /**
   * Get the current provider name
   */
  getProviderName(): string | null {
    return this.provider?.getProviderName() || null;
  }

  /**
   * Generate a completion
   */
  async complete(messages: LLMMessage[], config?: LLMRequestConfig): Promise<LLMResponse> {
    if (!this.provider) {
      throw new Error('LLM provider is not configured');
    }

    return this.provider.complete(messages, config);
  }

  /**
   * Generate a streaming completion
   */
  completeStream(
    messages: LLMMessage[],
    config?: LLMRequestConfig
  ): AsyncGenerator<LLMStreamChunk, void, unknown> {
    if (!this.provider) {
      throw new Error('LLM provider is not configured');
    }

    return this.provider.completeStream(messages, config);
  }

  /**
   * Get provider capabilities
   */
  getCapabilities() {
    return this.provider?.getCapabilities() || null;
  }

  /**
   * Get default model
   */
  getDefaultModel(): string | null {
    return this.provider?.getDefaultModel() || null;
  }

  /**
   * Set a custom provider (for testing or dynamic switching)
   */
  setProvider(provider: BaseLLMProvider): void {
    this.provider = provider;
  }

  /**
   * Reset the service
   */
  reset(): void {
    this.provider = null;
    this.initialized = false;
  }
}

/**
 * Get the LLM service instance
 */
export function getLLMService(): LLMService {
  return LLMService.getInstance();
}

/**
 * Initialize LLM service
 */
export async function initializeLLMService(): Promise<void> {
  const service = getLLMService();
  await service.initialize();
}
