/**
 * Rating Service
 *
 * Phase 5: Handles user feedback/ratings on chat responses
 * Tracks ratings for both preview data (Phase 3) and formatted reports (Phase 4)
 */

import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { ResponseRating, RatingType, RatingValue } from '../generated/prisma-client';

export interface CreateRatingData {
  messageId: string;
  userId: string;
  ratingType: RatingType;
  rating: RatingValue;
  feedback?: string;
  metadata?: Record<string, any>;
}

export interface RatingStats {
  totalRatings: number;
  badCount: number;
  okCount: number;
  goodCount: number;
  averageScore: number; // BAD=1, OK=2, GOOD=3
  badPercentage: number;
  okPercentage: number;
  goodPercentage: number;
}

export interface RatingAnalytics {
  preview: RatingStats;
  report: RatingStats;
  overall: RatingStats;
}

export class RatingService {
  constructor(private prisma: ClientPrismaClient) {}

  /**
   * Create a new rating
   */
  async createRating(data: CreateRatingData): Promise<ResponseRating> {
    return this.prisma.responseRating.create({
      data: {
        messageId: data.messageId,
        userId: data.userId,
        ratingType: data.ratingType,
        rating: data.rating,
        feedback: data.feedback,
        metadata: data.metadata || {},
      },
    });
  }

  /**
   * Get all ratings for a message
   */
  async getRatingsByMessage(messageId: string): Promise<ResponseRating[]> {
    return this.prisma.responseRating.findMany({
      where: { messageId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all ratings by a user
   */
  async getRatingsByUser(
    userId: string,
    options?: {
      ratingType?: RatingType;
      skip?: number;
      take?: number;
    }
  ): Promise<ResponseRating[]> {
    return this.prisma.responseRating.findMany({
      where: {
        userId,
        ...(options?.ratingType && { ratingType: options.ratingType }),
      },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take || 50,
    });
  }

  /**
   * Update an existing rating
   */
  async updateRating(
    ratingId: string,
    data: {
      rating?: RatingValue;
      feedback?: string;
    }
  ): Promise<ResponseRating> {
    return this.prisma.responseRating.update({
      where: { id: ratingId },
      data,
    });
  }

  /**
   * Delete a rating
   */
  async deleteRating(ratingId: string): Promise<void> {
    await this.prisma.responseRating.delete({
      where: { id: ratingId },
    });
  }

  /**
   * Get rating statistics for a specific type
   */
  async getRatingStats(ratingType?: RatingType): Promise<RatingStats> {
    const ratings = await this.prisma.responseRating.findMany({
      where: ratingType ? { ratingType } : undefined,
      select: { rating: true },
    });

    const totalRatings = ratings.length;
    const badCount = ratings.filter((r: { rating: string }) => r.rating === 'BAD').length;
    const okCount = ratings.filter((r: { rating: string }) => r.rating === 'OK').length;
    const goodCount = ratings.filter((r: { rating: string }) => r.rating === 'GOOD').length;

    // Calculate average score (BAD=1, OK=2, GOOD=3)
    const scoreMap: Record<string, number> = { BAD: 1, OK: 2, GOOD: 3 };
    const totalScore = ratings.reduce(
      (sum: number, r: { rating: string }) => sum + scoreMap[r.rating],
      0
    );
    const averageScore = totalRatings > 0 ? totalScore / totalRatings : 0;

    return {
      totalRatings,
      badCount,
      okCount,
      goodCount,
      averageScore: Math.round(averageScore * 100) / 100,
      badPercentage: totalRatings > 0 ? Math.round((badCount / totalRatings) * 100) : 0,
      okPercentage: totalRatings > 0 ? Math.round((okCount / totalRatings) * 100) : 0,
      goodPercentage: totalRatings > 0 ? Math.round((goodCount / totalRatings) * 100) : 0,
    };
  }

  /**
   * Get comprehensive rating analytics
   */
  async getRatingAnalytics(): Promise<RatingAnalytics> {
    const [previewStats, reportStats, overallStats] = await Promise.all([
      this.getRatingStats('PREVIEW'),
      this.getRatingStats('REPORT'),
      this.getRatingStats(),
    ]);

    return {
      preview: previewStats,
      report: reportStats,
      overall: overallStats,
    };
  }

  /**
   * Get recent feedback with poor ratings for improvement
   */
  async getRecentBadFeedback(options?: {
    ratingType?: RatingType;
    take?: number;
  }): Promise<ResponseRating[]> {
    return this.prisma.responseRating.findMany({
      where: {
        rating: 'BAD',
        feedback: { not: null },
        ...(options?.ratingType && { ratingType: options.ratingType }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.take || 20,
      include: {
        message: {
          select: {
            id: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });
  }

  /**
   * Check if user has already rated a message
   */
  async hasUserRatedMessage(
    messageId: string,
    userId: string,
    ratingType: RatingType
  ): Promise<boolean> {
    const existing = await this.prisma.responseRating.findFirst({
      where: {
        messageId,
        userId,
        ratingType,
      },
    });

    return !!existing;
  }

  /**
   * Get or create rating (prevents duplicates)
   */
  async getOrCreateRating(data: CreateRatingData): Promise<{
    rating: ResponseRating;
    created: boolean;
  }> {
    const existing = await this.prisma.responseRating.findFirst({
      where: {
        messageId: data.messageId,
        userId: data.userId,
        ratingType: data.ratingType,
      },
    });

    if (existing) {
      // Update existing rating
      const updated = await this.updateRating(existing.id, {
        rating: data.rating,
        feedback: data.feedback,
      });
      return { rating: updated, created: false };
    }

    // Create new rating
    const created = await this.createRating(data);
    return { rating: created, created: true };
  }
}
