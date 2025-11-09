/**
 * PayPal Integration Routes (Admin)
 *
 * Manages global PayPal integrations
 * Admin creates integrations and configures which tenants can use them
 */

import { Router } from 'express';
import { PrismaClient as MainPrismaClient } from '../../generated/prisma-main';
import type { Request, Response } from 'express';

const router = Router();
const mainDb = new MainPrismaClient();

/**
 * GET /api/v1/admin/paypal-integration
 * List all PayPal integrations
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { isActive, isProduction } = req.query;

    const where: Record<string, unknown> = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (isProduction !== undefined) where.isProduction = isProduction === 'true';

    const integrations = await mainDb.payPalIntegration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        clientId: true,
        isProduction: true,
        isActive: true,
        allowedTenantIds: true,
        webhookId: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        // Exclude encrypted secret
      },
    });

    res.status(200).json({
      status: 'success',
      data: integrations,
    });
  } catch (error) {
    console.error('Error listing PayPal integrations:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list PayPal integrations',
    });
  }
});

/**
 * GET /api/v1/admin/paypal-integration/:id
 * Get PayPal integration by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const integration = await mainDb.payPalIntegration.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        clientId: true,
        isProduction: true,
        isActive: true,
        allowedTenantIds: true,
        webhookId: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        // Exclude encrypted secret
      },
    });

    if (!integration) {
      res.status(404).json({
        status: 'error',
        message: 'PayPal integration not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: integration,
    });
  } catch (error) {
    console.error('Error getting PayPal integration:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get PayPal integration',
    });
  }
});

/**
 * POST /api/v1/admin/paypal-integration
 * Create new PayPal integration
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, clientId, clientSecret, isProduction, allowedTenantIds } = req.body;

    // Validation
    if (!name || !clientId || !clientSecret) {
      res.status(400).json({
        status: 'error',
        message: 'name, clientId, and clientSecret are required',
      });
      return;
    }

    // TODO: Encrypt client secret before storing
    // For now, storing as-is (in production, use encryption!)
    const clientSecretEnc = Buffer.from(clientSecret).toString('base64');

    // Validate allowed tenant IDs if provided
    if (allowedTenantIds && Array.isArray(allowedTenantIds) && allowedTenantIds.length > 0) {
      const validTenants = await mainDb.tenant.findMany({
        where: { id: { in: allowedTenantIds } },
        select: { id: true },
      });

      if (validTenants.length !== allowedTenantIds.length) {
        res.status(400).json({
          status: 'error',
          message: 'Some tenant IDs are invalid',
        });
        return;
      }
    }

    const integration = await mainDb.payPalIntegration.create({
      data: {
        name: name.trim(),
        clientId: clientId.trim(),
        clientSecretEnc,
        isProduction: isProduction || false,
        allowedTenantIds: allowedTenantIds || [],
        createdBy: req.user?.sub || 'unknown',
      },
      select: {
        id: true,
        name: true,
        clientId: true,
        isProduction: true,
        isActive: true,
        allowedTenantIds: true,
        createdBy: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      status: 'success',
      data: integration,
      message: 'PayPal integration created successfully',
    });
  } catch (error) {
    console.error('Error creating PayPal integration:', error);
    if (error instanceof Error) {
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to create PayPal integration',
    });
  }
});

/**
 * PUT /api/v1/admin/paypal-integration/:id
 * Update PayPal integration
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, clientId, clientSecret, isProduction, isActive, allowedTenantIds, webhookId } =
      req.body;

    // Check if integration exists
    const existing = await mainDb.payPalIntegration.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({
        status: 'error',
        message: 'PayPal integration not found',
      });
      return;
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name.trim();
    if (clientId !== undefined) updateData.clientId = clientId.trim();
    if (clientSecret !== undefined) {
      // TODO: Encrypt client secret before storing
      updateData.clientSecretEnc = Buffer.from(clientSecret).toString('base64');
    }
    if (isProduction !== undefined) updateData.isProduction = isProduction;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (webhookId !== undefined) updateData.webhookId = webhookId?.trim() || null;

    // Validate allowed tenant IDs if provided
    if (allowedTenantIds !== undefined) {
      if (Array.isArray(allowedTenantIds) && allowedTenantIds.length > 0) {
        const validTenants = await mainDb.tenant.findMany({
          where: { id: { in: allowedTenantIds } },
          select: { id: true },
        });

        if (validTenants.length !== allowedTenantIds.length) {
          res.status(400).json({
            status: 'error',
            message: 'Some tenant IDs are invalid',
          });
          return;
        }
      }
      updateData.allowedTenantIds = allowedTenantIds;
    }

    const integration = await mainDb.payPalIntegration.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        clientId: true,
        isProduction: true,
        isActive: true,
        allowedTenantIds: true,
        webhookId: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      status: 'success',
      data: integration,
      message: 'PayPal integration updated successfully',
    });
  } catch (error) {
    console.error('Error updating PayPal integration:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update PayPal integration',
    });
  }
});

/**
 * DELETE /api/v1/admin/paypal-integration/:id
 * Delete PayPal integration
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if integration exists
    const existing = await mainDb.payPalIntegration.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({
        status: 'error',
        message: 'PayPal integration not found',
      });
      return;
    }

    await mainDb.payPalIntegration.delete({
      where: { id },
    });

    res.status(200).json({
      status: 'success',
      message: 'PayPal integration deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting PayPal integration:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete PayPal integration',
    });
  }
});

/**
 * GET /api/v1/admin/paypal-integration/:id/allowed-tenants
 * Get list of tenants allowed to use this integration
 */
router.get('/:id/allowed-tenants', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const integration = await mainDb.payPalIntegration.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
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

    // If empty array, all tenants are allowed
    if (integration.allowedTenantIds.length === 0) {
      const allTenants = await mainDb.tenant.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
        orderBy: { name: 'asc' },
      });

      res.status(200).json({
        status: 'success',
        data: {
          integrationId: integration.id,
          integrationName: integration.name,
          allowsAllTenants: true,
          tenants: allTenants,
        },
      });
      return;
    }

    // Get specific allowed tenants
    const allowedTenants = await mainDb.tenant.findMany({
      where: {
        id: { in: integration.allowedTenantIds },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      status: 'success',
      data: {
        integrationId: integration.id,
        integrationName: integration.name,
        allowsAllTenants: false,
        tenants: allowedTenants,
      },
    });
  } catch (error) {
    console.error('Error getting allowed tenants:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get allowed tenants',
    });
  }
});

/**
 * POST /api/v1/admin/paypal-integration/:id/test-connection
 * Test PayPal API connection
 */
router.post('/:id/test-connection', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const integration = await mainDb.payPalIntegration.findUnique({
      where: { id },
    });

    if (!integration) {
      res.status(404).json({
        status: 'error',
        message: 'PayPal integration not found',
      });
      return;
    }

    // TODO: Decrypt client secret
    const clientSecret = Buffer.from(integration.clientSecretEnc, 'base64').toString('utf-8');

    // Test PayPal API connection
    const baseUrl = integration.isProduction
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    // Get OAuth token
    const authResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${integration.clientId}:${clientSecret}`).toString(
          'base64'
        )}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!authResponse.ok) {
      res.status(400).json({
        status: 'error',
        message: 'Failed to authenticate with PayPal',
        details: await authResponse.text(),
      });
      return;
    }

    const authData = (await authResponse.json()) as { access_token: string };

    // Test by fetching user info
    const userInfoResponse = await fetch(
      `${baseUrl}/v1/identity/oauth2/userinfo?schema=paypalv1.1`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authData.access_token}`,
        },
      }
    );

    if (!userInfoResponse.ok) {
      res.status(400).json({
        status: 'error',
        message: 'PayPal API test failed',
        details: await userInfoResponse.text(),
      });
      return;
    }

    const userInfo = await userInfoResponse.json();

    res.status(200).json({
      status: 'success',
      message: 'PayPal connection successful',
      data: {
        mode: integration.isProduction ? 'production' : 'sandbox',
        userInfo,
      },
    });
  } catch (error) {
    console.error('Error testing PayPal connection:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to test PayPal connection',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
