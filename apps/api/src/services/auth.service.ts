/**
 * Authentication Service
 *
 * Handles authentication logic including login, registration, and token management
 */

import crypto from 'crypto';
import { PrismaClient as MainPrismaClient } from '../generated/prisma-main';
import { getJWTService } from './jwt.service';
import { getPasswordService } from './password.service';
import { getUserService } from './user.service';
import type { User } from '../generated/prisma-main';
import type { LoginResponse, RegisterRequest, UserPublic } from '@freetimechat/types';

export class AuthService {
  private prisma: MainPrismaClient;
  private userService: ReturnType<typeof getUserService>;
  private passwordService: ReturnType<typeof getPasswordService>;
  private jwtService: ReturnType<typeof getJWTService>;

  constructor() {
    this.prisma = new MainPrismaClient();
    this.userService = getUserService();
    this.passwordService = getPasswordService();
    this.jwtService = getJWTService();
  }

  /**
   * Authenticate user with email and password
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    // Find user by email
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new Error('Invalid credentials');
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
      throw new Error('Invalid credentials');
    }

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

    // Get user's primary role
    const role = await this.userService.getPrimaryRole(user.id);

    // Generate tokens
    const familyId = crypto.randomUUID();
    const { accessToken, refreshToken } = this.jwtService.generateTokenPair(
      {
        userId: user.id,
        email: user.email,
        role: role || 'user',
        clientId: user.clientId,
      },
      familyId
    );

    // Store refresh token
    await this.storeRefreshToken(user.id, refreshToken, familyId);

    // Update last login
    await this.userService.updateLastLogin(user.id);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
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

    // Create user
    const user = await this.userService.create({
      email: data.email,
      passwordHash,
      name: data.name,
      clientId,
    });

    // Get user's primary role (or assign default role)
    const role = await this.userService.getPrimaryRole(user.id);

    // Generate tokens
    const familyId = crypto.randomUUID();
    const { accessToken, refreshToken } = this.jwtService.generateTokenPair(
      {
        userId: user.id,
        email: user.email,
        role: role || 'user',
        clientId: user.clientId,
      },
      familyId
    );

    // Store refresh token
    await this.storeRefreshToken(user.id, refreshToken, familyId);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
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

      // Get user's role
      const role = await this.userService.getPrimaryRole(user.id);

      // Revoke old refresh token
      await this.revokeRefreshToken(refreshToken);

      // Generate new tokens with same family ID
      const newFamilyId = storedToken.familyId;
      const tokens = this.jwtService.generateTokenPair(
        {
          userId: user.id,
          email: user.email,
          role: role || 'user',
          clientId: user.clientId,
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
