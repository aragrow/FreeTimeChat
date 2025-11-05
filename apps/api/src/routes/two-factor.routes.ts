/**
 * Two-Factor Authentication Routes
 *
 * Handles 2FA setup, verification, and management
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getTwoFactorService } from '../services/two-factor.service';
import type {
  TwoFactorDisableRequest,
  TwoFactorEnableRequest,
  TwoFactorVerifyRequest,
} from '@freetimechat/types';
import type { Request, Response } from 'express';

const router = Router();
const twoFactorService = getTwoFactorService();

// All 2FA routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/2fa/enable
 * Enable 2FA for authenticated user
 */
router.post('/enable', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
      return;
    }

    const twoFactorEnabled = process.env.ENABLE_TWO_FACTOR === 'true';
    if (!twoFactorEnabled) {
      res.status(403).json({
        status: 'error',
        message: 'Two-factor authentication is currently disabled',
      });
      return;
    }

    const { password } = req.body as TwoFactorEnableRequest;

    if (!password) {
      res.status(400).json({
        status: 'error',
        message: 'Password is required',
      });
      return;
    }

    const result = await twoFactorService.enable(req.user.sub, password);

    res.status(200).json({
      status: 'success',
      data: result,
      message:
        'Scan the QR code with your authenticator app and verify with a code to complete setup',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Invalid password') {
        res.status(401).json({
          status: 'error',
          message: 'Invalid password',
        });
        return;
      }

      if (error.message === 'Two-factor authentication is already enabled') {
        res.status(400).json({
          status: 'error',
          message: 'Two-factor authentication is already enabled',
        });
        return;
      }
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to enable two-factor authentication',
    });
  }
});

/**
 * POST /api/v1/2fa/verify
 * Verify TOTP token and complete 2FA setup
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
      return;
    }

    const { token } = req.body as TwoFactorVerifyRequest;

    if (!token) {
      res.status(400).json({
        status: 'error',
        message: 'Verification token is required',
      });
      return;
    }

    await twoFactorService.verify(req.user.sub, token);

    res.status(200).json({
      status: 'success',
      message: 'Two-factor authentication enabled successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Invalid verification code') {
        res.status(400).json({
          status: 'error',
          message: 'Invalid verification code',
        });
        return;
      }

      if (error.message === 'Two-factor authentication not set up') {
        res.status(400).json({
          status: 'error',
          message: 'Please enable 2FA first',
        });
        return;
      }
    }

    res.status(500).json({
      status: 'error',
      message: 'Verification failed',
    });
  }
});

/**
 * POST /api/v1/2fa/disable
 * Disable 2FA for authenticated user
 */
router.post('/disable', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
      return;
    }

    const { password, token } = req.body as TwoFactorDisableRequest;

    if (!password || !token) {
      res.status(400).json({
        status: 'error',
        message: 'Password and verification token are required',
      });
      return;
    }

    await twoFactorService.disable(req.user.sub, password, token);

    res.status(200).json({
      status: 'success',
      message: 'Two-factor authentication disabled successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Invalid password') {
        res.status(401).json({
          status: 'error',
          message: 'Invalid password',
        });
        return;
      }

      if (error.message === 'Invalid verification code') {
        res.status(400).json({
          status: 'error',
          message: 'Invalid verification code',
        });
        return;
      }

      if (error.message === 'Two-factor authentication is not enabled') {
        res.status(400).json({
          status: 'error',
          message: 'Two-factor authentication is not enabled',
        });
        return;
      }
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to disable two-factor authentication',
    });
  }
});

/**
 * GET /api/v1/2fa/status
 * Check if 2FA is enabled for authenticated user
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
      return;
    }

    const isEnabled = await twoFactorService.isEnabled(req.user.sub);

    res.status(200).json({
      status: 'success',
      data: {
        enabled: isEnabled,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to check 2FA status',
    });
  }
});

export default router;
