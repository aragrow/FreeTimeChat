/**
 * Impersonation Service
 *
 * Handles admin impersonation functionality with audit trail
 */

import crypto from 'crypto';
import { PrismaClient as MainPrismaClient } from '../generated/prisma-main';
import { getJWTService } from './jwt.service';
import { getRoleService } from './role.service';
import { getUserService } from './user.service';
import type { ImpersonationSession } from '../generated/prisma-main';
import type { ImpersonationMetadata } from '@freetimechat/types';

export class ImpersonationService {
  private prisma: MainPrismaClient;
  private userService: ReturnType<typeof getUserService>;
  private roleService: ReturnType<typeof getRoleService>;
  private jwtService: ReturnType<typeof getJWTService>;

  constructor() {
    this.prisma = new MainPrismaClient();
    this.userService = getUserService();
    this.roleService = getRoleService();
    this.jwtService = getJWTService();
  }

  /**
   * Start impersonation session
   */
  async startImpersonation(
    adminUserId: string,
    targetUserId: string
  ): Promise<{
    accessToken: string;
    session: ImpersonationSession;
  }> {
    // Check if feature is enabled
    const impersonationEnabled = process.env.ENABLE_IMPERSONATION === 'true';
    if (!impersonationEnabled) {
      throw new Error('Impersonation is currently disabled');
    }

    // Verify admin has permission
    const isAdmin = await this.roleService.userHasRole(adminUserId, 'admin');
    if (!isAdmin) {
      throw new Error('Only administrators can impersonate users');
    }

    // Get admin and target user
    const adminUser = await this.userService.findById(adminUserId);
    const targetUser = await this.userService.findById(targetUserId);

    if (!adminUser) {
      throw new Error('Admin user not found');
    }

    if (!targetUser) {
      throw new Error('Target user not found');
    }

    // Prevent impersonating other admins
    const targetIsAdmin = await this.roleService.userHasRole(targetUserId, 'admin');
    if (targetIsAdmin) {
      throw new Error('Cannot impersonate other administrators');
    }

    // Check if admin is already impersonating someone
    const activeSession = await this.prisma.impersonationSession.findFirst({
      where: {
        adminUserId,
        endedAt: null,
      },
    });

    if (activeSession) {
      throw new Error('You are already impersonating another user. Stop current session first.');
    }

    // Create impersonation session
    const sessionId = crypto.randomUUID();
    const session = await this.prisma.impersonationSession.create({
      data: {
        id: sessionId,
        adminUserId,
        targetUserId,
      },
    });

    // Get target user's role
    const targetRole = await this.userService.getPrimaryRole(targetUserId);

    // Create impersonation metadata
    const impersonationMetadata: ImpersonationMetadata = {
      isImpersonating: true,
      adminUserId,
      adminEmail: adminUser.email,
      sessionId,
      startedAt: Date.now(),
    };

    // Generate access token with impersonation metadata
    const accessToken = this.jwtService.signAccessToken({
      userId: targetUserId,
      email: targetUser.email,
      role: targetRole || 'user',
      clientId: targetUser.clientId,
      impersonation: impersonationMetadata,
    });

    return {
      accessToken,
      session,
    };
  }

  /**
   * Stop impersonation session
   */
  async stopImpersonation(sessionId: string): Promise<void> {
    const session = await this.prisma.impersonationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Impersonation session not found');
    }

    if (session.endedAt) {
      throw new Error('Impersonation session already ended');
    }

    // End the session
    await this.prisma.impersonationSession.update({
      where: { id: sessionId },
      data: {
        endedAt: new Date(),
      },
    });
  }

  /**
   * Get active impersonation session for admin
   */
  async getActiveSession(adminUserId: string): Promise<ImpersonationSession | null> {
    return this.prisma.impersonationSession.findFirst({
      where: {
        adminUserId,
        endedAt: null,
      },
    });
  }

  /**
   * Get impersonation session by ID
   */
  async getSession(sessionId: string): Promise<ImpersonationSession | null> {
    return this.prisma.impersonationSession.findUnique({
      where: { id: sessionId },
    });
  }

  /**
   * Get impersonation history for admin
   */
  async getAdminHistory(adminUserId: string, limit: number = 50): Promise<ImpersonationSession[]> {
    return this.prisma.impersonationSession.findMany({
      where: {
        adminUserId,
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get impersonation history for target user
   */
  async getTargetHistory(
    targetUserId: string,
    limit: number = 50
  ): Promise<ImpersonationSession[]> {
    return this.prisma.impersonationSession.findMany({
      where: {
        targetUserId,
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Check if user is being impersonated
   */
  async isBeingImpersonated(userId: string): Promise<boolean> {
    const activeSession = await this.prisma.impersonationSession.findFirst({
      where: {
        targetUserId: userId,
        endedAt: null,
      },
    });

    return activeSession !== null;
  }
}

// Singleton instance
let impersonationServiceInstance: ImpersonationService | null = null;

/**
 * Get ImpersonationService singleton instance
 */
export function getImpersonationService(): ImpersonationService {
  if (!impersonationServiceInstance) {
    impersonationServiceInstance = new ImpersonationService();
  }
  return impersonationServiceInstance;
}
