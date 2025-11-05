/**
 * Time Entry Validation Schemas
 *
 * Zod schemas for validating time entry requests
 */

import { z } from 'zod';

/**
 * Create Time Entry Schema
 */
export const createTimeEntrySchema = z.object({
  body: z
    .object({
      projectId: z.string().uuid('Invalid project ID format'),
      description: z.string().max(500, 'Description must be less than 500 characters').optional(),
      startTime: z
        .string()
        .datetime({ message: 'Invalid start time format' })
        .optional()
        .or(z.date().optional()),
      endTime: z
        .string()
        .datetime({ message: 'Invalid end time format' })
        .optional()
        .or(z.date().optional()),
      duration: z.number().int().positive('Duration must be positive').optional(),
    })
    .refine(
      (data) => {
        // If endTime is provided, startTime must also be provided
        if (data.endTime && !data.startTime) {
          return false;
        }
        return true;
      },
      {
        message: 'Start time is required when end time is provided',
        path: ['startTime'],
      }
    )
    .refine(
      (data) => {
        // If both times are provided, endTime must be after startTime
        if (data.startTime && data.endTime) {
          const start = new Date(data.startTime);
          const end = new Date(data.endTime);
          return end > start;
        }
        return true;
      },
      {
        message: 'End time must be after start time',
        path: ['endTime'],
      }
    ),
});

/**
 * Start Time Entry Schema
 */
export const startTimeEntrySchema = z.object({
  body: z.object({
    projectId: z.string().uuid('Invalid project ID format'),
    description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  }),
});

/**
 * Stop Time Entry Schema
 */
export const stopTimeEntrySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid time entry ID format'),
  }),
});

/**
 * Update Time Entry Schema
 */
export const updateTimeEntrySchema = z.object({
  body: z
    .object({
      description: z.string().max(500, 'Description must be less than 500 characters').optional(),
      startTime: z
        .string()
        .datetime({ message: 'Invalid start time format' })
        .optional()
        .or(z.date().optional()),
      endTime: z
        .string()
        .datetime({ message: 'Invalid end time format' })
        .optional()
        .or(z.date().optional()),
      duration: z.number().int().positive('Duration must be positive').optional(),
    })
    .refine(
      (data) => {
        // If both times are provided, endTime must be after startTime
        if (data.startTime && data.endTime) {
          const start = new Date(data.startTime);
          const end = new Date(data.endTime);
          return end > start;
        }
        return true;
      },
      {
        message: 'End time must be after start time',
        path: ['endTime'],
      }
    ),
  params: z.object({
    id: z.string().uuid('Invalid time entry ID format'),
  }),
});

/**
 * Get Time Entry by ID Schema
 */
export const getTimeEntryByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid time entry ID format'),
  }),
});

/**
 * Delete Time Entry Schema
 */
export const deleteTimeEntrySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid time entry ID format'),
  }),
  query: z.object({
    permanent: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
  }),
});

/**
 * List Time Entries Schema
 */
export const listTimeEntriesSchema = z.object({
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
    userId: z.string().uuid('Invalid user ID format').optional(),
    projectId: z.string().uuid('Invalid project ID format').optional(),
    startDate: z
      .string()
      .datetime({ message: 'Invalid start date format' })
      .optional()
      .transform((val) => (val ? new Date(val) : undefined)),
    endDate: z
      .string()
      .datetime({ message: 'Invalid end date format' })
      .optional()
      .transform((val) => (val ? new Date(val) : undefined)),
    includeDeleted: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
  }),
});

/**
 * Restore Time Entry Schema
 */
export const restoreTimeEntrySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid time entry ID format'),
  }),
});

/**
 * Total Hours Report Schema
 */
export const totalHoursReportSchema = z.object({
  query: z
    .object({
      startDate: z.string().datetime({ message: 'Invalid start date format' }),
      endDate: z.string().datetime({ message: 'Invalid end date format' }),
    })
    .refine(
      (data) => {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return end > start;
      },
      {
        message: 'End date must be after start date',
        path: ['endDate'],
      }
    ),
});

export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;
export type StartTimeEntryInput = z.infer<typeof startTimeEntrySchema>;
export type StopTimeEntryInput = z.infer<typeof stopTimeEntrySchema>;
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;
export type GetTimeEntryByIdInput = z.infer<typeof getTimeEntryByIdSchema>;
export type DeleteTimeEntryInput = z.infer<typeof deleteTimeEntrySchema>;
export type ListTimeEntriesInput = z.infer<typeof listTimeEntriesSchema>;
export type RestoreTimeEntryInput = z.infer<typeof restoreTimeEntrySchema>;
export type TotalHoursReportInput = z.infer<typeof totalHoursReportSchema>;
