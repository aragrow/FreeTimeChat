/**
 * Clients Routes (Non-Admin)
 *
 * Regular user endpoints for accessing clients from their tenant database
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import { attachTenantDatabase } from '../middleware/tenant-database.middleware';
import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { Request, Response } from 'express';

const router = Router();

// All routes require authentication and tenant database
router.use(authenticateJWT, attachTenantDatabase);

/**
 * GET /api/v1/clients
 * List all business clients for the current tenant
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const search = req.query.search as string;

    const skip = (page - 1) * limit;

    // Build where clause - only active, non-deleted clients
    const where: any = {
      deletedAt: null,
      isActive: true,
    };

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get clients with pagination
    const clientDb = req.tenantDb as ClientPrismaClient;
    const [clients, total] = await Promise.all([
      clientDb.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          name: 'asc',
        },
      }),
      clientDb.client.count({ where }),
    ]);

    res.status(200).json({
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
    console.error('Error listing clients:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list clients',
    });
  }
});

/**
 * GET /api/v1/clients/:id
 * Get business client by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { id } = req.params;
    const clientDb = req.tenantDb as ClientPrismaClient;

    const client = await clientDb.client.findUnique({
      where: { id },
    });

    if (!client || client.deletedAt) {
      res.status(404).json({
        status: 'error',
        message: 'Client not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: client,
    });
  } catch (error) {
    console.error('Error getting client:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get client',
    });
  }
});

export default router;
