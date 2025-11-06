/**
 * Security Settings Routes
 *
 * Admin endpoints for managing security configuration
 */

import { Router, type Request, type Response } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import { requireCapability } from '../middleware/permission.middleware';
import { getSecuritySettingsService } from '../services/security-settings.service';

const router = Router();
const securitySettingsService = getSecuritySettingsService();

/**
 * GET /api/v1/admin/security-settings
 * Get security settings for the current client
 */
router.get(
  '/',
  authenticateJWT,
  requireCapability('security.settings.read'),
  async (req: Request, res: Response) => {
    try {
      const clientId = req.user!.clientId;
      const settings = await securitySettingsService.getByClientId(clientId);

      res.status(200).json({
        status: 'success',
        data: settings,
      });
    } catch (error) {
      console.error('Failed to get security settings:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve security settings',
      });
    }
  }
);

/**
 * PUT /api/v1/admin/security-settings
 * Update security settings for the current client
 */
router.put(
  '/',
  authenticateJWT,
  requireCapability('security.settings.write'),
  async (req: Request, res: Response) => {
    try {
      const clientId = req.user!.clientId;
      const {
        twoFactorGracePeriodDays,
        twoFactorRequiredRoles,
        twoFactorBypassUrls,
        maxPasswordAttempts,
        maxTwoFactorAttempts,
        accountLockoutDurationMinutes,
      } = req.body;

      // Validate inputs
      if (
        twoFactorGracePeriodDays !== undefined &&
        (typeof twoFactorGracePeriodDays !== 'number' || twoFactorGracePeriodDays < 0)
      ) {
        res.status(400).json({
          status: 'error',
          message: 'Grace period must be a non-negative number',
        });
        return;
      }

      if (
        maxPasswordAttempts !== undefined &&
        (typeof maxPasswordAttempts !== 'number' || maxPasswordAttempts < 1)
      ) {
        res.status(400).json({
          status: 'error',
          message: 'Max password attempts must be at least 1',
        });
        return;
      }

      if (
        maxTwoFactorAttempts !== undefined &&
        (typeof maxTwoFactorAttempts !== 'number' || maxTwoFactorAttempts < 1)
      ) {
        res.status(400).json({
          status: 'error',
          message: 'Max 2FA attempts must be at least 1',
        });
        return;
      }

      if (
        accountLockoutDurationMinutes !== undefined &&
        (typeof accountLockoutDurationMinutes !== 'number' || accountLockoutDurationMinutes < 1)
      ) {
        res.status(400).json({
          status: 'error',
          message: 'Lockout duration must be at least 1 minute',
        });
        return;
      }

      if (twoFactorRequiredRoles !== undefined && !Array.isArray(twoFactorRequiredRoles)) {
        res.status(400).json({
          status: 'error',
          message: 'Required roles must be an array',
        });
        return;
      }

      if (twoFactorBypassUrls !== undefined && !Array.isArray(twoFactorBypassUrls)) {
        res.status(400).json({
          status: 'error',
          message: 'Bypass URLs must be an array',
        });
        return;
      }

      const settings = await securitySettingsService.update(clientId, {
        twoFactorGracePeriodDays,
        twoFactorRequiredRoles,
        twoFactorBypassUrls,
        maxPasswordAttempts,
        maxTwoFactorAttempts,
        accountLockoutDurationMinutes,
      });

      res.status(200).json({
        status: 'success',
        data: settings,
        message: 'Security settings updated successfully',
      });
    } catch (error) {
      console.error('Failed to update security settings:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update security settings',
      });
    }
  }
);

/**
 * GET /api/v1/admin/security-settings/all
 * Get all security settings (super admin only)
 */
router.get(
  '/all',
  authenticateJWT,
  requireCapability('security.settings.read.all'),
  async (_req: Request, res: Response) => {
    try {
      const allSettings = await securitySettingsService.listAll();

      res.status(200).json({
        status: 'success',
        data: allSettings,
      });
    } catch (error) {
      console.error('Failed to get all security settings:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve security settings',
      });
    }
  }
);

export default router;
