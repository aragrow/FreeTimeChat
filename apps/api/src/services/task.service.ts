/**
 * Task Service
 *
 * Handles task management operations for client databases
 */

import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { Task, TaskPriority, TaskStatus } from '../generated/prisma-client';

export interface CreateTaskData {
  projectId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedToUserId?: string;
  dueDate?: Date;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedToUserId?: string;
  dueDate?: Date;
}

export interface ListTasksOptions {
  skip?: number;
  take?: number;
  projectId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedToUserId?: string;
}

export class TaskService {
  constructor(private prisma: ClientPrismaClient) {}

  /**
   * Create a new task
   */
  async create(data: CreateTaskData): Promise<Task> {
    return this.prisma.task.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        status: data.status || 'TODO',
        priority: data.priority || 'MEDIUM',
        assignedToUserId: data.assignedToUserId,
        dueDate: data.dueDate,
      },
      include: {
        project: true,
      },
    });
  }

  /**
   * Get task by ID
   */
  async getById(id: string): Promise<Task | null> {
    return this.prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });
  }

  /**
   * List tasks with pagination and filters
   */
  async list(options: ListTasksOptions = {}): Promise<Task[]> {
    const { skip = 0, take = 20, projectId, status, priority, assignedToUserId } = options;

    return this.prisma.task.findMany({
      where: {
        ...(projectId && { projectId }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(assignedToUserId && { assignedToUserId }),
      },
      skip,
      take,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        project: true,
      },
    });
  }

  /**
   * Count tasks
   */
  async count(
    projectId?: string,
    status?: TaskStatus,
    priority?: TaskPriority,
    assignedToUserId?: string
  ): Promise<number> {
    return this.prisma.task.count({
      where: {
        ...(projectId && { projectId }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(assignedToUserId && { assignedToUserId }),
      },
    });
  }

  /**
   * Update task
   */
  async update(id: string, data: UpdateTaskData): Promise<Task> {
    // If status is being changed to DONE, set completedAt
    const updateData: UpdateTaskData & { completedAt?: Date | null } = { ...data };

    if (data.status === 'DONE') {
      updateData.completedAt = new Date();
    } else if (data.status && data.status !== 'DONE') {
      // If changing from DONE to another status, clear completedAt
      const existing = await this.getById(id);
      if (existing?.status === 'DONE') {
        updateData.completedAt = null;
      }
    }

    return this.prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        project: true,
      },
    });
  }

  /**
   * Delete task permanently
   */
  async delete(id: string): Promise<Task> {
    return this.prisma.task.delete({
      where: { id },
    });
  }

  /**
   * Assign task to a user
   */
  async assign(id: string, userId: string): Promise<Task> {
    return this.prisma.task.update({
      where: { id },
      data: {
        assignedToUserId: userId,
      },
      include: {
        project: true,
      },
    });
  }

  /**
   * Unassign task from user
   */
  async unassign(id: string): Promise<Task> {
    return this.prisma.task.update({
      where: { id },
      data: {
        assignedToUserId: null,
      },
      include: {
        project: true,
      },
    });
  }

  /**
   * Update task status
   */
  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    return this.update(id, { status });
  }

  /**
   * Update task priority
   */
  async updatePriority(id: string, priority: TaskPriority): Promise<Task> {
    return this.update(id, { priority });
  }

  /**
   * Get tasks by project
   */
  async getByProject(projectId: string, status?: TaskStatus): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        projectId,
        ...(status && { status }),
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        project: true,
      },
    });
  }

  /**
   * Get tasks assigned to a user
   */
  async getByAssignedUser(userId: string, status?: TaskStatus): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        assignedToUserId: userId,
        ...(status && { status }),
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        project: true,
      },
    });
  }

  /**
   * Get overdue tasks
   */
  async getOverdue(): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        dueDate: {
          lt: new Date(),
        },
        status: {
          notIn: ['DONE', 'CANCELLED'],
        },
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
      include: {
        project: true,
      },
    });
  }

  /**
   * Get task statistics for a project
   */
  async getProjectStats(projectId: string): Promise<{
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    done: number;
    cancelled: number;
    byPriority: {
      low: number;
      medium: number;
      high: number;
      urgent: number;
    };
  }> {
    const [total, todo, inProgress, review, done, cancelled, low, medium, high, urgent] =
      await Promise.all([
        this.prisma.task.count({ where: { projectId } }),
        this.prisma.task.count({ where: { projectId, status: 'TODO' } }),
        this.prisma.task.count({ where: { projectId, status: 'IN_PROGRESS' } }),
        this.prisma.task.count({ where: { projectId, status: 'REVIEW' } }),
        this.prisma.task.count({ where: { projectId, status: 'DONE' } }),
        this.prisma.task.count({ where: { projectId, status: 'CANCELLED' } }),
        this.prisma.task.count({ where: { projectId, priority: 'LOW' } }),
        this.prisma.task.count({ where: { projectId, priority: 'MEDIUM' } }),
        this.prisma.task.count({ where: { projectId, priority: 'HIGH' } }),
        this.prisma.task.count({ where: { projectId, priority: 'URGENT' } }),
      ]);

    return {
      total,
      todo,
      inProgress,
      review,
      done,
      cancelled,
      byPriority: {
        low,
        medium,
        high,
        urgent,
      },
    };
  }
}
