/**
 * Time Entry Service
 *
 * Handles time entry management operations for client databases
 */

import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { TimeEntry } from '../generated/prisma-client';

export interface CreateTimeEntryData {
  userId: string;
  projectId: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

export interface UpdateTimeEntryData {
  description?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
}

export interface ListTimeEntriesOptions {
  skip?: number;
  take?: number;
  userId?: string;
  projectId?: string;
  startDate?: Date;
  endDate?: Date;
  includeDeleted?: boolean;
}

export class TimeEntryService {
  constructor(private prisma: ClientPrismaClient) {}

  /**
   * Create a new time entry
   */
  async create(data: CreateTimeEntryData): Promise<TimeEntry> {
    // Calculate duration if endTime is provided
    const duration = data.endTime
      ? Math.floor((data.endTime.getTime() - data.startTime.getTime()) / 1000)
      : data.duration;

    return this.prisma.timeEntry.create({
      data: {
        userId: data.userId,
        projectId: data.projectId,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        duration,
      },
      include: {
        project: true,
      },
    });
  }

  /**
   * Start a time entry (no end time)
   */
  async start(data: {
    userId: string;
    projectId: string;
    description?: string;
  }): Promise<TimeEntry> {
    // Check for active time entries for this user
    const activeEntry = await this.findActiveByUserId(data.userId);
    if (activeEntry) {
      throw new Error(
        'User already has an active time entry. Please stop it before starting a new one.'
      );
    }

    return this.create({
      userId: data.userId,
      projectId: data.projectId,
      description: data.description,
      startTime: new Date(),
    });
  }

  /**
   * Stop a running time entry
   */
  async stop(id: string): Promise<TimeEntry> {
    const entry = await this.getById(id);
    if (!entry) {
      throw new Error('Time entry not found');
    }

    if (entry.endTime) {
      throw new Error('Time entry is already stopped');
    }

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - entry.startTime.getTime()) / 1000);

    return this.prisma.timeEntry.update({
      where: { id },
      data: {
        endTime,
        duration,
      },
      include: {
        project: true,
      },
    });
  }

  /**
   * Get time entry by ID
   */
  async getById(id: string): Promise<TimeEntry | null> {
    return this.prisma.timeEntry.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });
  }

  /**
   * Find active time entry for a user (no end time)
   */
  async findActiveByUserId(userId: string): Promise<TimeEntry | null> {
    return this.prisma.timeEntry.findFirst({
      where: {
        userId,
        endTime: null,
        deletedAt: null,
      },
      include: {
        project: true,
      },
    });
  }

  /**
   * List time entries with pagination and filters
   */
  async list(options: ListTimeEntriesOptions = {}): Promise<TimeEntry[]> {
    const {
      skip = 0,
      take = 20,
      userId,
      projectId,
      startDate,
      endDate,
      includeDeleted = false,
    } = options;

    return this.prisma.timeEntry.findMany({
      where: {
        ...(userId && { userId }),
        ...(projectId && { projectId }),
        ...(startDate && { startTime: { gte: startDate } }),
        ...(endDate && { startTime: { lte: endDate } }),
        ...(!includeDeleted && { deletedAt: null }),
      },
      skip,
      take,
      orderBy: { startTime: 'desc' },
      include: {
        project: true,
      },
    });
  }

  /**
   * Count time entries
   */
  async count(
    userId?: string,
    projectId?: string,
    startDate?: Date,
    endDate?: Date,
    includeDeleted: boolean = false
  ): Promise<number> {
    return this.prisma.timeEntry.count({
      where: {
        ...(userId && { userId }),
        ...(projectId && { projectId }),
        ...(startDate && { startTime: { gte: startDate } }),
        ...(endDate && { startTime: { lte: endDate } }),
        ...(!includeDeleted && { deletedAt: null }),
      },
    });
  }

  /**
   * Update time entry
   */
  async update(id: string, data: UpdateTimeEntryData): Promise<TimeEntry> {
    // Recalculate duration if times are updated
    let duration = data.duration;
    if (data.startTime || data.endTime) {
      const entry = await this.getById(id);
      if (!entry) {
        throw new Error('Time entry not found');
      }

      const startTime = data.startTime || entry.startTime;
      const endTime = data.endTime || entry.endTime;

      if (endTime) {
        duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      }
    }

    return this.prisma.timeEntry.update({
      where: { id },
      data: {
        ...data,
        duration,
      },
      include: {
        project: true,
      },
    });
  }

  /**
   * Soft delete time entry
   */
  async softDelete(id: string): Promise<TimeEntry> {
    return this.prisma.timeEntry.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
      include: {
        project: true,
      },
    });
  }

  /**
   * Restore soft-deleted time entry
   */
  async restore(id: string): Promise<TimeEntry> {
    return this.prisma.timeEntry.update({
      where: { id },
      data: {
        deletedAt: null,
      },
      include: {
        project: true,
      },
    });
  }

  /**
   * Permanently delete time entry
   */
  async permanentDelete(id: string): Promise<TimeEntry> {
    return this.prisma.timeEntry.delete({
      where: { id },
    });
  }

  /**
   * Check for overlapping time entries for a user
   */
  async checkOverlap(
    userId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string
  ): Promise<TimeEntry | null> {
    return this.prisma.timeEntry.findFirst({
      where: {
        userId,
        deletedAt: null,
        ...(excludeId && { id: { not: excludeId } }),
        OR: [
          // New entry starts during existing entry
          {
            startTime: { lte: startTime },
            endTime: { gte: startTime },
          },
          // New entry ends during existing entry
          {
            startTime: { lte: endTime },
            endTime: { gte: endTime },
          },
          // New entry encompasses existing entry
          {
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
          // Existing entry with no end time (still running)
          {
            startTime: { lte: endTime },
            endTime: null,
          },
        ],
      },
    });
  }

  /**
   * Get total hours for a user in a date range
   */
  async getTotalHours(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const entries = await this.prisma.timeEntry.findMany({
      where: {
        userId,
        startTime: { gte: startDate, lte: endDate },
        endTime: { not: null },
        deletedAt: null,
      },
      select: {
        duration: true,
      },
    });

    const totalSeconds = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    return totalSeconds / 3600; // Convert to hours
  }

  /**
   * Get total hours for a project in a date range
   */
  async getProjectHours(projectId: string, startDate?: Date, endDate?: Date): Promise<number> {
    const entries = await this.prisma.timeEntry.findMany({
      where: {
        projectId,
        ...(startDate && { startTime: { gte: startDate } }),
        ...(endDate && { startTime: { lte: endDate } }),
        endTime: { not: null },
        deletedAt: null,
      },
      select: {
        duration: true,
      },
    });

    const totalSeconds = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    return totalSeconds / 3600; // Convert to hours
  }
}
