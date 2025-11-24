/**
 * Product Routes
 *
 * Manages products for the tenant
 * Products can be associated to a client or be tenant-level
 */

import { Router } from 'express';
import type { PrismaClient as ClientPrismaClient } from '../../generated/prisma-client';
import type { Request, Response } from 'express';

const router = Router();

/**
 * GET /api/v1/admin/products
 * List all products for the current tenant
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
    const clientId = req.query.clientId as string;
    const includeInactive = req.query.includeInactive === 'true';
    const tenantOnly = req.query.tenantOnly === 'true';

    const skip = (page - 1) * limit;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      deletedAt: null,
    };

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Client filter
    if (clientId) {
      where.clientId = clientId;
    } else if (tenantOnly) {
      where.clientId = null;
    }

    // Active filter
    if (!includeInactive) {
      where.isActive = true;
    }

    const clientDb = req.tenantDb as ClientPrismaClient;
    // Get products with pagination
    const [products, total] = await Promise.all([
      clientDb.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      clientDb.product.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error listing products:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list products',
    });
  }
});

/**
 * GET /api/v1/admin/products/:id
 * Get product by ID
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

    const product = await clientDb.product.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!product) {
      res.status(404).json({
        status: 'error',
        message: 'Product not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: product,
    });
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get product',
    });
  }
});

/**
 * POST /api/v1/admin/products
 * Create new product
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { name, description, sku, clientId, rate, unit } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      res.status(400).json({
        status: 'error',
        message: 'Product name is required',
      });
      return;
    }

    const clientDb = req.tenantDb as ClientPrismaClient;
    // Check if client exists if clientId provided
    if (clientId) {
      const client = await clientDb.client.findUnique({
        where: { id: clientId },
      });
      if (!client) {
        res.status(400).json({
          status: 'error',
          message: 'Client not found',
        });
        return;
      }
    }

    // Create product
    const product = await clientDb.product.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        sku: sku?.trim() || null,
        clientId: clientId || null,
        rate: rate ? parseFloat(rate) : null,
        unit: unit?.trim() || null,
        isActive: true,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      status: 'success',
      data: product,
      message: 'Product created successfully',
    });
  } catch (error) {
    console.error('Error creating product:', error);
    if (error instanceof Error) {
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to create product',
    });
  }
});

/**
 * PUT /api/v1/admin/products/:id
 * Update product
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { id } = req.params;
    const { name, description, sku, clientId, imageUrl, rate, unit, isActive } = req.body;

    const clientDb = req.tenantDb as ClientPrismaClient;
    // Check if product exists
    const existingProduct = await clientDb.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      res.status(404).json({
        status: 'error',
        message: 'Product not found',
      });
      return;
    }

    // Check if client exists if clientId provided
    if (clientId) {
      const client = await clientDb.client.findUnique({
        where: { id: clientId },
      });
      if (!client) {
        res.status(400).json({
          status: 'error',
          message: 'Client not found',
        });
        return;
      }
    }

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (name !== undefined && name.trim()) {
      updateData.name = name.trim();
    }
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (sku !== undefined) updateData.sku = sku?.trim() || null;
    if (clientId !== undefined) updateData.clientId = clientId || null;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl?.trim() || null;
    if (rate !== undefined) updateData.rate = rate ? parseFloat(rate) : null;
    if (unit !== undefined) updateData.unit = unit?.trim() || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update product
    const product = await clientDb.product.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(200).json({
      status: 'success',
      data: product,
      message: 'Product updated successfully',
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update product',
    });
  }
});

/**
 * DELETE /api/v1/admin/products/:id
 * Soft delete product
 */
router.delete('/:id', async (req: Request, res: Response) => {
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

    // Check if product exists
    const existingProduct = await clientDb.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      res.status(404).json({
        status: 'error',
        message: 'Product not found',
      });
      return;
    }

    if (existingProduct.deletedAt) {
      res.status(400).json({
        status: 'error',
        message: 'Product is already deleted',
      });
      return;
    }

    // Soft delete product
    const product = await clientDb.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Product deleted successfully',
      data: product,
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete product',
    });
  }
});

export default router;
