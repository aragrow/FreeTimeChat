/**
 * Base LLM Provider
 *
 * Abstract base class for all LLM provider implementations
 */

import type {
  LLMMessage,
  LLMProviderCapabilities,
  LLMProviderConfig,
  LLMRequestConfig,
  LLMResponse,
  LLMStreamChunk,
} from './types';

/**
 * Abstract base class for LLM providers
 */
export abstract class BaseLLMProvider {
  protected config: LLMProviderConfig;
  protected capabilities: LLMProviderCapabilities;

  constructor(config: LLMProviderConfig, capabilities: LLMProviderCapabilities) {
    this.config = config;
    this.capabilities = capabilities;
  }

  /**
   * Get provider name
   */
  abstract getProviderName(): string;

  /**
   * Generate a completion from messages
   */
  abstract complete(messages: LLMMessage[], config?: LLMRequestConfig): Promise<LLMResponse>;

  /**
   * Generate a streaming completion from messages
   */
  abstract completeStream(
    messages: LLMMessage[],
    config?: LLMRequestConfig
  ): AsyncGenerator<LLMStreamChunk, void, unknown>;

  /**
   * Validate the provider configuration
   */
  abstract validateConfig(): Promise<boolean>;

  /**
   * Get provider capabilities
   */
  getCapabilities(): LLMProviderCapabilities {
    return this.capabilities;
  }

  /**
   * Get default model
   */
  getDefaultModel(): string {
    return this.config.defaultModel || '';
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  /**
   * Merge request config with defaults
   */
  protected mergeConfig(config?: LLMRequestConfig): LLMRequestConfig {
    return {
      model: config?.model || this.config.defaultModel,
      temperature: config?.temperature ?? this.config.defaultTemperature ?? 0.7,
      maxTokens: config?.maxTokens ?? this.config.defaultMaxTokens ?? 2000,
      topP: config?.topP,
      frequencyPenalty: config?.frequencyPenalty,
      presencePenalty: config?.presencePenalty,
      stop: config?.stop,
      stream: config?.stream ?? false,
    };
  }

  /**
   * Handle API errors uniformly
   */
  protected handleError(error: unknown, context: string): never {
    if (error instanceof Error) {
      throw new Error(`[${this.getProviderName()}] ${context}: ${error.message}`);
    }
    throw new Error(`[${this.getProviderName()}] ${context}: Unknown error`);
  }
}
