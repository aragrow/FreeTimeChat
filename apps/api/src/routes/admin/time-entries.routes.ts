/**
 * Time Entry Routes
 *
 * Manages time tracking entries for projects
 * Stored in tenant database
 */

import { Router } from 'express';
import type { PrismaClient as ClientPrismaClient } from '../../generated/prisma-client';
import type { Request, Response } from 'express';

const router = Router();

/**
 * GET /api/v1/admin/time-entries
 * List all time entries with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const {
      page = '1',
      limit = '20',
      projectId,
      userId,
      startDate,
      endDate,
      isBillable,
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Build filter conditions
    const where: any = {
      deletedAt: null,
    };

    // RBAC: Regular users can only see their own entries
    // Tenant admins and system admins can see all entries in the tenant
    const isAdmin = req.user?.roles?.includes('admin');
    const isTenantAdmin = req.user?.roles?.includes('tenantadmin');
    const isRegularUser = !isAdmin && !isTenantAdmin;

    if (isRegularUser) {
      where.userId = req.user?.sub;
    }

    if (projectId) where.projectId = projectId as string;
    // Allow filtering by userId only for admins
    if (userId && (isAdmin || isTenantAdmin)) where.userId = userId as string;
    if (isBillable !== undefined) where.isBillable = isBillable === 'true';

    // Date range filter
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate as string);
      if (endDate) where.startTime.lte = new Date(endDate as string);
    }

    const [entries, total] = await Promise.all([
      (req.clientDb as ClientPrismaClient).timeEntry.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              clientId: true,
              isBillableProject: true,
              hourlyRate: true,
            },
          },
        },
        orderBy: { startTime: 'desc' },
        skip,
        take,
      }),
      (req.clientDb as ClientPrismaClient).timeEntry.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        entries,
        pagination: {
          page: parseInt(page as string),
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    console.error('Error listing time entries:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list time entries',
    });
  }
});

/**
 * GET /api/v1/admin/time-entries/:id
 * Get time entry by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { id } = req.params;

    const entry = await (req.clientDb as ClientPrismaClient).timeEntry.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            clientId: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
            isBillableProject: true,
            hourlyRate: true,
          },
        },
      },
    });

    if (!entry) {
      res.status(404).json({
        status: 'error',
        message: 'Time entry not found',
      });
      return;
    }

    // RBAC: Regular users can only see their own entries
    const isAdmin = req.user?.roles?.includes('admin');
    const isTenantAdmin = req.user?.roles?.includes('tenantadmin');
    const isRegularUser = !isAdmin && !isTenantAdmin;

    if (isRegularUser && entry.userId !== req.user?.sub) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied: You can only view your own time entries',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: entry,
    });
  } catch (error) {
    console.error('Error getting time entry:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get time entry',
    });
  }
});

/**
 * POST /api/v1/admin/time-entries
 * Create new time entry
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const {
      userId,
      projectId,
      description,
      startTime,
      endTime,
      duration,
      regularHours,
      overtimeHours,
      weekStartDate,
      isBillable = true,
    } = req.body;

    // RBAC: Regular users can only create entries for themselves
    const isAdmin = req.user?.roles?.includes('admin');
    const isTenantAdmin = req.user?.roles?.includes('tenantadmin');
    const isRegularUser = !isAdmin && !isTenantAdmin;

    // Determine the userId for the entry
    const entryUserId = isRegularUser ? req.user?.sub : userId || req.user?.sub;

    // Validation
    if (!entryUserId || !projectId || !startTime) {
      res.status(400).json({
        status: 'error',
        message: 'projectId and startTime are required',
      });
      return;
    }

    // Verify project exists
    const project = await (req.clientDb as ClientPrismaClient).project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      res.status(404).json({
        status: 'error',
        message: 'Project not found',
      });
      return;
    }

    // Calculate duration if not provided but endTime is
    let calculatedDuration = duration;
    if (!duration && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      calculatedDuration = Math.floor((end.getTime() - start.getTime()) / 1000); // duration in seconds
    }

    // Create time entry
    const entry = await (req.clientDb as ClientPrismaClient).timeEntry.create({
      data: {
        userId: entryUserId,
        projectId,
        description: description?.trim() || null,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        duration: calculatedDuration || null,
        regularHours: regularHours ? parseFloat(regularHours) : null,
        overtimeHours: overtimeHours ? parseFloat(overtimeHours) : null,
        weekStartDate: weekStartDate ? new Date(weekStartDate) : null,
        isBillable,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            hourlyRate: true,
          },
        },
      },
    });

    res.status(201).json({
      status: 'success',
      data: entry,
      message: 'Time entry created successfully',
    });
  } catch (error) {
    console.error('Error creating time entry:', error);
    if (error instanceof Error) {
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to create time entry',
    });
  }
});

/**
 * PUT /api/v1/admin/time-entries/:id
 * Update time entry
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { id } = req.params;
    const {
      projectId,
      description,
      startTime,
      endTime,
      duration,
      regularHours,
      overtimeHours,
      weekStartDate,
      isBillable,
    } = req.body;

    // Check if entry exists
    const existingEntry = await (req.clientDb as ClientPrismaClient).timeEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      res.status(404).json({
        status: 'error',
        message: 'Time entry not found',
      });
      return;
    }

    // RBAC: Regular users can only update their own entries
    const isAdmin = req.user?.roles?.includes('admin');
    const isTenantAdmin = req.user?.roles?.includes('tenantadmin');
    const isRegularUser = !isAdmin && !isTenantAdmin;

    if (isRegularUser && existingEntry.userId !== req.user?.sub) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied: You can only update your own time entries',
      });
      return;
    }

    // Build update data
    const updateData: any = {};

    if (projectId !== undefined) {
      // Verify project exists
      const project = await (req.clientDb as ClientPrismaClient).project.findUnique({
        where: { id: projectId },
      });
      if (!project) {
        res.status(404).json({
          status: 'error',
          message: 'Project not found',
        });
        return;
      }
      updateData.projectId = projectId;
    }

    if (description !== undefined) updateData.description = description?.trim() || null;
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = endTime ? new Date(endTime) : null;

    // Recalculate duration if start or end time changed
    if (startTime !== undefined || endTime !== undefined) {
      const start = new Date(startTime || existingEntry.startTime);
      const end = endTime ? new Date(endTime) : existingEntry.endTime;
      if (end) {
        updateData.duration = Math.floor((end.getTime() - start.getTime()) / 1000);
      }
    } else if (duration !== undefined) {
      updateData.duration = duration;
    }

    if (regularHours !== undefined)
      updateData.regularHours = regularHours ? parseFloat(regularHours) : null;
    if (overtimeHours !== undefined)
      updateData.overtimeHours = overtimeHours ? parseFloat(overtimeHours) : null;
    if (weekStartDate !== undefined)
      updateData.weekStartDate = weekStartDate ? new Date(weekStartDate) : null;
    if (isBillable !== undefined) updateData.isBillable = isBillable;

    // Update time entry
    const entry = await (req.clientDb as ClientPrismaClient).timeEntry.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            hourlyRate: true,
          },
        },
      },
    });

    res.status(200).json({
      status: 'success',
      data: entry,
      message: 'Time entry updated successfully',
    });
  } catch (error) {
    console.error('Error updating time entry:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update time entry',
    });
  }
});

/**
 * DELETE /api/v1/admin/time-entries/:id
 * Soft delete time entry
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { id } = req.params;

    // Check if entry exists
    const existingEntry = await (req.clientDb as ClientPrismaClient).timeEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      res.status(404).json({
        status: 'error',
        message: 'Time entry not found',
      });
      return;
    }

    // RBAC: Regular users can only delete their own entries
    const isAdmin = req.user?.roles?.includes('admin');
    const isTenantAdmin = req.user?.roles?.includes('tenantadmin');
    const isRegularUser = !isAdmin && !isTenantAdmin;

    if (isRegularUser && existingEntry.userId !== req.user?.sub) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied: You can only delete your own time entries',
      });
      return;
    }

    if (existingEntry.deletedAt) {
      res.status(400).json({
        status: 'error',
        message: 'Time entry is already deleted',
      });
      return;
    }

    // Soft delete entry
    const entry = await (req.clientDb as ClientPrismaClient).timeEntry.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Time entry deleted successfully',
      data: entry,
    });
  } catch (error) {
    console.error('Error deleting time entry:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete time entry',
    });
  }
});

/**
 * POST /api/v1/admin/time-entries/:id/start
 * Start a timer (create a new time entry with only start time)
 */
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { projectId, description } = req.body;

    if (!projectId || !req.user) {
      res.status(400).json({
        status: 'error',
        message: 'projectId is required',
      });
      return;
    }

    // Verify project exists
    const project = await (req.clientDb as ClientPrismaClient).project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      res.status(404).json({
        status: 'error',
        message: 'Project not found',
      });
      return;
    }

    // Create time entry with start time only
    const entry = await (req.clientDb as ClientPrismaClient).timeEntry.create({
      data: {
        userId: req.user.sub,
        projectId,
        description: description?.trim() || null,
        startTime: new Date(),
        isBillable: project.defaultBillable,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            hourlyRate: true,
          },
        },
      },
    });

    res.status(201).json({
      status: 'success',
      data: entry,
      message: 'Timer started successfully',
    });
  } catch (error) {
    console.error('Error starting timer:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to start timer',
    });
  }
});

/**
 * POST /api/v1/admin/time-entries/:id/stop
 * Stop a timer (update time entry with end time)
 */
router.post('/:id/stop', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { id } = req.params;

    // Check if entry exists
    const existingEntry = await (req.clientDb as ClientPrismaClient).timeEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      res.status(404).json({
        status: 'error',
        message: 'Time entry not found',
      });
      return;
    }

    // RBAC: Regular users can only stop their own timers
    const isAdmin = req.user?.roles?.includes('admin');
    const isTenantAdmin = req.user?.roles?.includes('tenantadmin');
    const isRegularUser = !isAdmin && !isTenantAdmin;

    if (isRegularUser && existingEntry.userId !== req.user?.sub) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied: You can only stop your own timers',
      });
      return;
    }

    if (existingEntry.endTime) {
      res.status(400).json({
        status: 'error',
        message: 'Timer has already been stopped',
      });
      return;
    }

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - existingEntry.startTime.getTime()) / 1000);

    // Calculate hours
    const totalHours = duration / 3600;
    const regularHours = Math.min(totalHours, 8); // Assuming 8 hours is regular
    const overtimeHours = Math.max(0, totalHours - 8);

    // Update time entry
    const entry = await (req.clientDb as ClientPrismaClient).timeEntry.update({
      where: { id },
      data: {
        endTime,
        duration,
        regularHours,
        overtimeHours,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            hourlyRate: true,
          },
        },
      },
    });

    res.status(200).json({
      status: 'success',
      data: entry,
      message: 'Timer stopped successfully',
    });
  } catch (error) {
    console.error('Error stopping timer:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to stop timer',
    });
  }
});

export default router;
