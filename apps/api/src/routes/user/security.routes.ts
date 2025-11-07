/**
 * User Security Routes
 *
 * Handles user security settings (password change, 2FA status)
 */

import { Router } from 'express';
import { PrismaClient as MainPrismaClient } from '../../generated/prisma-main';
import { getPasswordService } from '../../services/password.service';
import type { Request, Response } from 'express';

const router = Router();
const prisma = new MainPrismaClient();
const passwordService = getPasswordService();

/**
 * GET /api/v1/user/security/settings
 * Get user's security settings
 */
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    // Get user's security settings from User table
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorGracePeriodEndsAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorGracePeriodEndsAt: user.twoFactorGracePeriodEndsAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (error) {
    console.error('Error fetching security settings:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch security settings',
    });
  }
});

/**
 * POST /api/v1/user/password/change
 * Change user's password
 */
router.post('/password/change', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        status: 'error',
        message: 'Current password and new password are required',
      });
      return;
    }

    // Validate new password
    const passwordValidation = passwordService.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      res.status(400).json({
        status: 'error',
        message: `Invalid password: ${passwordValidation.errors.join(', ')}`,
      });
      return;
    }

    // Get user's current password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        passwordHash: true,
      },
    });

    if (!user || !user.passwordHash) {
      res.status(404).json({
        status: 'error',
        message: 'User not found or password authentication not available',
      });
      return;
    }

    // Verify current password
    const isValidPassword = await passwordService.verify(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect',
      });
      return;
    }

    // Hash new password
    const newPasswordHash = await passwordService.hash(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to change password',
    });
  }
});

export default router;
