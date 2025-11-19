/**
 * Google Gemini LLM Provider
 *
 * Implementation for Google Gemini models
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

interface GeminiContent {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    stopSequences?: string[];
  };
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
      role: string;
    };
    finishReason: string;
  }[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GeminiProvider extends BaseLLMProvider {
  private readonly baseUrl: string;

  constructor(config: LLMProviderConfig) {
    const capabilities: LLMProviderCapabilities = {
      supportsStreaming: true,
      supportsSystemMessages: true,
      supportsFunctionCalling: true,
      supportsVision: true,
      maxContextTokens: 1000000, // Gemini 1.5 Pro context window
    };

    super(config, capabilities);
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  }

  getProviderName(): string {
    return 'Google Gemini';
  }

  async validateConfig(): Promise<boolean> {
    if (!this.config.apiKey) {
      throw new LLMError('Google API key is required', this.getProviderName());
    }

    if (!this.config.defaultModel) {
      throw new LLMError('Default model is required for Gemini', this.getProviderName());
    }

    try {
      // Test the API key by making a simple request
      const response = await fetch(
        `${this.baseUrl}/models/${this.config.defaultModel}?key=${this.config.apiKey}`
      );

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
      throw new LLMError('Model is required for Gemini', this.getProviderName());
    }

    const requestBody: GeminiRequest = {
      contents: this.convertMessages(messages),
      generationConfig: {
        temperature: mergedConfig.temperature,
        maxOutputTokens: mergedConfig.maxTokens,
        topP: mergedConfig.topP,
        stopSequences: mergedConfig.stop,
      },
    };

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${mergedConfig.model}:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

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

      const data = (await response.json()) as GeminiResponse;

      const candidate = data.candidates[0];
      if (!candidate) {
        throw new LLMError('No response generated', this.getProviderName());
      }

      return {
        content: candidate.content.parts[0]?.text || '',
        role: LLMRole.ASSISTANT,
        finishReason: this.mapFinishReason(candidate.finishReason),
        usage: data.usageMetadata
          ? {
              promptTokens: data.usageMetadata.promptTokenCount,
              completionTokens: data.usageMetadata.candidatesTokenCount,
              totalTokens: data.usageMetadata.totalTokenCount,
            }
          : undefined,
        model: mergedConfig.model,
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
      throw new LLMError('Model is required for Gemini', this.getProviderName());
    }

    const requestBody: GeminiRequest = {
      contents: this.convertMessages(messages),
      generationConfig: {
        temperature: mergedConfig.temperature,
        maxOutputTokens: mergedConfig.maxTokens,
        topP: mergedConfig.topP,
        stopSequences: mergedConfig.stop,
      },
    };

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${mergedConfig.model}:streamGenerateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

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

          if (trimmed === '' || trimmed === ',') {
            continue;
          }

          // Gemini returns JSON array, need to parse each object
          try {
            const json: GeminiResponse = JSON.parse(trimmed.replace(/,$/, ''));
            const candidate = json.candidates[0];

            if (candidate?.content?.parts[0]?.text) {
              yield {
                content: candidate.content.parts[0].text,
                isComplete: false,
              };
            }

            if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
              yield {
                content: '',
                isComplete: true,
                finishReason: this.mapFinishReason(candidate.finishReason),
              };
            }
          } catch (error) {
            console.error('Failed to parse streaming chunk:', error);
          }
        }
      }

      yield {
        content: '',
        isComplete: true,
        finishReason: 'stop',
      };
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }
      this.handleError(error, 'Streaming request failed');
    }
  }

  private convertMessages(messages: LLMMessage[]): GeminiContent[] {
    // Import extractTextContent locally to avoid circular dependency issues
    const extractText = (content: string | import('../types').LLMContentPart[]): string => {
      if (typeof content === 'string') return content;
      return content
        .filter((part): part is import('../types').LLMTextContentPart => part.type === 'text')
        .map((part) => part.text)
        .join('\n');
    };

    // Gemini doesn't have a separate system role, merge system messages into user message
    const converted: GeminiContent[] = [];
    let systemMessage = '';

    for (const msg of messages) {
      const msgRole = String(msg.role);
      if (msgRole === LLMRole.SYSTEM || msgRole === 'system') {
        systemMessage += `${extractText(msg.content)}\n`;
      } else if (msgRole === LLMRole.USER || msgRole === 'user') {
        const textContent = extractText(msg.content);
        const content = systemMessage ? systemMessage + textContent : textContent;
        converted.push({
          role: 'user',
          parts: [{ text: content }],
        });
        systemMessage = '';
      } else {
        converted.push({
          role: 'model',
          parts: [{ text: extractText(msg.content) }],
        });
      }
    }

    return converted;
  }

  private mapFinishReason(
    reason: string | null
  ): 'stop' | 'length' | 'content_filter' | 'tool_calls' | undefined {
    switch (reason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
        return 'content_filter';
      default:
        return undefined;
    }
  }
}
