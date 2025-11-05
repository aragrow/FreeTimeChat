/**
 * Project Validation Schemas
 *
 * Zod schemas for validating project-related requests
 */

import { z } from 'zod';

/**
 * Create Project Schema
 */
export const createProjectSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, 'Project name is required')
      .max(255, 'Project name must be less than 255 characters')
      .trim(),
    description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
    startDate: z
      .string()
      .datetime({ message: 'Invalid start date format' })
      .optional()
      .or(z.date().optional()),
    endDate: z
      .string()
      .datetime({ message: 'Invalid end date format' })
      .optional()
      .or(z.date().optional()),
    isBillableProject: z.boolean().optional(),
    defaultBillable: z.boolean().optional(),
  }),
});

/**
 * Update Project Schema
 */
export const updateProjectSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, 'Project name cannot be empty')
      .max(255, 'Project name must be less than 255 characters')
      .trim()
      .optional(),
    description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
    isActive: z.boolean().optional(),
    startDate: z
      .string()
      .datetime({ message: 'Invalid start date format' })
      .optional()
      .or(z.date().optional()),
    endDate: z
      .string()
      .datetime({ message: 'Invalid end date format' })
      .optional()
      .or(z.date().optional()),
    isBillableProject: z.boolean().optional(),
    defaultBillable: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid project ID format'),
  }),
});

/**
 * Get Project by ID Schema
 */
export const getProjectByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID format'),
  }),
});

/**
 * Delete Project Schema
 */
export const deleteProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID format'),
  }),
  query: z.object({
    permanent: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
  }),
});

/**
 * List Projects Schema
 */
export const listProjectsSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20)),
    isActive: z
      .string()
      .optional()
      .transform((val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return undefined;
      }),
    includeDeleted: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
  }),
});

/**
 * Restore Project Schema
 */
export const restoreProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID format'),
  }),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type GetProjectByIdInput = z.infer<typeof getProjectByIdSchema>;
export type DeleteProjectInput = z.infer<typeof deleteProjectSchema>;
export type ListProjectsInput = z.infer<typeof listProjectsSchema>;
export type RestoreProjectInput = z.infer<typeof restoreProjectSchema>;
