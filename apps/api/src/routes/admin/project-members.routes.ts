/**
 * Project Members Routes
 *
 * Manages user assignments to projects
 * Stored in tenant database
 */

import { Router } from 'express';
import type { PrismaClient as ClientPrismaClient } from '../../generated/prisma-client';
import type { Request, Response } from 'express';

const router = Router();

/**
 * GET /api/v1/admin/project-members
 * List all project members with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { page = '1', limit = '50', projectId, userId } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Build filter conditions
    const where: any = {};

    if (projectId) where.projectId = projectId as string;
    if (userId) where.userId = userId as string;

    const [members, total] = await Promise.all([
      (req.tenantDb as ClientPrismaClient).projectMember.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      (req.tenantDb as ClientPrismaClient).projectMember.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        members,
        pagination: {
          page: parseInt(page as string),
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    console.error('Error listing project members:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list project members',
    });
  }
});

/**
 * GET /api/v1/admin/project-members/project/:projectId
 * Get all members for a specific project
 */
router.get('/project/:projectId', async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { projectId } = req.params;

    const members = await (req.tenantDb as ClientPrismaClient).projectMember.findMany({
      where: { projectId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json({
      status: 'success',
      data: members,
    });
  } catch (error) {
    console.error('Error getting project members:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get project members',
    });
  }
});

/**
 * GET /api/v1/admin/project-members/user/:userId
 * Get all projects for a specific user
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { userId } = req.params;

    const members = await (req.tenantDb as ClientPrismaClient).projectMember.findMany({
      where: { userId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
            clientId: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: members,
    });
  } catch (error) {
    console.error('Error getting user projects:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user projects',
    });
  }
});

/**
 * POST /api/v1/admin/project-members
 * Add a user to a project
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { projectId, userId, isBillable } = req.body;

    // Validation
    if (!projectId || !userId) {
      res.status(400).json({
        status: 'error',
        message: 'projectId and userId are required',
      });
      return;
    }

    // Verify project exists
    const project = await (req.tenantDb as ClientPrismaClient).project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      res.status(404).json({
        status: 'error',
        message: 'Project not found',
      });
      return;
    }

    // Check if user is already a member
    const existingMember = await (req.tenantDb as ClientPrismaClient).projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (existingMember) {
      res.status(409).json({
        status: 'error',
        message: 'User is already a member of this project',
      });
      return;
    }

    // Create project member
    const member = await (req.tenantDb as ClientPrismaClient).projectMember.create({
      data: {
        projectId,
        userId,
        isBillable: isBillable !== undefined ? isBillable : project.defaultBillable,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    res.status(201).json({
      status: 'success',
      data: member,
      message: 'User added to project successfully',
    });
  } catch (error) {
    console.error('Error adding project member:', error);
    if (error instanceof Error) {
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to add project member',
    });
  }
});

/**
 * PUT /api/v1/admin/project-members/:id
 * Update project member settings
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { id } = req.params;
    const { isBillable } = req.body;

    // Check if member exists
    const existingMember = await (req.tenantDb as ClientPrismaClient).projectMember.findUnique({
      where: { id },
    });

    if (!existingMember) {
      res.status(404).json({
        status: 'error',
        message: 'Project member not found',
      });
      return;
    }

    // Update project member
    const member = await (req.tenantDb as ClientPrismaClient).projectMember.update({
      where: { id },
      data: {
        isBillable: isBillable !== undefined ? isBillable : undefined,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    res.status(200).json({
      status: 'success',
      data: member,
      message: 'Project member updated successfully',
    });
  } catch (error) {
    console.error('Error updating project member:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update project member',
    });
  }
});

/**
 * DELETE /api/v1/admin/project-members/:id
 * Remove a user from a project
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { id } = req.params;

    // Check if member exists
    const existingMember = await (req.tenantDb as ClientPrismaClient).projectMember.findUnique({
      where: { id },
    });

    if (!existingMember) {
      res.status(404).json({
        status: 'error',
        message: 'Project member not found',
      });
      return;
    }

    // Delete project member
    await (req.tenantDb as ClientPrismaClient).projectMember.delete({
      where: { id },
    });

    res.status(200).json({
      status: 'success',
      message: 'User removed from project successfully',
    });
  } catch (error) {
    console.error('Error removing project member:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to remove project member',
    });
  }
});

/**
 * POST /api/v1/admin/project-members/bulk
 * Add multiple users to a project at once
 */
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { projectId, userIds, isBillable } = req.body;

    // Validation
    if (!projectId || !Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'projectId and userIds array are required',
      });
      return;
    }

    // Verify project exists
    const project = await (req.tenantDb as ClientPrismaClient).project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      res.status(404).json({
        status: 'error',
        message: 'Project not found',
      });
      return;
    }

    // Get existing members to avoid duplicates
    const existingMembers = await (req.tenantDb as ClientPrismaClient).projectMember.findMany({
      where: {
        projectId,
        userId: { in: userIds },
      },
      select: { userId: true },
    });

    const existingUserIds = new Set(existingMembers.map((m: { userId: string }) => m.userId));
    const newUserIds = userIds.filter((userId) => !existingUserIds.has(userId));

    if (newUserIds.length === 0) {
      res.status(409).json({
        status: 'error',
        message: 'All users are already members of this project',
        data: {
          skipped: userIds.length,
          added: 0,
        },
      });
      return;
    }

    // Create project members
    const membersData = newUserIds.map((userId) => ({
      projectId,
      userId,
      isBillable: isBillable !== undefined ? isBillable : project.defaultBillable,
    }));

    await (req.tenantDb as ClientPrismaClient).projectMember.createMany({
      data: membersData,
    });

    res.status(201).json({
      status: 'success',
      message: `${newUserIds.length} user(s) added to project successfully`,
      data: {
        added: newUserIds.length,
        skipped: existingUserIds.size,
        total: userIds.length,
      },
    });
  } catch (error) {
    console.error('Error adding project members in bulk:', error);
    if (error instanceof Error) {
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to add project members',
    });
  }
});

export default router;
