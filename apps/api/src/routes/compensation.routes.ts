/**
 * Compensation Routes
 *
 * Admin-only endpoints for managing user compensation
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/permission.middleware';
import { validate } from '../middleware/validation.middleware';
import { getCompensationService } from '../services/compensation.service';
import {
  getCompensationSchema,
  setCompensationSchema,
  setHourlyRateSchema,
} from '../validation/compensation.validation';
import type { Request, Response } from 'express';

const router = Router();
const compensationService = getCompensationService();

// All routes require authentication and admin role
router.use(authenticateJWT, requireRole('admin'));

/**
 * GET /api/v1/admin/users/:id/compensation
 * Get user compensation information
 */
router.get(
  '/:id/compensation',
  validate(getCompensationSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const compensation = await compensationService.getCompensationInfo(id);

      res.json({
        status: 'success',
        data: compensation,
      });
    } catch (error) {
      console.error('Failed to get compensation info:', error);
      res.status(error instanceof Error && error.message === 'User not found' ? 404 : 500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to get compensation info',
      });
    }
  }
);

/**
 * PATCH /api/v1/admin/users/:id/compensation
 * Set user compensation type and hourly rate
 */
router.patch(
  '/:id/compensation',
  validate(setCompensationSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { compensationType, hourlyRate } = req.body;

      const user = await compensationService.setCompensation(id, {
        compensationType,
        hourlyRate,
      });

      const compensation = await compensationService.getCompensationInfo(user.id);

      res.json({
        status: 'success',
        data: compensation,
        message: 'Compensation updated successfully',
      });
    } catch (error) {
      console.error('Failed to set compensation:', error);
      res.status(400).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to set compensation',
      });
    }
  }
);

/**
 * PATCH /api/v1/admin/users/:id/hourly-rate
 * Update only the hourly rate
 */
router.patch(
  '/:id/hourly-rate',
  validate(setHourlyRateSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { hourlyRate } = req.body;

      const user = await compensationService.setHourlyRate(id, hourlyRate);

      const compensation = await compensationService.getCompensationInfo(user.id);

      res.json({
        status: 'success',
        data: compensation,
        message: 'Hourly rate updated successfully',
      });
    } catch (error) {
      console.error('Failed to set hourly rate:', error);
      res.status(400).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to set hourly rate',
      });
    }
  }
);

/**
 * DELETE /api/v1/admin/users/:id/compensation
 * Clear user compensation configuration
 */
router.delete(
  '/:id/compensation',
  validate(getCompensationSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await compensationService.clearCompensation(id);

      res.json({
        status: 'success',
        message: 'Compensation configuration cleared',
      });
    } catch (error) {
      console.error('Failed to clear compensation:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to clear compensation',
      });
    }
  }
);

/**
 * GET /api/v1/admin/compensation/list
 * Get all users with compensation configured for current client
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      res.status(500).json({ status: 'error', message: 'Client ID not available' });
      return;
    }

    const users = await compensationService.listUsersWithCompensation(req.user.tenantId);

    res.json({
      status: 'success',
      data: users,
    });
  } catch (error) {
    console.error('Failed to list compensation:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list compensation',
    });
  }
});

export default router;
