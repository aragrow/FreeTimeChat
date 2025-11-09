/**
 * Admin System Settings Routes
 *
 * Admin-only endpoints to manage global system settings
 */

import { Router } from 'express';
import { getSystemSettingsService } from '../../services/system-settings.service';
import type { Request, Response } from 'express';

const router = Router();
const systemSettingsService = getSystemSettingsService();

/**
 * GET /api/v1/admin/system-settings
 * Get current system settings
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const settings = await systemSettingsService.getSettings();

    res.status(200).json({
      status: 'success',
      data: settings,
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch system settings',
    });
  }
});

/**
 * PATCH /api/v1/admin/system-settings/bypass-2fa
 * Update bypass 2FA for all users setting
 */
router.patch('/bypass-2fa', async (req: Request, res: Response) => {
  try {
    const { bypass } = req.body;

    if (typeof bypass !== 'boolean') {
      res.status(400).json({
        status: 'error',
        message: 'bypass must be a boolean value',
      });
      return;
    }

    const settings = await systemSettingsService.setBypassTwoFactorForAllUsers(bypass);

    res.status(200).json({
      status: 'success',
      data: settings,
      message: `2FA bypass for all users ${bypass ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    console.error('Error updating bypass 2FA setting:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update bypass 2FA setting',
    });
  }
});

export default router;
