/**
 * Admin Role Management Routes
 *
 * Handles role CRUD operations and capability assignments
 */

import { Router } from 'express';
import { PrismaClient as MainPrismaClient } from '../../generated/prisma-main';
import { getCapabilityService } from '../../services/capability.service';
import { getRoleService } from '../../services/role.service';
import type { Request, Response } from 'express';

const router = Router();
const roleService = getRoleService();
const capabilityService = getCapabilityService();
const prisma = new MainPrismaClient();

/**
 * GET /api/v1/admin/roles
 * List all roles with capability counts
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        capabilities: {
          include: {
            capability: true,
          },
        },
        users: {
          select: {
            userId: true,
          },
        },
        _count: {
          select: {
            capabilities: true,
            users: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.status(200).json({
      status: 'success',
      data: roles,
    });
  } catch (error) {
    console.error('Error listing roles:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list roles',
    });
  }
});

/**
 * GET /api/v1/admin/roles/:id
 * Get role by ID with full capabilities
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        capabilities: {
          include: {
            capability: true,
          },
        },
        users: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                isActive: true,
              },
            },
          },
        },
        _count: {
          select: {
            capabilities: true,
            users: true,
          },
        },
      },
    });

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
    console.error('Error getting role:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get role',
    });
  }
});

/**
 * POST /api/v1/admin/roles
 * Create new role
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      res.status(400).json({
        status: 'error',
        message: 'Role name is required',
      });
      return;
    }

    // Check if role name already exists
    const existingRole = await roleService.findByName(name);
    if (existingRole) {
      res.status(409).json({
        status: 'error',
        message: 'Role name already exists',
      });
      return;
    }

    const role = await roleService.create({ name, description });

    res.status(201).json({
      status: 'success',
      data: role,
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create role',
    });
  }
});

/**
 * PUT /api/v1/admin/roles/:id
 * Update role (name, description)
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Check if role exists
    const existingRole = await roleService.findById(id);
    if (!existingRole) {
      res.status(404).json({
        status: 'error',
        message: 'Role not found',
      });
      return;
    }

    // Check if it's a seeded role
    if (existingRole.isSeeded) {
      res.status(403).json({
        status: 'error',
        message: 'Cannot modify seeded roles',
      });
      return;
    }

    // If name is being changed, check if new name already exists
    if (name && name !== existingRole.name) {
      const roleWithName = await roleService.findByName(name);
      if (roleWithName) {
        res.status(409).json({
          status: 'error',
          message: 'Role name already exists',
        });
        return;
      }
    }

    const role = await roleService.update(id, { name, description });

    res.status(200).json({
      status: 'success',
      data: role,
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update role',
    });
  }
});

/**
 * DELETE /api/v1/admin/roles/:id
 * Delete role (check if used first)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if role exists
    const existingRole = await roleService.findById(id);
    if (!existingRole) {
      res.status(404).json({
        status: 'error',
        message: 'Role not found',
      });
      return;
    }

    // Check if it's a seeded role
    if (existingRole.isSeeded) {
      res.status(403).json({
        status: 'error',
        message: 'Cannot delete seeded roles',
      });
      return;
    }

    // Check if role is assigned to any users
    const users = await roleService.getUsersWithRole(id);
    if (users.length > 0) {
      res.status(400).json({
        status: 'error',
        message: `Cannot delete role. It is assigned to ${users.length} user(s)`,
        data: {
          userCount: users.length,
        },
      });
      return;
    }

    await roleService.delete(id);

    res.status(200).json({
      status: 'success',
      message: 'Role deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete role',
    });
  }
});

/**
 * GET /api/v1/admin/roles/:id/capabilities
 * Get role's capabilities
 */
router.get('/:id/capabilities', async (req: Request, res: Response) => {
  try {
    const { id: roleId } = req.params;

    // Check if role exists
    const role = await roleService.findById(roleId);
    if (!role) {
      res.status(404).json({
        status: 'error',
        message: 'Role not found',
      });
      return;
    }

    const capabilities = await capabilityService.getRoleCapabilities(roleId);

    res.status(200).json({
      status: 'success',
      data: capabilities,
    });
  } catch (error) {
    console.error('Error getting role capabilities:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get role capabilities',
    });
  }
});

/**
 * POST /api/v1/admin/roles/:id/capabilities
 * Assign capability to role
 */
router.post('/:id/capabilities', async (req: Request, res: Response) => {
  try {
    const { id: roleId } = req.params;
    const { capabilityId, isAllowed = true } = req.body;

    if (!capabilityId) {
      res.status(400).json({
        status: 'error',
        message: 'Capability ID is required',
      });
      return;
    }

    // Check if role exists
    const role = await roleService.findById(roleId);
    if (!role) {
      res.status(404).json({
        status: 'error',
        message: 'Role not found',
      });
      return;
    }

    // Check if capability exists
    const capability = await capabilityService.findById(capabilityId);
    if (!capability) {
      res.status(404).json({
        status: 'error',
        message: 'Capability not found',
      });
      return;
    }

    const assignment = await capabilityService.assignToRole(roleId, capabilityId, isAllowed);

    res.status(201).json({
      status: 'success',
      data: assignment,
    });
  } catch (error) {
    console.error('Error assigning capability:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to assign capability',
    });
  }
});

/**
 * DELETE /api/v1/admin/roles/:id/capabilities/:capabilityId
 * Remove capability from role
 */
router.delete('/:id/capabilities/:capabilityId', async (req: Request, res: Response) => {
  try {
    const { id: roleId, capabilityId } = req.params;

    // Check if role exists
    const role = await roleService.findById(roleId);
    if (!role) {
      res.status(404).json({
        status: 'error',
        message: 'Role not found',
      });
      return;
    }

    await capabilityService.removeFromRole(roleId, capabilityId);

    res.status(200).json({
      status: 'success',
      message: 'Capability removed successfully',
    });
  } catch (error) {
    console.error('Error removing capability:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to remove capability',
    });
  }
});

export default router;
