/**
 * Unit Tests for PasswordService
 *
 * Tests password hashing and verification
 */

import { PasswordService } from '../../../services/password.service';

describe('PasswordService', () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    passwordService = new PasswordService();
  });

  describe('hash', () => {
    it('should hash a password', async () => {
      const password = 'SecurePassword123!';
      const hash = await passwordService.hash(password);

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true); // bcrypt hash starts with $2a, $2b, or $2y
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'SecurePassword123!';
      const hash1 = await passwordService.hash(password);
      const hash2 = await passwordService.hash(password);

      expect(hash1).not.toBe(hash2); // bcrypt includes salt
    });

    it('should handle special characters', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:",.<>?/~`';
      const hash = await passwordService.hash(password);

      expect(hash).toBeTruthy();
      expect(await passwordService.verify(password, hash)).toBe(true);
    });
  });

  describe('verify', () => {
    it('should verify a correct password', async () => {
      const password = 'SecurePassword123!';
      const hash = await passwordService.hash(password);
      const isValid = await passwordService.verify(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'SecurePassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await passwordService.hash(password);
      const isValid = await passwordService.verify(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const password = 'SecurePassword123!';
      const hash = await passwordService.hash(password);
      const isValid = await passwordService.verify('securepassword123!', hash);

      expect(isValid).toBe(false);
    });

    it('should handle empty password', async () => {
      const password = '';
      const hash = await passwordService.hash(password);
      const isValid = await passwordService.verify('', hash);

      expect(isValid).toBe(true);
    });
  });

  describe('integration', () => {
    it('should work with multiple hash-verify cycles', async () => {
      const passwords = [
        'Password1!',
        'Another@Pass2',
        'ThirdPassword#3',
      ];

      for (const password of passwords) {
        const hash = await passwordService.hash(password);
        expect(await passwordService.verify(password, hash)).toBe(true);
        expect(await passwordService.verify(password + 'wrong', hash)).toBe(false);
      }
    });
  });
});
