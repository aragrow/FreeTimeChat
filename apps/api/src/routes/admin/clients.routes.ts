/**
 * Admin Customer Management Routes
 *
 * Handles customer (tenant) CRUD operations
 */

import { Router } from 'express';
import { PrismaClient as MainPrismaClient } from '../../generated/prisma-main';
import type { Request, Response } from 'express';

const router = Router();
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

    // Get customers with pagination
    const [clients, total] = await Promise.all([
      prisma.tenant.findMany({
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
      prisma.tenant.count({ where }),
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

    const client = await prisma.tenant.findUnique({
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
        message: 'Customer not found',
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

/**
 * POST /api/v1/admin/clients
 * Create new customer (tenant)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, tenantKey } = req.body;

    // Validate required fields
    if (!name) {
      res.status(400).json({
        status: 'error',
        message: 'Customer name is required',
      });
      return;
    }

    if (!tenantKey) {
      res.status(400).json({
        status: 'error',
        message: 'Tenant key is required',
      });
      return;
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Create customer
    const customer = await prisma.tenant.create({
      data: {
        name,
        slug,
        tenantKey,
        databaseHost: 'localhost',
        isActive: true,
      },
    });

    res.status(201).json({
      status: 'success',
      data: customer,
      message: 'Customer created successfully',
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    if (error instanceof Error) {
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to create customer',
    });
  }
});

/**
 * PUT /api/v1/admin/clients/:id
 * Update customer details
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, tenantKey, isActive } = req.body;

    // Check if customer exists
    const existingCustomer = await prisma.tenant.findUnique({ where: { id } });
    if (!existingCustomer) {
      res.status(404).json({
        status: 'error',
        message: 'Customer not found',
      });
      return;
    }

    // Update customer
    const customer = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(tenantKey && { tenantKey }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.status(200).json({
      status: 'success',
      data: customer,
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update customer',
    });
  }
});

/**
 * DELETE /api/v1/admin/clients/:id
 * Soft delete customer (deactivate)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if customer exists
    const existingCustomer = await prisma.tenant.findUnique({ where: { id } });
    if (!existingCustomer) {
      res.status(404).json({
        status: 'error',
        message: 'Customer not found',
      });
      return;
    }

    // Check if customer has active users
    const activeUsers = await prisma.user.count({
      where: {
        tenantId: id,
        isActive: true,
        deletedAt: null,
      },
    });

    if (activeUsers > 0) {
      res.status(400).json({
        status: 'error',
        message: `Cannot delete customer. It has ${activeUsers} active user(s). Please deactivate all users first.`,
        data: {
          activeUserCount: activeUsers,
        },
      });
      return;
    }

    // Soft delete (deactivate) customer
    const customer = await prisma.tenant.update({
      where: { id },
      data: { isActive: false },
    });

    res.status(200).json({
      status: 'success',
      message: 'Customer deactivated successfully',
      data: customer,
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete customer',
    });
  }
});

/**
 * POST /api/v1/admin/clients/:id/reactivate
 * Reactivate a deactivated customer
 */
router.post('/:id/reactivate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if customer exists
    const existingCustomer = await prisma.tenant.findUnique({ where: { id } });
    if (!existingCustomer) {
      res.status(404).json({
        status: 'error',
        message: 'Customer not found',
      });
      return;
    }

    if (existingCustomer.isActive) {
      res.status(400).json({
        status: 'error',
        message: 'Customer is already active',
      });
      return;
    }

    // Reactivate customer
    const customer = await prisma.tenant.update({
      where: { id },
      data: { isActive: true },
    });

    res.status(200).json({
      status: 'success',
      message: 'Customer reactivated successfully',
      data: customer,
    });
  } catch (error) {
    console.error('Error reactivating customer:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reactivate customer',
    });
  }
});

/**
 * GET /api/v1/admin/clients/:id/stats
 * Get customer statistics
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if customer exists
    const customer = await prisma.tenant.findUnique({ where: { id } });
    if (!customer) {
      res.status(404).json({
        status: 'error',
        message: 'Customer not found',
      });
      return;
    }

    // Get basic stats
    const userCount = await prisma.user.count({
      where: { tenantId: id, deletedAt: null },
    });

    const activeUserCount = await prisma.user.count({
      where: { tenantId: id, isActive: true, deletedAt: null },
    });

    const stats = {
      userCount,
      activeUserCount,
    };

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    console.error('Error getting customer stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get customer stats',
    });
  }
});

export default router;
