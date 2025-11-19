/**
 * Discount Service
 *
 * Manages discounts that can be applied to invoices
 */

import type { PrismaClient, DiscountType } from '../generated/prisma-client';

export interface CreateDiscountInput {
  name: string;
  description?: string;
  code?: string;
  discountType: DiscountType;
  discountValue: number;
  appliesToAll?: boolean;
  clientId?: string;
  minimumAmount?: number;
  maximumDiscount?: number;
  validFrom?: Date;
  validUntil?: Date;
  usageLimit?: number;
  isActive?: boolean;
}

export interface UpdateDiscountInput {
  name?: string;
  description?: string;
  code?: string;
  discountType?: DiscountType;
  discountValue?: number;
  appliesToAll?: boolean;
  clientId?: string;
  minimumAmount?: number;
  maximumDiscount?: number;
  validFrom?: Date;
  validUntil?: Date;
  usageLimit?: number;
  isActive?: boolean;
}

export interface DiscountFilters {
  search?: string;
  isActive?: boolean;
  clientId?: string;
  discountType?: DiscountType;
}

export class DiscountService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new discount
   */
  async create(input: CreateDiscountInput, userId: string) {
    // Check for duplicate code
    if (input.code) {
      const existing = await this.prisma.discount.findUnique({
        where: { code: input.code },
      });
      if (existing) {
        throw new Error('Discount code already exists');
      }
    }

    return this.prisma.discount.create({
      data: {
        name: input.name,
        description: input.description,
        code: input.code,
        discountType: input.discountType,
        discountValue: input.discountValue,
        appliesToAll: input.appliesToAll ?? true,
        clientId: input.clientId,
        minimumAmount: input.minimumAmount,
        maximumDiscount: input.maximumDiscount,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        usageLimit: input.usageLimit,
        isActive: input.isActive ?? true,
        createdBy: userId,
      },
    });
  }

  /**
   * Get all discounts with filters
   */
  async findAll(filters: DiscountFilters = {}) {
    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.clientId) {
      where.OR = [{ clientId: filters.clientId }, { appliesToAll: true }];
    }

    if (filters.discountType) {
      where.discountType = filters.discountType;
    }

    if (filters.search) {
      where.AND = [
        where.OR ? { OR: where.OR } : {},
        {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { code: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
          ],
        },
      ];
      delete where.OR;
    }

    return this.prisma.discount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get discount by ID
   */
  async findById(id: string) {
    return this.prisma.discount.findFirst({
      where: { id, deletedAt: null },
    });
  }

  /**
   * Get discount by code
   */
  async findByCode(code: string) {
    return this.prisma.discount.findFirst({
      where: { code, deletedAt: null, isActive: true },
    });
  }

  /**
   * Update a discount
   */
  async update(id: string, input: UpdateDiscountInput) {
    // Check for duplicate code
    if (input.code) {
      const existing = await this.prisma.discount.findFirst({
        where: { code: input.code, id: { not: id } },
      });
      if (existing) {
        throw new Error('Discount code already exists');
      }
    }

    return this.prisma.discount.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        code: input.code,
        discountType: input.discountType,
        discountValue: input.discountValue,
        appliesToAll: input.appliesToAll,
        clientId: input.clientId,
        minimumAmount: input.minimumAmount,
        maximumDiscount: input.maximumDiscount,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        usageLimit: input.usageLimit,
        isActive: input.isActive,
      },
    });
  }

  /**
   * Soft delete a discount
   */
  async delete(id: string) {
    return this.prisma.discount.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  /**
   * Check if discount is valid and can be applied
   */
  async validateDiscount(id: string, amount: number, clientId?: string) {
    const discount = await this.findById(id);
    if (!discount) {
      return { valid: false, error: 'Discount not found' };
    }

    if (!discount.isActive) {
      return { valid: false, error: 'Discount is not active' };
    }

    const now = new Date();
    if (discount.validFrom && now < discount.validFrom) {
      return { valid: false, error: 'Discount is not yet valid' };
    }

    if (discount.validUntil && now > discount.validUntil) {
      return { valid: false, error: 'Discount has expired' };
    }

    if (discount.minimumAmount && amount < Number(discount.minimumAmount)) {
      return { valid: false, error: `Minimum amount of ${discount.minimumAmount} required` };
    }

    if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
      return { valid: false, error: 'Discount usage limit reached' };
    }

    if (!discount.appliesToAll && discount.clientId !== clientId) {
      return { valid: false, error: 'Discount not applicable to this client' };
    }

    return { valid: true, discount };
  }

  /**
   * Calculate discount amount
   */
  calculateDiscountAmount(
    discount: {
      discountType: DiscountType;
      discountValue: number;
      maximumDiscount?: number | null;
    },
    amount: number
  ): number {
    let discountAmount: number;

    if (discount.discountType === 'PERCENTAGE') {
      discountAmount = (amount * Number(discount.discountValue)) / 100;
      if (discount.maximumDiscount) {
        discountAmount = Math.min(discountAmount, Number(discount.maximumDiscount));
      }
    } else {
      discountAmount = Number(discount.discountValue);
    }

    return Math.min(discountAmount, amount); // Can't discount more than the amount
  }

  /**
   * Increment usage count
   */
  async incrementUsage(id: string) {
    return this.prisma.discount.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }
}
