/**
 * Unit Tests for TwoFactorService
 *
 * Tests two-factor authentication (2FA) functionality
 */

import { TwoFactorService } from '../../../services/two-factor.service';

describe('TwoFactorService', () => {
  let twoFactorService: TwoFactorService;

  beforeEach(() => {
    twoFactorService = new TwoFactorService();
  });

  describe('generateSecret', () => {
    it('should generate a valid secret', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const appName = 'FreeTimeChat';

      const result = await twoFactorService.generateSecret(userId, email, appName);

      expect(result).toBeDefined();
      expect(result.secret).toBeTruthy();
      expect(typeof result.secret).toBe('string');
      expect(result.qrCode).toBeTruthy();
      expect(result.qrCode.startsWith('data:image/png;base64,')).toBe(true);
      expect(result.backupCodes).toBeInstanceOf(Array);
      expect(result.backupCodes).toHaveLength(10);
    });

    it('should generate unique secrets each time', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const appName = 'FreeTimeChat';

      const result1 = await twoFactorService.generateSecret(userId, email, appName);
      const result2 = await twoFactorService.generateSecret(userId, email, appName);

      expect(result1.secret).not.toBe(result2.secret);
      expect(result1.backupCodes).not.toEqual(result2.backupCodes);
    });

    it('should generate backup codes with correct format', async () => {
      const result = await twoFactorService.generateSecret(
        'user-123',
        'test@example.com',
        'FreeTimeChat'
      );

      result.backupCodes.forEach((code) => {
        expect(typeof code).toBe('string');
        expect(code).toMatch(/^[A-Z0-9]{8}$/); // 8 alphanumeric characters
      });
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      // Generate a secret
      const result = await twoFactorService.generateSecret(
        'user-123',
        'test@example.com',
        'FreeTimeChat'
      );

      // Generate a token using the secret (simulating authenticator app)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const speakeasy = require('speakeasy');
      const validToken = speakeasy.totp({
        secret: result.secret,
        encoding: 'base32',
      });

      // Verify the token
      const isValid = twoFactorService.verifyToken(result.secret, validToken);
      expect(isValid).toBe(true);
    });

    it('should reject an invalid token', async () => {
      const result = await twoFactorService.generateSecret(
        'user-123',
        'test@example.com',
        'FreeTimeChat'
      );
      const invalidToken = '000000'; // Invalid token

      const isValid = twoFactorService.verifyToken(result.secret, invalidToken);
      expect(isValid).toBe(false);
    });

    it('should reject expired tokens', async () => {
      const result = await twoFactorService.generateSecret(
        'user-123',
        'test@example.com',
        'FreeTimeChat'
      );

      // Generate a token from 2 minutes ago (outside the 30-second window)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const speakeasy = require('speakeasy');
      const oldToken = speakeasy.totp({
        secret: result.secret,
        encoding: 'base32',
        time: Math.floor(Date.now() / 1000) - 120, // 2 minutes ago
      });

      const isValid = twoFactorService.verifyToken(result.secret, oldToken);
      expect(isValid).toBe(false);
    });
  });

  describe('verifyBackupCode', () => {
    it('should verify a valid backup code', async () => {
      const backupCodes = twoFactorService['generateBackupCodes']();
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const passwordService = require('../../../services/password.service').getPasswordService();

      // Hash the backup codes using bcrypt (like production would)
      const hashedCodes = await Promise.all(backupCodes.map((code) => passwordService.hash(code)));

      const codeToVerify = backupCodes[0];
      const isValid = await twoFactorService.verifyBackupCode(
        codeToVerify,
        JSON.stringify(hashedCodes)
      );

      expect(isValid).toBe(true);
    });

    it('should reject an invalid backup code', async () => {
      const backupCodes = twoFactorService['generateBackupCodes']();
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const passwordService = require('../../../services/password.service').getPasswordService();

      const hashedCodes = await Promise.all(backupCodes.map((code) => passwordService.hash(code)));

      const invalidCode = 'INVALID1';
      const isValid = await twoFactorService.verifyBackupCode(
        invalidCode,
        JSON.stringify(hashedCodes)
      );

      expect(isValid).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const backupCodes = twoFactorService['generateBackupCodes']();
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const passwordService = require('../../../services/password.service').getPasswordService();

      const hashedCodes = await Promise.all(backupCodes.map((code) => passwordService.hash(code)));

      const codeToVerify = backupCodes[0].toLowerCase();
      const isValid = await twoFactorService.verifyBackupCode(
        codeToVerify,
        JSON.stringify(hashedCodes)
      );

      // Backup codes should be case-sensitive for security
      expect(isValid).toBe(false);
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate 10 backup codes', () => {
      const codes = twoFactorService['generateBackupCodes']();
      expect(codes).toHaveLength(10);
    });

    it('should generate unique codes', () => {
      const codes = twoFactorService['generateBackupCodes']();
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(10);
    });

    it('should generate codes with correct format', () => {
      const codes = twoFactorService['generateBackupCodes']();
      codes.forEach((code) => {
        expect(typeof code).toBe('string');
        expect(code).toMatch(/^[A-Z0-9]{8}$/);
      });
    });
  });
});
