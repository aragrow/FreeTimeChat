/**
 * LLM Integration Types
 *
 * Common types and interfaces for LLM providers
 */

/**
 * LLM Message Role
 */
export enum LLMRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
}

/**
 * LLM Message
 */
export interface LLMMessage {
  role: LLMRole;
  content: string;
  name?: string;
}

/**
 * LLM Request Configuration
 */
export interface LLMRequestConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
}

/**
 * LLM Response
 */
export interface LLMResponse {
  content: string;
  role: LLMRole;
  finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  provider: string;
}

/**
 * LLM Streaming Chunk
 */
export interface LLMStreamChunk {
  content: string;
  isComplete: boolean;
  finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls';
}

/**
 * LLM Provider Configuration
 */
export interface LLMProviderConfig {
  apiKey: string;
  baseUrl?: string;
  organization?: string;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  timeout?: number;
}

/**
 * LLM Provider Capabilities
 */
export interface LLMProviderCapabilities {
  supportsStreaming: boolean;
  supportsSystemMessages: boolean;
  supportsFunctionCalling: boolean;
  supportsVision: boolean;
  maxContextTokens: number;
}

/**
 * LLM Error
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public provider: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * Available LLM Providers
 */
export enum LLMProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE_GEMINI = 'google-gemini',
  PERPLEXITY = 'perplexity',
  ABACUS_AI = 'abacus-ai',
}
