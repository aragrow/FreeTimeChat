/**
 * Impersonation Routes
 *
 * Handles admin user impersonation
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/permission.middleware';
import { getImpersonationService } from '../services/impersonation.service';
import type { Request, Response } from 'express';

const router = Router();
const impersonationService = getImpersonationService();

// All impersonation routes require authentication
router.use(authenticateJWT);

/**
 * POST /api/v1/impersonate/start
 * Start impersonating a user (admin only)
 */
router.post('/start', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
      return;
    }

    const { targetUserId } = req.body;

    if (!targetUserId) {
      res.status(400).json({
        status: 'error',
        message: 'Target user ID is required',
      });
      return;
    }

    const result = await impersonationService.startImpersonation(req.user.sub, targetUserId);

    res.status(200).json({
      status: 'success',
      data: {
        accessToken: result.accessToken,
        session: result.session,
      },
      message: 'Impersonation started successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Impersonation is currently disabled') {
        res.status(403).json({
          status: 'error',
          message: 'Impersonation is currently disabled',
        });
        return;
      }

      if (error.message === 'Only administrators can impersonate users') {
        res.status(403).json({
          status: 'error',
          message: 'Only administrators can impersonate users',
        });
        return;
      }

      if (error.message === 'Cannot impersonate other administrators') {
        res.status(403).json({
          status: 'error',
          message: 'Cannot impersonate other administrators',
        });
        return;
      }

      if (error.message.includes('already impersonating')) {
        res.status(409).json({
          status: 'error',
          message: error.message,
        });
        return;
      }

      if (error.message === 'Target user not found') {
        res.status(404).json({
          status: 'error',
          message: 'Target user not found',
        });
        return;
      }
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to start impersonation',
    });
  }
});

/**
 * POST /api/v1/impersonate/stop
 * Stop impersonating a user
 */
router.post('/stop', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
      return;
    }

    // Check if user is impersonating
    if (!req.user.impersonation) {
      res.status(400).json({
        status: 'error',
        message: 'Not currently impersonating any user',
      });
      return;
    }

    await impersonationService.stopImpersonation(req.user.impersonation.sessionId);

    res.status(200).json({
      status: 'success',
      message: 'Impersonation stopped successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === 'Impersonation session not found' ||
        error.message === 'Impersonation session already ended'
      ) {
        res.status(404).json({
          status: 'error',
          message: error.message,
        });
        return;
      }
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to stop impersonation',
    });
  }
});

/**
 * GET /api/v1/impersonate/active
 * Get active impersonation session (admin only)
 */
router.get('/active', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
      return;
    }

    const session = await impersonationService.getActiveSession(req.user.sub);

    res.status(200).json({
      status: 'success',
      data: session,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get active session',
    });
  }
});

/**
 * GET /api/v1/impersonate/history
 * Get impersonation history (admin only)
 */
router.get('/history', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
      return;
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const history = await impersonationService.getAdminHistory(req.user.sub, limit);

    res.status(200).json({
      status: 'success',
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get impersonation history',
    });
  }
});

/**
 * GET /api/v1/impersonate/status
 * Check impersonation status of current request
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

    const isImpersonating = req.user.impersonation !== undefined;

    res.status(200).json({
      status: 'success',
      data: {
        isImpersonating,
        impersonation: req.user.impersonation || null,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to check impersonation status',
    });
  }
});

export default router;
