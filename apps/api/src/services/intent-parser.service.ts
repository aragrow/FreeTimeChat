/**
 * Intent Parser Service
 *
 * Handles natural language understanding for chat messages
 * - Identifies user intent (time_entry, query, help, general)
 * - Extracts entities (duration, project, date/time)
 * - Calculates confidence scores
 */

export type IntentType = 'time_entry' | 'query' | 'help' | 'general';

export interface DurationEntity {
  hours: number;
  text: string;
  confidence: number;
}

export interface ProjectEntity {
  projectName: string;
  text: string;
  confidence: number;
}

export interface DateTimeEntity {
  date: Date;
  text: string;
  type: 'absolute' | 'relative';
  confidence: number;
}

export interface TimeRangeEntity {
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  text: string;
  confidence: number;
}

export interface ParsedIntent {
  intent: IntentType;
  confidence: number;
  entities: {
    duration?: DurationEntity;
    project?: ProjectEntity;
    dateTime?: DateTimeEntity;
    timeRange?: TimeRangeEntity;
    description?: string;
  };
  originalMessage: string;
}

export class IntentParserService {
  // Intent detection patterns
  private readonly intentPatterns = {
    time_entry: [
      /(?:log|track|add|record|enter|worked|spent)\s+(?:time|hours|minutes)/i,
      /(?:i|I)\s+(?:worked|spent|did|completed)\s+\d+/i,
      /\d+\s*(?:hours?|hrs?|h|minutes?|mins?|m)\s+(?:on|for|to|in)/i,
      /(?:bill|charge)\s+\d+\s*(?:hours?|hrs?)/i,
      /(?:from|between)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s+(?:to|until|-)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i,
    ],
    query: [
      /(?:how much|how many|what|when|where|show|list|get|find)\s+(?:time|hours|entries|projects)/i,
      /(?:total|summary|report)\s+(?:time|hours)/i,
      /(?:what did i|what have i)\s+(?:work|log|track)/i,
    ],
    help: [/(?:help|how to|what can|commands|usage)/i, /(?:how do i|how can i|show me how)/i],
  };

  // Duration extraction patterns
  private readonly durationPatterns = [
    // "2 hours", "2.5 hours", "2 hrs", "2h"
    /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)(?:\s+(?:and\s+)?(\d+)\s*(?:minutes?|mins?|m))?/i,
    // "30 minutes", "30 mins", "30m"
    /(\d+)\s*(?:minutes?|mins?|m)(?!\s*(?:hours?|hrs?))/i,
    // "2:30" (2 hours 30 minutes)
    /(\d+):(\d{2})/,
  ];

  // Project extraction patterns
  private readonly projectPatterns = [
    /(?:on|for|to|in)\s+(?:the\s+)?(?:project\s+)?["']?([A-Za-z0-9\s-]+?)["']?\s+(?:project|today|yesterday|on|for|$)/i,
    /(?:project|client):\s*["']?([A-Za-z0-9\s-]+)["']?/i,
    /["']([A-Za-z0-9\s-]+)["']\s+project/i,
  ];

  // Date/time extraction patterns
  private readonly datePatterns = {
    relative: [
      { pattern: /today/i, offset: 0 },
      { pattern: /yesterday/i, offset: -1 },
      { pattern: /(\d+)\s+days?\s+ago/i, offset: 'dynamic' as const },
      {
        pattern: /last\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
        type: 'last_weekday' as const,
      },
    ],
    absolute: [
      // "2025-01-15", "01/15/2025", "15/01/2025"
      /(\d{4})-(\d{2})-(\d{2})/,
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    ],
  };

  // Time range extraction patterns
  private readonly timeRangePatterns = [
    // "from 9am to 5pm", "9:00am - 5:00pm", "9-5", "between 9am and 5pm"
    /(?:from|between)\s+(\d{1,2})(?::(\d{2}))?\s*([ap]m?)?\s+(?:to|until|and|-)\s+(\d{1,2})(?::(\d{2}))?\s*([ap]m?)?/i,
  ];

  /**
   * Parse a user message to extract intent and entities
   */
  async parseMessage(message: string): Promise<ParsedIntent> {
    const intent = this.detectIntent(message);
    const entities = await this.extractEntities(message, intent);

    return {
      intent: intent.type,
      confidence: intent.confidence,
      entities,
      originalMessage: message,
    };
  }

  /**
   * Detect the primary intent of the message
   */
  private detectIntent(message: string): { type: IntentType; confidence: number } {
    let maxConfidence = 0;
    let detectedIntent: IntentType = 'general';

    // Check each intent type
    for (const [intentType, patterns] of Object.entries(this.intentPatterns)) {
      let matchCount = 0;
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        const confidence = Math.min(0.5 + matchCount * 0.25, 1.0);
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          detectedIntent = intentType as IntentType;
        }
      }
    }

    // If no specific pattern matched but message is short and conversational
    if (maxConfidence === 0) {
      if (message.length < 30 && /^(hi|hello|hey|thanks|ok|yes|no)\b/i.test(message)) {
        return { type: 'general', confidence: 0.9 };
      }
    }

    return {
      type: detectedIntent,
      confidence: maxConfidence > 0 ? maxConfidence : 0.3,
    };
  }

  /**
   * Extract entities based on intent type
   */
  private async extractEntities(
    message: string,
    intent: { type: IntentType; confidence: number }
  ): Promise<ParsedIntent['entities']> {
    const entities: ParsedIntent['entities'] = {};

    if (intent.type === 'time_entry') {
      // Extract duration
      entities.duration = this.extractDuration(message);

      // Extract project reference
      entities.project = this.extractProject(message);

      // Extract date/time
      entities.dateTime = this.extractDateTime(message);

      // Extract time range (alternative to duration)
      if (!entities.duration) {
        entities.timeRange = this.extractTimeRange(message);
      }

      // Extract description (remaining text after removing entity mentions)
      entities.description = this.extractDescription(message, entities);
    }

    return entities;
  }

  /**
   * Extract duration from message
   */
  private extractDuration(message: string): DurationEntity | undefined {
    for (const pattern of this.durationPatterns) {
      const match = message.match(pattern);
      if (match) {
        let hours = 0;
        const confidence = 0.9;

        // Pattern 1: "2 hours", "2.5 hours", "2h 30m"
        if (match[1] && !match[0].includes(':')) {
          hours = parseFloat(match[1]);
          if (match[2]) {
            // Additional minutes
            hours += parseInt(match[2]) / 60;
          }
          // Check if it's minutes only
          if (/minutes?|mins?|m(?!\s*(?:hours?|hrs?))/i.test(match[0])) {
            hours = parseInt(match[1]) / 60;
          }
        }
        // Pattern 3: "2:30" format
        else if (match[1] && match[2] && match[0].includes(':')) {
          hours = parseInt(match[1]) + parseInt(match[2]) / 60;
        }

        if (hours > 0 && hours <= 24) {
          return {
            hours,
            text: match[0],
            confidence,
          };
        }
      }
    }

    return undefined;
  }

  /**
   * Extract project reference from message
   */
  private extractProject(message: string): ProjectEntity | undefined {
    for (const pattern of this.projectPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const projectName = match[1].trim();
        if (projectName.length > 0 && projectName.length < 100) {
          return {
            projectName,
            text: match[0],
            confidence: 0.8,
          };
        }
      }
    }

    return undefined;
  }

  /**
   * Extract date/time information from message
   */
  private extractDateTime(message: string): DateTimeEntity | undefined {
    // Check relative dates
    for (const { pattern, offset } of this.datePatterns.relative) {
      const match = message.match(pattern);
      if (match) {
        const now = new Date();
        const targetDate = new Date(now);

        if (offset === 'dynamic') {
          // "X days ago"
          const days = parseInt(match[1]);
          targetDate.setDate(now.getDate() - days);
        } else if (typeof offset === 'number') {
          // today, yesterday
          targetDate.setDate(now.getDate() + offset);
        } else if (offset === 'last_weekday') {
          // last Monday, etc.
          const weekdays = [
            'sunday',
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
          ];
          const targetDay = weekdays.indexOf(match[1].toLowerCase());
          const currentDay = now.getDay();
          let daysAgo = currentDay - targetDay;
          if (daysAgo <= 0) daysAgo += 7;
          targetDate.setDate(now.getDate() - daysAgo);
        }

        return {
          date: targetDate,
          text: match[0],
          type: 'relative',
          confidence: 0.95,
        };
      }
    }

    // Check absolute dates
    for (const pattern of this.datePatterns.absolute) {
      const match = message.match(pattern);
      if (match) {
        let year: number, month: number, day: number;

        if (pattern.source.includes('\\d{4}')) {
          // YYYY-MM-DD format
          [, year, month, day] = match.map(Number);
        } else {
          // MM/DD/YYYY format (assuming US format)
          [, month, day, year] = match.map(Number);
        }

        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return {
            date,
            text: match[0],
            type: 'absolute',
            confidence: 1.0,
          };
        }
      }
    }

    // Default to today if no date mentioned
    return {
      date: new Date(),
      text: 'today (implied)',
      type: 'relative',
      confidence: 0.5,
    };
  }

  /**
   * Extract time range from message
   */
  private extractTimeRange(message: string): TimeRangeEntity | undefined {
    for (const pattern of this.timeRangePatterns) {
      const match = message.match(pattern);
      if (match) {
        const [, startHour, startMin = '00', startMeridiem, endHour, endMin = '00', endMeridiem] =
          match;

        let start = parseInt(startHour);
        let end = parseInt(endHour);

        // Handle AM/PM
        if (startMeridiem && startMeridiem.toLowerCase().startsWith('p') && start < 12) {
          start += 12;
        }
        if (endMeridiem && endMeridiem.toLowerCase().startsWith('p') && end < 12) {
          end += 12;
        }

        // If end is less than start and no meridiem specified, assume end is PM
        if (end <= start && !endMeridiem && start < 12) {
          end += 12;
        }

        const startTime = `${start.toString().padStart(2, '0')}:${startMin.padStart(2, '0')}`;
        const endTime = `${end.toString().padStart(2, '0')}:${endMin.padStart(2, '0')}`;

        return {
          startTime,
          endTime,
          text: match[0],
          confidence: 0.9,
        };
      }
    }

    return undefined;
  }

  /**
   * Extract description by removing entity text from message
   */
  private extractDescription(message: string, entities: ParsedIntent['entities']): string {
    let description = message;

    // Remove duration text
    if (entities.duration) {
      description = description.replace(entities.duration.text, '').trim();
    }

    // Remove project text
    if (entities.project) {
      description = description.replace(entities.project.text, '').trim();
    }

    // Remove date/time text
    if (entities.dateTime && entities.dateTime.text !== 'today (implied)') {
      description = description.replace(entities.dateTime.text, '').trim();
    }

    // Remove time range text
    if (entities.timeRange) {
      description = description.replace(entities.timeRange.text, '').trim();
    }

    // Clean up common action words
    description = description
      .replace(/^(log|track|add|record|enter|worked|spent|i|I)\s+/i, '')
      .replace(/\s+(on|for|to|in|at)\s*$/, '')
      .trim();

    // If description is too short or empty, use original message
    if (description.length < 3) {
      description = message;
    }

    return description;
  }

  /**
   * Calculate duration from time range
   */
  calculateDurationFromTimeRange(timeRange: TimeRangeEntity): number {
    const [startHour, startMin] = timeRange.startTime.split(':').map(Number);
    const [endHour, endMin] = timeRange.endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    const durationMinutes = endMinutes - startMinutes;
    return durationMinutes / 60; // Convert to hours
  }
}
