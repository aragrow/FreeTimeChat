/**
 * Time Entry Routes
 *
 * Handles time tracking operations
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import { attachClientDatabase } from '../middleware/client-database.middleware';
import { validate } from '../middleware/validation.middleware';
import { TimeEntryService } from '../services/time-entry.service';
import {
  createTimeEntrySchema,
  deleteTimeEntrySchema,
  getTimeEntryByIdSchema,
  listTimeEntriesSchema,
  restoreTimeEntrySchema,
  startTimeEntrySchema,
  stopTimeEntrySchema,
  totalHoursReportSchema,
  updateTimeEntrySchema,
} from '../validation/time-entry.validation';
import type { Request, Response } from 'express';

const router = Router();

// All routes require authentication and client database
router.use(authenticateJWT, attachClientDatabase);

/**
 * POST /api/v1/time-entries
 * Create a new time entry
 */
router.post('/', validate(createTimeEntrySchema), async (req: Request, res: Response) => {
  try {
    if (!req.clientDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { projectId, description, startTime, endTime, duration } = req.body;

    if (!projectId) {
      res.status(400).json({ status: 'error', message: 'Project ID is required' });
      return;
    }

    const timeEntryService = new TimeEntryService(req.clientDb);

    // Check for overlaps if endTime is provided
    if (endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);

      const overlap = await timeEntryService.checkOverlap(req.user.userId, start, end);
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
      userId: req.user.userId,
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
    if (!req.clientDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { projectId, description } = req.body;

    if (!projectId) {
      res.status(400).json({ status: 'error', message: 'Project ID is required' });
      return;
    }

    const timeEntryService = new TimeEntryService(req.clientDb);
    const timeEntry = await timeEntryService.start({
      userId: req.user.userId,
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
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { id } = req.params;

    const timeEntryService = new TimeEntryService(req.clientDb);
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
    if (!req.clientDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const timeEntryService = new TimeEntryService(req.clientDb);
    const activeEntry = await timeEntryService.findActiveByUserId(req.user.userId);

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
    if (!req.clientDb || !req.user) {
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
    const userId = req.user.role === 'admin' ? (req.query.userId as string) : req.user.userId;

    const skip = (page - 1) * limit;

    const timeEntryService = new TimeEntryService(req.clientDb);
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
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { id } = req.params;

    const timeEntryService = new TimeEntryService(req.clientDb);
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
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { id } = req.params;
    const { description, startTime, endTime, duration } = req.body;

    const timeEntryService = new TimeEntryService(req.clientDb);

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
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { id } = req.params;
    const permanent = req.query.permanent === 'true';

    const timeEntryService = new TimeEntryService(req.clientDb);

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
      if (!req.clientDb) {
        res.status(500).json({ status: 'error', message: 'Client database not available' });
        return;
      }

      const { id } = req.params;

      const timeEntryService = new TimeEntryService(req.clientDb);
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
      if (!req.clientDb || !req.user) {
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

      const timeEntryService = new TimeEntryService(req.clientDb);
      const totalHours = await timeEntryService.getTotalHours(req.user.userId, startDate, endDate);

      res.json({
        status: 'success',
        data: {
          userId: req.user.userId,
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

export default router;
