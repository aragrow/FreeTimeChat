/**
 * JWT Service
 *
 * Handles JWT token generation and verification using RS256 algorithm
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import type { ImpersonationMetadata, JWTPayload } from '@freetimechat/types';

interface SignTokenOptions {
  userId: string;
  email: string;
  role: string;
  roles: string[];
  clientId: string;
  databaseName: string;
  impersonation?: ImpersonationMetadata;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class JWTService {
  private privateKey: Buffer;
  private publicKey: Buffer;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;
  private issuer: string;
  private audience: string;

  constructor() {
    // Load RSA keys
    const privateKeyPath = path.resolve(process.env.JWT_PRIVATE_KEY_PATH || './keys/private.pem');
    const publicKeyPath = path.resolve(process.env.JWT_PUBLIC_KEY_PATH || './keys/public.pem');

    if (!fs.existsSync(privateKeyPath)) {
      throw new Error(`Private key not found at ${privateKeyPath}`);
    }

    if (!fs.existsSync(publicKeyPath)) {
      throw new Error(`Public key not found at ${publicKeyPath}`);
    }

    this.privateKey = fs.readFileSync(privateKeyPath);
    this.publicKey = fs.readFileSync(publicKeyPath);

    // JWT configuration from environment
    this.accessTokenExpiry = process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d';
    this.issuer = process.env.JWT_ISSUER || 'freetimechat-api';
    this.audience = process.env.JWT_AUDIENCE || 'freetimechat-web';
  }

  /**
   * Sign an access token
   */
  signAccessToken(options: SignTokenOptions): string {
    // Generate unique JWT ID to prevent duplicate tokens
    const jti = crypto.randomBytes(16).toString('hex');

    const payload: Omit<JWTPayload, 'iat' | 'exp'> & { jti: string } = {
      sub: options.userId,
      email: options.email,
      role: options.role,
      roles: options.roles,
      clientId: options.clientId,
      databaseName: options.databaseName,
      jti,
    };

    if (options.impersonation) {
      payload.impersonation = options.impersonation;
    }

    // @ts-expect-error - jsonwebtoken types are overly strict for RS256 with string expiresIn
    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: this.accessTokenExpiry,
      issuer: this.issuer,
      audience: this.audience,
    });
  }

  /**
   * Sign a refresh token (simpler payload)
   */
  signRefreshToken(userId: string, familyId: string): string {
    // Generate unique JWT ID to prevent duplicate tokens
    const jti = crypto.randomBytes(16).toString('hex');

    // @ts-expect-error - jsonwebtoken types are overly strict for RS256 with string expiresIn
    return jwt.sign(
      {
        sub: userId,
        familyId,
        type: 'refresh',
        jti,
      },
      this.privateKey,
      {
        algorithm: 'RS256',
        expiresIn: this.refreshTokenExpiry,
        issuer: this.issuer,
        audience: this.audience,
      }
    );
  }

  /**
   * Generate both access and refresh tokens
   */
  generateTokenPair(options: SignTokenOptions, familyId: string): TokenPair {
    return {
      accessToken: this.signAccessToken(options),
      refreshToken: this.signRefreshToken(options.userId, familyId),
    };
  }

  /**
   * Verify and decode an access token
   */
  verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        issuer: this.issuer,
        audience: this.audience,
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Verify and decode a refresh token
   */
  verifyRefreshToken(token: string): {
    sub: string;
    familyId: string;
    type: string;
    iat: number;
    exp: number;
  } {
    try {
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        issuer: this.issuer,
        audience: this.audience,
      }) as { sub: string; familyId: string; type: string; iat: number; exp: number };

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Decode token without verification (use carefully!)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }

  /**
   * Get token expiration time in seconds
   */
  getAccessTokenExpiry(): number {
    return this.parseExpiry(this.accessTokenExpiry);
  }

  /**
   * Get refresh token expiration time in seconds
   */
  getRefreshTokenExpiry(): number {
    return this.parseExpiry(this.refreshTokenExpiry);
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * (multipliers[unit] || 60);
  }
}

// Singleton instance
let jwtServiceInstance: JWTService | null = null;

/**
 * Get JWT service singleton instance
 */
export function getJWTService(): JWTService {
  if (!jwtServiceInstance) {
    jwtServiceInstance = new JWTService();
  }
  return jwtServiceInstance;
}
