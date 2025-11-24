/**
 * Time Entry Routes
 *
 * Handles time tracking operations
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import { attachTenantDatabase } from '../middleware/tenant-database.middleware';
import { validate } from '../middleware/validation.middleware';
import { OvertimeCalculationService } from '../services/overtime-calculation.service';
import { TimeEntryService } from '../services/time-entry.service';
import {
  billableHoursSummarySchema,
  createTimeEntrySchema,
  deleteTimeEntrySchema,
  getTimeEntryByIdSchema,
  listTimeEntriesSchema,
  overtimeSummarySchema,
  recalculateWeekOvertimeSchema,
  restoreTimeEntrySchema,
  startTimeEntrySchema,
  stopTimeEntrySchema,
  totalHoursReportSchema,
  updateTimeEntrySchema,
} from '../validation/time-entry.validation';
import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { Request, Response } from 'express';

const router = Router();

// All routes require authentication and client database
router.use(authenticateJWT, attachTenantDatabase);

/**
 * POST /api/v1/time-entries
 * Create a new time entry
 */
router.post('/', validate(createTimeEntrySchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { projectId, description, startTime, endTime, duration } = req.body;

    if (!projectId) {
      res.status(400).json({ status: 'error', message: 'Project ID is required' });
      return;
    }

    const timeEntryService = new TimeEntryService(req.tenantDb as ClientPrismaClient, req.mainDb!);

    // Check for overlaps if endTime is provided
    if (endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);

      const overlap = await timeEntryService.checkOverlap(req.user.sub, start, end);
      if (overlap) {
        res.status(400).json({
          status: 'error',
          message: 'Time entry overlaps with an existing entry',
          overlappingEntry: overlap,
        });
        return;
      }
    }

    const timeEntry = await timeEntryService.create({
      userId: req.user.sub,
      projectId,
      description,
      startTime: startTime ? new Date(startTime) : new Date(),
      endTime: endTime ? new Date(endTime) : undefined,
      duration,
    });

    res.status(201).json({
      status: 'success',
      data: timeEntry,
      message: 'Time entry created successfully',
    });
  } catch (error) {
    console.error('Failed to create time entry:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to create time entry',
    });
  }
});

/**
 * POST /api/v1/time-entries/start
 * Start a new time entry (timer)
 */
router.post('/start', validate(startTimeEntrySchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { projectId, description } = req.body;

    if (!projectId) {
      res.status(400).json({ status: 'error', message: 'Project ID is required' });
      return;
    }

    const timeEntryService = new TimeEntryService(req.tenantDb as ClientPrismaClient, req.mainDb!);
    const timeEntry = await timeEntryService.start({
      userId: req.user.sub,
      projectId,
      description,
    });

    res.status(201).json({
      status: 'success',
      data: timeEntry,
      message: 'Time entry started successfully',
    });
  } catch (error) {
    console.error('Failed to start time entry:', error);
    res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to start time entry',
    });
  }
});

/**
 * POST /api/v1/time-entries/:id/stop
 * Stop a running time entry
 */
router.post('/:id/stop', validate(stopTimeEntrySchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { id } = req.params;

    const timeEntryService = new TimeEntryService(req.tenantDb as ClientPrismaClient, req.mainDb!);
    const timeEntry = await timeEntryService.stop(id);

    res.json({
      status: 'success',
      data: timeEntry,
      message: 'Time entry stopped successfully',
    });
  } catch (error) {
    console.error('Failed to stop time entry:', error);
    res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to stop time entry',
    });
  }
});

/**
 * GET /api/v1/time-entries/active
 * Get active time entry for current user
 */
router.get('/active', async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const timeEntryService = new TimeEntryService(req.tenantDb as ClientPrismaClient, req.mainDb!);
    const activeEntry = await timeEntryService.findActiveByUserId(req.user.sub);

    res.json({
      status: 'success',
      data: activeEntry,
    });
  } catch (error) {
    console.error('Failed to get active time entry:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get active time entry',
    });
  }
});

/**
 * GET /api/v1/time-entries
 * List time entries with pagination and filters
 */
router.get('/', validate(listTimeEntriesSchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const projectId = req.query.projectId as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const includeDeleted = req.query.includeDeleted === 'true';

    // Only allow users to see their own time entries unless they're an admin
    const userId = req.user.role === 'admin' ? (req.query.userId as string) : req.user.sub;

    const skip = (page - 1) * limit;

    const timeEntryService = new TimeEntryService(req.tenantDb as ClientPrismaClient, req.mainDb!);
    const [timeEntries, total] = await Promise.all([
      timeEntryService.list({
        skip,
        take: limit,
        userId,
        projectId,
        startDate,
        endDate,
        includeDeleted,
      }),
      timeEntryService.count(userId, projectId, startDate, endDate, includeDeleted),
    ]);

    res.json({
      status: 'success',
      data: timeEntries,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to list time entries:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list time entries',
    });
  }
});

/**
 * GET /api/v1/time-entries/:id
 * Get time entry by ID
 */
router.get('/:id', validate(getTimeEntryByIdSchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { id } = req.params;

    const timeEntryService = new TimeEntryService(req.tenantDb as ClientPrismaClient, req.mainDb!);
    const timeEntry = await timeEntryService.getById(id);

    if (!timeEntry) {
      res.status(404).json({
        status: 'error',
        message: 'Time entry not found',
      });
      return;
    }

    res.json({
      status: 'success',
      data: timeEntry,
    });
  } catch (error) {
    console.error('Failed to get time entry:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get time entry',
    });
  }
});

/**
 * PATCH /api/v1/time-entries/:id
 * Update time entry
 */
router.patch('/:id', validate(updateTimeEntrySchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { id } = req.params;
    const { description, startTime, endTime, duration } = req.body;

    const timeEntryService = new TimeEntryService(req.tenantDb as ClientPrismaClient, req.mainDb!);

    // Check if time entry exists
    const existing = await timeEntryService.getById(id);
    if (!existing) {
      res.status(404).json({
        status: 'error',
        message: 'Time entry not found',
      });
      return;
    }

    // Check for overlaps if times are being updated
    if (startTime || endTime) {
      const start = startTime ? new Date(startTime) : existing.startTime;
      const end = endTime ? new Date(endTime) : existing.endTime;

      if (end) {
        const overlap = await timeEntryService.checkOverlap(existing.userId, start, end, id);
        if (overlap) {
          res.status(400).json({
            status: 'error',
            message: 'Time entry overlaps with an existing entry',
            overlappingEntry: overlap,
          });
          return;
        }
      }
    }

    const updated = await timeEntryService.update(id, {
      description,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      duration,
    });

    res.json({
      status: 'success',
      data: updated,
      message: 'Time entry updated successfully',
    });
  } catch (error) {
    console.error('Failed to update time entry:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to update time entry',
    });
  }
});

/**
 * DELETE /api/v1/time-entries/:id
 * Delete time entry (soft delete by default)
 */
router.delete('/:id', validate(deleteTimeEntrySchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { id } = req.params;
    const permanent = req.query.permanent === 'true';

    const timeEntryService = new TimeEntryService(req.tenantDb as ClientPrismaClient, req.mainDb!);

    // Check if time entry exists
    const existing = await timeEntryService.getById(id);
    if (!existing) {
      res.status(404).json({
        status: 'error',
        message: 'Time entry not found',
      });
      return;
    }

    if (permanent) {
      await timeEntryService.permanentDelete(id);
      res.json({
        status: 'success',
        message: 'Time entry permanently deleted',
      });
    } else {
      const deleted = await timeEntryService.softDelete(id);
      res.json({
        status: 'success',
        data: deleted,
        message: 'Time entry soft deleted',
      });
    }
  } catch (error) {
    console.error('Failed to delete time entry:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete time entry',
    });
  }
});

/**
 * POST /api/v1/time-entries/:id/restore
 * Restore soft-deleted time entry
 */
router.post(
  '/:id/restore',
  validate(restoreTimeEntrySchema),
  async (req: Request, res: Response) => {
    try {
      if (!req.tenantDb) {
        res.status(500).json({ status: 'error', message: 'Client database not available' });
        return;
      }

      const { id } = req.params;

      const timeEntryService = new TimeEntryService(
        req.tenantDb as ClientPrismaClient,
        req.mainDb!
      );
      const restored = await timeEntryService.restore(id);

      res.json({
        status: 'success',
        data: restored,
        message: 'Time entry restored successfully',
      });
    } catch (error) {
      console.error('Failed to restore time entry:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to restore time entry',
      });
    }
  }
);

/**
 * GET /api/v1/time-entries/reports/total-hours
 * Get total hours for current user in a date range
 */
router.get(
  '/reports/total-hours',
  validate(totalHoursReportSchema),
  async (req: Request, res: Response) => {
    try {
      if (!req.tenantDb || !req.user) {
        res.status(500).json({ status: 'error', message: 'Client database not available' });
        return;
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      if (!startDate || !endDate) {
        res.status(400).json({
          status: 'error',
          message: 'Start date and end date are required',
        });
        return;
      }

      const timeEntryService = new TimeEntryService(
        req.tenantDb as ClientPrismaClient,
        req.mainDb!
      );
      const totalHours = await timeEntryService.getTotalHours(req.user.sub, startDate, endDate);

      res.json({
        status: 'success',
        data: {
          userId: req.user.sub,
          startDate,
          endDate,
          totalHours,
        },
      });
    } catch (error) {
      console.error('Failed to get total hours:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get total hours',
      });
    }
  }
);

/**
 * GET /api/v1/time-entries/reports/overtime
 * Get overtime summary for current user in a date range
 */
router.get(
  '/reports/overtime',
  validate(overtimeSummarySchema),
  async (req: Request, res: Response) => {
    try {
      if (!req.tenantDb || !req.mainDb || !req.user) {
        res.status(500).json({ status: 'error', message: 'Database not available' });
        return;
      }

      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);

      const overtimeService = new OvertimeCalculationService(req.tenantDb as ClientPrismaClient);
      const summary = await overtimeService.getOvertimeSummary(req.user.sub, startDate, endDate);

      res.json({
        status: 'success',
        data: {
          userId: req.user.sub,
          startDate,
          endDate,
          ...summary,
        },
      });
    } catch (error) {
      console.error('Failed to get overtime summary:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get overtime summary',
      });
    }
  }
);

/**
 * POST /api/v1/time-entries/admin/recalculate-overtime
 * Recalculate overtime for a specific week (admin only)
 */
router.post(
  '/admin/recalculate-overtime',
  validate(recalculateWeekOvertimeSchema),
  async (req: Request, res: Response) => {
    try {
      if (!req.tenantDb || !req.mainDb || !req.user) {
        res.status(500).json({ status: 'error', message: 'Database not available' });
        return;
      }

      // Check if user is admin
      if (req.user.role !== 'admin') {
        res.status(403).json({
          status: 'error',
          message: 'Unauthorized. Admin access required.',
        });
        return;
      }

      const { userId, weekStartDate } = req.body;
      const weekStart = new Date(weekStartDate);

      // Get user's compensation type
      const user = await req.mainDb.user.findUnique({
        where: { id: userId },
        select: { compensationType: true },
      });

      if (!user) {
        res.status(404).json({
          status: 'error',
          message: 'User not found',
        });
        return;
      }

      const compensationType = user.compensationType || 'HOURLY';

      const overtimeService = new OvertimeCalculationService(req.tenantDb as ClientPrismaClient);
      const updatedCount = await overtimeService.recalculateWeekOvertime(
        userId,
        weekStart,
        compensationType
      );

      res.json({
        status: 'success',
        data: {
          userId,
          weekStartDate: weekStart,
          entriesUpdated: updatedCount,
        },
        message: `Recalculated overtime for ${updatedCount} entries`,
      });
    } catch (error) {
      console.error('Failed to recalculate overtime:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to recalculate overtime',
      });
    }
  }
);

/**
 * GET /api/v1/time-entries/reports/billable-hours
 * Get billable hours summary
 */
router.get(
  '/reports/billable-hours',
  validate(billableHoursSummarySchema),
  async (req: Request, res: Response) => {
    try {
      if (!req.tenantDb || !req.mainDb || !req.user) {
        res.status(500).json({ status: 'error', message: 'Database not available' });
        return;
      }

      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      const userId = (req.query.userId as string) || req.user.sub;
      const projectId = req.query.projectId as string;

      // Get time entries with billability information
      const entries = await (req.tenantDb as ClientPrismaClient).timeEntry.findMany({
        where: {
          userId,
          ...(projectId && { projectId }),
          startTime: {
            gte: startDate,
            lte: endDate,
          },
          deletedAt: null,
          endTime: { not: null },
        },
        select: {
          id: true,
          duration: true,
          regularHours: true,
          overtimeHours: true,
          isBillable: true,
          projectId: true,
          project: {
            select: {
              name: true,
            },
          },
        },
      });

      // Calculate totals
      const billableEntries = entries.filter((e: { isBillable: boolean }) => e.isBillable);
      const nonBillableEntries = entries.filter((e: { isBillable: boolean }) => !e.isBillable);

      const billableHours = billableEntries.reduce(
        (sum: number, e: { duration: number | null }) => {
          const hours = e.duration ? e.duration / 3600 : 0;
          return sum + hours;
        },
        0
      );

      const nonBillableHours = nonBillableEntries.reduce(
        (sum: number, e: { duration: number | null }) => {
          const hours = e.duration ? e.duration / 3600 : 0;
          return sum + hours;
        },
        0
      );

      const billableRegularHours = billableEntries.reduce(
        (sum: number, e: { regularHours: unknown }) => {
          return sum + (e.regularHours ? parseFloat(e.regularHours.toString()) : 0);
        },
        0
      );

      const billableOvertimeHours = billableEntries.reduce(
        (sum: number, e: { overtimeHours: unknown }) => {
          return sum + (e.overtimeHours ? parseFloat(e.overtimeHours.toString()) : 0);
        },
        0
      );

      // Group by project
      const byProject = entries.reduce(
        (
          acc: Record<
            string,
            {
              projectId: string;
              projectName: string;
              billableHours: number;
              nonBillableHours: number;
              totalHours: number;
            }
          >,
          entry: {
            projectId: string;
            project: { name: string };
            duration: number | null;
            isBillable: boolean;
          }
        ) => {
          const key = entry.projectId;
          if (!acc[key]) {
            acc[key] = {
              projectId: entry.projectId,
              projectName: entry.project.name,
              billableHours: 0,
              nonBillableHours: 0,
              totalHours: 0,
            };
          }

          const hours = entry.duration ? entry.duration / 3600 : 0;
          if (entry.isBillable) {
            acc[key].billableHours += hours;
          } else {
            acc[key].nonBillableHours += hours;
          }
          acc[key].totalHours += hours;

          return acc;
        },
        {} as Record<
          string,
          {
            projectId: string;
            projectName: string;
            billableHours: number;
            nonBillableHours: number;
            totalHours: number;
          }
        >
      );

      res.json({
        status: 'success',
        data: {
          userId,
          startDate,
          endDate,
          summary: {
            totalHours: billableHours + nonBillableHours,
            billableHours,
            nonBillableHours,
            billableRegularHours,
            billableOvertimeHours,
            billablePercentage:
              billableHours + nonBillableHours > 0
                ? (billableHours / (billableHours + nonBillableHours)) * 100
                : 0,
          },
          byProject: Object.values(byProject),
        },
      });
    } catch (error) {
      console.error('Failed to get billable hours summary:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get billable hours summary',
      });
    }
  }
);

export default router;
