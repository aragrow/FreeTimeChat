/**
 * Login Tracking Service
 *
 * Tracks login attempts and manages account lockouts
 */

import {
  type AccountLockout,
  AttemptType,
  type LoginAttempt,
  PrismaClient as MainPrismaClient,
} from '../generated/prisma-main';
import { getSecuritySettingsService } from './security-settings.service';

interface RecordAttemptDto {
  userId: string;
  attemptType: AttemptType;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export class LoginTrackingService {
  private prisma: MainPrismaClient;
  private securitySettingsService: ReturnType<typeof getSecuritySettingsService>;

  constructor() {
    this.prisma = new MainPrismaClient();
    this.securitySettingsService = getSecuritySettingsService();
  }

  /**
   * Record a login attempt
   */
  async recordAttempt(data: RecordAttemptDto): Promise<LoginAttempt> {
    return this.prisma.loginAttempt.create({
      data: {
        userId: data.userId,
        attemptType: data.attemptType,
        success: data.success,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  /**
   * Get failed attempts count within a time window (last 15 minutes)
   */
  async getRecentFailedAttempts(
    userId: string,
    attemptType: AttemptType,
    windowMinutes: number = 15
  ): Promise<number> {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);

    const count = await this.prisma.loginAttempt.count({
      where: {
        userId,
        attemptType,
        success: false,
        createdAt: { gte: since },
      },
    });

    return count;
  }

  /**
   * Check if account is currently locked
   */
  async isAccountLocked(userId: string): Promise<boolean> {
    const activeLockout = await this.prisma.accountLockout.findFirst({
      where: {
        userId,
        unlocked: false,
        lockedUntil: { gt: new Date() },
      },
      orderBy: { lockedAt: 'desc' },
    });

    return activeLockout !== null;
  }

  /**
   * Get active account lockout info
   */
  async getActiveLockout(userId: string): Promise<AccountLockout | null> {
    return this.prisma.accountLockout.findFirst({
      where: {
        userId,
        unlocked: false,
        lockedUntil: { gt: new Date() },
      },
      orderBy: { lockedAt: 'desc' },
    });
  }

  /**
   * Lock account due to too many failed attempts
   */
  async lockAccount(userId: string, clientId: string, reason: string): Promise<AccountLockout> {
    // Get security settings to determine lockout duration
    const settings = await this.securitySettingsService.getByClientId(clientId);
    const lockoutDuration = settings.accountLockoutDurationMinutes;

    const lockedUntil = new Date(Date.now() + lockoutDuration * 60 * 1000);

    return this.prisma.accountLockout.create({
      data: {
        userId,
        lockedUntil,
        reason,
      },
    });
  }

  /**
   * Manually unlock an account (admin action)
   */
  async unlockAccount(userId: string, unlockedBy: string): Promise<void> {
    await this.prisma.accountLockout.updateMany({
      where: {
        userId,
        unlocked: false,
      },
      data: {
        unlocked: true,
        unlockedAt: new Date(),
        unlockedBy,
      },
    });
  }

  /**
   * Automatically unlock expired lockouts (run as cron job)
   */
  async unlockExpiredAccounts(): Promise<number> {
    const result = await this.prisma.accountLockout.updateMany({
      where: {
        unlocked: false,
        lockedUntil: { lte: new Date() },
      },
      data: {
        unlocked: true,
        unlockedAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Check if user should be locked due to failed attempts
   * Returns true if account was locked
   */
  async checkAndLockIfNeeded(
    userId: string,
    clientId: string,
    attemptType: AttemptType
  ): Promise<boolean> {
    // Get security settings
    const settings = await this.securitySettingsService.getByClientId(clientId);

    // Determine max attempts based on type
    const maxAttempts =
      attemptType === AttemptType.PASSWORD
        ? settings.maxPasswordAttempts
        : settings.maxTwoFactorAttempts;

    // Count recent failed attempts
    const failedCount = await this.getRecentFailedAttempts(userId, attemptType);

    // Lock if threshold exceeded
    if (failedCount >= maxAttempts) {
      const reason =
        attemptType === AttemptType.PASSWORD
          ? `Too many failed password attempts (${failedCount})`
          : `Too many failed 2FA attempts (${failedCount})`;

      await this.lockAccount(userId, clientId, reason);
      return true;
    }

    return false;
  }

  /**
   * Get login attempt history for a user
   */
  async getUserLoginHistory(userId: string, limit: number = 50): Promise<LoginAttempt[]> {
    return this.prisma.loginAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get account lockout history for a user
   */
  async getUserLockoutHistory(userId: string, limit: number = 10): Promise<AccountLockout[]> {
    return this.prisma.accountLockout.findMany({
      where: { userId },
      orderBy: { lockedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Clean up old login attempts (run as cron job)
   */
  async cleanupOldAttempts(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await this.prisma.loginAttempt.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return result.count;
  }
}

// Singleton instance
let loginTrackingServiceInstance: LoginTrackingService | null = null;

/**
 * Get LoginTrackingService singleton instance
 */
export function getLoginTrackingService(): LoginTrackingService {
  if (!loginTrackingServiceInstance) {
    loginTrackingServiceInstance = new LoginTrackingService();
  }
  return loginTrackingServiceInstance;
}
