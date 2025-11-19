/**
 * Debug Types
 *
 * Type definitions for LLM debugging functionality
 */

/**
 * Intent analysis debug data
 */
export interface DebugIntent {
  type: string;
  confidence: number;
  entities: Record<string, unknown>;
}

/**
 * System context debug data
 */
export interface DebugSystemContext {
  systemPrompt: string;
  userFacts: string[];
  conversationHistory: Array<{
    role: string;
    content: string;
  }>;
}

/**
 * LLM request debug data
 */
export interface DebugLLMRequest {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  messages: Array<{
    role: string;
    content: string;
  }>;
  config: Record<string, unknown>;
}

/**
 * LLM response debug data
 */
export interface DebugLLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  model: string;
}

/**
 * Timing debug data
 */
export interface DebugTiming {
  intentParsing: number;
  contextBuilding: number;
  llmCall: number;
  total: number;
}

/**
 * Complete debug data structure
 */
export interface DebugData {
  intent: DebugIntent;
  systemContext: DebugSystemContext;
  llmRequest: DebugLLMRequest;
  llmResponse: DebugLLMResponse;
  timing: DebugTiming;
  timestamp: string;
}
