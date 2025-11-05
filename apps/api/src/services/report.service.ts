/**
 * Report Service
 *
 * Provides reporting and analytics functionality for time tracking data
 */

import { DatabaseService } from './database.service';

interface TimeByUserReport {
  userId: string;
  userName: string;
  userEmail: string;
  totalMinutes: number;
  totalHours: number;
  entryCount: number;
  projectBreakdown: Array<{
    projectId: string;
    projectName: string;
    minutes: number;
    hours: number;
  }>;
}

interface TimeByProjectReport {
  projectId: string;
  projectName: string;
  totalMinutes: number;
  totalHours: number;
  entryCount: number;
  userBreakdown: Array<{
    userId: string;
    userName: string;
    minutes: number;
    hours: number;
  }>;
}

interface TimeByDateReport {
  date: string;
  totalMinutes: number;
  totalHours: number;
  entryCount: number;
  projectBreakdown: Array<{
    projectId: string;
    projectName: string;
    minutes: number;
    hours: number;
  }>;
}

interface ReportOptions {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  projectId?: string;
}

export class ReportService {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = new DatabaseService();
  }

  /**
   * Generate time by user report
   */
  async getTimeByUser(clientId: string, options: ReportOptions = {}): Promise<TimeByUserReport[]> {
    const db = await this.databaseService.getClientDatabase(clientId);

    const timeEntries = await db.timeEntry.findMany({
      where: {
        ...(options.userId && { userId: options.userId }),
        ...(options.projectId && { projectId: options.projectId }),
        ...(options.startDate || options.endDate
          ? {
              startTime: {
                ...(options.startDate && { gte: options.startDate }),
                ...(options.endDate && { lte: options.endDate }),
              },
            }
          : {}),
        deletedAt: null,
      },
      include: {
        project: true,
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    // Get user information from main database
    const mainDb = await this.databaseService.getMainDatabase();
    const userIds = [...new Set(timeEntries.map((entry) => entry.userId))];
    const users = await mainDb.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Group by user
    const userReports: Map<string, TimeByUserReport> = new Map();

    for (const entry of timeEntries) {
      const user = userMap.get(entry.userId);
      if (!user) continue;

      const duration = this.calculateDuration(entry.startTime, entry.endTime);
      const userKey = entry.userId;

      if (!userReports.has(userKey)) {
        userReports.set(userKey, {
          userId: entry.userId,
          userName: `${user.firstName} ${user.lastName}`,
          userEmail: user.email,
          totalMinutes: 0,
          totalHours: 0,
          entryCount: 0,
          projectBreakdown: [],
        });
      }

      const report = userReports.get(userKey);
      if (!report) continue;
      report.totalMinutes += duration;
      report.entryCount += 1;

      // Update project breakdown
      const projectBreakdown = report.projectBreakdown.find((p) => p.projectId === entry.projectId);
      if (projectBreakdown) {
        projectBreakdown.minutes += duration;
        projectBreakdown.hours = projectBreakdown.minutes / 60;
      } else {
        report.projectBreakdown.push({
          projectId: entry.projectId,
          projectName: entry.project?.name || 'Unknown',
          minutes: duration,
          hours: duration / 60,
        });
      }
    }

    // Calculate total hours and sort
    const reports = Array.from(userReports.values()).map((report) => ({
      ...report,
      totalHours: report.totalMinutes / 60,
      projectBreakdown: report.projectBreakdown.sort((a, b) => b.minutes - a.minutes),
    }));

    return reports.sort((a, b) => b.totalMinutes - a.totalMinutes);
  }

  /**
   * Generate time by project report
   */
  async getTimeByProject(
    clientId: string,
    options: ReportOptions = {}
  ): Promise<TimeByProjectReport[]> {
    const db = await this.databaseService.getClientDatabase(clientId);

    const timeEntries = await db.timeEntry.findMany({
      where: {
        ...(options.userId && { userId: options.userId }),
        ...(options.projectId && { projectId: options.projectId }),
        ...(options.startDate || options.endDate
          ? {
              startTime: {
                ...(options.startDate && { gte: options.startDate }),
                ...(options.endDate && { lte: options.endDate }),
              },
            }
          : {}),
        deletedAt: null,
      },
      include: {
        project: true,
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    // Get user information from main database
    const mainDb = await this.databaseService.getMainDatabase();
    const userIds = [...new Set(timeEntries.map((entry) => entry.userId))];
    const users = await mainDb.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Group by project
    const projectReports: Map<string, TimeByProjectReport> = new Map();

    for (const entry of timeEntries) {
      const user = userMap.get(entry.userId);
      if (!user) continue;

      const duration = this.calculateDuration(entry.startTime, entry.endTime);
      const projectKey = entry.projectId;

      if (!projectReports.has(projectKey)) {
        projectReports.set(projectKey, {
          projectId: entry.projectId,
          projectName: entry.project?.name || 'Unknown',
          totalMinutes: 0,
          totalHours: 0,
          entryCount: 0,
          userBreakdown: [],
        });
      }

      const report = projectReports.get(projectKey);
      if (!report) continue;
      report.totalMinutes += duration;
      report.entryCount += 1;

      // Update user breakdown
      const userBreakdown = report.userBreakdown.find((u) => u.userId === entry.userId);
      if (userBreakdown) {
        userBreakdown.minutes += duration;
        userBreakdown.hours = userBreakdown.minutes / 60;
      } else {
        report.userBreakdown.push({
          userId: entry.userId,
          userName: `${user.firstName} ${user.lastName}`,
          minutes: duration,
          hours: duration / 60,
        });
      }
    }

    // Calculate total hours and sort
    const reports = Array.from(projectReports.values()).map((report) => ({
      ...report,
      totalHours: report.totalMinutes / 60,
      userBreakdown: report.userBreakdown.sort((a, b) => b.minutes - a.minutes),
    }));

    return reports.sort((a, b) => b.totalMinutes - a.totalMinutes);
  }

  /**
   * Generate time by date report
   */
  async getTimeByDate(clientId: string, options: ReportOptions = {}): Promise<TimeByDateReport[]> {
    const db = await this.databaseService.getClientDatabase(clientId);

    const timeEntries = await db.timeEntry.findMany({
      where: {
        ...(options.userId && { userId: options.userId }),
        ...(options.projectId && { projectId: options.projectId }),
        ...(options.startDate || options.endDate
          ? {
              startTime: {
                ...(options.startDate && { gte: options.startDate }),
                ...(options.endDate && { lte: options.endDate }),
              },
            }
          : {}),
        deletedAt: null,
      },
      include: {
        project: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // Group by date
    const dateReports: Map<string, TimeByDateReport> = new Map();

    for (const entry of timeEntries) {
      const duration = this.calculateDuration(entry.startTime, entry.endTime);
      const date = entry.startTime.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!dateReports.has(date)) {
        dateReports.set(date, {
          date,
          totalMinutes: 0,
          totalHours: 0,
          entryCount: 0,
          projectBreakdown: [],
        });
      }

      const report = dateReports.get(date);
      if (!report) continue;
      report.totalMinutes += duration;
      report.entryCount += 1;

      // Update project breakdown
      const projectBreakdown = report.projectBreakdown.find((p) => p.projectId === entry.projectId);
      if (projectBreakdown) {
        projectBreakdown.minutes += duration;
        projectBreakdown.hours = projectBreakdown.minutes / 60;
      } else {
        report.projectBreakdown.push({
          projectId: entry.projectId,
          projectName: entry.project?.name || 'Unknown',
          minutes: duration,
          hours: duration / 60,
        });
      }
    }

    // Calculate total hours and sort
    const reports = Array.from(dateReports.values()).map((report) => ({
      ...report,
      totalHours: report.totalMinutes / 60,
      projectBreakdown: report.projectBreakdown.sort((a, b) => b.minutes - a.minutes),
    }));

    return reports.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get summary statistics
   */
  async getSummaryStats(
    clientId: string,
    options: ReportOptions = {}
  ): Promise<{
    totalMinutes: number;
    totalHours: number;
    entryCount: number;
    averagePerEntry: number;
    averagePerDay: number;
    userCount: number;
    projectCount: number;
  }> {
    const db = await this.databaseService.getClientDatabase(clientId);

    const timeEntries = await db.timeEntry.findMany({
      where: {
        ...(options.userId && { userId: options.userId }),
        ...(options.projectId && { projectId: options.projectId }),
        ...(options.startDate || options.endDate
          ? {
              startTime: {
                ...(options.startDate && { gte: options.startDate }),
                ...(options.endDate && { lte: options.endDate }),
              },
            }
          : {}),
        deletedAt: null,
      },
      select: {
        startTime: true,
        endTime: true,
        userId: true,
        projectId: true,
      },
    });

    const totalMinutes = timeEntries.reduce(
      (sum, entry) => sum + this.calculateDuration(entry.startTime, entry.endTime),
      0
    );

    const uniqueDates = new Set(
      timeEntries.map((entry) => entry.startTime.toISOString().split('T')[0])
    );
    const uniqueUsers = new Set(timeEntries.map((entry) => entry.userId));
    const uniqueProjects = new Set(timeEntries.map((entry) => entry.projectId));

    return {
      totalMinutes,
      totalHours: totalMinutes / 60,
      entryCount: timeEntries.length,
      averagePerEntry: timeEntries.length > 0 ? totalMinutes / timeEntries.length : 0,
      averagePerDay: uniqueDates.size > 0 ? totalMinutes / uniqueDates.size : 0,
      userCount: uniqueUsers.size,
      projectCount: uniqueProjects.size,
    };
  }

  /**
   * Calculate duration in minutes
   */
  private calculateDuration(startTime: Date, endTime: Date | null): number {
    if (!endTime) {
      // Running entry - calculate duration up to now
      return Math.floor((Date.now() - startTime.getTime()) / (1000 * 60));
    }
    return Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  }
}
