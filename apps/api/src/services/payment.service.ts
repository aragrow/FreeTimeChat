/**
 * Payment Service
 *
 * Manages payments and refunds
 */

import type { PrismaClient, PaymentMethod, PaymentStatus } from '../generated/prisma-client';

export interface CreatePaymentInput {
  invoiceId?: string;
  clientId?: string;
  amount: number;
  currency?: string;
  paymentMethod: PaymentMethod;
  paymentDate: Date;
  transactionId?: string;
  referenceNumber?: string;
  note?: string;
}

export interface UpdatePaymentInput {
  amount?: number;
  currency?: string;
  paymentMethod?: PaymentMethod;
  paymentDate?: Date;
  transactionId?: string;
  referenceNumber?: string;
  status?: PaymentStatus;
  note?: string;
}

export interface PaymentFilters {
  search?: string;
  clientId?: string;
  invoiceId?: string;
  paymentMethod?: PaymentMethod;
  status?: PaymentStatus;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export class PaymentService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new payment
   */
  async create(input: CreatePaymentInput, userId: string) {
    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: input.invoiceId,
        clientId: input.clientId,
        amount: input.amount,
        currency: input.currency ?? 'USD',
        paymentMethod: input.paymentMethod,
        paymentDate: input.paymentDate,
        transactionId: input.transactionId,
        referenceNumber: input.referenceNumber,
        note: input.note,
        status: 'COMPLETED',
        receivedBy: userId,
      },
    });

    // Update invoice if linked
    if (input.invoiceId) {
      await this.updateInvoicePaymentStatus(input.invoiceId);
    }

    return payment;
  }

  /**
   * Get all payments with filters and pagination
   */
  async findAll(filters: PaymentFilters = {}, pagination: PaginationOptions = {}) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters.invoiceId) {
      where.invoiceId = filters.invoiceId;
    }

    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.paymentDate = {};
      if (filters.dateFrom) {
        (where.paymentDate as Record<string, Date>).gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        (where.paymentDate as Record<string, Date>).lte = filters.dateTo;
      }
    }

    if (filters.search) {
      where.OR = [
        { transactionId: { contains: filters.search, mode: 'insensitive' } },
        { referenceNumber: { contains: filters.search, mode: 'insensitive' } },
        { note: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get payment by ID
   */
  async findById(id: string) {
    return this.prisma.payment.findUnique({
      where: { id },
    });
  }

  /**
   * Update a payment
   */
  async update(id: string, input: UpdatePaymentInput) {
    const payment = await this.prisma.payment.update({
      where: { id },
      data: {
        amount: input.amount,
        currency: input.currency,
        paymentMethod: input.paymentMethod,
        paymentDate: input.paymentDate,
        transactionId: input.transactionId,
        referenceNumber: input.referenceNumber,
        status: input.status,
        note: input.note,
      },
    });

    // Update invoice if linked
    if (payment.invoiceId) {
      await this.updateInvoicePaymentStatus(payment.invoiceId);
    }

    return payment;
  }

  /**
   * Delete a payment
   */
  async delete(id: string) {
    const payment = await this.findById(id);
    if (!payment) {
      throw new Error('Payment not found');
    }

    await this.prisma.payment.delete({
      where: { id },
    });

    // Update invoice if linked
    if (payment.invoiceId) {
      await this.updateInvoicePaymentStatus(payment.invoiceId);
    }

    return { deleted: true };
  }

  /**
   * Process a refund
   */
  async refund(paymentId: string, amount: number, userId: string, note?: string) {
    const originalPayment = await this.findById(paymentId);
    if (!originalPayment) {
      throw new Error('Original payment not found');
    }

    if (amount > Number(originalPayment.amount)) {
      throw new Error('Refund amount cannot exceed original payment amount');
    }

    // Create refund payment
    const refund = await this.prisma.payment.create({
      data: {
        invoiceId: originalPayment.invoiceId,
        clientId: originalPayment.clientId,
        amount: -amount, // Negative amount for refund
        currency: originalPayment.currency,
        paymentMethod: originalPayment.paymentMethod,
        paymentDate: new Date(),
        note: note ?? `Refund for payment ${paymentId}`,
        status: 'REFUNDED',
        isRefund: true,
        refundedPaymentId: paymentId,
        receivedBy: userId,
      },
    });

    // Update original payment status
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'REFUNDED' },
    });

    // Update invoice if linked
    if (originalPayment.invoiceId) {
      await this.updateInvoicePaymentStatus(originalPayment.invoiceId);
    }

    return refund;
  }

  /**
   * Get payments for a client
   */
  async getClientPayments(clientId: string) {
    return this.prisma.payment.findMany({
      where: { clientId },
      orderBy: { paymentDate: 'desc' },
    });
  }

  /**
   * Get payments for an invoice
   */
  async getInvoicePayments(invoiceId: string) {
    return this.prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { paymentDate: 'desc' },
    });
  }

  /**
   * Get payment summary statistics
   */
  async getStatistics(filters: { dateFrom?: Date; dateTo?: Date; clientId?: string } = {}) {
    const where: Record<string, unknown> = {
      status: 'COMPLETED',
      isRefund: false,
    };

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.paymentDate = {};
      if (filters.dateFrom) {
        (where.paymentDate as Record<string, Date>).gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        (where.paymentDate as Record<string, Date>).lte = filters.dateTo;
      }
    }

    const [totalReceived, byMethod, refunds] = await Promise.all([
      this.prisma.payment.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payment.groupBy({
        by: ['paymentMethod'],
        where,
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: { ...where, isRefund: true },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      totalReceived: totalReceived._sum.amount || 0,
      totalPayments: totalReceived._count,
      totalRefunded: Math.abs(Number(refunds._sum.amount || 0)),
      totalRefunds: refunds._count,
      byMethod: byMethod.map((m) => ({
        method: m.paymentMethod,
        amount: m._sum.amount || 0,
        count: m._count,
      })),
    };
  }

  /**
   * Update invoice payment status based on payments
   */
  private async updateInvoicePaymentStatus(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) return;

    // Get all payments for this invoice
    const payments = await this.prisma.payment.findMany({
      where: { invoiceId, status: 'COMPLETED' },
    });

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const amountDue = Number(invoice.totalAmount) - totalPaid;

    let status = invoice.status;
    if (totalPaid >= Number(invoice.totalAmount)) {
      status = 'PAID';
    } else if (totalPaid > 0) {
      status = 'PARTIAL_PAID';
    }

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: totalPaid,
        amountDue: Math.max(0, amountDue),
        status,
        paidDate: status === 'PAID' ? new Date() : null,
      },
    });
  }
}
