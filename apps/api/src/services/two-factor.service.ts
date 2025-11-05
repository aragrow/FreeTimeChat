/**
 * Two-Factor Authentication Service
 *
 * Handles TOTP (Time-based One-Time Password) generation and verification
 */

import crypto from 'crypto';
import qrcode from 'qrcode';
import speakeasy from 'speakeasy';
import { getPasswordService } from './password.service';
import { getUserService } from './user.service';
import type { TwoFactorEnableResponse } from '@freetimechat/types';

export class TwoFactorService {
  private userService: ReturnType<typeof getUserService>;
  private passwordService: ReturnType<typeof getPasswordService>;
  private appName: string;
  private issuer: string;

  constructor() {
    this.userService = getUserService();
    this.passwordService = getPasswordService();
    this.appName = process.env.TWO_FACTOR_APP_NAME || 'FreeTimeChat';
    this.issuer = process.env.TWO_FACTOR_ISSUER || 'FreeTimeChat';
  }

  /**
   * Enable 2FA for a user
   */
  async enable(userId: string, password: string): Promise<TwoFactorEnableResponse> {
    // Verify user's password
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.passwordHash) {
      throw new Error('Password verification not available');
    }

    const isValidPassword = await this.passwordService.verify(password, user.passwordHash);

    if (!isValidPassword) {
      throw new Error('Invalid password');
    }

    // Check if 2FA is already enabled
    if (user.twoFactorEnabled) {
      throw new Error('Two-factor authentication is already enabled');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${this.appName} (${user.email})`,
      issuer: this.issuer,
      length: 32,
    });

    if (!secret.base32) {
      throw new Error('Failed to generate 2FA secret');
    }

    // Generate QR code
    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url || '');

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(10);

    // Store secret in database (not yet enabled until verification)
    await this.userService.update(userId, {
      twoFactorSecret: secret.base32,
    });

    return {
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
      backupCodes,
    };
  }

  /**
   * Verify TOTP token and enable 2FA
   */
  async verify(userId: string, token: string): Promise<boolean> {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.twoFactorSecret) {
      throw new Error('Two-factor authentication not set up');
    }

    // Verify token
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before and after
    });

    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    // Enable 2FA
    await this.userService.update(userId, {
      twoFactorEnabled: true,
    });

    return true;
  }

  /**
   * Verify TOTP token for login
   */
  async verifyLogin(userId: string, token: string): Promise<boolean> {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new Error('Two-factor authentication not enabled');
    }

    // Verify token
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1, // More strict window for login
    });

    return isValid;
  }

  /**
   * Disable 2FA
   */
  async disable(userId: string, password: string, token: string): Promise<void> {
    // Verify user's password
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.passwordHash) {
      throw new Error('Password verification not available');
    }

    const isValidPassword = await this.passwordService.verify(password, user.passwordHash);

    if (!isValidPassword) {
      throw new Error('Invalid password');
    }

    if (!user.twoFactorEnabled) {
      throw new Error('Two-factor authentication is not enabled');
    }

    // Verify 2FA token
    const isValidToken = await this.verifyLogin(userId, token);

    if (!isValidToken) {
      throw new Error('Invalid verification code');
    }

    // Disable 2FA
    await this.userService.update(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    });
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      // Format as XXXX-XXXX
      const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}`;
      codes.push(formatted);
    }

    return codes;
  }

  /**
   * Verify backup code
   * Note: In production, backup codes should be hashed and stored in database
   * This is a simplified implementation
   */
  verifyBackupCode(_userId: string, _code: string): boolean {
    // TODO: Implement backup code verification with database storage
    // For now, this is a placeholder that always returns false
    // In production, you would:
    // 1. Hash the provided code
    // 2. Check if it exists in the user's backup codes
    // 3. Mark it as used
    // 4. Return true if valid and not used
    return false;
  }

  /**
   * Check if 2FA is enabled for user
   */
  async isEnabled(userId: string): Promise<boolean> {
    const user = await this.userService.findById(userId);
    return user !== null && user.twoFactorEnabled;
  }
}

// Singleton instance
let twoFactorServiceInstance: TwoFactorService | null = null;

/**
 * Get TwoFactorService singleton instance
 */
export function getTwoFactorService(): TwoFactorService {
  if (!twoFactorServiceInstance) {
    twoFactorServiceInstance = new TwoFactorService();
  }
  return twoFactorServiceInstance;
}
