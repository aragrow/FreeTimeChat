/**
 * Discounts Admin Routes
 */

import { Router } from 'express';
import { DiscountService } from '../../services/discount.service';
import type { PrismaClient as ClientPrismaClient } from '../../generated/prisma-client';
import type { AuthenticatedRequest } from '../../types/express';
import type { Response, RequestHandler } from 'express';

const router = Router();

// GET /api/v1/admin/discounts - List all discounts
router.get('/', (async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.tenantDb as ClientPrismaClient;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new DiscountService(prisma);
    const { search, isActive, clientId, discountType } = req.query;

    const discounts = await service.findAll({
      search: search as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      clientId: clientId as string,
      discountType: discountType as 'PERCENTAGE' | 'FIXED_AMOUNT',
    });

    return res.json({ status: 'success', data: { discounts } });
  } catch (error) {
    console.error('Error fetching discounts:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch discounts' });
  }
}) as RequestHandler);

// GET /api/v1/admin/discounts/:id - Get discount by ID
router.get('/:id', (async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.tenantDb as ClientPrismaClient;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new DiscountService(prisma);
    const discount = await service.findById(req.params.id);

    if (!discount) {
      return res.status(404).json({ status: 'error', message: 'Discount not found' });
    }

    return res.json({ status: 'success', data: { discount } });
  } catch (error) {
    console.error('Error fetching discount:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch discount' });
  }
}) as RequestHandler);

// POST /api/v1/admin/discounts - Create discount
router.post('/', (async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.tenantDb as ClientPrismaClient;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new DiscountService(prisma);
    const {
      name,
      description,
      code,
      discountType,
      discountValue,
      appliesToAll,
      clientId,
      minimumAmount,
      maximumDiscount,
      validFrom,
      validUntil,
      usageLimit,
      isActive,
    } = req.body;

    if (!name || !discountType || discountValue === undefined) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Name, discountType, and discountValue are required' });
    }

    const discount = await service.create(
      {
        name,
        description,
        code,
        discountType,
        discountValue,
        appliesToAll,
        clientId,
        minimumAmount,
        maximumDiscount,
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        usageLimit,
        isActive,
      },
      req.user!.sub
    );

    return res.status(201).json({ status: 'success', data: { discount } });
  } catch (error) {
    console.error('Error creating discount:', error);
    const message = error instanceof Error ? error.message : 'Failed to create discount';
    return res.status(500).json({ status: 'error', message });
  }
}) as RequestHandler);

// POST /api/v1/admin/discounts/validate - Validate discount
router.post('/validate', (async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.tenantDb as ClientPrismaClient;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new DiscountService(prisma);
    const { discountId, amount, clientId } = req.body;

    const result = await service.validateDiscount(discountId, amount, clientId);

    if (!result.valid) {
      return res.status(400).json({ status: 'error', message: result.error });
    }

    const discountForCalc = {
      discountType: result.discount!.discountType,
      discountValue: Number(result.discount!.discountValue),
      maximumDiscount: result.discount!.maximumDiscount
        ? Number(result.discount!.maximumDiscount)
        : null,
    };
    const discountAmount = service.calculateDiscountAmount(discountForCalc, amount);

    return res.json({
      status: 'success',
      data: { valid: true, discountAmount, discount: result.discount },
    });
  } catch (error) {
    console.error('Error validating discount:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to validate discount' });
  }
}) as RequestHandler);

// PUT /api/v1/admin/discounts/:id - Update discount
router.put('/:id', (async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.tenantDb as ClientPrismaClient;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new DiscountService(prisma);
    const updateData = { ...req.body };

    if (updateData.validFrom) updateData.validFrom = new Date(updateData.validFrom);
    if (updateData.validUntil) updateData.validUntil = new Date(updateData.validUntil);

    const discount = await service.update(req.params.id, updateData);

    return res.json({ status: 'success', data: { discount } });
  } catch (error) {
    console.error('Error updating discount:', error);
    const message = error instanceof Error ? error.message : 'Failed to update discount';
    return res.status(500).json({ status: 'error', message });
  }
}) as RequestHandler);

// DELETE /api/v1/admin/discounts/:id - Delete discount
router.delete('/:id', (async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.tenantDb as ClientPrismaClient;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new DiscountService(prisma);
    await service.delete(req.params.id);

    return res.json({ status: 'success', message: 'Discount deleted' });
  } catch (error) {
    console.error('Error deleting discount:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to delete discount' });
  }
}) as RequestHandler);

export default router;
