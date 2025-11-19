/**
 * Perplexity AI LLM Provider
 *
 * Implementation for Perplexity AI models (OpenAI-compatible API)
 */

import { BaseLLMProvider } from '../base-provider';
import { LLMError, LLMRole } from '../types';
import type {
  LLMMessage,
  LLMProviderCapabilities,
  LLMProviderConfig,
  LLMRequestConfig,
  LLMResponse,
  LLMStreamChunk,
} from '../types';

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityRequest {
  model: string;
  messages: PerplexityMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

interface PerplexityResponse {
  id: string;
  model: string;
  created: number;
  choices: {
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface PerplexityStreamChunk {
  id: string;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }[];
}

export class PerplexityProvider extends BaseLLMProvider {
  private readonly baseUrl: string;

  constructor(config: LLMProviderConfig) {
    const capabilities: LLMProviderCapabilities = {
      supportsStreaming: true,
      supportsSystemMessages: true,
      supportsFunctionCalling: false,
      supportsVision: false,
      maxContextTokens: 127072, // Perplexity context window
    };

    super(config, capabilities);
    this.baseUrl = config.baseUrl || 'https://api.perplexity.ai';
  }

  getProviderName(): string {
    return 'Perplexity AI';
  }

  async validateConfig(): Promise<boolean> {
    if (!this.config.apiKey) {
      throw new LLMError('Perplexity API key is required', this.getProviderName());
    }

    try {
      // Test the API key by making a simple request
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.defaultModel || 'sonar',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 10,
        }),
      });

      if (!response.ok) {
        throw new LLMError(
          `Invalid API key or configuration: ${response.statusText}`,
          this.getProviderName(),
          response.status
        );
      }

      return true;
    } catch (error) {
      this.handleError(error, 'Configuration validation failed');
    }
  }

  async complete(messages: LLMMessage[], config?: LLMRequestConfig): Promise<LLMResponse> {
    const mergedConfig = this.mergeConfig(config);

    if (!mergedConfig.model) {
      throw new LLMError('Model is required for Perplexity', this.getProviderName());
    }

    const requestBody: PerplexityRequest = {
      model: mergedConfig.model,
      messages: this.convertMessages(messages),
      temperature: mergedConfig.temperature,
      max_tokens: mergedConfig.maxTokens,
      top_p: mergedConfig.topP,
      stream: false,
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new LLMError(
          errorData.error?.message || `API request failed: ${response.statusText}`,
          this.getProviderName(),
          response.status,
          errorData
        );
      }

      const data = (await response.json()) as PerplexityResponse;

      return {
        content: data.choices[0]?.message.content || '',
        role: LLMRole.ASSISTANT,
        finishReason: this.mapFinishReason(data.choices[0]?.finish_reason),
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        model: data.model,
        provider: this.getProviderName(),
      };
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }
      this.handleError(error, 'Completion request failed');
    }
  }

  async *completeStream(
    messages: LLMMessage[],
    config?: LLMRequestConfig
  ): AsyncGenerator<LLMStreamChunk, void, unknown> {
    const mergedConfig = this.mergeConfig({ ...config, stream: true });

    if (!mergedConfig.model) {
      throw new LLMError('Model is required for Perplexity', this.getProviderName());
    }

    const requestBody: PerplexityRequest = {
      model: mergedConfig.model,
      messages: this.convertMessages(messages),
      temperature: mergedConfig.temperature,
      max_tokens: mergedConfig.maxTokens,
      top_p: mergedConfig.topP,
      stream: true,
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new LLMError(
          errorData.error?.message || `API request failed: ${response.statusText}`,
          this.getProviderName(),
          response.status,
          errorData
        );
      }

      if (!response.body) {
        throw new LLMError('No response body received', this.getProviderName());
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();

          if (trimmed === '' || trimmed === 'data: [DONE]') {
            continue;
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const json: PerplexityStreamChunk = JSON.parse(trimmed.slice(6));
              const delta = json.choices[0]?.delta;
              const finishReason = json.choices[0]?.finish_reason;

              if (delta?.content) {
                yield {
                  content: delta.content,
                  isComplete: false,
                };
              }

              if (finishReason) {
                yield {
                  content: '',
                  isComplete: true,
                  finishReason: this.mapFinishReason(finishReason),
                };
              }
            } catch (error) {
              console.error('Failed to parse streaming chunk:', error);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }
      this.handleError(error, 'Streaming request failed');
    }
  }

  private convertMessages(messages: LLMMessage[]): PerplexityMessage[] {
    // Import extractTextContent locally to avoid circular dependency issues
    const extractText = (content: string | import('../types').LLMContentPart[]): string => {
      if (typeof content === 'string') return content;
      return content
        .filter((part): part is import('../types').LLMTextContentPart => part.type === 'text')
        .map((part) => part.text)
        .join('\n');
    };

    return messages.map((msg) => {
      let role: 'system' | 'user' | 'assistant';
      const msgRole = String(msg.role);
      if (msgRole === LLMRole.SYSTEM || msgRole === 'system') {
        role = 'system';
      } else if (msgRole === LLMRole.USER || msgRole === 'user') {
        role = 'user';
      } else {
        role = 'assistant';
      }
      return {
        role,
        content: extractText(msg.content),
      };
    });
  }

  private mapFinishReason(
    reason: string | null
  ): 'stop' | 'length' | 'content_filter' | 'tool_calls' | undefined {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      default:
        return undefined;
    }
  }
}
