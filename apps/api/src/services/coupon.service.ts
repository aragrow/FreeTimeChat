/**
 * Coupon Service
 *
 * Manages promotional coupons for customers
 */

import type { PrismaClient, DiscountType } from '../generated/prisma-client';

export interface CreateCouponInput {
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minimumAmount?: number;
  maximumDiscount?: number;
  validFrom: Date;
  validUntil: Date;
  usageLimit?: number;
  usageLimitPerClient?: number;
  clientIds?: string[];
  isActive?: boolean;
  isFirstPurchase?: boolean;
}

export interface UpdateCouponInput {
  code?: string;
  name?: string;
  description?: string;
  discountType?: DiscountType;
  discountValue?: number;
  minimumAmount?: number;
  maximumDiscount?: number;
  validFrom?: Date;
  validUntil?: Date;
  usageLimit?: number;
  usageLimitPerClient?: number;
  clientIds?: string[];
  isActive?: boolean;
  isFirstPurchase?: boolean;
}

export interface CouponFilters {
  search?: string;
  isActive?: boolean;
  validNow?: boolean;
}

export class CouponService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new coupon
   */
  async create(input: CreateCouponInput, userId: string) {
    // Check for duplicate code
    const existing = await this.prisma.coupon.findUnique({
      where: { code: input.code.toUpperCase() },
    });
    if (existing) {
      throw new Error('Coupon code already exists');
    }

    return this.prisma.coupon.create({
      data: {
        code: input.code.toUpperCase(),
        name: input.name,
        description: input.description,
        discountType: input.discountType,
        discountValue: input.discountValue,
        minimumAmount: input.minimumAmount,
        maximumDiscount: input.maximumDiscount,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        usageLimit: input.usageLimit,
        usageLimitPerClient: input.usageLimitPerClient,
        clientIds: input.clientIds ?? [],
        isActive: input.isActive ?? true,
        isFirstPurchase: input.isFirstPurchase ?? false,
        createdBy: userId,
      },
    });
  }

  /**
   * Get all coupons with filters
   */
  async findAll(filters: CouponFilters = {}) {
    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.validNow) {
      const now = new Date();
      where.validFrom = { lte: now };
      where.validUntil = { gte: now };
    }

    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.coupon.findMany({
      where,
      include: {
        _count: {
          select: { redemptions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get coupon by ID
   */
  async findById(id: string) {
    return this.prisma.coupon.findFirst({
      where: { id, deletedAt: null },
      include: {
        redemptions: {
          orderBy: { redeemedAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { redemptions: true },
        },
      },
    });
  }

  /**
   * Get coupon by code
   */
  async findByCode(code: string) {
    return this.prisma.coupon.findFirst({
      where: { code: code.toUpperCase(), deletedAt: null },
    });
  }

  /**
   * Update a coupon
   */
  async update(id: string, input: UpdateCouponInput) {
    // Check for duplicate code
    if (input.code) {
      const existing = await this.prisma.coupon.findFirst({
        where: { code: input.code.toUpperCase(), id: { not: id } },
      });
      if (existing) {
        throw new Error('Coupon code already exists');
      }
    }

    return this.prisma.coupon.update({
      where: { id },
      data: {
        code: input.code?.toUpperCase(),
        name: input.name,
        description: input.description,
        discountType: input.discountType,
        discountValue: input.discountValue,
        minimumAmount: input.minimumAmount,
        maximumDiscount: input.maximumDiscount,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        usageLimit: input.usageLimit,
        usageLimitPerClient: input.usageLimitPerClient,
        clientIds: input.clientIds,
        isActive: input.isActive,
        isFirstPurchase: input.isFirstPurchase,
      },
    });
  }

  /**
   * Soft delete a coupon
   */
  async delete(id: string) {
    return this.prisma.coupon.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  /**
   * Validate coupon for use
   */
  async validateCoupon(code: string, amount: number, clientId?: string) {
    const coupon = await this.findByCode(code);
    if (!coupon) {
      return { valid: false, error: 'Coupon not found' };
    }

    if (!coupon.isActive) {
      return { valid: false, error: 'Coupon is not active' };
    }

    const now = new Date();
    if (now < coupon.validFrom) {
      return { valid: false, error: 'Coupon is not yet valid' };
    }

    if (now > coupon.validUntil) {
      return { valid: false, error: 'Coupon has expired' };
    }

    if (coupon.minimumAmount && amount < Number(coupon.minimumAmount)) {
      return { valid: false, error: `Minimum amount of ${coupon.minimumAmount} required` };
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, error: 'Coupon usage limit reached' };
    }

    // Check client-specific restrictions
    if (coupon.clientIds.length > 0 && clientId && !coupon.clientIds.includes(clientId)) {
      return { valid: false, error: 'Coupon not valid for this client' };
    }

    // Check per-client usage limit
    if (coupon.usageLimitPerClient && clientId) {
      const clientRedemptions = await this.prisma.couponRedemption.count({
        where: { couponId: coupon.id, clientId },
      });
      if (clientRedemptions >= coupon.usageLimitPerClient) {
        return { valid: false, error: 'Coupon usage limit reached for this client' };
      }
    }

    return { valid: true, coupon };
  }

  /**
   * Redeem a coupon
   */
  async redeemCoupon(
    couponId: string,
    invoiceId: string,
    discountAmount: number,
    userId: string,
    clientId?: string
  ) {
    // Create redemption record
    await this.prisma.couponRedemption.create({
      data: {
        couponId,
        invoiceId,
        clientId,
        discountAmount,
        redeemedBy: userId,
      },
    });

    // Increment usage count
    await this.prisma.coupon.update({
      where: { id: couponId },
      data: { usageCount: { increment: 1 } },
    });
  }

  /**
   * Calculate discount amount from coupon
   */
  calculateDiscountAmount(
    coupon: { discountType: DiscountType; discountValue: number; maximumDiscount?: number | null },
    amount: number
  ): number {
    let discountAmount: number;

    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = (amount * Number(coupon.discountValue)) / 100;
      if (coupon.maximumDiscount) {
        discountAmount = Math.min(discountAmount, Number(coupon.maximumDiscount));
      }
    } else {
      discountAmount = Number(coupon.discountValue);
    }

    return Math.min(discountAmount, amount);
  }

  /**
   * Get coupon statistics
   */
  async getStatistics(id: string) {
    const coupon = await this.findById(id);
    if (!coupon) {
      throw new Error('Coupon not found');
    }

    const redemptions = await this.prisma.couponRedemption.aggregate({
      where: { couponId: id },
      _sum: { discountAmount: true },
      _count: true,
    });

    return {
      totalRedemptions: redemptions._count,
      totalDiscountGiven: redemptions._sum.discountAmount || 0,
      remainingUses: coupon.usageLimit ? coupon.usageLimit - coupon.usageCount : null,
    };
  }
}
