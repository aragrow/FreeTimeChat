/**
 * Tasks Routes
 *
 * Manages project tasks with status and priority tracking
 * Stored in tenant database
 */

import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

/**
 * GET /api/v1/admin/tasks
 * List all tasks with filters
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

    const { page = '1', limit = '20', projectId, status, priority, assignedToUserId } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Build filter conditions
    const where: any = {};

    if (projectId) where.projectId = projectId as string;
    if (status) where.status = status as string;
    if (priority) where.priority = priority as string;
    if (assignedToUserId) where.assignedToUserId = assignedToUserId as string;

    const [tasks, total] = await Promise.all([
      req.clientDb.task.findMany({
        where,
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
            },
          },
        },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      req.clientDb.task.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        tasks,
        pagination: {
          page: parseInt(page as string),
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    console.error('Error listing tasks:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list tasks',
    });
  }
});

/**
 * GET /api/v1/admin/tasks/:id
 * Get task by ID
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

    const task = await req.clientDb.task.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
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
    });

    if (!task) {
      res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: task,
    });
  } catch (error) {
    console.error('Error getting task:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get task',
    });
  }
});

/**
 * GET /api/v1/admin/tasks/project/:projectId
 * Get all tasks for a specific project
 */
router.get('/project/:projectId', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { projectId } = req.params;

    const tasks = await req.clientDb.task.findMany({
      where: { projectId },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    res.status(200).json({
      status: 'success',
      data: tasks,
    });
  } catch (error) {
    console.error('Error getting project tasks:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get project tasks',
    });
  }
});

/**
 * GET /api/v1/admin/tasks/user/:userId
 * Get all tasks assigned to a specific user
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { userId } = req.params;

    const tasks = await req.clientDb.task.findMany({
      where: { assignedToUserId: userId },
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
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });

    res.status(200).json({
      status: 'success',
      data: tasks,
    });
  } catch (error) {
    console.error('Error getting user tasks:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user tasks',
    });
  }
});

/**
 * POST /api/v1/admin/tasks
 * Create new task
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
      projectId,
      title,
      description,
      status = 'TODO',
      priority = 'MEDIUM',
      assignedToUserId,
      dueDate,
    } = req.body;

    // Validation
    if (!projectId || !title) {
      res.status(400).json({
        status: 'error',
        message: 'projectId and title are required',
      });
      return;
    }

    // Verify project exists
    const project = await req.clientDb.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      res.status(404).json({
        status: 'error',
        message: 'Project not found',
      });
      return;
    }

    // Create task
    const task = await req.clientDb.task.create({
      data: {
        projectId,
        title: title.trim(),
        description: description?.trim() || null,
        status,
        priority,
        assignedToUserId: assignedToUserId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      status: 'success',
      data: task,
      message: 'Task created successfully',
    });
  } catch (error) {
    console.error('Error creating task:', error);
    if (error instanceof Error) {
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to create task',
    });
  }
});

/**
 * PUT /api/v1/admin/tasks/:id
 * Update task
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
    const { title, description, status, priority, assignedToUserId, dueDate } = req.body;

    // Check if task exists
    const existingTask = await req.clientDb.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
      return;
    }

    // Build update data
    const updateData: any = {};

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assignedToUserId !== undefined) updateData.assignedToUserId = assignedToUserId || null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    // Auto-set completedAt when status changes to DONE
    if (status === 'DONE' && existingTask.status !== 'DONE') {
      updateData.completedAt = new Date();
    } else if (status !== 'DONE' && existingTask.status === 'DONE') {
      updateData.completedAt = null;
    }

    // Update task
    const task = await req.clientDb.task.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(200).json({
      status: 'success',
      data: task,
      message: 'Task updated successfully',
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update task',
    });
  }
});

/**
 * PATCH /api/v1/admin/tasks/:id/status
 * Update task status (quick update)
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({
        status: 'error',
        message: 'status is required',
      });
      return;
    }

    // Check if task exists
    const existingTask = await req.clientDb.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
      return;
    }

    const updateData: any = { status };

    // Auto-set completedAt when status changes to DONE
    if (status === 'DONE' && existingTask.status !== 'DONE') {
      updateData.completedAt = new Date();
    } else if (status !== 'DONE' && existingTask.status === 'DONE') {
      updateData.completedAt = null;
    }

    const task = await req.clientDb.task.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      status: 'success',
      data: task,
      message: 'Task status updated successfully',
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update task status',
    });
  }
});

/**
 * PATCH /api/v1/admin/tasks/:id/priority
 * Update task priority (quick update)
 */
router.patch('/:id/priority', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { id } = req.params;
    const { priority } = req.body;

    if (!priority) {
      res.status(400).json({
        status: 'error',
        message: 'priority is required',
      });
      return;
    }

    // Check if task exists
    const existingTask = await req.clientDb.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
      return;
    }

    const task = await req.clientDb.task.update({
      where: { id },
      data: { priority },
    });

    res.status(200).json({
      status: 'success',
      data: task,
      message: 'Task priority updated successfully',
    });
  } catch (error) {
    console.error('Error updating task priority:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update task priority',
    });
  }
});

/**
 * PATCH /api/v1/admin/tasks/:id/assign
 * Assign task to user (quick update)
 */
router.patch('/:id/assign', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { id } = req.params;
    const { userId } = req.body;

    // Check if task exists
    const existingTask = await req.clientDb.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
      return;
    }

    const task = await req.clientDb.task.update({
      where: { id },
      data: { assignedToUserId: userId || null },
    });

    res.status(200).json({
      status: 'success',
      data: task,
      message: userId ? 'Task assigned successfully' : 'Task unassigned successfully',
    });
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to assign task',
    });
  }
});

/**
 * DELETE /api/v1/admin/tasks/:id
 * Delete task
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

    // Check if task exists
    const existingTask = await req.clientDb.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
      return;
    }

    // Hard delete task
    await req.clientDb.task.delete({
      where: { id },
    });

    res.status(200).json({
      status: 'success',
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete task',
    });
  }
});

/**
 * GET /api/v1/admin/tasks/stats/summary
 * Get task statistics summary
 */
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { projectId } = req.query;
    const where: any = projectId ? { projectId: projectId as string } : {};

    const [
      total,
      todoCount,
      inProgressCount,
      reviewCount,
      doneCount,
      cancelledCount,
      highPriorityCount,
      overdueCount,
    ] = await Promise.all([
      req.clientDb.task.count({ where }),
      req.clientDb.task.count({ where: { ...where, status: 'TODO' } }),
      req.clientDb.task.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      req.clientDb.task.count({ where: { ...where, status: 'REVIEW' } }),
      req.clientDb.task.count({ where: { ...where, status: 'DONE' } }),
      req.clientDb.task.count({ where: { ...where, status: 'CANCELLED' } }),
      req.clientDb.task.count({ where: { ...where, priority: 'URGENT' } }),
      req.clientDb.task.count({
        where: {
          ...where,
          dueDate: { lt: new Date() },
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
      }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        total,
        byStatus: {
          todo: todoCount,
          inProgress: inProgressCount,
          review: reviewCount,
          done: doneCount,
          cancelled: cancelledCount,
        },
        byPriority: {
          urgent: highPriorityCount,
        },
        overdue: overdueCount,
        completionRate: total > 0 ? ((doneCount / total) * 100).toFixed(1) : '0',
      },
    });
  } catch (error) {
    console.error('Error getting task statistics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get task statistics',
    });
  }
});

export default router;
