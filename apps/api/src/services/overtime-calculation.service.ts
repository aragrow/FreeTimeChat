/**
 * Overtime Calculation Service
 *
 * Calculates regular and overtime hours based on compensation type
 */

import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { CompensationType } from '../generated/prisma-main';

export interface WeeklyHours {
  weekStartDate: Date;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  entries: Array<{
    id: string;
    hours: number;
  }>;
}

export interface OvertimeSplit {
  regularHours: number;
  overtimeHours: number;
}

export class OvertimeCalculationService {
  private readonly OVERTIME_THRESHOLD = 40;

  constructor(private prisma: ClientPrismaClient) {}

  /**
   * Get start of week for a given date (Monday)
   */
  getWeekStartDate(date: Date): Date {
    const dayOfWeek = date.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday is 1
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  /**
   * Calculate total hours for a user in a given week
   */
  async calculateWeeklyHours(userId: string, weekStartDate: Date): Promise<WeeklyHours> {
    const weekEnd = new Date(weekStartDate);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const entries = await this.prisma.timeEntry.findMany({
      where: {
        userId,
        weekStartDate,
        deletedAt: null,
        endTime: { not: null },
      },
      select: {
        id: true,
        duration: true,
        regularHours: true,
        overtimeHours: true,
      },
      orderBy: { startTime: 'asc' },
    });

    const totalSeconds = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    const totalHours = totalSeconds / 3600;

    const split = this.splitRegularAndOvertime(totalHours, 'HOURLY'); // Default split

    return {
      weekStartDate,
      totalHours,
      regularHours: split.regularHours,
      overtimeHours: split.overtimeHours,
      entries: entries.map((e) => ({
        id: e.id,
        hours: (e.duration || 0) / 3600,
      })),
    };
  }

  /**
   * Split hours into regular and overtime based on 40-hour threshold
   */
  splitRegularAndOvertime(totalHours: number, compensationType: CompensationType): OvertimeSplit {
    // SALARY_HCE doesn't earn overtime
    if (compensationType === 'SALARY_HCE') {
      return {
        regularHours: totalHours,
        overtimeHours: 0,
      };
    }

    // For SALARY_WITH_OT and HOURLY, overtime is after 40 hours
    if (totalHours <= this.OVERTIME_THRESHOLD) {
      return {
        regularHours: totalHours,
        overtimeHours: 0,
      };
    }

    return {
      regularHours: this.OVERTIME_THRESHOLD,
      overtimeHours: totalHours - this.OVERTIME_THRESHOLD,
    };
  }

  /**
   * Calculate overtime for a specific time entry
   * Takes into account other entries in the same week
   */
  async calculateEntryOvertime(
    userId: string,
    entryId: string,
    entryHours: number,
    weekStartDate: Date,
    compensationType: CompensationType
  ): Promise<OvertimeSplit> {
    // SALARY_HCE doesn't earn overtime
    if (compensationType === 'SALARY_HCE') {
      return {
        regularHours: entryHours,
        overtimeHours: 0,
      };
    }

    // Get all other entries in the same week (before this entry)
    const previousEntries = await this.prisma.timeEntry.findMany({
      where: {
        userId,
        weekStartDate,
        id: { not: entryId },
        deletedAt: null,
        endTime: { not: null },
      },
      select: {
        regularHours: true,
        overtimeHours: true,
      },
    });

    // Sum up hours from previous entries
    const previousRegularHours = previousEntries.reduce((sum, entry) => {
      return sum + (entry.regularHours ? parseFloat(entry.regularHours.toString()) : 0);
    }, 0);

    // Calculate how many regular hours are still available
    const availableRegularHours = Math.max(0, this.OVERTIME_THRESHOLD - previousRegularHours);

    if (entryHours <= availableRegularHours) {
      // All hours are regular
      return {
        regularHours: entryHours,
        overtimeHours: 0,
      };
    }

    // Split between regular and overtime
    return {
      regularHours: availableRegularHours,
      overtimeHours: entryHours - availableRegularHours,
    };
  }

  /**
   * Recalculate overtime for all entries in a week
   */
  async recalculateWeekOvertime(
    userId: string,
    weekStartDate: Date,
    compensationType: CompensationType
  ): Promise<number> {
    const weekEnd = new Date(weekStartDate);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Get all entries for the week, ordered by start time
    const entries = await this.prisma.timeEntry.findMany({
      where: {
        userId,
        weekStartDate,
        deletedAt: null,
        endTime: { not: null },
      },
      select: {
        id: true,
        duration: true,
      },
      orderBy: { startTime: 'asc' },
    });

    let cumulativeHours = 0;
    let updatedCount = 0;

    for (const entry of entries) {
      const entryHours = (entry.duration || 0) / 3600;

      // Calculate split for this entry
      const split = this.calculateSplitForEntry(cumulativeHours, entryHours, compensationType);

      // Update the entry
      await this.prisma.timeEntry.update({
        where: { id: entry.id },
        data: {
          regularHours: split.regularHours,
          overtimeHours: split.overtimeHours,
        },
      });

      cumulativeHours += entryHours;
      updatedCount++;
    }

    return updatedCount;
  }

  /**
   * Helper to calculate split for an entry given cumulative hours
   */
  private calculateSplitForEntry(
    cumulativeHours: number,
    entryHours: number,
    compensationType: CompensationType
  ): OvertimeSplit {
    // SALARY_HCE doesn't earn overtime
    if (compensationType === 'SALARY_HCE') {
      return {
        regularHours: entryHours,
        overtimeHours: 0,
      };
    }

    const availableRegularHours = Math.max(0, this.OVERTIME_THRESHOLD - cumulativeHours);

    if (entryHours <= availableRegularHours) {
      return {
        regularHours: entryHours,
        overtimeHours: 0,
      };
    }

    return {
      regularHours: availableRegularHours,
      overtimeHours: entryHours - availableRegularHours,
    };
  }

  /**
   * Get overtime summary for a user in a date range
   */
  async getOvertimeSummary(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalRegularHours: number;
    totalOvertimeHours: number;
    totalHours: number;
    weeklyBreakdown: Array<{
      weekStartDate: Date;
      regularHours: number;
      overtimeHours: number;
      totalHours: number;
    }>;
  }> {
    const entries = await this.prisma.timeEntry.findMany({
      where: {
        userId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        deletedAt: null,
        endTime: { not: null },
      },
      select: {
        weekStartDate: true,
        regularHours: true,
        overtimeHours: true,
      },
    });

    // Group by week
    const weeklyMap = new Map<
      string,
      { regularHours: number; overtimeHours: number; weekStartDate: Date }
    >();

    for (const entry of entries) {
      if (!entry.weekStartDate) continue;

      const weekKey = entry.weekStartDate.toISOString();
      const existing = weeklyMap.get(weekKey) || {
        weekStartDate: entry.weekStartDate,
        regularHours: 0,
        overtimeHours: 0,
      };

      existing.regularHours += entry.regularHours ? parseFloat(entry.regularHours.toString()) : 0;
      existing.overtimeHours += entry.overtimeHours
        ? parseFloat(entry.overtimeHours.toString())
        : 0;

      weeklyMap.set(weekKey, existing);
    }

    const weeklyBreakdown = Array.from(weeklyMap.values()).map((week) => ({
      weekStartDate: week.weekStartDate,
      regularHours: week.regularHours,
      overtimeHours: week.overtimeHours,
      totalHours: week.regularHours + week.overtimeHours,
    }));

    const totalRegularHours = weeklyBreakdown.reduce((sum, week) => sum + week.regularHours, 0);
    const totalOvertimeHours = weeklyBreakdown.reduce((sum, week) => sum + week.overtimeHours, 0);

    return {
      totalRegularHours,
      totalOvertimeHours,
      totalHours: totalRegularHours + totalOvertimeHours,
      weeklyBreakdown,
    };
  }
}
