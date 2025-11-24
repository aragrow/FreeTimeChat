/**
 * Vendor Routes
 *
 * Manages vendors/suppliers for Account Payables (stored in tenant database)
 * These are businesses we pay money to (opposite of clients who pay us)
 */

import { Router } from 'express';
import type { PrismaClient as ClientPrismaClient } from '../../generated/prisma-client';
import type { JWTPayload } from '@freetimechat/types';
import type { Request, Response } from 'express';

const router = Router();

/**
 * GET /api/v1/admin/vendors
 * List all vendors for the current tenant
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
        { companyName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Active filter
    if (!includeInactive) {
      where.isActive = true;
    }

    // Get vendors with pagination
    const clientDb = req.tenantDb as ClientPrismaClient;
    const [vendors, total] = await Promise.all([
      clientDb.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      clientDb.vendor.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        vendors,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error listing vendors:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list vendors',
    });
  }
});

/**
 * GET /api/v1/admin/vendors/:id
 * Get vendor by ID
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

    const vendor = await clientDb.vendor.findUnique({
      where: { id },
      include: {
        bills: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!vendor) {
      res.status(404).json({
        status: 'error',
        message: 'Vendor not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: vendor,
    });
  } catch (error) {
    console.error('Error getting vendor:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get vendor',
    });
  }
});

/**
 * POST /api/v1/admin/vendors
 * Create new vendor
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

    const currentUser = req.user as JWTPayload;
    const {
      name,
      companyName,
      email,
      phone,
      website,
      contactPerson,
      // Address
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      // Payment info
      paymentTermDays,
      accountNumber,
      taxId,
      // Bank details
      bankName,
      bankAccountNumber,
      bankRoutingNumber,
      // Notes
      notes,
    } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      res.status(400).json({
        status: 'error',
        message: 'Vendor name is required',
      });
      return;
    }

    const clientDb = req.tenantDb as ClientPrismaClient;

    // Create vendor
    const vendor = await clientDb.vendor.create({
      data: {
        name: name.trim(),
        companyName: companyName?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        website: website?.trim() || null,
        contactPerson: contactPerson?.trim() || null,
        addressLine1: addressLine1?.trim() || null,
        addressLine2: addressLine2?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        postalCode: postalCode?.trim() || null,
        country: country?.trim() || null,
        paymentTermDays: paymentTermDays || 30,
        accountNumber: accountNumber?.trim() || null,
        taxId: taxId?.trim() || null,
        bankName: bankName?.trim() || null,
        bankAccountNumber: bankAccountNumber?.trim() || null,
        bankRoutingNumber: bankRoutingNumber?.trim() || null,
        notes: notes?.trim() || null,
        isActive: true,
        createdBy: currentUser.sub,
      },
    });

    res.status(201).json({
      status: 'success',
      data: vendor,
      message: 'Vendor created successfully',
    });
  } catch (error) {
    console.error('Error creating vendor:', error);
    if (error instanceof Error) {
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to create vendor',
    });
  }
});

/**
 * PUT /api/v1/admin/vendors/:id
 * Update vendor
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
    const {
      name,
      companyName,
      email,
      phone,
      website,
      contactPerson,
      // Address
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      // Payment info
      paymentTermDays,
      accountNumber,
      taxId,
      // Bank details
      bankName,
      bankAccountNumber,
      bankRoutingNumber,
      // Notes
      notes,
      isActive,
    } = req.body;

    const clientDb = req.tenantDb as ClientPrismaClient;

    // Check if vendor exists
    const existingVendor = await clientDb.vendor.findUnique({
      where: { id },
    });

    if (!existingVendor) {
      res.status(404).json({
        status: 'error',
        message: 'Vendor not found',
      });
      return;
    }

    // Build update data
    const updateData: any = {};

    if (name !== undefined && name.trim()) updateData.name = name.trim();
    if (companyName !== undefined) updateData.companyName = companyName?.trim() || null;
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (website !== undefined) updateData.website = website?.trim() || null;
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson?.trim() || null;
    if (addressLine1 !== undefined) updateData.addressLine1 = addressLine1?.trim() || null;
    if (addressLine2 !== undefined) updateData.addressLine2 = addressLine2?.trim() || null;
    if (city !== undefined) updateData.city = city?.trim() || null;
    if (state !== undefined) updateData.state = state?.trim() || null;
    if (postalCode !== undefined) updateData.postalCode = postalCode?.trim() || null;
    if (country !== undefined) updateData.country = country?.trim() || null;
    if (paymentTermDays !== undefined) updateData.paymentTermDays = paymentTermDays;
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber?.trim() || null;
    if (taxId !== undefined) updateData.taxId = taxId?.trim() || null;
    if (bankName !== undefined) updateData.bankName = bankName?.trim() || null;
    if (bankAccountNumber !== undefined)
      updateData.bankAccountNumber = bankAccountNumber?.trim() || null;
    if (bankRoutingNumber !== undefined)
      updateData.bankRoutingNumber = bankRoutingNumber?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update vendor
    const vendor = await clientDb.vendor.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      status: 'success',
      data: vendor,
      message: 'Vendor updated successfully',
    });
  } catch (error) {
    console.error('Error updating vendor:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update vendor',
    });
  }
});

/**
 * DELETE /api/v1/admin/vendors/:id
 * Soft delete vendor
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

    // Check if vendor exists
    const existingVendor = await clientDb.vendor.findUnique({
      where: { id },
    });

    if (!existingVendor) {
      res.status(404).json({
        status: 'error',
        message: 'Vendor not found',
      });
      return;
    }

    if (existingVendor.deletedAt) {
      res.status(400).json({
        status: 'error',
        message: 'Vendor is already deleted',
      });
      return;
    }

    // Soft delete vendor
    const vendor = await clientDb.vendor.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Vendor deleted successfully',
      data: vendor,
    });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete vendor',
    });
  }
});

export default router;
