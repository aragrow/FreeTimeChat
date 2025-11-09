/**
 * System Settings Service
 *
 * Manages global system-wide settings
 */

import { PrismaClient as MainPrismaClient } from '../generated/prisma-main';

export class SystemSettingsService {
  private prisma: MainPrismaClient;

  constructor(prisma: MainPrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get system settings (creates if doesn't exist)
   */
  async getSettings() {
    // Upsert to ensure settings exist
    const settings = await this.prisma.systemSettings.upsert({
      where: { id: 'system' },
      update: {},
      create: {
        id: 'system',
        bypassTwoFactorForAllUsers: false,
      },
    });

    return settings;
  }

  /**
   * Update bypass 2FA for all users setting
   */
  async setBypassTwoFactorForAllUsers(bypass: boolean) {
    const settings = await this.prisma.systemSettings.upsert({
      where: { id: 'system' },
      update: {
        bypassTwoFactorForAllUsers: bypass,
      },
      create: {
        id: 'system',
        bypassTwoFactorForAllUsers: bypass,
      },
    });

    return settings;
  }

  /**
   * Check if 2FA is bypassed for all users
   */
  async isTwoFactorBypassedForAllUsers(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.bypassTwoFactorForAllUsers;
  }
}

// Singleton instance
let systemSettingsServiceInstance: SystemSettingsService | null = null;

export function getSystemSettingsService(): SystemSettingsService {
  if (!systemSettingsServiceInstance) {
    const prisma = new MainPrismaClient();
    systemSettingsServiceInstance = new SystemSettingsService(prisma);
  }
  return systemSettingsServiceInstance;
}
