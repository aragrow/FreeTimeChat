/**
 * Unit Tests for JWTService
 *
 * Tests JWT token generation, verification, and decoding
 */

import fs from 'fs';
import path from 'path';
import { JWTService } from '../../../services/jwt.service';
import type { ImpersonationMetadata } from '@freetimechat/types';

describe('JWTService', () => {
  let jwtService: JWTService;
  const testPrivateKeyPath = path.join(__dirname, '../../fixtures/test-private.pem');
  const testPublicKeyPath = path.join(__dirname, '../../fixtures/test-public.pem');

  beforeAll(() => {
    // Create test key directory
    const fixturesDir = path.join(__dirname, '../../fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // Set environment variables to use test keys
    process.env.JWT_PRIVATE_KEY_PATH = testPrivateKeyPath;
    process.env.JWT_PUBLIC_KEY_PATH = testPublicKeyPath;
    process.env.JWT_ACCESS_TOKEN_EXPIRY = '15m';
    process.env.JWT_REFRESH_TOKEN_EXPIRY = '7d';
    process.env.JWT_ISSUER = 'test-issuer';
    process.env.JWT_AUDIENCE = 'test-audience';

    // Generate test RSA keys if they don't exist
    if (!fs.existsSync(testPrivateKeyPath)) {
      const { generateKeyPairSync } = require('crypto');
      const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });
      fs.writeFileSync(testPrivateKeyPath, privateKey);
      fs.writeFileSync(testPublicKeyPath, publicKey);
    }
  });

  beforeEach(() => {
    jwtService = new JWTService();
  });

  describe('signAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = jwtService.signAccessToken({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
        clientId: 'client-456',
      });

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should include impersonation metadata when provided', () => {
      const impersonation: ImpersonationMetadata = {
        isImpersonating: true,
        adminUserId: 'admin-123',
        adminEmail: 'admin@example.com',
        sessionId: 'session-789',
        startedAt: Date.now(),
      };

      const token = jwtService.signAccessToken({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
        clientId: 'client-456',
        impersonation,
      });

      const decoded = jwtService.verifyAccessToken(token);
      expect(decoded.impersonation).toEqual(impersonation);
    });
  });

  describe('signRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = jwtService.signRefreshToken('user-123', 'family-456');

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify and decode a valid access token', () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const role = 'user';
      const clientId = 'client-456';

      const token = jwtService.signAccessToken({ userId, email, role, clientId });
      const decoded = jwtService.verifyAccessToken(token);

      expect(decoded.sub).toBe(userId);
      expect(decoded.email).toBe(email);
      expect(decoded.role).toBe(role);
      expect(decoded.clientId).toBe(clientId);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        jwtService.verifyAccessToken('invalid-token');
      }).toThrow('Invalid token');
    });

    it('should throw error for expired token', () => {
      // Create a token with immediate expiry
      process.env.JWT_ACCESS_TOKEN_EXPIRY = '0s';
      const expiredService = new JWTService();

      const token = expiredService.signAccessToken({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
        clientId: 'client-456',
      });

      // Wait a moment to ensure expiry
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(() => {
            jwtService.verifyAccessToken(token);
          }).toThrow('Token expired');
          process.env.JWT_ACCESS_TOKEN_EXPIRY = '15m';
          resolve(undefined);
        }, 100);
      });
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify and decode a valid refresh token', () => {
      const userId = 'user-123';
      const familyId = 'family-456';

      const token = jwtService.signRefreshToken(userId, familyId);
      const decoded = jwtService.verifyRefreshToken(token);

      expect(decoded.sub).toBe(userId);
      expect(decoded.familyId).toBe(familyId);
      expect(decoded.type).toBe('refresh');
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should throw error for access token used as refresh token', () => {
      const accessToken = jwtService.signAccessToken({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
        clientId: 'client-456',
      });

      expect(() => {
        jwtService.verifyRefreshToken(accessToken);
      }).toThrow('Invalid token type');
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const tokens = jwtService.generateTokenPair(
        {
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
          clientId: 'client-456',
        },
        'family-789'
      );

      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);

      // Verify both tokens are valid
      const accessDecoded = jwtService.verifyAccessToken(tokens.accessToken);
      const refreshDecoded = jwtService.verifyRefreshToken(tokens.refreshToken);

      expect(accessDecoded.sub).toBe('user-123');
      expect(refreshDecoded.sub).toBe('user-123');
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = jwtService.signAccessToken({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
        clientId: 'client-456',
      });

      const decoded = jwtService.decodeToken(token);

      expect(decoded).toBeTruthy();
      expect(decoded?.sub).toBe('user-123');
      expect(decoded?.email).toBe('test@example.com');
    });

    it('should return null for invalid token', () => {
      const decoded = jwtService.decodeToken('invalid-token');
      expect(decoded).toBeNull();
    });
  });

  describe('getAccessTokenExpiry', () => {
    it('should return correct expiry time in seconds', () => {
      const expiry = jwtService.getAccessTokenExpiry();
      expect(expiry).toBe(900); // 15 minutes = 900 seconds
    });
  });

  describe('getRefreshTokenExpiry', () => {
    it('should return correct expiry time in seconds', () => {
      const expiry = jwtService.getRefreshTokenExpiry();
      expect(expiry).toBe(604800); // 7 days = 604800 seconds
    });
  });
});
