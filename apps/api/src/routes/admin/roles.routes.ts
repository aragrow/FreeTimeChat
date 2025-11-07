/**
 * Admin Role Management Routes
 *
 * Handles role CRUD operations and capability assignments
 * Uses RoleController for better separation of concerns
 */

import { Router } from 'express';
import { RoleController } from '../../controllers/role.controller';

const router = Router();
const controller = new RoleController();

/**
 * @route   GET /api/v1/admin/roles/statistics
 * @desc    Get role statistics
 * @access  Admin only
 */
router.get('/statistics', controller.getStatistics.bind(controller));

/**
 * @route   GET /api/v1/admin/roles
 * @desc    Get all roles with optional filtering
 * @access  Admin only
 * @query   search - Search by name or description
 * @query   hasCapability - Filter by capability name
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20)
 */
router.get('/', controller.getAll.bind(controller));

/**
 * @route   GET /api/v1/admin/roles/:id
 * @desc    Get role by ID with full capability details
 * @access  Admin only
 */
router.get('/:id', controller.getById.bind(controller));

/**
 * @route   POST /api/v1/admin/roles
 * @desc    Create new role
 * @access  Admin only
 * @body    { name, description?, capabilityIds?: string[] }
 */
router.post('/', controller.create.bind(controller));

/**
 * @route   PUT /api/v1/admin/roles/:id
 * @desc    Update role
 * @access  Admin only
 * @body    { name?, description?, capabilityIds?: string[] }
 */
router.put('/:id', controller.update.bind(controller));

/**
 * @route   POST /api/v1/admin/roles/:id/capabilities
 * @desc    Assign capabilities to role
 * @access  Admin only
 * @body    { capabilityIds: string[] }
 */
router.post('/:id/capabilities', controller.assignCapabilities.bind(controller));

/**
 * @route   DELETE /api/v1/admin/roles/:id/capabilities/:capabilityId
 * @desc    Remove capability from role
 * @access  Admin only
 */
router.delete('/:id/capabilities/:capabilityId', controller.removeCapability.bind(controller));

/**
 * @route   PATCH /api/v1/admin/roles/:id/capabilities/:capabilityId
 * @desc    Toggle capability allow/deny for role
 * @access  Admin only
 * @body    { isAllowed: boolean }
 */
router.patch('/:id/capabilities/:capabilityId', controller.toggleCapability.bind(controller));

/**
 * @route   DELETE /api/v1/admin/roles/:id
 * @desc    Delete role
 * @access  Admin only
 * @warning Cannot delete seeded roles or roles with assigned users
 */
router.delete('/:id', controller.delete.bind(controller));

export default router;
