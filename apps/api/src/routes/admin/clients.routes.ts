/**
 * Business Client Routes
 *
 * Manages the tenant's business clients (stored in tenant database)
 * These are different from the "clients" in the main DB (which are actually tenants)
 */

import { Router } from 'express';
import type { PrismaClient as ClientPrismaClient } from '../../generated/prisma-client';
import type { Request, Response } from 'express';

const router = Router();

/**
 * GET /api/v1/admin/business-clients
 * List all business clients for the current tenant
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const search = req.query.search as string;
    const includeInactive = req.query.includeInactive === 'true';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      deletedAt: null,
    };

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Active filter
    if (!includeInactive) {
      where.isActive = true;
    }

    // Get clients with pagination
    const clientDb = req.clientDb as ClientPrismaClient;
    const [clients, total] = await Promise.all([
      clientDb.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      clientDb.client.count({ where }),
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
    console.error('Error listing business clients:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list business clients',
    });
  }
});

/**
 * GET /api/v1/admin/business-clients/:id
 * Get business client by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { id } = req.params;
    const clientDb = req.clientDb as ClientPrismaClient;

    const client = await clientDb.client.findUnique({
      where: { id },
    });

    if (!client) {
      res.status(404).json({
        status: 'error',
        message: 'Business client not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: client,
    });
  } catch (error) {
    console.error('Error getting business client:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get business client',
    });
  }
});

/**
 * POST /api/v1/admin/business-clients
 * Create new business client
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const {
      name,
      companyName,
      // Form field names (mapped to schema field names)
      contactName,
      contactEmail,
      contactPhone,
      address,
      city,
      state,
      zipCode,
      country,
      // Schema field names (also accepted)
      email,
      phone,
      website,
      contactPerson,
      hourlyRate,
      discountPercentage,
      billingAddressLine1,
      billingAddressLine2,
      billingCity,
      billingState,
      billingPostalCode,
      billingCountry,
      // Billing contact
      billingContactName,
      billingContactEmail,
      billingContactPhone,
      invoicePrefix,
      invoiceNextNumber,
      invoiceNumberPadding,
    } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      res.status(400).json({
        status: 'error',
        message: 'Client name is required',
      });
      return;
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    const clientDb = req.clientDb as ClientPrismaClient;
    // Create client (map form fields to schema fields)
    const client = await clientDb.client.create({
      data: {
        name: name.trim(),
        slug,
        companyName: companyName?.trim() || null,
        email: (contactEmail || email)?.trim() || null,
        phone: (contactPhone || phone)?.trim() || null,
        website: website?.trim() || null,
        contactPerson: (contactName || contactPerson)?.trim() || null,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        discountPercentage: discountPercentage ? parseFloat(discountPercentage) : 0,
        billingAddressLine1: (address || billingAddressLine1)?.trim() || null,
        billingAddressLine2: billingAddressLine2?.trim() || null,
        billingCity: (city || billingCity)?.trim() || null,
        billingState: (state || billingState)?.trim() || null,
        billingPostalCode: (zipCode || billingPostalCode)?.trim() || null,
        billingCountry: (country || billingCountry)?.trim() || null,
        billingContactName: billingContactName?.trim() || null,
        billingContactEmail: billingContactEmail?.trim() || null,
        billingContactPhone: billingContactPhone?.trim() || null,
        invoicePrefix: invoicePrefix?.trim() || null,
        invoiceNextNumber: invoiceNextNumber || 1,
        invoiceNumberPadding: invoiceNumberPadding || 5,
        isActive: true,
      },
    });

    res.status(201).json({
      status: 'success',
      data: client,
      message: 'Business client created successfully',
    });
  } catch (error) {
    console.error('Error creating business client:', error);
    if (error instanceof Error) {
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to create business client',
    });
  }
});

/**
 * PUT /api/v1/admin/business-clients/:id
 * Update business client
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { id } = req.params;
    const {
      name,
      companyName,
      // Form field names (mapped to schema field names)
      contactName,
      contactEmail,
      contactPhone,
      address,
      city,
      state,
      zipCode,
      country,
      // Schema field names (also accepted)
      email,
      phone,
      website,
      contactPerson,
      hourlyRate,
      discountPercentage,
      billingAddressLine1,
      billingAddressLine2,
      billingCity,
      billingState,
      billingPostalCode,
      billingCountry,
      // Billing contact
      billingContactName,
      billingContactEmail,
      billingContactPhone,
      invoicePrefix,
      invoiceNextNumber,
      invoiceNumberPadding,
      isActive,
    } = req.body;

    const clientDb = req.clientDb as ClientPrismaClient;
    // Check if client exists
    const existingClient = await clientDb.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      res.status(404).json({
        status: 'error',
        message: 'Business client not found',
      });
      return;
    }

    // Build update data (map form fields to schema fields)
    const updateData: any = {};

    if (name !== undefined && name.trim()) {
      updateData.name = name.trim();
      updateData.slug = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    }

    if (companyName !== undefined) updateData.companyName = companyName?.trim() || null;
    if (contactEmail !== undefined || email !== undefined)
      updateData.email = (contactEmail || email)?.trim() || null;
    if (contactPhone !== undefined || phone !== undefined)
      updateData.phone = (contactPhone || phone)?.trim() || null;
    if (website !== undefined) updateData.website = website?.trim() || null;
    if (contactName !== undefined || contactPerson !== undefined)
      updateData.contactPerson = (contactName || contactPerson)?.trim() || null;
    if (hourlyRate !== undefined)
      updateData.hourlyRate = hourlyRate ? parseFloat(hourlyRate) : null;
    if (discountPercentage !== undefined)
      updateData.discountPercentage = discountPercentage ? parseFloat(discountPercentage) : 0;
    if (address !== undefined || billingAddressLine1 !== undefined)
      updateData.billingAddressLine1 = (address || billingAddressLine1)?.trim() || null;
    if (billingAddressLine2 !== undefined)
      updateData.billingAddressLine2 = billingAddressLine2?.trim() || null;
    if (city !== undefined || billingCity !== undefined)
      updateData.billingCity = (city || billingCity)?.trim() || null;
    if (state !== undefined || billingState !== undefined)
      updateData.billingState = (state || billingState)?.trim() || null;
    if (zipCode !== undefined || billingPostalCode !== undefined)
      updateData.billingPostalCode = (zipCode || billingPostalCode)?.trim() || null;
    if (country !== undefined || billingCountry !== undefined)
      updateData.billingCountry = (country || billingCountry)?.trim() || null;
    if (billingContactName !== undefined)
      updateData.billingContactName = billingContactName?.trim() || null;
    if (billingContactEmail !== undefined)
      updateData.billingContactEmail = billingContactEmail?.trim() || null;
    if (billingContactPhone !== undefined)
      updateData.billingContactPhone = billingContactPhone?.trim() || null;
    if (invoicePrefix !== undefined) updateData.invoicePrefix = invoicePrefix?.trim() || null;
    if (invoiceNextNumber !== undefined) updateData.invoiceNextNumber = invoiceNextNumber;
    if (invoiceNumberPadding !== undefined) updateData.invoiceNumberPadding = invoiceNumberPadding;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update client
    const client = await clientDb.client.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      status: 'success',
      data: client,
      message: 'Business client updated successfully',
    });
  } catch (error) {
    console.error('Error updating business client:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update business client',
    });
  }
});

/**
 * DELETE /api/v1/admin/business-clients/:id
 * Soft delete business client
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { id } = req.params;
    const clientDb = req.clientDb as ClientPrismaClient;

    // Check if client exists
    const existingClient = await clientDb.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      res.status(404).json({
        status: 'error',
        message: 'Business client not found',
      });
      return;
    }

    if (existingClient.deletedAt) {
      res.status(400).json({
        status: 'error',
        message: 'Business client is already deleted',
      });
      return;
    }

    // Soft delete client
    const client = await clientDb.client.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Business client deleted successfully',
      data: client,
    });
  } catch (error) {
    console.error('Error deleting business client:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete business client',
    });
  }
});

export default router;
