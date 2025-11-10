/**
 * Admin User Management Routes
 *
 * Handles user CRUD operations and role assignments
 */

import { Router } from 'express';
import { PrismaClient as MainPrismaClient } from '../../generated/prisma-main';
import { getImpersonationService } from '../../services/impersonation.service';
import { getPasswordService } from '../../services/password.service';
import { getRoleService } from '../../services/role.service';
import { getUserService } from '../../services/user.service';
import type { JWTPayload } from '@freetimechat/types';
import type { Request, Response } from 'express';

const router = Router();
const userService = getUserService();
const roleService = getRoleService();
const impersonationService = getImpersonationService();
const passwordService = getPasswordService();
const prisma = new MainPrismaClient();

/**
 * GET /api/v1/admin/users
 * List all users with pagination, search, and filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string; // 'active', 'inactive', 'deleted', 'all'
    const clientId = req.query.clientId as string;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Tenant filtering: tenantadmin users can only see users from their own tenant
    const currentUser = req.user as JWTPayload;
    const userRoles = currentUser.roles || [];
    const isTenantAdmin = userRoles.includes('tenantadmin');
    const isAdmin = userRoles.includes('admin');

    // If user is tenantadmin (not admin), filter by their tenant
    if (isTenantAdmin && !isAdmin && currentUser.tenantId) {
      where.tenantId = currentUser.tenantId;
    }

    // Search filter
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Status filter
    if (status === 'active') {
      where.isActive = true;
      where.deletedAt = null;
    } else if (status === 'inactive') {
      where.isActive = false;
      where.deletedAt = null;
    } else if (status === 'deleted') {
      where.deletedAt = { not: null };
    }
    // 'all' or undefined = no status filter

    // Client filter (only for admin users)
    if (clientId && isAdmin) {
      where.tenantId = clientId;
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          roles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list users',
    });
  }
});

/**
 * GET /api/v1/admin/users/:id
 * Get user by ID with full details including roles and capabilities
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        tenant: true,
        roles: {
          include: {
            role: {
              include: {
                capabilities: {
                  include: {
                    capability: true,
                  },
                },
              },
            },
          },
        },
        refreshTokens: {
          where: {
            expiresAt: { gt: new Date() },
          },
          select: {
            id: true,
            expiresAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: user,
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user',
    });
  }
});

/**
 * POST /api/v1/admin/users
 * Create new user (admin can create users for any client)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, name, password, clientId, roleIds } = req.body;

    // Validate required fields
    if (!email || !name) {
      res.status(400).json({
        status: 'error',
        message: 'Email and name are required',
      });
      return;
    }

    // Check if email already exists
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      res.status(409).json({
        status: 'error',
        message: 'Email already in use',
      });
      return;
    }

    // Verify client exists if provided
    if (clientId) {
      const client = await prisma.tenant.findUnique({
        where: { id: clientId },
      });

      if (!client) {
        res.status(404).json({
          status: 'error',
          message: 'Client not found',
        });
        return;
      }
    }

    // Hash password if provided
    let passwordHash: string | undefined;
    if (password) {
      passwordHash = await passwordService.hash(password);
    }

    // Create user (tenantId can be null for system admins)
    const user = await userService.create({
      email,
      name,
      passwordHash,
      tenantId: clientId || null,
    });

    // Assign roles if provided
    if (roleIds && Array.isArray(roleIds) && roleIds.length > 0) {
      for (const roleId of roleIds) {
        try {
          await roleService.assignToUser(user.id, roleId);
        } catch (error) {
          console.warn(`Failed to assign role ${roleId} to user ${user.id}:`, error);
        }
      }
    }

    // Fetch user with roles
    const userWithRoles = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        tenant: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    res.status(201).json({
      status: 'success',
      data: userWithRoles,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create user',
    });
  }
});

/**
 * PUT /api/v1/admin/users/:id
 * Update user details
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, password, isActive, twoFactorEnabled, trackingMode, roleIds } = req.body;

    // Check if user exists
    const existingUser = await userService.findById(id);
    if (!existingUser) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (twoFactorEnabled !== undefined) updateData.twoFactorEnabled = twoFactorEnabled;
    if (trackingMode !== undefined) updateData.trackingMode = trackingMode;

    // Hash password if provided
    if (password) {
      updateData.passwordHash = await passwordService.hash(password);
    }

    // Update user
    const _user = await userService.update(id, updateData);

    // Update roles if provided
    if (roleIds !== undefined && Array.isArray(roleIds)) {
      // Get current roles
      const currentRoles = await roleService.getUserRoles(id);
      const currentRoleIds = currentRoles.map((r) => r.id);

      // Determine which roles to add and remove
      const rolesToAdd = roleIds.filter((roleId: string) => !currentRoleIds.includes(roleId));
      const rolesToRemove = currentRoleIds.filter((roleId) => !roleIds.includes(roleId));

      // Add new roles
      for (const roleId of rolesToAdd) {
        try {
          await roleService.assignToUser(id, roleId);
        } catch (error) {
          console.warn(`Failed to assign role ${roleId} to user ${id}:`, error);
        }
      }

      // Remove old roles
      for (const roleId of rolesToRemove) {
        try {
          await roleService.removeFromUser(id, roleId);
        } catch (error) {
          console.warn(`Failed to remove role ${roleId} from user ${id}:`, error);
        }
      }
    }

    // Fetch updated user with roles
    const updatedUser = await prisma.user.findUnique({
      where: { id },
      include: {
        tenant: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    res.status(200).json({
      status: 'success',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update user',
    });
  }
});

/**
 * DELETE /api/v1/admin/users/:id
 * Soft delete user (set isActive = false and deletedAt)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await userService.findById(id);
    if (!existingUser) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    // Prevent deleting self
    const currentUser = req.user as JWTPayload;
    if (currentUser.sub === id) {
      res.status(400).json({
        status: 'error',
        message: 'Cannot delete your own account',
      });
      return;
    }

    // Soft delete user
    const user = await userService.softDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully',
      data: user,
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete user',
    });
  }
});

/**
 * POST /api/v1/admin/users/impersonate/stop
 * Stop impersonation session
 * NOTE: This route MUST come before /:id/impersonate to avoid matching 'impersonate' as an ID
 */
router.post('/impersonate/stop', async (req: Request, res: Response) => {
  try {
    const currentUser = req.user as JWTPayload;

    // Check if user is currently impersonating
    if (!currentUser.impersonation?.sessionId) {
      res.status(400).json({
        status: 'error',
        message: 'No active impersonation session',
      });
      return;
    }

    // Get the admin user ID from impersonation metadata
    const adminUserId = currentUser.impersonation.adminUserId;

    // Stop impersonation
    await impersonationService.stopImpersonation(currentUser.impersonation.sessionId);

    // Get the admin user to generate a new token
    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      include: { tenant: true },
    });

    if (!adminUser) {
      res.status(404).json({
        status: 'error',
        message: 'Admin user not found',
      });
      return;
    }

    // Get admin roles
    const adminRoles = await roleService.getUserRoles(adminUserId);
    const primaryRole = adminRoles.length > 0 ? adminRoles[0] : 'user';

    // Generate new access token for admin
    const { getJWTService } = await import('../../services/jwt.service');
    const jwtService = getJWTService();
    const accessToken = jwtService.signAccessToken({
      userId: adminUserId,
      email: adminUser.email,
      role: primaryRole,
      roles: adminRoles.length > 0 ? adminRoles : ['user'],
      tenantId: adminUser.tenantId || 'system',
      databaseName: adminUser.tenant?.databaseName || 'freetimechat_customer_dev',
    });

    res.status(200).json({
      status: 'success',
      message: 'Impersonation session stopped',
      data: {
        accessToken,
      },
    });
  } catch (error) {
    console.error('Error stopping impersonation:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to stop impersonation',
    });
  }
});

/**
 * POST /api/v1/admin/users/:id/impersonate
 * Start impersonation session for a user
 */
router.post('/:id/impersonate', async (req: Request, res: Response) => {
  try {
    const { id: targetUserId } = req.params;
    const currentUser = req.user as JWTPayload;
    const adminUserId = currentUser.sub;

    // Check if user exists
    const targetUser = await userService.findById(targetUserId);
    if (!targetUser) {
      res.status(404).json({
        status: 'error',
        message: 'Target user not found',
      });
      return;
    }

    // Tenant filtering: tenantadmin users can only impersonate users from their own tenant
    const userRoles = currentUser.roles || [];
    const isTenantAdmin = userRoles.includes('tenantadmin');
    const isAdmin = userRoles.includes('admin');

    // If user is tenantadmin (not admin), check if target user is from their tenant
    if (isTenantAdmin && !isAdmin) {
      if (!currentUser.tenantId) {
        res.status(403).json({
          status: 'error',
          message: 'You must belong to a tenant to impersonate users',
        });
        return;
      }

      if (targetUser.tenantId !== currentUser.tenantId) {
        res.status(403).json({
          status: 'error',
          message: 'You can only impersonate users from your own tenant',
        });
        return;
      }
    }

    // Prevent impersonating yourself
    if (adminUserId === targetUserId) {
      res.status(400).json({
        status: 'error',
        message: 'Cannot impersonate yourself',
      });
      return;
    }

    // Start impersonation
    const result = await impersonationService.startImpersonation(adminUserId, targetUserId);

    res.status(200).json({
      status: 'success',
      data: {
        accessToken: result.accessToken,
        session: result.session,
        targetUser: {
          id: targetUser.id,
          email: targetUser.email,
          name: targetUser.name,
        },
      },
    });
  } catch (error) {
    console.error('Error starting impersonation:', error);
    if (error instanceof Error) {
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to start impersonation',
    });
  }
});

/**
 * GET /api/v1/admin/users/:id/roles
 * Get user's roles
 */
router.get('/:id/roles', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await userService.findById(id);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    const roles = await roleService.getUserRoles(id);

    res.status(200).json({
      status: 'success',
      data: roles,
    });
  } catch (error) {
    console.error('Error getting user roles:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user roles',
    });
  }
});

/**
 * POST /api/v1/admin/users/:id/roles
 * Assign role to user
 */
router.post('/:id/roles', async (req: Request, res: Response) => {
  try {
    const { id: userId } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      res.status(400).json({
        status: 'error',
        message: 'Role ID is required',
      });
      return;
    }

    // Check if user exists
    const user = await userService.findById(userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
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

    console.error('Error assigning role:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to assign role',
    });
  }
});

/**
 * DELETE /api/v1/admin/users/:id/roles/:roleId
 * Remove role from user
 */
router.delete('/:id/roles/:roleId', async (req: Request, res: Response) => {
  try {
    const { id: userId, roleId } = req.params;

    // Check if user exists
    const user = await userService.findById(userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    await roleService.removeFromUser(userId, roleId);

    res.status(200).json({
      status: 'success',
      message: 'Role removed successfully',
    });
  } catch (error) {
    console.error('Error removing role:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to remove role',
    });
  }
});

export default router;
