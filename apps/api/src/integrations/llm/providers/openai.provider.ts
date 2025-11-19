/**
 * OpenAI LLM Provider
 *
 * Implementation for OpenAI GPT models
 */

import { BaseLLMProvider } from '../base-provider';
import { LLMError, LLMRole } from '../types';
import type {
  LLMContentPart,
  LLMMessage,
  LLMProviderCapabilities,
  LLMProviderConfig,
  LLMRequestConfig,
  LLMResponse,
  LLMStreamChunk,
} from '../types';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | LLMContentPart[];
  name?: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
  stream?: boolean;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
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

export class OpenAIProvider extends BaseLLMProvider {
  private readonly baseUrl: string;

  constructor(config: LLMProviderConfig) {
    const capabilities: LLMProviderCapabilities = {
      supportsStreaming: true,
      supportsSystemMessages: true,
      supportsFunctionCalling: true,
      supportsVision: true,
      maxContextTokens: 128000, // GPT-4 Turbo context window
    };

    super(config, capabilities);
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  getProviderName(): string {
    return 'OpenAI';
  }

  async validateConfig(): Promise<boolean> {
    if (!this.config.apiKey) {
      throw new LLMError('OpenAI API key is required', this.getProviderName());
    }

    try {
      // Test the API key by listing models
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          ...(this.config.organization && { 'OpenAI-Organization': this.config.organization }),
        },
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
      throw new LLMError('Model is required for OpenAI', this.getProviderName());
    }

    const requestBody: OpenAIRequest = {
      model: mergedConfig.model,
      messages: this.convertMessages(messages),
      temperature: mergedConfig.temperature,
      max_tokens: mergedConfig.maxTokens,
      top_p: mergedConfig.topP,
      frequency_penalty: mergedConfig.frequencyPenalty,
      presence_penalty: mergedConfig.presencePenalty,
      stop: mergedConfig.stop,
      stream: false,
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
          ...(this.config.organization && { 'OpenAI-Organization': this.config.organization }),
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

      const data = (await response.json()) as OpenAIResponse;

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
      throw new LLMError('Model is required for OpenAI', this.getProviderName());
    }

    const requestBody: OpenAIRequest = {
      model: mergedConfig.model,
      messages: this.convertMessages(messages),
      temperature: mergedConfig.temperature,
      max_tokens: mergedConfig.maxTokens,
      top_p: mergedConfig.topP,
      frequency_penalty: mergedConfig.frequencyPenalty,
      presence_penalty: mergedConfig.presencePenalty,
      stop: mergedConfig.stop,
      stream: true,
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
          ...(this.config.organization && { 'OpenAI-Organization': this.config.organization }),
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
              const json: OpenAIStreamChunk = JSON.parse(trimmed.slice(6));
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

  private convertMessages(messages: LLMMessage[]): OpenAIMessage[] {
    return messages.map((msg) => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
      ...(msg.name && { name: msg.name }),
    }));
  }

  private mapFinishReason(
    reason: string | null
  ): 'stop' | 'length' | 'content_filter' | 'tool_calls' | undefined {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      case 'tool_calls':
        return 'tool_calls';
      default:
        return undefined;
    }
  }
}
