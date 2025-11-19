/**
 * Chat Validation Schemas
 *
 * Zod schemas for validating chat requests
 */

import { z } from 'zod';

/**
 * Send Chat Message Schema
 */
export const sendMessageSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'Message is required').max(2000, 'Message is too long'),
    conversationId: z.string().uuid('Invalid conversation ID').optional(),
    includeContext: z.boolean().optional(),
    debugMode: z.boolean().optional(),
  }),
});

/**
 * Get Conversation Context Schema
 */
export const getConversationContextSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid conversation ID format'),
  }),
});

/**
 * End Conversation Schema
 */
export const endConversationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid conversation ID format'),
  }),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type GetConversationContextInput = z.infer<typeof getConversationContextSchema>;
export type EndConversationInput = z.infer<typeof endConversationSchema>;
