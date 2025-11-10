/**
 * Anthropic Claude LLM Provider
 *
 * Implementation for Anthropic Claude models
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

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
  system?: string;
  stream?: boolean;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: {
    type: string;
    text: string;
  }[];
  model: string;
  stop_reason: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicStreamEvent {
  type: string;
  index?: number;
  delta?: {
    type: string;
    text?: string;
    stop_reason?: string;
  };
  content_block?: {
    type: string;
    text: string;
  };
  message?: {
    id: string;
    type: string;
    role: string;
    content: unknown[];
    model: string;
    stop_reason: string | null;
    usage: {
      input_tokens: number;
      output_tokens: number;
    };
  };
}

export class AnthropicProvider extends BaseLLMProvider {
  private readonly baseUrl: string;

  constructor(config: LLMProviderConfig) {
    const capabilities: LLMProviderCapabilities = {
      supportsStreaming: true,
      supportsSystemMessages: true,
      supportsFunctionCalling: false, // Claude has tools, but we'll implement later
      supportsVision: true,
      maxContextTokens: 200000, // Claude 3 context window
    };

    super(config, capabilities);
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
  }

  getProviderName(): string {
    return 'Anthropic Claude';
  }

  async validateConfig(): Promise<boolean> {
    if (!this.config.apiKey) {
      throw new LLMError('Anthropic API key is required', this.getProviderName());
    }

    try {
      // Test the API key by making a simple request
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.defaultModel || 'claude-3-5-sonnet-20241022',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
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
      throw new LLMError('Model is required for Anthropic', this.getProviderName());
    }

    if (!mergedConfig.maxTokens) {
      throw new LLMError('maxTokens is required for Anthropic', this.getProviderName());
    }

    const { messages: convertedMessages, system } = this.convertMessages(messages);

    const requestBody: AnthropicRequest = {
      model: mergedConfig.model,
      messages: convertedMessages,
      max_tokens: mergedConfig.maxTokens,
      temperature: mergedConfig.temperature,
      top_p: mergedConfig.topP,
      stop_sequences: mergedConfig.stop,
      ...(system && { system }),
      stream: false,
    };

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new LLMError(
          errorData.error?.message || `API request failed: ${response.statusText}`,
          this.getProviderName(),
          response.status,
          errorData
        );
      }

      const data: AnthropicResponse = await response.json();

      return {
        content: data.content[0]?.text || '',
        role: LLMRole.ASSISTANT,
        finishReason: this.mapFinishReason(data.stop_reason),
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
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
      throw new LLMError('Model is required for Anthropic', this.getProviderName());
    }

    if (!mergedConfig.maxTokens) {
      throw new LLMError('maxTokens is required for Anthropic', this.getProviderName());
    }

    const { messages: convertedMessages, system } = this.convertMessages(messages);

    const requestBody: AnthropicRequest = {
      model: mergedConfig.model,
      messages: convertedMessages,
      max_tokens: mergedConfig.maxTokens,
      temperature: mergedConfig.temperature,
      top_p: mergedConfig.topP,
      stop_sequences: mergedConfig.stop,
      ...(system && { system }),
      stream: true,
    };

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
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

          if (trimmed === '' || !trimmed.startsWith('data: ')) {
            continue;
          }

          const jsonStr = trimmed.slice(6);

          // Skip event type only lines
          if (jsonStr.startsWith('event:')) {
            continue;
          }

          try {
            const event: AnthropicStreamEvent = JSON.parse(jsonStr);

            // Content block delta - contains the actual text
            if (event.type === 'content_block_delta' && event.delta?.text) {
              yield {
                content: event.delta.text,
                isComplete: false,
              };
            }

            // Message delta with stop reason
            if (event.type === 'message_delta' && event.delta?.stop_reason) {
              yield {
                content: '',
                isComplete: true,
                finishReason: this.mapFinishReason(event.delta.stop_reason),
              };
            }

            // Message stop event
            if (event.type === 'message_stop') {
              yield {
                content: '',
                isComplete: true,
                finishReason: 'stop',
              };
            }
          } catch (error) {
            console.error('Failed to parse streaming chunk:', error);
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

  private convertMessages(messages: LLMMessage[]): {
    messages: AnthropicMessage[];
    system?: string;
  } {
    // Anthropic requires system messages to be passed separately
    let system: string | undefined;
    const converted: AnthropicMessage[] = [];

    for (const msg of messages) {
      if (msg.role === LLMRole.SYSTEM) {
        system = msg.content;
      } else if (msg.role === LLMRole.USER || msg.role === LLMRole.ASSISTANT) {
        converted.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    return { messages: converted, system };
  }

  private mapFinishReason(
    reason: string | null
  ): 'stop' | 'length' | 'content_filter' | 'tool_calls' | undefined {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'stop_sequence':
        return 'stop';
      default:
        return undefined;
    }
  }
}
