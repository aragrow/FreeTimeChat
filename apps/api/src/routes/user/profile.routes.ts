/**
 * User Profile Routes
 *
 * Handles user profile settings (communication preferences, notifications, account recovery)
 */

import { Router } from 'express';
import { PrismaClient as MainPrismaClient } from '../../generated/prisma-main';
import type { Request, Response } from 'express';

const router = Router();
const prisma = new MainPrismaClient();

/**
 * GET /api/v1/user/profile/settings
 * Get user's profile settings
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

    // Get user's profile settings from User table
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        communicationMedium: true,
        notificationFrequency: true,
        secondaryEmail: true,
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
        communicationMedium: user.communicationMedium || 'email',
        notificationFrequency: user.notificationFrequency || 'immediate',
        secondaryEmail: user.secondaryEmail || '',
      },
    });
  } catch (error) {
    console.error('Error fetching profile settings:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch profile settings',
    });
  }
});

/**
 * PUT /api/v1/user/profile/settings
 * Update user's profile settings
 */
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    const { communicationMedium, notificationFrequency, secondaryEmail } = req.body;

    // Validate communication medium
    if (communicationMedium && !['email', 'sms', 'both', 'none'].includes(communicationMedium)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid communication medium',
      });
      return;
    }

    // Validate notification frequency
    if (
      notificationFrequency &&
      !['immediate', 'hourly', 'daily', 'weekly'].includes(notificationFrequency)
    ) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid notification frequency',
      });
      return;
    }

    // Validate secondary email format if provided
    if (secondaryEmail && secondaryEmail.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(secondaryEmail)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid secondary email format',
        });
        return;
      }
    }

    // Update user's profile settings
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        communicationMedium: communicationMedium || undefined,
        notificationFrequency: notificationFrequency || undefined,
        secondaryEmail: secondaryEmail?.trim() || null,
      },
      select: {
        communicationMedium: true,
        notificationFrequency: true,
        secondaryEmail: true,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Profile settings updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Error updating profile settings:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile settings',
    });
  }
});

export default router;
