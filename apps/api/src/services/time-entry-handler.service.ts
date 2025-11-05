/**
 * Time Entry Handler Service
 *
 * Handles creation of time entries from natural language using IntentParser
 */

import { IntentParserService } from './intent-parser.service';
import { ProjectService } from './project.service';
import { TimeEntryService } from './time-entry.service';
import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { TimeEntry } from '../generated/prisma-client';
import type { PrismaClient as MainPrismaClient } from '../generated/prisma-main';

export interface TimeEntryHandlerResult {
  success: boolean;
  message: string;
  timeEntry?: TimeEntry;
  errors?: string[];
}

export class TimeEntryHandlerService {
  private intentParser: IntentParserService;
  private projectService: ProjectService;
  private timeEntryService: TimeEntryService;

  constructor(clientPrisma: ClientPrismaClient, mainPrisma: MainPrismaClient) {
    this.intentParser = new IntentParserService();
    this.projectService = new ProjectService(clientPrisma);
    this.timeEntryService = new TimeEntryService(clientPrisma, mainPrisma);
  }

  /**
   * Handle time entry creation from natural language
   */
  async handleTimeEntry(userId: string, userMessage: string): Promise<TimeEntryHandlerResult> {
    try {
      // Parse the message
      const parsed = await this.intentParser.parseMessage(userMessage);

      // Validate that this is a time entry intent
      if (parsed.intent !== 'time_entry') {
        return {
          success: false,
          message:
            "I didn't detect a time entry in your message. Try phrases like 'I worked 2 hours on Project X' or 'Log 3.5 hours for the client meeting'.",
        };
      }

      // Validate confidence
      if (parsed.confidence < 0.5) {
        return {
          success: false,
          message: "I'm not sure I understood your time entry correctly. Could you rephrase it?",
        };
      }

      // Extract entities
      const { duration, project, dateTime, timeRange, description } = parsed.entities;

      // Validate required entities
      const errors: string[] = [];

      // Need either duration or time range
      if (!duration && !timeRange) {
        errors.push(
          'I couldn\'t find a duration or time range. Try "2 hours", "30 minutes", or "from 9am to 5pm".'
        );
      }

      // Look up project if mentioned
      let projectId: string | undefined;
      if (project) {
        const projects = await this.projectService.findByName(project.projectName);

        if (projects.length === 0) {
          errors.push(
            `I couldn't find a project named "${project.projectName}". Please check the project name.`
          );
        } else if (projects.length === 1) {
          projectId = projects[0].id;
        } else {
          // Multiple matches - try exact match first
          const exactMatch = projects.find(
            (p) => p.name.toLowerCase() === project.projectName.toLowerCase()
          );
          if (exactMatch) {
            projectId = exactMatch.id;
          } else {
            const projectNames = projects.map((p) => p.name).join(', ');
            errors.push(
              `Multiple projects match "${project.projectName}": ${projectNames}. Please be more specific.`
            );
          }
        }
      } else {
        errors.push(
          'I couldn\'t find a project reference. Try "on Project X" or "for the client meeting".'
        );
      }

      // Return validation errors if any
      if (errors.length > 0) {
        return {
          success: false,
          message: 'I found some issues with your time entry:',
          errors,
        };
      }

      // Calculate start and end times
      const targetDate = dateTime?.date || new Date();
      let startTime: Date;
      let endTime: Date | undefined;
      let hours: number;

      if (timeRange) {
        // Use time range
        hours = this.intentParser.calculateDurationFromTimeRange(timeRange);
        const [startHour, startMin] = timeRange.startTime.split(':').map(Number);
        const [endHour, endMin] = timeRange.endTime.split(':').map(Number);

        startTime = new Date(targetDate);
        startTime.setHours(startHour, startMin, 0, 0);

        endTime = new Date(targetDate);
        endTime.setHours(endHour, endMin, 0, 0);
      } else if (duration) {
        // Use duration - assume it ended now or at end of day
        hours = duration.hours;

        // If date is today, end time is now
        if (this.isSameDay(targetDate, new Date())) {
          endTime = new Date();
          startTime = new Date(endTime.getTime() - hours * 3600 * 1000);
        } else {
          // For past dates, assume work ended at 5pm
          endTime = new Date(targetDate);
          endTime.setHours(17, 0, 0, 0);
          startTime = new Date(endTime.getTime() - hours * 3600 * 1000);
        }
      } else {
        // Should never reach here due to validation
        return {
          success: false,
          message: 'Unable to determine time entry duration.',
        };
      }

      // Validate hours are reasonable
      if (hours <= 0 || hours > 24) {
        return {
          success: false,
          message: `The duration ${hours.toFixed(2)} hours seems unusual. Please check your time entry.`,
        };
      }

      // Check for overlapping entries
      const overlap = await this.timeEntryService.checkOverlap(userId, startTime, endTime);
      if (overlap) {
        return {
          success: false,
          message: `This time entry overlaps with an existing entry from ${this.formatTime(overlap.startTime)} to ${overlap.endTime ? this.formatTime(overlap.endTime) : 'ongoing'}.`,
        };
      }

      // Create the time entry
      if (!projectId) {
        return {
          success: false,
          message: 'Project ID is required but was not found.',
        };
      }

      const timeEntry = await this.timeEntryService.create({
        userId,
        projectId,
        description: description || parsed.originalMessage,
        startTime,
        endTime,
        duration: Math.floor(hours * 3600), // Convert to seconds
      });

      // Generate success message
      const dateStr = this.isSameDay(targetDate, new Date())
        ? 'today'
        : targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const message = `✓ Logged ${hours.toFixed(2)} hours for ${dateStr} (${this.formatTime(startTime)} - ${this.formatTime(endTime)})`;

      return {
        success: true,
        message,
        timeEntry,
      };
    } catch (error) {
      console.error('Failed to handle time entry:', error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'An error occurred while creating your time entry. Please try again.',
      };
    }
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

  /**
   * Format time for display
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}
