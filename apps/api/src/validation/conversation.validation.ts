/**
 * Conversation Validation Schemas
 *
 * Zod schemas for validating conversation and message requests
 */

import { z } from 'zod';

const messageRoleEnum = z.enum(['USER', 'ASSISTANT', 'SYSTEM']);

/**
 * Create Conversation Schema
 */
export const createConversationSchema = z.object({
  body: z.object({
    title: z.string().max(255, 'Title must be less than 255 characters').optional(),
  }),
});

/**
 * Update Conversation Schema
 */
export const updateConversationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid conversation ID format'),
  }),
  body: z.object({
    title: z.string().max(255, 'Title must be less than 255 characters').optional(),
    isActive: z.boolean().optional(),
  }),
});

/**
 * Get Conversation by ID Schema
 */
export const getConversationByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid conversation ID format'),
  }),
});

/**
 * Delete Conversation Schema
 */
export const deleteConversationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid conversation ID format'),
  }),
});

/**
 * List Conversations Schema
 */
export const listConversationsSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20))
      .pipe(z.number().int().positive().max(100).default(20)),
    isActive: z
      .string()
      .optional()
      .transform((val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return undefined;
      }),
  }),
});

/**
 * Add Message to Conversation Schema
 */
export const addMessageSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid conversation ID format'),
  }),
  body: z.object({
    content: z.string().min(1, 'Message content is required').max(10000, 'Message too long'),
    role: messageRoleEnum.optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

/**
 * Get Messages Schema
 */
export const getMessagesSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid conversation ID format'),
  }),
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 50))
      .pipe(z.number().int().positive().max(100).default(50)),
    role: messageRoleEnum.optional(),
    fromDate: z
      .string()
      .datetime({ message: 'Invalid from date format' })
      .optional()
      .transform((val) => (val ? new Date(val) : undefined)),
    toDate: z
      .string()
      .datetime({ message: 'Invalid to date format' })
      .optional()
      .transform((val) => (val ? new Date(val) : undefined)),
  }),
});

/**
 * Search Messages Schema
 */
export const searchMessagesSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid conversation ID format'),
  }),
  query: z.object({
    q: z.string().min(1, 'Search query is required'),
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20))
      .pipe(z.number().int().positive().max(100).default(20)),
  }),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type GetConversationByIdInput = z.infer<typeof getConversationByIdSchema>;
export type DeleteConversationInput = z.infer<typeof deleteConversationSchema>;
export type ListConversationsInput = z.infer<typeof listConversationsSchema>;
export type AddMessageInput = z.infer<typeof addMessageSchema>;
export type GetMessagesInput = z.infer<typeof getMessagesSchema>;
export type SearchMessagesInput = z.infer<typeof searchMessagesSchema>;
