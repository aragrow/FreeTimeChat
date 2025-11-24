/**
 * Task Routes
 *
 * Handles task management operations
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import { attachTenantDatabase } from '../middleware/tenant-database.middleware';
import { validate } from '../middleware/validation.middleware';
import { TaskService } from '../services/task.service';
import {
  assignTaskSchema,
  createTaskSchema,
  deleteTaskSchema,
  getTaskByIdSchema,
  listTasksSchema,
  unassignTaskSchema,
  updateTaskPrioritySchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from '../validation/task.validation';
import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { Request, Response } from 'express';

const router = Router();

// All routes require authentication and client database
router.use(authenticateJWT, attachTenantDatabase);

/**
 * POST /api/v1/tasks
 * Create a new task
 */
router.post('/', validate(createTaskSchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { projectId, title, description, status, priority, assignedToUserId, dueDate } = req.body;

    const taskService = new TaskService(req.tenantDb as ClientPrismaClient);
    const task = await taskService.create({
      projectId,
      title,
      description,
      status,
      priority,
      assignedToUserId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    res.status(201).json({
      status: 'success',
      data: task,
      message: 'Task created successfully',
    });
  } catch (error) {
    console.error('Failed to create task:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to create task',
    });
  }
});

/**
 * GET /api/v1/tasks
 * List tasks with pagination and filters
 */
router.get('/', validate(listTasksSchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const projectId = req.query.projectId as string;
    const status = req.query.status as
      | 'TODO'
      | 'IN_PROGRESS'
      | 'REVIEW'
      | 'DONE'
      | 'CANCELLED'
      | undefined;
    const priority = req.query.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | undefined;
    const assignedToUserId = req.query.assignedToUserId as string;

    const skip = (page - 1) * limit;

    const taskService = new TaskService(req.tenantDb as ClientPrismaClient);
    const [tasks, total] = await Promise.all([
      taskService.list({ skip, take: limit, projectId, status, priority, assignedToUserId }),
      taskService.count(projectId, status, priority, assignedToUserId),
    ]);

    res.json({
      status: 'success',
      data: tasks,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to list tasks:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list tasks',
    });
  }
});

/**
 * GET /api/v1/tasks/my-tasks
 * Get tasks assigned to current user
 */
router.get('/my-tasks', async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const status = req.query.status as
      | 'TODO'
      | 'IN_PROGRESS'
      | 'REVIEW'
      | 'DONE'
      | 'CANCELLED'
      | undefined;

    const taskService = new TaskService(req.tenantDb as ClientPrismaClient);
    const tasks = await taskService.getByAssignedUser(req.user.sub, status);

    res.json({
      status: 'success',
      data: tasks,
    });
  } catch (error) {
    console.error('Failed to get user tasks:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user tasks',
    });
  }
});

/**
 * GET /api/v1/tasks/overdue
 * Get overdue tasks
 */
router.get('/overdue', async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const taskService = new TaskService(req.tenantDb as ClientPrismaClient);
    const tasks = await taskService.getOverdue();

    res.json({
      status: 'success',
      data: tasks,
    });
  } catch (error) {
    console.error('Failed to get overdue tasks:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get overdue tasks',
    });
  }
});

/**
 * GET /api/v1/tasks/:id
 * Get task by ID
 */
router.get('/:id', validate(getTaskByIdSchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { id } = req.params;

    const taskService = new TaskService(req.tenantDb as ClientPrismaClient);
    const task = await taskService.getById(id);

    if (!task) {
      res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
      return;
    }

    res.json({
      status: 'success',
      data: task,
    });
  } catch (error) {
    console.error('Failed to get task:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get task',
    });
  }
});

/**
 * PATCH /api/v1/tasks/:id
 * Update task
 */
router.patch('/:id', validate(updateTaskSchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { id } = req.params;
    const { title, description, status, priority, assignedToUserId, dueDate } = req.body;

    const taskService = new TaskService(req.tenantDb as ClientPrismaClient);

    // Check if task exists
    const existing = await taskService.getById(id);
    if (!existing) {
      res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
      return;
    }

    const updated = await taskService.update(id, {
      title,
      description,
      status,
      priority,
      assignedToUserId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    res.json({
      status: 'success',
      data: updated,
      message: 'Task updated successfully',
    });
  } catch (error) {
    console.error('Failed to update task:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to update task',
    });
  }
});

/**
 * PATCH /api/v1/tasks/:id/status
 * Update task status
 */
router.patch(
  '/:id/status',
  validate(updateTaskStatusSchema),
  async (req: Request, res: Response) => {
    try {
      if (!req.tenantDb) {
        res.status(500).json({ status: 'error', message: 'Client database not available' });
        return;
      }

      const { id } = req.params;
      const { status } = req.body;

      const taskService = new TaskService(req.tenantDb as ClientPrismaClient);

      // Check if task exists
      const existing = await taskService.getById(id);
      if (!existing) {
        res.status(404).json({
          status: 'error',
          message: 'Task not found',
        });
        return;
      }

      const updated = await taskService.updateStatus(id, status);

      res.json({
        status: 'success',
        data: updated,
        message: 'Task status updated successfully',
      });
    } catch (error) {
      console.error('Failed to update task status:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update task status',
      });
    }
  }
);

/**
 * PATCH /api/v1/tasks/:id/priority
 * Update task priority
 */
router.patch(
  '/:id/priority',
  validate(updateTaskPrioritySchema),
  async (req: Request, res: Response) => {
    try {
      if (!req.tenantDb) {
        res.status(500).json({ status: 'error', message: 'Client database not available' });
        return;
      }

      const { id } = req.params;
      const { priority } = req.body;

      const taskService = new TaskService(req.tenantDb as ClientPrismaClient);

      // Check if task exists
      const existing = await taskService.getById(id);
      if (!existing) {
        res.status(404).json({
          status: 'error',
          message: 'Task not found',
        });
        return;
      }

      const updated = await taskService.updatePriority(id, priority);

      res.json({
        status: 'success',
        data: updated,
        message: 'Task priority updated successfully',
      });
    } catch (error) {
      console.error('Failed to update task priority:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update task priority',
      });
    }
  }
);

/**
 * POST /api/v1/tasks/:id/assign
 * Assign task to a user
 */
router.post('/:id/assign', validate(assignTaskSchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { id } = req.params;
    const { userId } = req.body;

    const taskService = new TaskService(req.tenantDb as ClientPrismaClient);

    // Check if task exists
    const existing = await taskService.getById(id);
    if (!existing) {
      res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
      return;
    }

    const updated = await taskService.assign(id, userId);

    res.json({
      status: 'success',
      data: updated,
      message: 'Task assigned successfully',
    });
  } catch (error) {
    console.error('Failed to assign task:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to assign task',
    });
  }
});

/**
 * POST /api/v1/tasks/:id/unassign
 * Unassign task from user
 */
router.post('/:id/unassign', validate(unassignTaskSchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { id } = req.params;

    const taskService = new TaskService(req.tenantDb as ClientPrismaClient);

    // Check if task exists
    const existing = await taskService.getById(id);
    if (!existing) {
      res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
      return;
    }

    const updated = await taskService.unassign(id);

    res.json({
      status: 'success',
      data: updated,
      message: 'Task unassigned successfully',
    });
  } catch (error) {
    console.error('Failed to unassign task:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to unassign task',
    });
  }
});

/**
 * DELETE /api/v1/tasks/:id
 * Delete task permanently
 */
router.delete('/:id', validate(deleteTaskSchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { id } = req.params;

    const taskService = new TaskService(req.tenantDb as ClientPrismaClient);

    // Check if task exists
    const existing = await taskService.getById(id);
    if (!existing) {
      res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
      return;
    }

    await taskService.delete(id);

    res.json({
      status: 'success',
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete task:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete task',
    });
  }
});

export default router;
