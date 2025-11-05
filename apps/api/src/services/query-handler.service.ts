/**
 * Query Handler Service
 *
 * Handles query requests about time entries from natural language
 */

import { IntentParserService } from './intent-parser.service';
import { ProjectService } from './project.service';
import { TimeEntryService } from './time-entry.service';
import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { TimeEntry } from '../generated/prisma-client';
import type { PrismaClient as MainPrismaClient } from '../generated/prisma-main';

export interface QueryHandlerResult {
  success: boolean;
  message: string;
  data?: {
    timeEntries?: TimeEntry[];
    totalHours?: number;
    breakdown?: Record<string, number>;
  };
}

export class QueryHandlerService {
  private intentParser: IntentParserService;
  private projectService: ProjectService;
  private timeEntryService: TimeEntryService;

  // Query pattern matchers
  private readonly queryPatterns = {
    total: /(?:total|how much|how many)\s+(?:time|hours)/i,
    today: /\btoday\b/i,
    yesterday: /\byesterday\b/i,
    thisWeek: /this\s+week/i,
    lastWeek: /last\s+week/i,
    thisMonth: /this\s+month/i,
    lastMonth: /last\s+month/i,
    project: /(?:on|for|in)\s+(?:project\s+)?["']?([^"']+?)["']?(?:\s|$)/i,
    list: /(?:show|list|display|get)\s+(?:my\s+)?(?:time|entries|hours)/i,
  };

  constructor(clientPrisma: ClientPrismaClient, mainPrisma: MainPrismaClient) {
    this.intentParser = new IntentParserService();
    this.projectService = new ProjectService(clientPrisma);
    this.timeEntryService = new TimeEntryService(clientPrisma, mainPrisma);
  }

  /**
   * Handle query requests
   */
  async handleQuery(userId: string, message: string): Promise<QueryHandlerResult> {
    try {
      // Parse the message
      const parsed = await this.intentParser.parseMessage(message);

      // Validate that this is a query intent
      if (parsed.intent !== 'query') {
        return {
          success: false,
          message:
            "I didn't detect a query in your message. Try asking 'How much time did I log today?' or 'Show me my hours this week'.",
        };
      }

      // Extract query parameters
      const queryParams = this.extractQueryParameters(message, parsed.entities.dateTime?.date);

      // Get project filter if mentioned
      let projectId: string | undefined;
      const projectEntity = parsed.entities.project;
      if (projectEntity) {
        const projects = await this.projectService.findByName(projectEntity.projectName);

        if (projects.length === 1) {
          projectId = projects[0].id;
        } else if (projects.length > 1) {
          // Multiple matches - try exact match
          const exactMatch = projects.find(
            (p) => p.name.toLowerCase() === projectEntity.projectName.toLowerCase()
          );
          if (exactMatch) {
            projectId = exactMatch.id;
          }
        }
      }

      // Determine if user wants total or list
      const wantsTotal = this.queryPatterns.total.test(message);
      const wantsList = this.queryPatterns.list.test(message);

      // Query time entries
      const timeEntries = await this.timeEntryService.list({
        userId,
        projectId,
        startDate: queryParams.startDate,
        endDate: queryParams.endDate,
        take: 100, // Reasonable limit for chat display
      });

      // If no entries found
      if (timeEntries.length === 0) {
        return {
          success: true,
          message: `No time entries found ${this.formatDateRangeDescription(queryParams)}${projectId ? ` for the specified project` : ''}.`,
          data: {
            timeEntries: [],
            totalHours: 0,
          },
        };
      }

      // Calculate total hours
      const totalHours = timeEntries.reduce((sum, entry) => {
        if (entry.duration) {
          return sum + entry.duration / 3600;
        }
        return sum;
      }, 0);

      // Generate response based on query type
      if (wantsTotal) {
        // Total hours response
        const breakdown = this.calculateProjectBreakdown(timeEntries);
        const breakdownText =
          Object.keys(breakdown).length > 1
            ? `\n\n${Object.entries(breakdown)
                .map(([project, hours]) => `  • ${project}: ${hours.toFixed(2)}h`)
                .join('\n')}`
            : '';

        const message = `You logged ${totalHours.toFixed(2)} hours ${this.formatDateRangeDescription(queryParams)}${projectId ? ` on the specified project` : ''}.${breakdownText}`;

        return {
          success: true,
          message,
          data: {
            totalHours,
            breakdown,
            timeEntries,
          },
        };
      } else if (wantsList) {
        // List entries response
        const entriesByDate = this.groupEntriesByDate(timeEntries);
        const listText = Object.entries(entriesByDate)
          .map(([date, entries]) => {
            const dateTotal = entries.reduce((sum, e) => sum + (e.duration || 0) / 3600, 0);
            const entriesText = entries
              .map(
                (e) =>
                  `  • ${((e.duration || 0) / 3600).toFixed(2)}h - ${e.description || 'No description'}`
              )
              .join('\n');
            return `${date} (${dateTotal.toFixed(2)}h):\n${entriesText}`;
          })
          .join('\n\n');

        const message = `Time entries ${this.formatDateRangeDescription(queryParams)}:\n\n${listText}\n\nTotal: ${totalHours.toFixed(2)} hours`;

        return {
          success: true,
          message,
          data: {
            timeEntries,
            totalHours,
          },
        };
      } else {
        // Default summary response
        const recentEntries = timeEntries.slice(0, 5);
        const recentText = recentEntries
          .map(
            (e) =>
              `  • ${this.formatDate(e.startTime)}: ${((e.duration || 0) / 3600).toFixed(2)}h - ${e.description || 'No description'}`
          )
          .join('\n');

        const moreText = timeEntries.length > 5 ? `\n  ... and ${timeEntries.length - 5} more` : '';

        const message = `You have ${timeEntries.length} time entries ${this.formatDateRangeDescription(queryParams)} (${totalHours.toFixed(2)} hours total):\n\n${recentText}${moreText}`;

        return {
          success: true,
          message,
          data: {
            timeEntries,
            totalHours,
          },
        };
      }
    } catch (error) {
      console.error('Failed to handle query:', error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'An error occurred while processing your query. Please try again.',
      };
    }
  }

  /**
   * Extract query parameters from message
   */
  private extractQueryParameters(
    message: string,
    parsedDate?: Date
  ): {
    startDate: Date;
    endDate: Date;
    description: string;
  } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let description: string;

    // Check for today
    if (this.queryPatterns.today.test(message) || parsedDate) {
      const target = parsedDate || now;
      startDate = new Date(target);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(target);
      endDate.setHours(23, 59, 59, 999);
      description = parsedDate ? `on ${this.formatDate(parsedDate)}` : 'today';
    }
    // Check for yesterday
    else if (this.queryPatterns.yesterday.test(message)) {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      description = 'yesterday';
    }
    // Check for this week
    else if (this.queryPatterns.thisWeek.test(message)) {
      startDate = this.getWeekStart(now);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      description = 'this week';
    }
    // Check for last week
    else if (this.queryPatterns.lastWeek.test(message)) {
      const lastWeek = new Date(now);
      lastWeek.setDate(now.getDate() - 7);
      startDate = this.getWeekStart(lastWeek);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      description = 'last week';
    }
    // Check for this month
    else if (this.queryPatterns.thisMonth.test(message)) {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      description = 'this month';
    }
    // Check for last month
    else if (this.queryPatterns.lastMonth.test(message)) {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      endDate.setHours(23, 59, 59, 999);
      description = 'last month';
    }
    // Default to last 7 days
    else {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      description = 'in the last 7 days';
    }

    return { startDate, endDate, description };
  }

  /**
   * Get the start of the week (Monday)
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  /**
   * Calculate breakdown by project
   */
  private calculateProjectBreakdown(timeEntries: TimeEntry[]): Record<string, number> {
    const breakdown: Record<string, number> = {};

    for (const entry of timeEntries) {
      const projectName = entry.projectId || 'Unknown';
      const hours = (entry.duration || 0) / 3600;
      breakdown[projectName] = (breakdown[projectName] || 0) + hours;
    }

    return breakdown;
  }

  /**
   * Group entries by date
   */
  private groupEntriesByDate(timeEntries: TimeEntry[]): Record<string, TimeEntry[]> {
    const grouped: Record<string, TimeEntry[]> = {};

    for (const entry of timeEntries) {
      const dateKey = this.formatDate(entry.startTime);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(entry);
    }

    return grouped;
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    const now = new Date();
    if (this.isSameDay(date, now)) {
      return 'Today';
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (this.isSameDay(date, yesterday)) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Format date range description
   */
  private formatDateRangeDescription(params: { description: string }): string {
    return params.description;
  }

  /**
   * Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }
}
