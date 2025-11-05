/**
 * Admin Routes
 *
 * Handles role and capability management (admin only)
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/permission.middleware';
import { getCapabilityService } from '../services/capability.service';
import { getRoleService } from '../services/role.service';
import type { Request, Response } from 'express';

const router = Router();
const roleService = getRoleService();
const capabilityService = getCapabilityService();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireRole('admin'));

// ============================================================================
// Role Management
// ============================================================================

/**
 * GET /api/v1/admin/roles
 * List all roles
 */
router.get('/roles', async (_req: Request, res: Response) => {
  try {
    const roles = await roleService.list();

    res.status(200).json({
      status: 'success',
      data: roles,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to list roles',
    });
  }
});

/**
 * POST /api/v1/admin/roles
 * Create a new role
 */
router.post('/roles', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      res.status(400).json({
        status: 'error',
        message: 'Role name is required',
      });
      return;
    }

    const role = await roleService.create({ name, description });

    res.status(201).json({
      status: 'success',
      data: role,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to create role',
    });
  }
});

/**
 * GET /api/v1/admin/roles/:id
 * Get a specific role
 */
router.get('/roles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const role = await roleService.findById(id);

    if (!role) {
      res.status(404).json({
        status: 'error',
        message: 'Role not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: role,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get role',
    });
  }
});

/**
 * PATCH /api/v1/admin/roles/:id
 * Update a role
 */
router.patch('/roles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const role = await roleService.update(id, { name, description });

    res.status(200).json({
      status: 'success',
      data: role,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to update role',
    });
  }
});

/**
 * DELETE /api/v1/admin/roles/:id
 * Delete a role
 */
router.delete('/roles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await roleService.delete(id);

    res.status(200).json({
      status: 'success',
      message: 'Role deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete role',
    });
  }
});

// ============================================================================
// User-Role Assignment
// ============================================================================

/**
 * POST /api/v1/admin/users/:userId/roles
 * Assign role to user
 */
router.post('/users/:userId/roles', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      res.status(400).json({
        status: 'error',
        message: 'Role ID is required',
      });
      return;
    }

    const assignment = await roleService.assignToUser(userId, roleId);

    res.status(201).json({
      status: 'success',
      data: assignment,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'User already has this role') {
      res.status(409).json({
        status: 'error',
        message: 'User already has this role',
      });
      return;
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to assign role',
    });
  }
});

/**
 * DELETE /api/v1/admin/users/:userId/roles/:roleId
 * Remove role from user
 */
router.delete('/users/:userId/roles/:roleId', async (req: Request, res: Response) => {
  try {
    const { userId, roleId } = req.params;
    await roleService.removeFromUser(userId, roleId);

    res.status(200).json({
      status: 'success',
      message: 'Role removed successfully',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to remove role',
    });
  }
});

/**
 * GET /api/v1/admin/users/:userId/roles
 * Get user's roles
 */
router.get('/users/:userId/roles', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const roles = await roleService.getUserRoles(userId);

    res.status(200).json({
      status: 'success',
      data: roles,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user roles',
    });
  }
});

// ============================================================================
// Capability Management
// ============================================================================

/**
 * GET /api/v1/admin/capabilities
 * List all capabilities
 */
router.get('/capabilities', async (_req: Request, res: Response) => {
  try {
    const capabilities = await capabilityService.list();

    res.status(200).json({
      status: 'success',
      data: capabilities,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to list capabilities',
    });
  }
});

/**
 * POST /api/v1/admin/capabilities
 * Create a new capability
 */
router.post('/capabilities', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      res.status(400).json({
        status: 'error',
        message: 'Capability name is required',
      });
      return;
    }

    const capability = await capabilityService.create({ name, description });

    res.status(201).json({
      status: 'success',
      data: capability,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to create capability',
    });
  }
});

/**
 * POST /api/v1/admin/roles/:roleId/capabilities
 * Assign capability to role
 */
router.post('/roles/:roleId/capabilities', async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;
    const { capabilityId, allow = true } = req.body;

    if (!capabilityId) {
      res.status(400).json({
        status: 'error',
        message: 'Capability ID is required',
      });
      return;
    }

    const assignment = await capabilityService.assignToRole(roleId, capabilityId, allow);

    res.status(201).json({
      status: 'success',
      data: assignment,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to assign capability',
    });
  }
});

/**
 * DELETE /api/v1/admin/roles/:roleId/capabilities/:capabilityId
 * Remove capability from role
 */
router.delete('/roles/:roleId/capabilities/:capabilityId', async (req: Request, res: Response) => {
  try {
    const { roleId, capabilityId } = req.params;
    await capabilityService.removeFromRole(roleId, capabilityId);

    res.status(200).json({
      status: 'success',
      message: 'Capability removed successfully',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to remove capability',
    });
  }
});

/**
 * GET /api/v1/admin/roles/:roleId/capabilities
 * Get role's capabilities
 */
router.get('/roles/:roleId/capabilities', async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;
    const capabilities = await capabilityService.getRoleCapabilities(roleId);

    res.status(200).json({
      status: 'success',
      data: capabilities,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get role capabilities',
    });
  }
});

export default router;
