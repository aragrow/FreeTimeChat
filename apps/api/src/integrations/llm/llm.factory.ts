/**
 * LLM Provider Factory
 *
 * Factory for creating LLM provider instances based on configuration
 */

import { AbacusProvider } from './providers/abacus.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { PerplexityProvider } from './providers/perplexity.provider';
import { LLMError, LLMProvider } from './types';
import type { BaseLLMProvider } from './base-provider';
import type { LLMProviderConfig } from './types';

/**
 * LLM Factory Configuration
 */
export interface LLMFactoryConfig {
  provider: LLMProvider | string;
  apiKey: string;
  baseUrl?: string;
  organization?: string;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  timeout?: number;
}

/**
 * Create an LLM provider instance
 */
export function createLLMProvider(config: LLMFactoryConfig): BaseLLMProvider {
  const providerConfig: LLMProviderConfig = {
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    organization: config.organization,
    defaultModel: config.defaultModel,
    defaultTemperature: config.defaultTemperature,
    defaultMaxTokens: config.defaultMaxTokens,
    timeout: config.timeout,
  };

  switch (config.provider.toLowerCase()) {
    case LLMProvider.OPENAI:
    case 'openai':
      return new OpenAIProvider(providerConfig);

    case LLMProvider.ANTHROPIC:
    case 'anthropic':
    case 'claude':
      return new AnthropicProvider(providerConfig);

    case LLMProvider.GOOGLE_GEMINI:
    case 'google-gemini':
    case 'gemini':
    case 'google':
      return new GeminiProvider(providerConfig);

    case LLMProvider.PERPLEXITY:
    case 'perplexity':
      return new PerplexityProvider(providerConfig);

    case LLMProvider.ABACUS_AI:
    case 'abacus-ai':
    case 'abacus':
      return new AbacusProvider(providerConfig);

    default:
      throw new LLMError(`Unsupported LLM provider: ${config.provider}`, 'Factory');
  }
}

/**
 * Get provider from environment variables
 */
export function createLLMProviderFromEnv(): BaseLLMProvider | null {
  const provider = process.env.LLM_PROVIDER;

  if (!provider) {
    return null;
  }

  const apiKey = process.env.LLM_API_KEY || '';

  if (!apiKey) {
    console.warn(`LLM_PROVIDER is set to "${provider}" but LLM_API_KEY is not configured`);
    return null;
  }

  const config: LLMFactoryConfig = {
    provider,
    apiKey,
    baseUrl: process.env.LLM_BASE_URL,
    organization: process.env.LLM_ORGANIZATION,
    defaultModel: process.env.LLM_DEFAULT_MODEL,
    defaultTemperature: process.env.LLM_TEMPERATURE
      ? parseFloat(process.env.LLM_TEMPERATURE)
      : undefined,
    defaultMaxTokens: process.env.LLM_MAX_TOKENS
      ? parseInt(process.env.LLM_MAX_TOKENS, 10)
      : undefined,
    timeout: process.env.LLM_TIMEOUT ? parseInt(process.env.LLM_TIMEOUT, 10) : undefined,
  };

  try {
    return createLLMProvider(config);
  } catch (error) {
    console.error('Failed to create LLM provider from environment:', error);
    return null;
  }
}

/**
 * List available providers
 */
export function listAvailableProviders(): string[] {
  return Object.values(LLMProvider);
}
