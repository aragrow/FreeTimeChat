/**
 * Compensation Validation Schemas
 *
 * Zod schemas for validating compensation requests
 */

import { z } from 'zod';

const compensationTypeEnum = z.enum(['SALARY_HCE', 'SALARY_WITH_OT', 'HOURLY']);

/**
 * Set Compensation Schema
 */
export const setCompensationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    compensationType: compensationTypeEnum,
    hourlyRate: z.number().min(0, 'Hourly rate must be non-negative').max(10000).optional(),
  }),
});

/**
 * Set Hourly Rate Schema
 */
export const setHourlyRateSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    hourlyRate: z.number().min(0, 'Hourly rate must be non-negative').max(10000),
  }),
});

/**
 * Get Compensation Schema
 */
export const getCompensationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
});

export type SetCompensationInput = z.infer<typeof setCompensationSchema>;
export type SetHourlyRateInput = z.infer<typeof setHourlyRateSchema>;
export type GetCompensationInput = z.infer<typeof getCompensationSchema>;
