/**
 * OAuth Routes
 *
 * Handles OAuth authentication (Google, etc.)
 */

import { Router } from 'express';
import { getGoogleOAuthService } from '../services/google-oauth.service';
import type { Request, Response } from 'express';

const router = Router();
const googleOAuthService = getGoogleOAuthService();

/**
 * GET /api/v1/oauth/google
 * Start Google OAuth flow
 */
router.get('/google', (req: Request, res: Response, next) => {
  const googleAuthEnabled = process.env.ENABLE_GOOGLE_AUTH === 'true';

  if (!googleAuthEnabled) {
    res.status(403).json({
      status: 'error',
      message: 'Google authentication is currently disabled',
    });
    return;
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    res.status(500).json({
      status: 'error',
      message: 'Google OAuth is not configured',
    });
    return;
  }

  googleOAuthService.authenticate()(req, res, next);
});

/**
 * GET /api/v1/oauth/google/callback
 * Handle Google OAuth callback
 */
router.get('/google/callback', (req: Request, res: Response, _next) => {
  googleOAuthService.authenticateCallback()(req, res, async (err: Error | null) => {
    if (err) {
      // Redirect to frontend with error
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/google/error?message=${encodeURIComponent(err.message)}`);
      return;
    }

    try {
      // User is authenticated, generate tokens
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = req.user as any;
      const tokens = await googleOAuthService.generateTokens(user);

      // Redirect to frontend with tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const params = new URLSearchParams({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });

      res.redirect(`${frontendUrl}/auth/google/callback?${params.toString()}`);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(
        `${frontendUrl}/auth/google/error?message=${encodeURIComponent('Authentication failed')}`
      );
    }
  });
});

/**
 * GET /api/v1/oauth/google/failure
 * Handle Google OAuth failure
 */
router.get('/google/failure', (_req: Request, res: Response) => {
  res.status(401).json({
    status: 'error',
    message: 'Google authentication failed',
  });
});

export default router;
