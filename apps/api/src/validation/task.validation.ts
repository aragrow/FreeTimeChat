/**
 * Task Validation Schemas
 *
 * Zod schemas for validating task requests
 */

import { z } from 'zod';

const taskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED']);
const taskPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

/**
 * Create Task Schema
 */
export const createTaskSchema = z.object({
  body: z.object({
    projectId: z.string().uuid('Invalid project ID format'),
    title: z
      .string()
      .min(1, 'Task title is required')
      .max(255, 'Title must be less than 255 characters')
      .trim(),
    description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
    status: taskStatusEnum.optional(),
    priority: taskPriorityEnum.optional(),
    assignedToUserId: z.string().uuid('Invalid user ID format').optional(),
    dueDate: z
      .string()
      .datetime({ message: 'Invalid due date format' })
      .optional()
      .or(z.date().optional()),
  }),
});

/**
 * Update Task Schema
 */
export const updateTaskSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, 'Task title cannot be empty')
      .max(255, 'Title must be less than 255 characters')
      .trim()
      .optional(),
    description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
    status: taskStatusEnum.optional(),
    priority: taskPriorityEnum.optional(),
    assignedToUserId: z.string().uuid('Invalid user ID format').optional(),
    dueDate: z
      .string()
      .datetime({ message: 'Invalid due date format' })
      .optional()
      .or(z.date().optional()),
  }),
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
});

/**
 * Get Task by ID Schema
 */
export const getTaskByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
});

/**
 * Delete Task Schema
 */
export const deleteTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
});

/**
 * List Tasks Schema
 */
export const listTasksSchema = z.object({
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
    projectId: z.string().uuid('Invalid project ID format').optional(),
    status: taskStatusEnum.optional(),
    priority: taskPriorityEnum.optional(),
    assignedToUserId: z.string().uuid('Invalid user ID format').optional(),
  }),
});

/**
 * Assign Task Schema
 */
export const assignTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
  body: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

/**
 * Unassign Task Schema
 */
export const unassignTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
});

/**
 * Update Task Status Schema
 */
export const updateTaskStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
  body: z.object({
    status: taskStatusEnum,
  }),
});

/**
 * Update Task Priority Schema
 */
export const updateTaskPrioritySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
  body: z.object({
    priority: taskPriorityEnum,
  }),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type GetTaskByIdInput = z.infer<typeof getTaskByIdSchema>;
export type DeleteTaskInput = z.infer<typeof deleteTaskSchema>;
export type ListTasksInput = z.infer<typeof listTasksSchema>;
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;
export type UnassignTaskInput = z.infer<typeof unassignTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
export type UpdateTaskPriorityInput = z.infer<typeof updateTaskPrioritySchema>;
