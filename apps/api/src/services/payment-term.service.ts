/**
 * Payment Term Service
 *
 * Manages payment terms like Net 30, Due on Receipt, etc.
 */

import type { PrismaClient } from '../generated/prisma-client';

export interface CreatePaymentTermInput {
  name: string;
  description?: string;
  daysUntilDue: number;
  discountPercent?: number;
  discountDays?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UpdatePaymentTermInput {
  name?: string;
  description?: string;
  daysUntilDue?: number;
  discountPercent?: number;
  discountDays?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface PaymentTermFilters {
  search?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

// Default payment terms to seed
export const DEFAULT_PAYMENT_TERMS = [
  { name: 'Due on Receipt', daysUntilDue: 0, description: 'Payment due immediately upon receipt' },
  { name: 'Net 7', daysUntilDue: 7, description: 'Payment due within 7 days' },
  { name: 'Net 15', daysUntilDue: 15, description: 'Payment due within 15 days' },
  { name: 'Net 30', daysUntilDue: 30, description: 'Payment due within 30 days', isDefault: true },
  { name: 'Net 45', daysUntilDue: 45, description: 'Payment due within 45 days' },
  { name: 'Net 60', daysUntilDue: 60, description: 'Payment due within 60 days' },
  { name: 'Net 90', daysUntilDue: 90, description: 'Payment due within 90 days' },
  {
    name: '2/10 Net 30',
    daysUntilDue: 30,
    discountPercent: 2,
    discountDays: 10,
    description: '2% discount if paid within 10 days, otherwise net 30',
  },
];

export class PaymentTermService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new payment term
   */
  async create(input: CreatePaymentTermInput, userId: string) {
    // If setting as default, unset other defaults
    if (input.isDefault) {
      await this.prisma.paymentTerm.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.paymentTerm.create({
      data: {
        name: input.name,
        description: input.description,
        daysUntilDue: input.daysUntilDue,
        discountPercent: input.discountPercent,
        discountDays: input.discountDays,
        isDefault: input.isDefault ?? false,
        isActive: input.isActive ?? true,
        createdBy: userId,
      },
    });
  }

  /**
   * Get all payment terms with filters
   */
  async findAll(filters: PaymentTermFilters = {}) {
    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.isDefault !== undefined) {
      where.isDefault = filters.isDefault;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.paymentTerm.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { daysUntilDue: 'asc' }],
    });
  }

  /**
   * Get payment term by ID
   */
  async findById(id: string) {
    return this.prisma.paymentTerm.findFirst({
      where: { id, deletedAt: null },
    });
  }

  /**
   * Get default payment term
   */
  async getDefault() {
    return this.prisma.paymentTerm.findFirst({
      where: { isDefault: true, isActive: true, deletedAt: null },
    });
  }

  /**
   * Update a payment term
   */
  async update(id: string, input: UpdatePaymentTermInput) {
    // If setting as default, unset other defaults
    if (input.isDefault) {
      await this.prisma.paymentTerm.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.paymentTerm.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        daysUntilDue: input.daysUntilDue,
        discountPercent: input.discountPercent,
        discountDays: input.discountDays,
        isDefault: input.isDefault,
        isActive: input.isActive,
      },
    });
  }

  /**
   * Soft delete a payment term
   */
  async delete(id: string) {
    const term = await this.findById(id);
    if (term?.isDefault) {
      throw new Error('Cannot delete the default payment term');
    }

    return this.prisma.paymentTerm.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  /**
   * Set a payment term as default
   */
  async setDefault(id: string) {
    await this.prisma.paymentTerm.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });

    return this.prisma.paymentTerm.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  /**
   * Seed default payment terms
   */
  async seedDefaults(userId: string) {
    const existing = await this.prisma.paymentTerm.count();
    if (existing > 0) {
      return { created: 0, message: 'Payment terms already exist' };
    }

    const created = await Promise.all(
      DEFAULT_PAYMENT_TERMS.map((term) =>
        this.prisma.paymentTerm.create({
          data: {
            ...term,
            createdBy: userId,
          },
        })
      )
    );

    return { created: created.length, message: `Created ${created.length} default payment terms` };
  }
}
