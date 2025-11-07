/**
 * Admin Client Management Routes
 *
 * Handles client (tenant) CRUD operations
 */

import { Router } from 'express';
import { PrismaClient as MainPrismaClient } from '../../generated/prisma-main';
import { getClientService } from '../../services/client.service';
import type { Request, Response } from 'express';

const router = Router();
const clientService = getClientService();
const prisma = new MainPrismaClient();

/**
 * GET /api/v1/admin/clients
 * List all clients with search and filter
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const includeInactive = req.query.includeInactive === 'true';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Active filter
    if (!includeInactive) {
      where.isActive = true;
    }

    // Get clients with pagination
    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        include: {
          users: {
            select: {
              id: true,
              email: true,
              name: true,
              isActive: true,
            },
          },
          _count: {
            select: {
              users: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.client.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        clients,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
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
 * GET /api/v1/admin/clients/:id
 * Get client by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!client) {
      res.status(404).json({
        status: 'error',
        message: 'Client not found',
      });
      return;
    }

    // Get client statistics
    const stats = await clientService.getStats(id);

    res.status(200).json({
      status: 'success',
      data: {
        ...client,
        stats,
      },
    });
  } catch (error) {
    console.error('Error getting client:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get client',
    });
  }
});

/**
 * POST /api/v1/admin/clients
 * Create new client (creates database entry only, not actual DB)
 * Note: For full client provisioning with database, use the client.service.ts createClient method
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, adminEmail, adminName, adminPassword, roleIds } = req.body;

    // Validate required fields
    if (!name || !adminEmail || !adminName || !adminPassword) {
      res.status(400).json({
        status: 'error',
        message: 'Name, adminEmail, adminName, and adminPassword are required',
      });
      return;
    }

    // Validate roleIds
    if (!roleIds || !Array.isArray(roleIds) || roleIds.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'At least one role is required',
      });
      return;
    }

    // Create client with full provisioning (database + admin user)
    const result = await clientService.createClient({
      name,
      email: adminEmail,
      adminName,
      adminPassword,
      roleIds,
    });

    res.status(201).json({
      status: 'success',
      data: result,
      message: 'Client created successfully with database and admin user',
    });
  } catch (error) {
    console.error('Error creating client:', error);
    if (error instanceof Error) {
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to create client',
    });
  }
});

/**
 * PUT /api/v1/admin/clients/:id
 * Update client details
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Check if client exists
    const existingClient = await clientService.findById(id);
    if (!existingClient) {
      res.status(404).json({
        status: 'error',
        message: 'Client not found',
      });
      return;
    }

    // Update client
    const client = await clientService.update(id, { name });

    res.status(200).json({
      status: 'success',
      data: client,
    });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update client',
    });
  }
});

/**
 * DELETE /api/v1/admin/clients/:id
 * Soft delete client (deactivate)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if client exists
    const existingClient = await clientService.findById(id);
    if (!existingClient) {
      res.status(404).json({
        status: 'error',
        message: 'Client not found',
      });
      return;
    }

    // Check if client has active users
    const activeUsers = await prisma.user.count({
      where: {
        clientId: id,
        isActive: true,
        deletedAt: null,
      },
    });

    if (activeUsers > 0) {
      res.status(400).json({
        status: 'error',
        message: `Cannot delete client. It has ${activeUsers} active user(s). Please deactivate all users first.`,
        data: {
          activeUserCount: activeUsers,
        },
      });
      return;
    }

    // Soft delete (deactivate) client
    const client = await clientService.deactivate(id);

    res.status(200).json({
      status: 'success',
      message: 'Client deactivated successfully',
      data: client,
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete client',
    });
  }
});

/**
 * POST /api/v1/admin/clients/:id/reactivate
 * Reactivate a deactivated client
 */
router.post('/:id/reactivate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if client exists
    const existingClient = await clientService.findById(id);
    if (!existingClient) {
      res.status(404).json({
        status: 'error',
        message: 'Client not found',
      });
      return;
    }

    if (existingClient.isActive) {
      res.status(400).json({
        status: 'error',
        message: 'Client is already active',
      });
      return;
    }

    // Reactivate client
    const client = await clientService.reactivate(id);

    res.status(200).json({
      status: 'success',
      message: 'Client reactivated successfully',
      data: client,
    });
  } catch (error) {
    console.error('Error reactivating client:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reactivate client',
    });
  }
});

/**
 * GET /api/v1/admin/clients/:id/stats
 * Get client statistics
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if client exists
    const client = await clientService.findById(id);
    if (!client) {
      res.status(404).json({
        status: 'error',
        message: 'Client not found',
      });
      return;
    }

    const stats = await clientService.getStats(id);

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    console.error('Error getting client stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get client stats',
    });
  }
});

export default router;
