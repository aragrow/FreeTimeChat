/**
 * Google OAuth Service
 *
 * Handles Google OAuth authentication using Passport
 */

import crypto from 'crypto';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { getJWTService } from './jwt.service';
import { getUserService } from './user.service';
import type { GoogleUserInfo } from '@freetimechat/types';
import type { VerifyCallback } from 'passport-google-oauth20';

export class GoogleOAuthService {
  private userService: ReturnType<typeof getUserService>;
  private jwtService: ReturnType<typeof getJWTService>;
  private clientID: string;
  private clientSecret: string;
  private callbackURL: string;

  constructor() {
    this.userService = getUserService();
    this.jwtService = getJWTService();

    this.clientID = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.callbackURL = process.env.GOOGLE_CALLBACK_URL || '';

    if (!this.clientID || !this.clientSecret) {
      console.warn(
        'Google OAuth credentials not configured. Google authentication will not be available.'
      );
    }

    this.setupStrategy();
  }

  /**
   * Set up Passport Google OAuth strategy
   */
  private setupStrategy(): void {
    if (!this.clientID || !this.clientSecret) {
      return;
    }

    passport.use(
      new GoogleStrategy(
        {
          clientID: this.clientID,
          clientSecret: this.clientSecret,
          callbackURL: this.callbackURL,
        },
        this.verifyCallback.bind(this)
      )
    );

    // Serialize/deserialize user for session support (if needed)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
      try {
        const user = await this.userService.findById(id);
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });
  }

  /**
   * Passport verify callback
   */
  private async verifyCallback(
    accessToken: string,
    refreshToken: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    profile: any,
    done: VerifyCallback
  ): Promise<void> {
    try {
      const googleUserInfo: GoogleUserInfo = {
        id: profile.id,
        email: profile.emails?.[0]?.value || '',
        verified_email: profile.emails?.[0]?.verified || false,
        name: profile.displayName || '',
        given_name: profile.name?.givenName || '',
        family_name: profile.name?.familyName || '',
        picture: profile.photos?.[0]?.value || '',
        locale: profile._json?.locale || 'en',
      };

      // Try to find user by Google ID
      let user = await this.userService.findByGoogleId(googleUserInfo.id);

      if (!user) {
        // Try to find user by email
        user = await this.userService.findByEmail(googleUserInfo.email);

        if (user) {
          // Link Google account to existing user
          if (!user.googleId) {
            user = await this.userService.linkGoogleAccount(user.id, googleUserInfo.id);
          }
        } else {
          // Create new user
          user = await this.createGoogleUser(googleUserInfo);
        }
      }

      // Check if user is active
      if (!user.isActive || user.deletedAt) {
        done(new Error('Account is inactive'), undefined);
        return;
      }

      // Update last login
      await this.userService.updateLastLogin(user.id);

      done(null, user);
    } catch (error) {
      done(error as Error, undefined);
    }
  }

  /**
   * Create a new user from Google profile
   */
  private async createGoogleUser(googleUserInfo: GoogleUserInfo) {
    // Get default client
    const defaultClient = await this.userService['prisma'].client.findFirst({
      where: { slug: 'default' },
    });

    if (!defaultClient) {
      throw new Error('No default client found');
    }

    return this.userService.create({
      email: googleUserInfo.email,
      name: googleUserInfo.name,
      clientId: defaultClient.id,
      googleId: googleUserInfo.id,
    });
  }

  /**
   * Authenticate with Google (start OAuth flow)
   */
  authenticate() {
    return passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
    });
  }

  /**
   * Handle OAuth callback
   */
  authenticateCallback() {
    return passport.authenticate('google', {
      session: false,
      failureRedirect: '/auth/google/failure',
    });
  }

  /**
   * Generate tokens for authenticated user
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async generateTokens(user: any): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // Get user's primary role
    const role = await this.userService.getPrimaryRole(user.id);

    // Generate tokens
    const familyId = crypto.randomUUID();
    const tokens = this.jwtService.generateTokenPair(
      {
        userId: user.id,
        email: user.email,
        role: role || 'user',
        clientId: user.clientId,
      },
      familyId
    );

    // Store refresh token
    const expirySeconds = this.jwtService.getRefreshTokenExpiry();
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);

    await this.userService['prisma'].refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        familyId,
        expiresAt,
      },
    });

    return tokens;
  }
}

// Singleton instance
let googleOAuthServiceInstance: GoogleOAuthService | null = null;

/**
 * Get GoogleOAuthService singleton instance
 */
export function getGoogleOAuthService(): GoogleOAuthService {
  if (!googleOAuthServiceInstance) {
    googleOAuthServiceInstance = new GoogleOAuthService();
  }
  return googleOAuthServiceInstance;
}
