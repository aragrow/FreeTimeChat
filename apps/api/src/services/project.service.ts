/**
 * Project Service
 *
 * Handles project management operations for client databases
 */

import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { Project } from '../generated/prisma-client';

export interface CreateProjectData {
  name: string;
  description?: string;
  clientId: string;
  startDate?: Date;
  endDate?: Date;
  isBillableProject?: boolean;
  defaultBillable?: boolean;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
  isBillableProject?: boolean;
  defaultBillable?: boolean;
}

export interface ListProjectsOptions {
  skip?: number;
  take?: number;
  isActive?: boolean;
  includeDeleted?: boolean;
}

export class ProjectService {
  constructor(private prisma: ClientPrismaClient) {}

  /**
   * Create a new project
   */
  async create(data: CreateProjectData): Promise<Project> {
    return this.prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        clientId: data.clientId,
        startDate: data.startDate,
        endDate: data.endDate,
        isBillableProject: data.isBillableProject,
        defaultBillable: data.defaultBillable,
      },
    });
  }

  /**
   * Get project by ID
   */
  async getById(id: string): Promise<Project | null> {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        timeEntries: {
          where: { deletedAt: null },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          where: { status: { not: 'DONE' } },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Search projects by name (case-insensitive)
   */
  async findByName(name: string, includeDeleted: boolean = false): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: {
        name: {
          contains: name,
          mode: 'insensitive',
        },
        ...(!includeDeleted && { deletedAt: null }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * List projects with pagination and filters
   */
  async list(options: ListProjectsOptions = {}): Promise<any[]> {
    const { skip = 0, take = 20, isActive, includeDeleted = false } = options;

    const projects = await this.prisma.project.findMany({
      where: {
        ...(isActive !== undefined && { isActive }),
        ...(!includeDeleted && { deletedAt: null }),
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            timeEntries: true,
            tasks: true,
          },
        },
        timeEntries: {
          where: { deletedAt: null },
          select: { duration: true },
        },
      },
    });

    // Calculate totalHours for each project by summing time entry durations
    return projects.map((project) => {
      const totalSeconds = project.timeEntries.reduce((sum, entry) => {
        return sum + (entry.duration || 0);
      }, 0);

      // Convert seconds to hours
      const totalHours = totalSeconds / 3600;

      // Remove timeEntries from response and add totalHours
      const { timeEntries: _timeEntries, ...projectWithoutEntries } = project;
      return {
        ...projectWithoutEntries,
        totalHours: Math.round(totalHours * 10) / 10, // Round to 1 decimal place
      };
    });
  }

  /**
   * Count projects
   */
  async count(isActive?: boolean, includeDeleted: boolean = false): Promise<number> {
    return this.prisma.project.count({
      where: {
        ...(isActive !== undefined && { isActive }),
        ...(!includeDeleted && { deletedAt: null }),
      },
    });
  }

  /**
   * Update project
   */
  async update(id: string, data: UpdateProjectData): Promise<Project> {
    return this.prisma.project.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft delete project
   */
  async softDelete(id: string): Promise<Project> {
    return this.prisma.project.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  /**
   * Restore soft-deleted project
   */
  async restore(id: string): Promise<Project> {
    return this.prisma.project.update({
      where: { id },
      data: {
        deletedAt: null,
        isActive: true,
      },
    });
  }

  /**
   * Permanently delete project
   */
  async permanentDelete(id: string): Promise<Project> {
    return this.prisma.project.delete({
      where: { id },
    });
  }

  /**
   * Get project statistics
   */
  async getStats(id: string): Promise<{
    totalTimeEntries: number;
    totalTasks: number;
    completedTasks: number;
    activeTasks: number;
  }> {
    const [totalTimeEntries, totalTasks, completedTasks, activeTasks] = await Promise.all([
      this.prisma.timeEntry.count({
        where: { projectId: id, deletedAt: null },
      }),
      this.prisma.task.count({
        where: { projectId: id },
      }),
      this.prisma.task.count({
        where: { projectId: id, status: 'DONE' },
      }),
      this.prisma.task.count({
        where: { projectId: id, status: { in: ['TODO', 'IN_PROGRESS', 'REVIEW'] } },
      }),
    ]);

    return {
      totalTimeEntries,
      totalTasks,
      completedTasks,
      activeTasks,
    };
  }
}
