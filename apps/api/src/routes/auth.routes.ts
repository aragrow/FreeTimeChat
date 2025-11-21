/**
 * Authentication Routes
 *
 * Handles login, registration, token refresh, and logout
 */

import { Router } from 'express';
import { PrismaClient as PrismaMainClient } from '../generated/prisma-main';
import { authenticateJWT } from '../middleware/auth.middleware';
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
    const { email, password, tenantKey, skipTwoFactor, rememberMe } = req.body as LoginRequest & {
      skipTwoFactor?: boolean;
      rememberMe?: boolean;
    };

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
      });
      return;
    }

    // Development only: Allow skipping 2FA
    const shouldSkipTwoFactor = skipTwoFactor === true && process.env.NODE_ENV !== 'production';

    // Get IP and user agent for tracking
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.login(
      email,
      password,
      tenantKey,
      shouldSkipTwoFactor,
      ipAddress,
      userAgent,
      rememberMe
    );

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

      if (error.message === 'Tenant key is required') {
        res.status(400).json({
          status: 'error',
          message: 'Tenant key is required for non-admin users',
        });
        return;
      }

      if (error.message === 'Invalid tenant key') {
        res.status(401).json({
          status: 'error',
          message: 'Invalid tenant key',
        });
        return;
      }

      if (error.message.includes('Access denied')) {
        res.status(403).json({
          status: 'error',
          message: error.message,
        });
        return;
      }

      if (error.message.includes('Account is temporarily locked')) {
        res.status(429).json({
          status: 'error',
          message: error.message,
        });
        return;
      }
    }

    console.error('Login error:', error);
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid email format',
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

      if (error.message.includes('User not found')) {
        res.status(401).json({
          status: 'error',
          message: 'Invalid refresh token',
        });
        return;
      }

      // Log unexpected errors for debugging
      console.error('Unexpected refresh token error:', error.message);
      console.error(error.stack);
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
router.post('/logout', authenticateJWT, async (req: Request, res: Response) => {
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
 * POST /api/v1/auth/change-required-password
 * Change password when required (for first-time login)
 */
router.post('/change-required-password', async (req: Request, res: Response) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    // Validate input
    if (!email || !currentPassword || !newPassword) {
      res.status(400).json({
        status: 'error',
        message: 'Email, current password, and new password are required',
      });
      return;
    }

    // Get user
    const userService = (await import('../services/user.service')).getUserService();
    const passwordService = (await import('../services/password.service')).getPasswordService();

    const user = await userService.findByEmail(email);

    if (!user || !user.passwordHash) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid credentials',
      });
      return;
    }

    // Verify user requires password change
    if (!user.requirePasswordChange) {
      res.status(400).json({
        status: 'error',
        message: 'Password change not required for this account',
      });
      return;
    }

    // Verify current password
    const isValidPassword = await passwordService.verify(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid current password',
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

    // Hash new password
    const newPasswordHash = await passwordService.hash(newPassword);

    // Update password and clear requirePasswordChange flag
    await userService.updateUser(user.id, {
      passwordHash: newPasswordHash,
      requirePasswordChange: false,
    });

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully. Please login with your new password.',
    });
  } catch (error) {
    console.error('Error changing required password:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to change password',
    });
  }
});

/**
 * GET /api/v1/auth/me
 * Get current user information
 */
router.get('/me', authenticateJWT, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
      return;
    }

    // Fetch full user data from database
    const userService = (await import('../services/user.service')).getUserService();
    const user = await userService.findById(req.user.sub);

    if (!user || !user.isActive || user.deletedAt) {
      res.status(401).json({
        status: 'error',
        message: 'User not found or inactive',
      });
      return;
    }

    // Fetch user's capabilities through their roles
    const prismaMain = new PrismaMainClient();
    const userRoles = await prismaMain.userRole.findMany({
      where: {
        userId: user.id,
      },
      include: {
        role: {
          include: {
            capabilities: {
              where: {
                isAllowed: true,
              },
              include: {
                capability: true,
              },
            },
          },
        },
      },
    });

    // Extract all unique capabilities from all roles
    const capabilitiesSet = new Set<string>();
    for (const userRole of userRoles) {
      for (const roleCapability of userRole.role.capabilities) {
        capabilitiesSet.add(roleCapability.capability.name);
      }
    }
    const capabilities = Array.from(capabilitiesSet);

    // Fetch tenant localization settings if user belongs to a tenant
    let tenantSettings = null;
    if (user.tenantId) {
      const tenant = await prismaMain.tenant.findUnique({
        where: { id: user.tenantId },
        select: {
          id: true,
          name: true,
          language: true,
          dateFormat: true,
          timeZone: true,
        },
      });
      if (tenant) {
        tenantSettings = {
          id: tenant.id,
          name: tenant.name,
          language: tenant.language,
          dateFormat: tenant.dateFormat,
          timeZone: tenant.timeZone,
        };
      }
    }

    // Split name into firstName and lastName for frontend
    const nameParts = user.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Return user data with roles from JWT (to include any runtime roles like impersonation)
    const userData = {
      id: user.id,
      email: user.email,
      firstName,
      lastName,
      tenantId: user.tenantId, // Add tenantId for tenant scoping
      tenant: tenantSettings, // Add tenant localization settings
      role: req.user.role, // Use role from JWT
      roles: req.user.roles, // Use roles from JWT
      capabilities, // Add capabilities array
      isTwoFactorEnabled: user.twoFactorEnabled,
      trackingMode: user.trackingMode, // Add tracking mode (CLOCK or TIME)
      isImpersonating: req.user.impersonation?.isImpersonating,
      originalUserId: req.user.impersonation?.adminUserId,
      impersonation: req.user.impersonation
        ? {
            adminUserId: req.user.impersonation.adminUserId,
            adminEmail: req.user.impersonation.adminEmail,
            sessionId: req.user.impersonation.sessionId,
          }
        : undefined,
    };

    res.status(200).json({
      status: 'success',
      data: userData,
    });
  } catch (error) {
    console.error('Error in /auth/me:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user information',
    });
  }
});

export default router;
