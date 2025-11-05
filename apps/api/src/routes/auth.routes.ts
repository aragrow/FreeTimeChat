/**
 * Authentication Routes
 *
 * Handles login, registration, token refresh, and logout
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getAuthService } from '../services/auth.service';
import type { LoginRequest, RefreshTokenRequest, RegisterRequest } from '@freetimechat/types';
import type { Request, Response } from 'express';

const router = Router();
const authService = getAuthService();

/**
 * POST /api/v1/auth/login
 * Authenticate user with email and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginRequest;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
      });
      return;
    }

    const result = await authService.login(email, password);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Invalid credentials') {
        res.status(401).json({
          status: 'error',
          message: 'Invalid email or password',
        });
        return;
      }

      if (error.message === 'Account is inactive') {
        res.status(403).json({
          status: 'error',
          message: 'Your account has been deactivated',
        });
        return;
      }

      if (error.message.includes('Password authentication not available')) {
        res.status(400).json({
          status: 'error',
          message: 'Please use Google Sign-In for this account',
        });
        return;
      }
    }

    res.status(500).json({
      status: 'error',
      message: 'Login failed',
    });
  }
});

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = req.body as RegisterRequest;

    // Validate input
    if (!data.email || !data.password || !data.name) {
      res.status(400).json({
        status: 'error',
        message: 'Email, password, and name are required',
      });
      return;
    }

    const result = await authService.register(data);

    res.status(201).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Registration is currently disabled') {
        res.status(403).json({
          status: 'error',
          message: 'Registration is currently disabled',
        });
        return;
      }

      if (error.message === 'User already exists') {
        res.status(409).json({
          status: 'error',
          message: 'An account with this email already exists',
        });
        return;
      }

      if (error.message.startsWith('Invalid password:')) {
        res.status(400).json({
          status: 'error',
          message: error.message,
        });
        return;
      }

      if (error.message.includes('No default client found')) {
        res.status(400).json({
          status: 'error',
          message: 'Unable to register. Please contact support.',
        });
        return;
      }
    }

    res.status(500).json({
      status: 'error',
      message: 'Registration failed',
    });
  }
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body as RefreshTokenRequest;

    if (!refreshToken) {
      res.status(400).json({
        status: 'error',
        message: 'Refresh token is required',
      });
      return;
    }

    const tokens = await authService.refreshAccessToken(refreshToken);

    res.status(200).json({
      status: 'success',
      data: tokens,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Token reuse detected') {
        res.status(401).json({
          status: 'error',
          message: 'Token reuse detected. Please login again.',
          code: 'TOKEN_REUSE',
        });
        return;
      }

      if (error.message === 'Invalid refresh token' || error.message === 'Refresh token expired') {
        res.status(401).json({
          status: 'error',
          message: 'Invalid or expired refresh token',
        });
        return;
      }
    }

    res.status(500).json({
      status: 'error',
      message: 'Token refresh failed',
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * Logout user and revoke refresh token
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body as RefreshTokenRequest;

    if (!refreshToken) {
      res.status(400).json({
        status: 'error',
        message: 'Refresh token is required',
      });
      return;
    }

    await authService.logout(refreshToken);

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Logout failed',
    });
  }
});

/**
 * GET /api/v1/auth/me
 * Get current user information
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: req.user,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user information',
    });
  }
});

export default router;
