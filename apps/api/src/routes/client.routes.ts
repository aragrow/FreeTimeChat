/**
 * Client Routes
 *
 * Admin-only endpoints for managing clients (tenants)
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/permission.middleware';
import { getDatabaseService } from '../services/database.service';
import { getTenantService } from '../services/tenant.service';
import type { Request, Response } from 'express';

const router = Router();
const tenantService = getTenantService();
const databaseService = getDatabaseService();

/**
 * POST /api/v1/admin/clients
 * Create a new client (tenant)
 */
router.post('/', authenticateJWT, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { name, slug, tenantKey, contactEmail, hourlyRate, discountPercentage, ...otherFields } =
      req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      res.status(400).json({
        status: 'error',
        message: 'Client name is required',
      });
      return;
    }

    // Auto-generate slug from name if not provided
    const finalSlug =
      slug ||
      name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

    // Auto-generate tenantKey from name if not provided
    const finalTenantKey =
      tenantKey ||
      name
        .toUpperCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^A-Z0-9-]/g, '');

    // Validate email format if provided
    if (contactEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactEmail)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid email format',
        });
        return;
      }
    }

    // Validate hourlyRate if provided
    if (hourlyRate !== undefined && hourlyRate !== null) {
      const rate = parseFloat(hourlyRate);
      if (isNaN(rate) || rate < 0) {
        res.status(400).json({
          status: 'error',
          message: 'Hourly rate must be a positive number',
        });
        return;
      }
    }

    // Validate discountPercentage if provided
    if (discountPercentage !== undefined && discountPercentage !== null) {
      const discount = parseFloat(discountPercentage);
      if (isNaN(discount) || discount < 0 || discount > 100) {
        res.status(400).json({
          status: 'error',
          message: 'Discount percentage must be between 0 and 100',
        });
        return;
      }
    }

    // Create tenant
    const tenant = await tenantService.create({
      name: name.trim(),
      slug: finalSlug,
      tenantKey: finalTenantKey,
      contactEmail,
      ...otherFields,
    });

    res.status(201).json({
      status: 'success',
      data: {
        client: tenant,
      },
      message: 'Client created successfully',
    });
  } catch (error) {
    console.error('Failed to create client:', error);

    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to create client',
    });
  }
});

/**
 * GET /api/v1/admin/clients
 * List all clients with pagination
 */
router.get('/', authenticateJWT, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const includeInactive = req.query.includeInactive === 'true';

    const result = await tenantService.findAll(
      { isActive: includeInactive ? undefined : true },
      { page, limit }
    );

    res.json({
      status: 'success',
      data: result.tenants,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    console.error('Failed to list clients:', error);

    res.status(500).json({
      status: 'error',
      message: 'Failed to list clients',
    });
  }
});

/**
 * GET /api/v1/admin/clients/:id
 * Get client by ID
 */
router.get('/:id', authenticateJWT, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const client = await tenantService.findById(id);

    if (!client) {
      res.status(404).json({
        status: 'error',
        message: 'Client not found',
      });
      return;
    }

    res.json({
      status: 'success',
      data: client,
    });
  } catch (error) {
    console.error('Failed to get client:', error);

    res.status(500).json({
      status: 'error',
      message: 'Failed to get client',
    });
  }
});

/**
 * PATCH /api/v1/admin/clients/:id
 * Update client
 */
router.patch('/:id', authenticateJWT, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if client exists
    const existing = await tenantService.findById(id);
    if (!existing) {
      res.status(404).json({
        status: 'error',
        message: 'Client not found',
      });
      return;
    }

    // Update client
    const updated = await tenantService.update(id, req.body);

    res.json({
      status: 'success',
      data: updated,
      message: 'Client updated successfully',
    });
  } catch (error) {
    console.error('Failed to update client:', error);

    res.status(500).json({
      status: 'error',
      message: 'Failed to update client',
    });
  }
});

/**
 * DELETE /api/v1/admin/clients/:id
 * Soft delete client
 */
router.delete(
  '/:id',
  authenticateJWT,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const permanent = req.query.permanent === 'true';

      // Check if client exists
      const existing = await tenantService.findById(id);
      if (!existing) {
        res.status(404).json({
          status: 'error',
          message: 'Client not found',
        });
        return;
      }

      if (permanent) {
        // Permanent delete (including database)
        await tenantService.delete(id);

        res.json({
          status: 'success',
          message: 'Client permanently deleted',
        });
      } else {
        // Deactivate
        const deactivated = await tenantService.setActive(id, false);

        res.json({
          status: 'success',
          data: deactivated,
          message: 'Client deactivated',
        });
      }
    } catch (error) {
      console.error('Failed to delete client:', error);

      res.status(500).json({
        status: 'error',
        message: 'Failed to delete client',
      });
    }
  }
);

/**
 * POST /api/v1/admin/clients/:id/restore
 * Restore soft-deleted client
 */
router.post(
  '/:id/restore',
  authenticateJWT,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const reactivated = await tenantService.setActive(id, true);

      res.json({
        status: 'success',
        data: reactivated,
        message: 'Client reactivated successfully',
      });
    } catch (error) {
      console.error('Failed to restore client:', error);

      res.status(500).json({
        status: 'error',
        message: 'Failed to restore client',
      });
    }
  }
);

/**
 * GET /api/v1/admin/database/stats
 * Get database connection statistics
 */
router.get(
  '/database/stats',
  authenticateJWT,
  requireRole('admin'),
  async (_req: Request, res: Response) => {
    try {
      const stats = databaseService.getConnectionStats();

      res.json({
        status: 'success',
        data: stats,
      });
    } catch (error) {
      console.error('Failed to get database stats:', error);

      res.status(500).json({
        status: 'error',
        message: 'Failed to get database stats',
      });
    }
  }
);

export default router;
