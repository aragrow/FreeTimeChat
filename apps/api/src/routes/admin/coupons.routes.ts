/**
 * Coupons Admin Routes
 */

import { Router } from 'express';
import { CouponService } from '../../services/coupon.service';
import type { AuthenticatedRequest } from '../../types/express';
import type { Response } from 'express';

const router = Router();

// GET /api/v1/admin/coupons - List all coupons
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.clientPrisma;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new CouponService(prisma);
    const { search, isActive, validNow } = req.query;

    const coupons = await service.findAll({
      search: search as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      validNow: validNow === 'true',
    });

    res.json({ status: 'success', data: { coupons } });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch coupons' });
  }
});

// GET /api/v1/admin/coupons/:id - Get coupon by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.clientPrisma;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new CouponService(prisma);
    const coupon = await service.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({ status: 'error', message: 'Coupon not found' });
    }

    res.json({ status: 'success', data: { coupon } });
  } catch (error) {
    console.error('Error fetching coupon:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch coupon' });
  }
});

// GET /api/v1/admin/coupons/:id/stats - Get coupon statistics
router.get('/:id/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.clientPrisma;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new CouponService(prisma);
    const stats = await service.getStatistics(req.params.id);

    res.json({ status: 'success', data: { statistics: stats } });
  } catch (error) {
    console.error('Error fetching coupon stats:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch coupon statistics';
    res.status(500).json({ status: 'error', message });
  }
});

// POST /api/v1/admin/coupons - Create coupon
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.clientPrisma;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new CouponService(prisma);
    const {
      code,
      name,
      description,
      discountType,
      discountValue,
      minimumAmount,
      maximumDiscount,
      validFrom,
      validUntil,
      usageLimit,
      usageLimitPerClient,
      clientIds,
      isActive,
      isFirstPurchase,
    } = req.body;

    if (
      !code ||
      !name ||
      !discountType ||
      discountValue === undefined ||
      !validFrom ||
      !validUntil
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Code, name, discountType, discountValue, validFrom, and validUntil are required',
      });
    }

    const coupon = await service.create(
      {
        code,
        name,
        description,
        discountType,
        discountValue,
        minimumAmount,
        maximumDiscount,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        usageLimit,
        usageLimitPerClient,
        clientIds,
        isActive,
        isFirstPurchase,
      },
      req.user!.id
    );

    res.status(201).json({ status: 'success', data: { coupon } });
  } catch (error) {
    console.error('Error creating coupon:', error);
    const message = error instanceof Error ? error.message : 'Failed to create coupon';
    res.status(500).json({ status: 'error', message });
  }
});

// POST /api/v1/admin/coupons/validate - Validate coupon code
router.post('/validate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.clientPrisma;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new CouponService(prisma);
    const { code, amount, clientId } = req.body;

    const result = await service.validateCoupon(code, amount, clientId);

    if (!result.valid) {
      return res.status(400).json({ status: 'error', message: result.error });
    }

    const discountAmount = service.calculateDiscountAmount(result.coupon!, amount);

    res.json({ status: 'success', data: { valid: true, discountAmount, coupon: result.coupon } });
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ status: 'error', message: 'Failed to validate coupon' });
  }
});

// PUT /api/v1/admin/coupons/:id - Update coupon
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.clientPrisma;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new CouponService(prisma);
    const updateData = { ...req.body };

    if (updateData.validFrom) updateData.validFrom = new Date(updateData.validFrom);
    if (updateData.validUntil) updateData.validUntil = new Date(updateData.validUntil);

    const coupon = await service.update(req.params.id, updateData);

    res.json({ status: 'success', data: { coupon } });
  } catch (error) {
    console.error('Error updating coupon:', error);
    const message = error instanceof Error ? error.message : 'Failed to update coupon';
    res.status(500).json({ status: 'error', message });
  }
});

// DELETE /api/v1/admin/coupons/:id - Delete coupon
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.clientPrisma;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new CouponService(prisma);
    await service.delete(req.params.id);

    res.json({ status: 'success', message: 'Coupon deleted' });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete coupon' });
  }
});

export default router;
