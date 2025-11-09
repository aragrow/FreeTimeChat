/**
 * PayPal Tenant Configuration Routes
 *
 * Allows tenant admins to configure PayPal settings for their tenant
 * Requires tenant database connection
 */

import { Router } from 'express';
import { mainDb } from '../../lib/prisma-main';
import type { Request, Response } from 'express';

const router = Router();

/**
 * GET /api/v1/admin/paypal-config
 * Get PayPal configuration for current tenant
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

    const configs = await req.clientDb.payPalTenantConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // If no config exists, return empty
    if (configs.length === 0) {
      res.status(200).json({
        status: 'success',
        data: null,
        message: 'No PayPal configuration found for this tenant',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: configs[0],
    });
  } catch (error) {
    console.error('Error getting PayPal tenant config:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get PayPal configuration',
    });
  }
});

/**
 * GET /api/v1/admin/paypal-config/available-integrations
 * Get list of available PayPal integrations for this tenant
 */
router.get('/available-integrations', async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      res.status(403).json({
        status: 'error',
        message: 'User must be associated with a tenant',
      });
      return;
    }

    // Get all active PayPal integrations
    const allIntegrations = await mainDb.payPalIntegration.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        isProduction: true,
        allowedTenantIds: true,
      },
    });

    // Filter integrations allowed for this tenant
    const availableIntegrations = allIntegrations.filter((integration) => {
      // If allowedTenantIds is empty, all tenants can use it
      if (integration.allowedTenantIds.length === 0) return true;
      // Otherwise, check if this tenant is in the allowed list
      return integration.allowedTenantIds.includes(req.user?.tenantId || '');
    });

    res.status(200).json({
      status: 'success',
      data: availableIntegrations,
    });
  } catch (error) {
    console.error('Error getting available PayPal integrations:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get available PayPal integrations',
    });
  }
});

/**
 * POST /api/v1/admin/paypal-config
 * Create or update PayPal configuration for tenant
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
      paypalIntegrationId,
      isEnabled,
      invoiceEmailSubject,
      invoiceTermsAndConds,
      invoiceNote,
      invoiceMerchantLogo,
      allowPartialPayment,
      minimumAmountDue,
      dueInDays,
    } = req.body;

    if (!paypalIntegrationId) {
      res.status(400).json({
        status: 'error',
        message: 'paypalIntegrationId is required',
      });
      return;
    }

    // Verify integration exists and tenant is allowed to use it
    const integration = await mainDb.payPalIntegration.findUnique({
      where: { id: paypalIntegrationId },
      select: {
        id: true,
        isActive: true,
        allowedTenantIds: true,
      },
    });

    if (!integration) {
      res.status(404).json({
        status: 'error',
        message: 'PayPal integration not found',
      });
      return;
    }

    if (!integration.isActive) {
      res.status(400).json({
        status: 'error',
        message: 'This PayPal integration is not active',
      });
      return;
    }

    // Check if tenant is allowed to use this integration
    if (
      integration.allowedTenantIds.length > 0 &&
      !integration.allowedTenantIds.includes(req.user?.tenantId || '')
    ) {
      res.status(403).json({
        status: 'error',
        message: 'Your tenant is not allowed to use this PayPal integration',
      });
      return;
    }

    // Check if config already exists
    const existing = await req.clientDb.payPalTenantConfig.findFirst({
      where: { paypalIntegrationId },
    });

    let config;

    if (existing) {
      // Update existing
      config = await req.clientDb.payPalTenantConfig.update({
        where: { id: existing.id },
        data: {
          isEnabled: isEnabled !== undefined ? isEnabled : existing.isEnabled,
          invoiceEmailSubject:
            invoiceEmailSubject !== undefined ? invoiceEmailSubject?.trim() || null : undefined,
          invoiceTermsAndConds:
            invoiceTermsAndConds !== undefined ? invoiceTermsAndConds?.trim() || null : undefined,
          invoiceNote: invoiceNote !== undefined ? invoiceNote?.trim() || null : undefined,
          invoiceMerchantLogo:
            invoiceMerchantLogo !== undefined ? invoiceMerchantLogo?.trim() || null : undefined,
          allowPartialPayment: allowPartialPayment !== undefined ? allowPartialPayment : undefined,
          minimumAmountDue: minimumAmountDue !== undefined ? minimumAmountDue : undefined,
          dueInDays: dueInDays !== undefined ? dueInDays : undefined,
        },
      });
    } else {
      // Create new
      config = await req.clientDb.payPalTenantConfig.create({
        data: {
          paypalIntegrationId,
          isEnabled: isEnabled !== undefined ? isEnabled : true,
          invoiceEmailSubject: invoiceEmailSubject?.trim() || null,
          invoiceTermsAndConds: invoiceTermsAndConds?.trim() || null,
          invoiceNote: invoiceNote?.trim() || null,
          invoiceMerchantLogo: invoiceMerchantLogo?.trim() || null,
          allowPartialPayment: allowPartialPayment !== undefined ? allowPartialPayment : true,
          minimumAmountDue: minimumAmountDue || null,
          dueInDays: dueInDays || 30,
        },
      });
    }

    res.status(existing ? 200 : 201).json({
      status: 'success',
      data: config,
      message: existing
        ? 'PayPal configuration updated successfully'
        : 'PayPal configuration created successfully',
    });
  } catch (error) {
    console.error('Error saving PayPal tenant config:', error);
    if (error instanceof Error) {
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to save PayPal configuration',
    });
  }
});

/**
 * DELETE /api/v1/admin/paypal-config/:id
 * Delete PayPal configuration
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

    const existing = await req.clientDb.payPalTenantConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({
        status: 'error',
        message: 'PayPal configuration not found',
      });
      return;
    }

    await req.clientDb.payPalTenantConfig.delete({
      where: { id },
    });

    res.status(200).json({
      status: 'success',
      message: 'PayPal configuration deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting PayPal tenant config:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete PayPal configuration',
    });
  }
});

export default router;
