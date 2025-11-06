/**
 * Client Routes
 *
 * Admin-only endpoints for managing clients (tenants)
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/permission.middleware';
import { getClientService } from '../services/client.service';
import { getDatabaseService } from '../services/database.service';
import { getJWTService } from '../services/jwt.service';
import type { Request, Response } from 'express';

const router = Router();
const clientService = getClientService();
const databaseService = getDatabaseService();
const jwtService = getJWTService();

/**
 * POST /api/v1/admin/clients
 * Create a new client (tenant) with database and admin user
 */
router.post('/', authenticateJWT, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { name, email, adminName, adminPassword } = req.body;

    // Validate required fields
    if (!name || !email || !adminName || !adminPassword) {
      res.status(400).json({
        status: 'error',
        message: 'Missing required fields',
        required: ['name', 'email', 'adminName', 'adminPassword'],
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid email format',
      });
      return;
    }

    // Validate password strength
    if (adminPassword.length < 8) {
      res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters',
      });
      return;
    }

    // Create client
    const result = await clientService.createClient({
      name,
      email,
      adminName,
      adminPassword,
    });

    // Generate access token for the new admin user
    const accessToken = jwtService.signAccessToken({
      userId: result.adminUser.id,
      email: result.adminUser.email,
      role: 'Admin',
      roles: ['Admin'],
      clientId: result.client.id,
      databaseName: result.client.databaseName,
    });

    res.status(201).json({
      status: 'success',
      data: {
        client: {
          id: result.client.id,
          name: result.client.name,
          databaseName: result.client.databaseName,
          createdAt: result.client.createdAt,
        },
        adminUser: result.adminUser,
        accessToken,
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

    const skip = (page - 1) * limit;

    const [clients, total] = await Promise.all([
      clientService.list({ skip, take: limit, includeInactive }),
      clientService.count(includeInactive),
    ]);

    res.json({
      status: 'success',
      data: clients,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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

    const client = await clientService.findById(id);

    if (!client) {
      res.status(404).json({
        status: 'error',
        message: 'Client not found',
      });
      return;
    }

    // Get client statistics
    const stats = await clientService.getStats(id);

    res.json({
      status: 'success',
      data: {
        ...client,
        stats,
      },
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
    const { name } = req.body;

    // Check if client exists
    const existing = await clientService.findById(id);
    if (!existing) {
      res.status(404).json({
        status: 'error',
        message: 'Client not found',
      });
      return;
    }

    // Update client
    const updated = await clientService.update(id, { name });

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
      const existing = await clientService.findById(id);
      if (!existing) {
        res.status(404).json({
          status: 'error',
          message: 'Client not found',
        });
        return;
      }

      if (permanent) {
        // Permanent delete (including database)
        await clientService.permanentDelete(id);

        res.json({
          status: 'success',
          message: 'Client permanently deleted',
        });
      } else {
        // Deactivate
        const deactivated = await clientService.deactivate(id);

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

      const reactivated = await clientService.reactivate(id);

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
