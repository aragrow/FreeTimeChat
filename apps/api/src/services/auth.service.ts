/**
 * Authentication Service
 *
 * Handles authentication logic including login, registration, and token management
 */

import crypto from 'crypto';
import { AttemptType, PrismaClient as MainPrismaClient, type User } from '../generated/prisma-main';
import { getJWTService } from './jwt.service';
import { getLoginTrackingService } from './login-tracking.service';
import { getPasswordService } from './password.service';
import { getSystemSettingsService } from './system-settings.service';
import { getUserService } from './user.service';
import type { LoginResponse, RegisterRequest, UserPublic } from '@freetimechat/types';

export class AuthService {
  private prisma: MainPrismaClient;
  private userService: ReturnType<typeof getUserService>;
  private passwordService: ReturnType<typeof getPasswordService>;
  private jwtService: ReturnType<typeof getJWTService>;
  private loginTrackingService: ReturnType<typeof getLoginTrackingService>;
  private systemSettingsService: ReturnType<typeof getSystemSettingsService>;

  constructor() {
    this.prisma = new MainPrismaClient();
    this.userService = getUserService();
    this.passwordService = getPasswordService();
    this.jwtService = getJWTService();
    this.loginTrackingService = getLoginTrackingService();
    this.systemSettingsService = getSystemSettingsService();
  }

  /**
   * Calculate 2FA grace period based on user roles
   * Admin and TenantAdmin: 2 hours
   * Regular users: 10 days
   */
  private calculateRoleBasedGracePeriod(roles: string[]): Date {
    const now = new Date();

    // Check if user has admin or tenantadmin role
    const hasAdminRole = roles.some(
      (role) => role.toLowerCase() === 'admin' || role.toLowerCase() === 'tenantadmin'
    );

    if (hasAdminRole) {
      // 2 hours for admin and tenantadmin
      return new Date(now.getTime() + 2 * 60 * 60 * 1000);
    }

    // 10 days for regular users
    return new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
  }

  /**
   * Authenticate user with email and password
   * For non-admin users, tenantKey is required to identify the customer
   */
  async login(
    email: string,
    password: string,
    tenantKey?: string,
    skipTwoFactor?: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResponse> {
    // Find user by email with customer relation
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Get user's roles to check if admin
    let roles = await this.userService.getUserRoles(user.id);
    const isAdmin = roles.includes('admin');

    // Non-admin users must provide tenantKey
    if (!isAdmin && !tenantKey) {
      throw new Error('Tenant key is required');
    }

    // If tenantKey provided, validate customer access
    if (tenantKey) {
      const customer = await this.prisma.tenant.findUnique({
        where: { tenantKey },
      });

      if (!customer) {
        throw new Error('Invalid tenant key');
      }

      // For non-admin users, verify they belong to the customer
      if (!isAdmin && user.tenantId !== customer.id) {
        throw new Error('Access denied: User does not belong to this customer');
      }
    }

    // Check if account is locked
    const isLocked = await this.loginTrackingService.isAccountLocked(user.id);
    if (isLocked) {
      const lockout = await this.loginTrackingService.getActiveLockout(user.id);
      const minutesRemaining = lockout
        ? Math.ceil((lockout.lockedUntil.getTime() - Date.now()) / 60000)
        : 0;
      throw new Error(
        `Account is temporarily locked due to too many failed login attempts. Please try again in ${minutesRemaining} minutes.`
      );
    }

    // Check if user is active
    if (!user.isActive || user.deletedAt) {
      throw new Error('Account is inactive');
    }

    // Verify password (null check for OAuth-only users)
    if (!user.passwordHash) {
      throw new Error('Password authentication not available for this account');
    }

    const isValidPassword = await this.passwordService.verify(password, user.passwordHash);

    if (!isValidPassword) {
      // Record failed password attempt
      await this.loginTrackingService.recordAttempt({
        userId: user.id,
        attemptType: AttemptType.PASSWORD,
        success: false,
        ipAddress,
        userAgent,
      });

      // Check if account should be locked
      await this.loginTrackingService.checkAndLockIfNeeded(
        user.id,
        user.tenantId || 'system',
        AttemptType.PASSWORD
      );

      throw new Error('Invalid credentials');
    }

    // Record successful password attempt
    await this.loginTrackingService.recordAttempt({
      userId: user.id,
      attemptType: AttemptType.PASSWORD,
      success: true,
      ipAddress,
      userAgent,
    });

    // Check if password change is required
    if (user.requirePasswordChange) {
      return {
        accessToken: '',
        refreshToken: '',
        user: this.sanitizeUser(user),
        requiresPasswordChange: true,
      };
    }

    // Set 2FA grace period on first login
    if (!user.lastLoginAt && !user.twoFactorGracePeriodEndsAt) {
      const gracePeriodEndDate = this.calculateRoleBasedGracePeriod(roles);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { twoFactorGracePeriodEndsAt: gracePeriodEndDate },
      });
      // Update user object with new grace period
      user.twoFactorGracePeriodEndsAt = gracePeriodEndDate;
    }

    // Check if 2FA grace period has expired
    if (!user.twoFactorEnabled && user.twoFactorGracePeriodEndsAt) {
      const now = new Date();
      if (now > user.twoFactorGracePeriodEndsAt) {
        // Grace period expired, deactivate account
        await this.prisma.user.update({
          where: { id: user.id },
          data: { isActive: false },
        });

        throw new Error(
          `Account deactivated: 2FA must be enabled within the grace period. Please contact your administrator to reactivate your account.`
        );
      }
    }

    // Check if 2FA is enabled (skip in development if flag is set OR if global bypass is enabled)
    const globalBypass = await this.systemSettingsService.isTwoFactorBypassedForAllUsers();

    if (user.twoFactorEnabled && !skipTwoFactor && !globalBypass) {
      // Return partial response indicating 2FA is required
      return {
        accessToken: '',
        refreshToken: '',
        user: this.sanitizeUser(user),
        requiresTwoFactor: true,
      };
    }

    // Get user's roles (if not already fetched for admin check)
    if (!roles) {
      roles = await this.userService.getUserRoles(user.id);
    }
    const role = roles.length > 0 ? roles[0] : 'user';

    // Generate tokens
    const familyId = crypto.randomUUID();
    const { accessToken, refreshToken } = this.jwtService.generateTokenPair(
      {
        userId: user.id,
        email: user.email,
        role,
        roles: roles.length > 0 ? roles : ['user'],
        tenantId: user.tenantId || 'system',
        databaseName: user.tenant?.databaseName || 'freetimechat_client_dev',
      },
      familyId
    );

    // Store refresh token
    await this.storeRefreshToken(user.id, refreshToken, familyId);

    // Update last login
    await this.userService.updateLastLogin(user.id);

    // Add roles to user object for frontend
    const userWithRoles = {
      ...this.sanitizeUser(user),
      role,
      roles: roles.length > 0 ? roles : ['user'],
      tenantId: user.tenantId || 'system',
    };

    return {
      accessToken,
      refreshToken,
      user: userWithRoles as any, // Type assertion needed due to roles type mismatch
    };
  }

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<LoginResponse> {
    // Check if registration is enabled
    const registrationEnabled = process.env.ENABLE_REGISTRATION === 'true';
    if (!registrationEnabled) {
      throw new Error('Registration is currently disabled');
    }

    // Check if user already exists
    const existingUser = await this.userService.findByEmail(data.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Validate password
    const passwordValidation = this.passwordService.validatePassword(data.password);
    if (!passwordValidation.valid) {
      throw new Error(`Invalid password: ${passwordValidation.errors.join(', ')}`);
    }

    // Hash password
    const passwordHash = await this.passwordService.hash(data.password);

    // Determine customer ID
    let tenantId = data.clientId;
    if (!tenantId) {
      // Get default customer or create one
      const defaultCustomer = await this.prisma.tenant.findFirst({
        where: { slug: 'default' },
      });

      if (!defaultCustomer) {
        throw new Error('No default customer found. Please specify a tenantId.');
      }

      tenantId = defaultCustomer.id;
    }

    // Create user
    const user = await this.userService.create({
      email: data.email,
      passwordHash,
      name: data.name,
      tenantId,
    });

    // Get user's roles (or assign default role)
    const roles = await this.userService.getUserRoles(user.id);
    const role = roles.length > 0 ? roles[0] : 'user';

    // Calculate role-based 2FA grace period
    const gracePeriodEndDate = this.calculateRoleBasedGracePeriod(
      roles.length > 0 ? roles : ['user']
    );

    // Set 2FA grace period for new user
    await this.prisma.user.update({
      where: { id: user.id },
      data: { twoFactorGracePeriodEndsAt: gracePeriodEndDate },
    });

    // Get user with customer info for database name
    const userWithCustomer = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { tenant: true },
    });
    if (!userWithCustomer) {
      throw new Error('User not found after creation');
    }

    // Generate tokens
    const familyId = crypto.randomUUID();
    const { accessToken, refreshToken } = this.jwtService.generateTokenPair(
      {
        userId: user.id,
        email: user.email,
        role,
        roles: roles.length > 0 ? roles : ['user'],
        tenantId: user.tenantId || 'system',
        databaseName: userWithCustomer.tenant?.databaseName || 'freetimechat_client_dev',
      },
      familyId
    );

    // Store refresh token
    await this.storeRefreshToken(user.id, refreshToken, familyId);

    // Add roles to user object for frontend
    const userWithRoles = {
      ...this.sanitizeUser(user),
      role,
      roles: roles.length > 0 ? roles : ['user'],
      tenantId: user.tenantId || 'system',
    };

    return {
      accessToken,
      refreshToken,
      user: userWithRoles as any, // Type assertion needed due to roles type mismatch
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      // Verify refresh token
      const decoded = this.jwtService.verifyRefreshToken(refreshToken);

      // Check if refresh token exists and is not revoked
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!storedToken) {
        throw new Error('Invalid refresh token');
      }

      if (storedToken.isRevoked) {
        // Token reuse detected - revoke entire family
        await this.revokeTokenFamily(storedToken.familyId);
        throw new Error('Token reuse detected');
      }

      // Check expiration
      if (storedToken.expiresAt < new Date()) {
        throw new Error('Refresh token expired');
      }

      // Get user with customer relation
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        include: { tenant: true },
      });
      if (!user || !user.isActive || user.deletedAt) {
        throw new Error('User not found or inactive');
      }

      // Get user's roles
      const roles = await this.userService.getUserRoles(user.id);
      const role = roles.length > 0 ? roles[0] : 'user';

      // Revoke old refresh token
      await this.revokeRefreshToken(refreshToken);

      // Generate new tokens with same family ID
      const newFamilyId = storedToken.familyId;
      const tokens = this.jwtService.generateTokenPair(
        {
          userId: user.id,
          email: user.email,
          role,
          roles: roles.length > 0 ? roles : ['user'],
          tenantId: user.tenantId || 'system',
          databaseName: user.tenant?.databaseName || 'freetimechat_client_dev',
        },
        newFamilyId
      );

      // Store new refresh token
      await this.storeRefreshToken(user.id, tokens.refreshToken, newFamilyId);

      return tokens;
    } catch (error) {
      // Log the specific error for debugging
      console.error('Refresh token error details:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Store refresh token in database
   */
  private async storeRefreshToken(userId: string, token: string, familyId: string): Promise<void> {
    const expirySeconds = this.jwtService.getRefreshTokenExpiry();
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        familyId,
        expiresAt,
      },
    });
  }

  /**
   * Revoke a refresh token
   */
  private async revokeRefreshToken(token: string): Promise<void> {
    try {
      await this.prisma.refreshToken.update({
        where: { token },
        data: { isRevoked: true },
      });
    } catch (error) {
      // Token might not exist or already be revoked - this is acceptable
      // Just log and continue
      console.warn(
        'Failed to revoke refresh token:',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Revoke all tokens in a family (token rotation security)
   */
  private async revokeTokenFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId },
      data: { isRevoked: true },
    });
  }

  /**
   * Logout - revoke refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    await this.revokeRefreshToken(refreshToken);
  }

  /**
   * Sanitize user data for public exposure
   */
  private sanitizeUser(user: User): UserPublic {
    const { passwordHash: _passwordHash, twoFactorSecret: _twoFactorSecret, ...publicUser } = user;
    // Convert null to undefined for optional fields to match UserPublic type
    return {
      ...publicUser,
      googleId: publicUser.googleId ?? undefined,
      lastLoginAt: publicUser.lastLoginAt ?? undefined,
      compensationType: publicUser.compensationType ?? undefined,
      hourlyRate: publicUser.hourlyRate ?? undefined,
      deletedAt: publicUser.deletedAt ?? undefined,
    } as UserPublic;
  }
}

// Singleton instance
let authServiceInstance: AuthService | null = null;

/**
 * Get AuthService singleton instance
 */
export function getAuthService(): AuthService {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService();
  }
  return authServiceInstance;
}
