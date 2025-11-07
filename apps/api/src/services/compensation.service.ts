/**
 * Compensation Service
 *
 * Handles user compensation configuration and calculations
 */

import { PrismaClient } from '../generated/prisma-main';
import type { CompensationType, User } from '../generated/prisma-main';

export interface SetCompensationData {
  compensationType: CompensationType;
  hourlyRate?: number;
}

export interface CompensationInfo {
  userId: string;
  compensationType: CompensationType | null;
  hourlyRate: number | null;
  canEarnOvertime: boolean;
}

export class CompensationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Set compensation type and hourly rate for a user
   */
  async setCompensation(userId: string, data: SetCompensationData): Promise<User> {
    // Validate hourly rate if provided
    if (data.hourlyRate !== undefined) {
      if (data.hourlyRate < 0) {
        throw new Error('Hourly rate must be non-negative');
      }
      if (data.hourlyRate > 10000) {
        throw new Error('Hourly rate exceeds maximum allowed value');
      }
    }

    // For SALARY_HCE, hourly rate is optional (not typically used)
    // For SALARY_WITH_OT and HOURLY, hourly rate is required
    if (
      (data.compensationType === 'SALARY_WITH_OT' || data.compensationType === 'HOURLY') &&
      !data.hourlyRate
    ) {
      throw new Error(`Hourly rate is required for ${data.compensationType} compensation type`);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        compensationType: data.compensationType,
        hourlyRate: data.hourlyRate,
      },
    });
  }

  /**
   * Get compensation information for a user
   */
  async getCompensationInfo(userId: string): Promise<CompensationInfo> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        compensationType: true,
        hourlyRate: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      userId: user.id,
      compensationType: user.compensationType,
      hourlyRate: user.hourlyRate ? parseFloat(user.hourlyRate.toString()) : null,
      canEarnOvertime: user.compensationType !== 'SALARY_HCE',
    };
  }

  /**
   * Update only the hourly rate
   */
  async setHourlyRate(userId: string, hourlyRate: number): Promise<User> {
    if (hourlyRate < 0) {
      throw new Error('Hourly rate must be non-negative');
    }
    if (hourlyRate > 10000) {
      throw new Error('Hourly rate exceeds maximum allowed value');
    }

    // Get current compensation type
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { compensationType: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify user has a compensation type set
    if (!user.compensationType) {
      throw new Error('Cannot set hourly rate without compensation type');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { hourlyRate },
    });
  }

  /**
   * Update only the compensation type
   */
  async setCompensationType(userId: string, compensationType: CompensationType): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { compensationType },
    });
  }

  /**
   * Clear compensation configuration
   */
  async clearCompensation(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        compensationType: null,
        hourlyRate: null,
      },
    });
  }

  /**
   * Check if user can earn overtime
   */
  async canEarnOvertime(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { compensationType: true },
    });

    if (!user || !user.compensationType) {
      return false;
    }

    return user.compensationType !== 'SALARY_HCE';
  }

  /**
   * Get all users with compensation configured
   */
  async listUsersWithCompensation(tenantId: string): Promise<CompensationInfo[]> {
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        compensationType: { not: null },
        deletedAt: null,
      },
      select: {
        id: true,
        compensationType: true,
        hourlyRate: true,
      },
      orderBy: { name: 'asc' },
    });

    return users.map((user) => ({
      userId: user.id,
      compensationType: user.compensationType,
      hourlyRate: user.hourlyRate ? parseFloat(user.hourlyRate.toString()) : null,
      canEarnOvertime: user.compensationType !== 'SALARY_HCE',
    }));
  }
}

// Export singleton instance getter
let compensationServiceInstance: CompensationService | null = null;

export function getCompensationService(): CompensationService {
  if (!compensationServiceInstance) {
    const prisma = new PrismaClient();
    compensationServiceInstance = new CompensationService(prisma);
  }
  return compensationServiceInstance;
}
