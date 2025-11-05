/**
 * Chat Type Definitions
 *
 * Types for chat conversations and messages
 */

/**
 * Conversation entity
 */
export interface Conversation {
  id: string;
  userId: string;
  title?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  messages?: Message[];
}

/**
 * Message entity
 */
export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata?: MessageMetadata;
  embedding?: number[]; // Vector embedding for semantic search
  createdAt: Date;
}

/**
 * Message role
 */
export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

/**
 * Message metadata
 */
export interface MessageMetadata {
  intent?: string;
  entities?: Record<string, any>;
  confidence?: number;
  [key: string]: any;
}

/**
 * Chat request
 */
export interface ChatRequest {
  conversationId?: string;
  message: string;
}

/**
 * Chat response
 */
export interface ChatResponse {
  conversationId: string;
  message: Message;
  suggestions?: string[];
}

/**
 * Create conversation request
 */
export interface CreateConversationRequest {
  title?: string;
}
