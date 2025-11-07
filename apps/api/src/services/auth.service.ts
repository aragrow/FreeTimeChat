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
import { getSecuritySettingsService } from './security-settings.service';
import { getUserService } from './user.service';
import type { LoginResponse, RegisterRequest, UserPublic } from '@freetimechat/types';

export class AuthService {
  private prisma: MainPrismaClient;
  private userService: ReturnType<typeof getUserService>;
  private passwordService: ReturnType<typeof getPasswordService>;
  private jwtService: ReturnType<typeof getJWTService>;
  private loginTrackingService: ReturnType<typeof getLoginTrackingService>;
  private securitySettingsService: ReturnType<typeof getSecuritySettingsService>;

  constructor() {
    this.prisma = new MainPrismaClient();
    this.userService = getUserService();
    this.passwordService = getPasswordService();
    this.jwtService = getJWTService();
    this.loginTrackingService = getLoginTrackingService();
    this.securitySettingsService = getSecuritySettingsService();
  }

  /**
   * Authenticate user with email and password
   */
  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResponse> {
    // Find user by email
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new Error('Invalid credentials');
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
        user.clientId || null,
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

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Return partial response indicating 2FA is required
      return {
        accessToken: '',
        refreshToken: '',
        user: this.sanitizeUser(user),
        requiresTwoFactor: true,
      };
    }

    // Get user's roles
    const roles = await this.userService.getUserRoles(user.id);
    const role = roles.length > 0 ? roles[0] : 'user';

    // Generate tokens
    const familyId = crypto.randomUUID();
    const { accessToken, refreshToken } = this.jwtService.generateTokenPair(
      {
        userId: user.id,
        email: user.email,
        role,
        roles: roles.length > 0 ? roles : ['user'],
        clientId: user.clientId || undefined,
        databaseName: user.client?.databaseName || undefined,
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
    };

    return {
      accessToken,
      refreshToken,
      user: userWithRoles,
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

    // Determine client ID
    let clientId = data.clientId;
    if (!clientId) {
      // Get default client or create one
      const defaultClient = await this.prisma.client.findFirst({
        where: { slug: 'default' },
      });

      if (!defaultClient) {
        throw new Error('No default client found. Please specify a clientId.');
      }

      clientId = defaultClient.id;
    }

    // Get security settings for grace period
    const securitySettings = await this.securitySettingsService.getByClientId(clientId);
    const gracePeriodEndDate = this.securitySettingsService.calculateGracePeriodEndDate(
      securitySettings.twoFactorGracePeriodDays
    );

    // Create user
    const user = await this.userService.create({
      email: data.email,
      passwordHash,
      name: data.name,
      clientId,
    });

    // Set 2FA grace period for new user
    await this.prisma.user.update({
      where: { id: user.id },
      data: { twoFactorGracePeriodEndsAt: gracePeriodEndDate },
    });

    // Get user's roles (or assign default role)
    const roles = await this.userService.getUserRoles(user.id);
    const role = roles.length > 0 ? roles[0] : 'user';

    // Get user with client info for database name
    const userWithClient = await this.userService.findById(user.id);
    if (!userWithClient) {
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
        clientId: user.clientId || undefined,
        databaseName: userWithClient.client?.databaseName || undefined,
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
    };

    return {
      accessToken,
      refreshToken,
      user: userWithRoles,
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

      // Get user
      const user = await this.userService.findById(decoded.sub);
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
          clientId: user.clientId || undefined,
          databaseName: user.client?.databaseName || undefined,
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
