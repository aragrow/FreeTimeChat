/**
 * Security Settings Service
 *
 * Manages security configuration for 2FA grace periods, required roles, and account lockout settings
 */

import { PrismaClient as MainPrismaClient, type SecuritySettings } from '../generated/prisma-main';

interface CreateSecuritySettingsDto {
  tenantId: string;
  twoFactorGracePeriodDays?: number;
  twoFactorRequiredRoles?: string[];
  twoFactorBypassUrls?: string[];
  maxPasswordAttempts?: number;
  maxTwoFactorAttempts?: number;
  accountLockoutDurationMinutes?: number;
}

interface UpdateSecuritySettingsDto {
  twoFactorGracePeriodDays?: number;
  twoFactorRequiredRoles?: string[];
  twoFactorBypassUrls?: string[];
  maxPasswordAttempts?: number;
  maxTwoFactorAttempts?: number;
  accountLockoutDurationMinutes?: number;
}

export class SecuritySettingsService {
  private prisma: MainPrismaClient;

  constructor() {
    this.prisma = new MainPrismaClient();
  }

  /**
   * Get security settings for a tenant (creates default if not exists)
   * For system/admin users (tenantId = 'system' or null), returns default settings without saving
   */
  async getByTenantId(tenantId: string | null): Promise<SecuritySettings> {
    // For system/admin users without a tenant, return default settings
    if (!tenantId || tenantId === 'system') {
      return {
        id: 'system-default',
        tenantId: 'system',
        twoFactorGracePeriodDays: 10,
        twoFactorRequiredRoles: [],
        twoFactorBypassUrls: [],
        maxPasswordAttempts: 5,
        maxTwoFactorAttempts: 3,
        accountLockoutDurationMinutes: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as SecuritySettings;
    }

    let settings = await this.prisma.securitySettings.findUnique({
      where: { tenantId },
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await this.create({ tenantId });
    }

    return settings;
  }

  /**
   * Create security settings for a client
   */
  async create(data: CreateSecuritySettingsDto): Promise<SecuritySettings> {
    return this.prisma.securitySettings.create({
      data: {
        tenantId: data.tenantId,
        twoFactorGracePeriodDays: data.twoFactorGracePeriodDays ?? 10,
        twoFactorRequiredRoles: data.twoFactorRequiredRoles ?? [],
        twoFactorBypassUrls: data.twoFactorBypassUrls ?? [],
        maxPasswordAttempts: data.maxPasswordAttempts ?? 5,
        maxTwoFactorAttempts: data.maxTwoFactorAttempts ?? 3,
        accountLockoutDurationMinutes: data.accountLockoutDurationMinutes ?? 30,
      },
    });
  }

  /**
   * Update security settings for a client
   */
  async update(tenantId: string, data: UpdateSecuritySettingsDto): Promise<SecuritySettings> {
    return this.prisma.securitySettings.update({
      where: { tenantId },
      data: {
        ...(data.twoFactorGracePeriodDays !== undefined && {
          twoFactorGracePeriodDays: data.twoFactorGracePeriodDays,
        }),
        ...(data.twoFactorRequiredRoles !== undefined && {
          twoFactorRequiredRoles: data.twoFactorRequiredRoles,
        }),
        ...(data.twoFactorBypassUrls !== undefined && {
          twoFactorBypassUrls: data.twoFactorBypassUrls,
        }),
        ...(data.maxPasswordAttempts !== undefined && {
          maxPasswordAttempts: data.maxPasswordAttempts,
        }),
        ...(data.maxTwoFactorAttempts !== undefined && {
          maxTwoFactorAttempts: data.maxTwoFactorAttempts,
        }),
        ...(data.accountLockoutDurationMinutes !== undefined && {
          accountLockoutDurationMinutes: data.accountLockoutDurationMinutes,
        }),
      },
    });
  }

  /**
   * Check if 2FA is required for a user based on their roles
   */
  isUserRequired2FA(userRoles: string[], settings: SecuritySettings): boolean {
    if (settings.twoFactorRequiredRoles.length === 0) {
      // If no roles specified, 2FA is not required
      return false;
    }

    // Check if user has any of the required roles (case-insensitive)
    const requiredRolesLower = settings.twoFactorRequiredRoles.map((r) => r.toLowerCase());
    const userRolesLower = userRoles.map((r) => r.toLowerCase());

    return userRolesLower.some((role) => requiredRolesLower.includes(role));
  }

  /**
   * Check if a URL should bypass 2FA requirement
   */
  shouldBypass2FA(url: string, settings: SecuritySettings): boolean {
    if (settings.twoFactorBypassUrls.length === 0) {
      return false;
    }

    // Check if URL matches any bypass pattern (supports wildcards)
    return settings.twoFactorBypassUrls.some((pattern) => {
      // Convert wildcard pattern to regex
      const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
      const regex = new RegExp(`^${regexPattern}$`, 'i');
      return regex.test(url);
    });
  }

  /**
   * Check if user is within grace period for 2FA setup
   */
  isWithinGracePeriod(user: { twoFactorGracePeriodEndsAt: Date | null }): boolean {
    if (!user.twoFactorGracePeriodEndsAt) {
      return false;
    }

    return new Date() < user.twoFactorGracePeriodEndsAt;
  }

  /**
   * Calculate grace period end date for a new user
   */
  calculateGracePeriodEndDate(gracePeriodDays: number): Date {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + gracePeriodDays);
    return endDate;
  }

  /**
   * List all security settings (admin only)
   */
  async listAll(): Promise<SecuritySettings[]> {
    return this.prisma.securitySettings.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}

// Singleton instance
let securitySettingsServiceInstance: SecuritySettingsService | null = null;

/**
 * Get SecuritySettingsService singleton instance
 */
export function getSecuritySettingsService(): SecuritySettingsService {
  if (!securitySettingsServiceInstance) {
    securitySettingsServiceInstance = new SecuritySettingsService();
  }
  return securitySettingsServiceInstance;
}
