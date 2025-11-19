/**
 * Rating Validation Schemas
 *
 * Phase 5: Validation for rating endpoints
 */

import { z } from 'zod';

export const createRatingSchema = z.object({
  body: z.object({
    ratingType: z.enum(['PREVIEW', 'REPORT']),
    rating: z.enum(['BAD', 'OK', 'GOOD']),
    feedback: z.string().max(2000).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
  params: z.object({
    messageId: z.string().uuid(),
  }),
});

export const getRatingsSchema = z.object({
  params: z.object({
    messageId: z.string().uuid(),
  }),
});

export const getRatingAnalyticsSchema = z.object({
  query: z.object({
    ratingType: z.enum(['PREVIEW', 'REPORT']).optional(),
  }),
});

export type CreateRatingInput = z.infer<typeof createRatingSchema>;
export type GetRatingsInput = z.infer<typeof getRatingsSchema>;
export type GetRatingAnalyticsInput = z.infer<typeof getRatingAnalyticsSchema>;
