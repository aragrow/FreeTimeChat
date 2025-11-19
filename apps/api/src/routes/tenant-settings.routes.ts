/**
 * Tenant Settings Routes
 *
 * Routes for tenant admins to manage their own tenant settings
 * (currency, invoice prefix, next invoice number, logo)
 */

import { Router } from 'express';
import { PrismaClient as MainPrismaClient } from '../generated/prisma-main';
import type { JWTPayload } from '@freetimechat/types';
import type { Request, Response } from 'express';

const router = Router();
const prisma = new MainPrismaClient();

// Common currencies with USD and EUR first
const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'MAD' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
  { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA' },
  { code: 'XAF', name: 'Central African CFA Franc', symbol: 'FCFA' },
];

/**
 * GET /api/v1/tenant/settings/currencies
 * Get list of supported currencies
 */
router.get('/currencies', async (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    data: SUPPORTED_CURRENCIES,
  });
});

/**
 * GET /api/v1/tenant/settings
 * Get current tenant's settings
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const currentUser = req.user as JWTPayload;

    if (!currentUser.tenantId) {
      res.status(403).json({
        status: 'error',
        message: 'You must belong to a tenant to view settings',
      });
      return;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: currentUser.tenantId },
      select: {
        id: true,
        name: true,
        currency: true,
        invoicePrefix: true,
        nextInvoiceNumber: true,
        logoUrl: true,
        // Also include contact info for display
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        billingStreet: true,
        billingCity: true,
        billingState: true,
        billingZip: true,
        billingCountry: true,
        billingEmail: true,
        // Payment methods
        enableStripe: true,
        enablePaypal: true,
        stripePublishableKey: true,
        // Don't expose secret keys in GET
        paypalClientId: true,
        paypalSandbox: true,
        defaultPaymentMethod: true,
      },
    });

    if (!tenant) {
      res.status(404).json({
        status: 'error',
        message: 'Tenant not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: tenant,
    });
  } catch (error) {
    console.error('Error getting tenant settings:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get tenant settings',
    });
  }
});

/**
 * PUT /api/v1/tenant/settings
 * Update current tenant's settings
 */
router.put('/', async (req: Request, res: Response) => {
  try {
    const currentUser = req.user as JWTPayload;
    const userRoles = currentUser.roles || [];
    const isTenantAdmin = userRoles.includes('tenantadmin');
    const isAdmin = userRoles.includes('admin');

    // Only tenant admins or system admins can update settings
    if (!isTenantAdmin && !isAdmin) {
      res.status(403).json({
        status: 'error',
        message: 'Only tenant administrators can update settings',
      });
      return;
    }

    if (!currentUser.tenantId) {
      res.status(403).json({
        status: 'error',
        message: 'You must belong to a tenant to update settings',
      });
      return;
    }

    const {
      currency,
      invoicePrefix,
      nextInvoiceNumber,
      logoUrl,
      // Contact info
      contactName,
      contactEmail,
      contactPhone,
      billingStreet,
      billingCity,
      billingState,
      billingZip,
      billingCountry,
      billingEmail,
      // Payment methods
      enableStripe,
      enablePaypal,
      stripePublishableKey,
      stripeSecretKey,
      paypalClientId,
      paypalClientSecret,
      paypalSandbox,
      defaultPaymentMethod,
    } = req.body;

    // Validate currency if provided
    if (currency) {
      const validCurrency = SUPPORTED_CURRENCIES.find((c) => c.code === currency);
      if (!validCurrency) {
        res.status(400).json({
          status: 'error',
          message: `Invalid currency code. Supported: ${SUPPORTED_CURRENCIES.map((c) => c.code).join(', ')}`,
        });
        return;
      }
    }

    // Validate next invoice number
    if (
      nextInvoiceNumber !== undefined &&
      (nextInvoiceNumber < 1 || !Number.isInteger(nextInvoiceNumber))
    ) {
      res.status(400).json({
        status: 'error',
        message: 'Next invoice number must be a positive integer',
      });
      return;
    }

    // Validate default payment method
    if (defaultPaymentMethod && !['stripe', 'paypal'].includes(defaultPaymentMethod)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid payment method. Must be "stripe" or "paypal"',
      });
      return;
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (currency !== undefined) updateData.currency = currency;
    if (invoicePrefix !== undefined) updateData.invoicePrefix = invoicePrefix;
    if (nextInvoiceNumber !== undefined) updateData.nextInvoiceNumber = nextInvoiceNumber;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (contactName !== undefined) updateData.contactName = contactName;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (billingStreet !== undefined) updateData.billingStreet = billingStreet;
    if (billingCity !== undefined) updateData.billingCity = billingCity;
    if (billingState !== undefined) updateData.billingState = billingState;
    if (billingZip !== undefined) updateData.billingZip = billingZip;
    if (billingCountry !== undefined) updateData.billingCountry = billingCountry;
    if (billingEmail !== undefined) updateData.billingEmail = billingEmail;
    // Payment methods
    if (enableStripe !== undefined) updateData.enableStripe = enableStripe;
    if (enablePaypal !== undefined) updateData.enablePaypal = enablePaypal;
    if (stripePublishableKey !== undefined) updateData.stripePublishableKey = stripePublishableKey;
    if (stripeSecretKey !== undefined) updateData.stripeSecretKey = stripeSecretKey;
    if (paypalClientId !== undefined) updateData.paypalClientId = paypalClientId;
    if (paypalClientSecret !== undefined) updateData.paypalClientSecret = paypalClientSecret;
    if (paypalSandbox !== undefined) updateData.paypalSandbox = paypalSandbox;
    if (defaultPaymentMethod !== undefined) updateData.defaultPaymentMethod = defaultPaymentMethod;

    const tenant = await prisma.tenant.update({
      where: { id: currentUser.tenantId },
      data: updateData,
      select: {
        id: true,
        name: true,
        currency: true,
        invoicePrefix: true,
        nextInvoiceNumber: true,
        logoUrl: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        billingStreet: true,
        billingCity: true,
        billingState: true,
        billingZip: true,
        billingCountry: true,
        billingEmail: true,
        // Payment methods
        enableStripe: true,
        enablePaypal: true,
        stripePublishableKey: true,
        paypalClientId: true,
        paypalSandbox: true,
        defaultPaymentMethod: true,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Tenant settings updated successfully',
      data: tenant,
    });
  } catch (error) {
    console.error('Error updating tenant settings:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update tenant settings',
    });
  }
});

export default router;
