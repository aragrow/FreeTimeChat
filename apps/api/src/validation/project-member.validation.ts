/**
 * Project Member Validation Schemas
 *
 * Zod schemas for validating project member requests
 */

import { z } from 'zod';

/**
 * Assign User to Project Schema
 */
export const assignUserToProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID format'),
  }),
  body: z.object({
    userId: z.string().uuid('Invalid user ID format'),
    isBillable: z.boolean().optional(),
  }),
});

/**
 * Bulk Assign Users to Project Schema
 */
export const bulkAssignUsersSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID format'),
  }),
  body: z.object({
    userIds: z
      .array(z.string().uuid('Invalid user ID format'))
      .min(1, 'At least one user is required'),
    isBillable: z.boolean().optional(),
  }),
});

/**
 * Update Project Member Billability Schema
 */
export const updateMemberBillabilitySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID format'),
    userId: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    isBillable: z.boolean().nullable(),
  }),
});

/**
 * Remove User from Project Schema
 */
export const removeUserFromProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID format'),
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

/**
 * Get Project Members Schema
 */
export const getProjectMembersSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID format'),
  }),
});

/**
 * Get User Projects Schema
 */
export const getUserProjectsSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

/**
 * Get Effective Billability Schema
 */
export const getEffectiveBillabilitySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID format'),
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

export type AssignUserToProjectInput = z.infer<typeof assignUserToProjectSchema>;
export type BulkAssignUsersInput = z.infer<typeof bulkAssignUsersSchema>;
export type UpdateMemberBillabilityInput = z.infer<typeof updateMemberBillabilitySchema>;
export type RemoveUserFromProjectInput = z.infer<typeof removeUserFromProjectSchema>;
export type GetProjectMembersInput = z.infer<typeof getProjectMembersSchema>;
export type GetUserProjectsInput = z.infer<typeof getUserProjectsSchema>;
export type GetEffectiveBillabilityInput = z.infer<typeof getEffectiveBillabilitySchema>;
