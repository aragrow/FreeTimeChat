/**
 * Admin Client Management Routes
 *
 * Handles client CRUD operations (customers of tenants)
 */

import { Router } from 'express';
import { PrismaClient as MainPrismaClient } from '../../generated/prisma-main';
import type { JWTPayload } from '@freetimechat/types';
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
    let tenantId = req.query.tenantId as string;

    // Tenant filtering: tenantadmin users can only see clients from their own tenant
    const currentUser = req.user as JWTPayload;
    const userRoles = currentUser.roles || [];
    const isTenantAdmin = userRoles.includes('tenantadmin');
    const isAdmin = userRoles.includes('admin');

    // If user is tenantadmin (not admin), force filter by their tenant
    if (isTenantAdmin && !isAdmin && currentUser.tenantId) {
      tenantId = currentUser.tenantId;
    }

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      deletedAt: null, // Only show non-deleted clients
    };

    // Filter by tenant
    if (tenantId) {
      where.tenantId = tenantId;
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
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
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              tenantKey: true,
              isActive: true,
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
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            tenantKey: true,
            isActive: true,
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
 * Create new client
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      tenantId,
      companyName,
      contactName,
      contactEmail,
      contactPhone,
      address,
      city,
      state,
      zipCode,
      country,
      notes,
    } = req.body;

    // Tenant filtering: tenantadmin users can only create clients for their own tenant
    const currentUser = req.user as JWTPayload;
    const userRoles = currentUser.roles || [];
    const isTenantAdmin = userRoles.includes('tenantadmin');
    const isAdmin = userRoles.includes('admin');

    // If user is tenantadmin (not admin), force tenantId to their own tenant
    if (isTenantAdmin && !isAdmin && currentUser.tenantId) {
      tenantId = currentUser.tenantId;
    }

    // Validate required fields
    if (!name || !name.trim()) {
      res.status(400).json({
        status: 'error',
        message: 'Client name is required',
      });
      return;
    }

    if (!tenantId || !tenantId.trim()) {
      res.status(400).json({
        status: 'error',
        message: 'Tenant ID is required',
      });
      return;
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      res.status(404).json({
        status: 'error',
        message: 'Tenant not found',
      });
      return;
    }

    // Additional check: ensure tenantadmin users can only create for their own tenant
    if (isTenantAdmin && !isAdmin && tenant.id !== currentUser.tenantId) {
      res.status(403).json({
        status: 'error',
        message: 'You can only create clients for your own tenant',
      });
      return;
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Create client
    const client = await prisma.client.create({
      data: {
        name: name.trim(),
        slug,
        tenantId,
        companyName: companyName?.trim() || null,
        contactName: contactName?.trim() || null,
        contactEmail: contactEmail?.trim() || null,
        contactPhone: contactPhone?.trim() || null,
        address: address?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        zipCode: zipCode?.trim() || null,
        country: country?.trim() || null,
        notes: notes?.trim() || null,
        isActive: true,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            tenantKey: true,
          },
        },
      },
    });

    res.status(201).json({
      status: 'success',
      data: client,
      message: 'Client created successfully',
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
    const {
      name,
      companyName,
      contactName,
      contactEmail,
      contactPhone,
      address,
      city,
      state,
      zipCode,
      country,
      notes,
      isActive,
    } = req.body;

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      res.status(404).json({
        status: 'error',
        message: 'Client not found',
      });
      return;
    }

    // Build update data
    const updateData: any = {};

    if (name !== undefined && name.trim()) {
      updateData.name = name.trim();
      // Update slug if name changes
      updateData.slug = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    }

    if (companyName !== undefined) updateData.companyName = companyName?.trim() || null;
    if (contactName !== undefined) updateData.contactName = contactName?.trim() || null;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail?.trim() || null;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone?.trim() || null;
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (city !== undefined) updateData.city = city?.trim() || null;
    if (state !== undefined) updateData.state = state?.trim() || null;
    if (zipCode !== undefined) updateData.zipCode = zipCode?.trim() || null;
    if (country !== undefined) updateData.country = country?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update client
    const client = await prisma.client.update({
      where: { id },
      data: updateData,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            tenantKey: true,
          },
        },
      },
    });

    res.status(200).json({
      status: 'success',
      data: client,
      message: 'Client updated successfully',
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
 * Soft delete client (set deletedAt timestamp)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      res.status(404).json({
        status: 'error',
        message: 'Client not found',
      });
      return;
    }

    if (existingClient.deletedAt) {
      res.status(400).json({
        status: 'error',
        message: 'Client is already deleted',
      });
      return;
    }

    // Soft delete client
    const client = await prisma.client.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Client deleted successfully',
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
 * Reactivate a deleted client
 */
router.post('/:id/reactivate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      res.status(404).json({
        status: 'error',
        message: 'Client not found',
      });
      return;
    }

    if (!existingClient.deletedAt && existingClient.isActive) {
      res.status(400).json({
        status: 'error',
        message: 'Client is already active',
      });
      return;
    }

    // Reactivate client
    const client = await prisma.client.update({
      where: { id },
      data: {
        isActive: true,
        deletedAt: null,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            tenantKey: true,
          },
        },
      },
    });

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

export default router;
