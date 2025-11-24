/**
 * Bills Routes
 *
 * Manages bills from vendors for Account Payables (stored in tenant database)
 * Bills are what we owe to vendors (opposite of invoices that clients owe us)
 */

import { Router } from 'express';
import type { PrismaClient as ClientPrismaClient } from '../../generated/prisma-client';
import type { JWTPayload } from '@freetimechat/types';
import type { Request, Response } from 'express';

const router = Router();

/**
 * GET /api/v1/admin/bills
 * List all bills for the current tenant
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
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const vendorId = req.query.vendorId as string;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Search filter
    if (search) {
      where.OR = [
        { billNumber: { contains: search, mode: 'insensitive' } },
        { vendorInvoiceNo: { contains: search, mode: 'insensitive' } },
        { vendor: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Vendor filter
    if (vendorId) {
      where.vendorId = vendorId;
    }

    // Get bills with pagination
    const clientDb = req.tenantDb as ClientPrismaClient;
    const [bills, total] = await Promise.all([
      clientDb.bill.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              companyName: true,
            },
          },
          _count: {
            select: {
              items: true,
              payments: true,
            },
          },
        },
      }),
      clientDb.bill.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        bills,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error listing bills:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list bills',
    });
  }
});

/**
 * GET /api/v1/admin/bills/:id
 * Get bill by ID with full details
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

    const bill = await clientDb.bill.findUnique({
      where: { id },
      include: {
        vendor: true,
        items: {
          orderBy: { createdAt: 'asc' },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!bill) {
      res.status(404).json({
        status: 'error',
        message: 'Bill not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: bill,
    });
  } catch (error) {
    console.error('Error getting bill:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get bill',
    });
  }
});

/**
 * POST /api/v1/admin/bills
 * Create new bill
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
    const { vendorId, vendorInvoiceNo, billDate, dueDate, items, taxRate, discountAmount, note } =
      req.body;

    // Validate required fields
    if (!vendorId) {
      res.status(400).json({
        status: 'error',
        message: 'Vendor is required',
      });
      return;
    }

    if (!billDate || !dueDate) {
      res.status(400).json({
        status: 'error',
        message: 'Bill date and due date are required',
      });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'At least one line item is required',
      });
      return;
    }

    const clientDb = req.tenantDb as ClientPrismaClient;

    // Verify vendor exists
    const vendor = await clientDb.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      res.status(404).json({
        status: 'error',
        message: 'Vendor not found',
      });
      return;
    }

    // Generate bill number
    const lastBill = await clientDb.bill.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { billNumber: true },
    });

    let nextNumber = 1;
    if (lastBill?.billNumber) {
      const match = lastBill.billNumber.match(/BILL-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    const billNumber = `BILL-${nextNumber.toString().padStart(5, '0')}`;

    // Calculate amounts
    let subtotal = 0;
    const processedItems = items.map((item: any) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const amount = quantity * unitPrice;
      subtotal += amount;

      return {
        description: item.description,
        quantity,
        unitPrice,
        amount,
        expenseCategoryId: item.expenseCategoryId || null,
        projectId: item.projectId || null,
      };
    });

    const taxRateValue = parseFloat(taxRate) || 0;
    const taxAmount = subtotal * (taxRateValue / 100);
    const discountAmountValue = parseFloat(discountAmount) || 0;
    const totalAmount = subtotal + taxAmount - discountAmountValue;
    const amountDue = totalAmount;

    // Create bill with items
    const bill = await clientDb.bill.create({
      data: {
        billNumber,
        vendorId,
        vendorInvoiceNo: vendorInvoiceNo || null,
        status: 'DRAFT',
        billDate: new Date(billDate),
        dueDate: new Date(dueDate),
        subtotal,
        taxRate: taxRateValue,
        taxAmount,
        discountAmount: discountAmountValue,
        totalAmount,
        amountPaid: 0,
        amountDue,
        note: note || null,
        createdBy: currentUser.sub,
        items: {
          create: processedItems,
        },
      },
      include: {
        vendor: true,
        items: true,
      },
    });

    res.status(201).json({
      status: 'success',
      data: bill,
      message: 'Bill created successfully',
    });
  } catch (error) {
    console.error('Error creating bill:', error);
    if (error instanceof Error) {
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to create bill',
    });
  }
});

/**
 * PUT /api/v1/admin/bills/:id
 * Update bill (only if not paid)
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
    const { vendorInvoiceNo, billDate, dueDate, items, taxRate, discountAmount, note, status } =
      req.body;

    const clientDb = req.tenantDb as ClientPrismaClient;

    // Check if bill exists
    const existingBill = await clientDb.bill.findUnique({
      where: { id },
    });

    if (!existingBill) {
      res.status(404).json({
        status: 'error',
        message: 'Bill not found',
      });
      return;
    }

    // Can't modify paid bills
    if (existingBill.status === 'PAID') {
      res.status(400).json({
        status: 'error',
        message: 'Cannot modify a paid bill',
      });
      return;
    }

    // Build update data
    const updateData: any = {};

    if (vendorInvoiceNo !== undefined) updateData.vendorInvoiceNo = vendorInvoiceNo || null;
    if (billDate !== undefined) updateData.billDate = new Date(billDate);
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (note !== undefined) updateData.note = note || null;
    if (status !== undefined) updateData.status = status;

    // If items are provided, recalculate amounts
    if (items && Array.isArray(items) && items.length > 0) {
      // Delete existing items
      await clientDb.billItem.deleteMany({
        where: { billId: id },
      });

      // Calculate new amounts
      let subtotal = 0;
      const processedItems = items.map((item: any) => {
        const quantity = parseFloat(item.quantity) || 0;
        const unitPrice = parseFloat(item.unitPrice) || 0;
        const amount = quantity * unitPrice;
        subtotal += amount;

        return {
          billId: id,
          description: item.description,
          quantity,
          unitPrice,
          amount,
          expenseCategoryId: item.expenseCategoryId || null,
          projectId: item.projectId || null,
        };
      });

      // Create new items
      await clientDb.billItem.createMany({
        data: processedItems,
      });

      const taxRateValue =
        taxRate !== undefined ? parseFloat(taxRate) : Number(existingBill.taxRate);
      const taxAmount = subtotal * (taxRateValue / 100);
      const discountAmountValue =
        discountAmount !== undefined
          ? parseFloat(discountAmount)
          : Number(existingBill.discountAmount);
      const totalAmount = subtotal + taxAmount - discountAmountValue;
      const amountDue = totalAmount - Number(existingBill.amountPaid);

      updateData.subtotal = subtotal;
      updateData.taxRate = taxRateValue;
      updateData.taxAmount = taxAmount;
      updateData.discountAmount = discountAmountValue;
      updateData.totalAmount = totalAmount;
      updateData.amountDue = amountDue;
    } else if (taxRate !== undefined || discountAmount !== undefined) {
      // Recalculate with existing items
      const subtotal = Number(existingBill.subtotal);
      const taxRateValue =
        taxRate !== undefined ? parseFloat(taxRate) : Number(existingBill.taxRate);
      const taxAmount = subtotal * (taxRateValue / 100);
      const discountAmountValue =
        discountAmount !== undefined
          ? parseFloat(discountAmount)
          : Number(existingBill.discountAmount);
      const totalAmount = subtotal + taxAmount - discountAmountValue;
      const amountDue = totalAmount - Number(existingBill.amountPaid);

      updateData.taxRate = taxRateValue;
      updateData.taxAmount = taxAmount;
      updateData.discountAmount = discountAmountValue;
      updateData.totalAmount = totalAmount;
      updateData.amountDue = amountDue;
    }

    // Update bill
    const bill = await clientDb.bill.update({
      where: { id },
      data: updateData,
      include: {
        vendor: true,
        items: true,
        payments: true,
      },
    });

    res.status(200).json({
      status: 'success',
      data: bill,
      message: 'Bill updated successfully',
    });
  } catch (error) {
    console.error('Error updating bill:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update bill',
    });
  }
});

/**
 * POST /api/v1/admin/bills/:id/payments
 * Record a payment on a bill
 */
router.post('/:id/payments', async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const currentUser = req.user as JWTPayload;
    const { id } = req.params;
    const { amount, paymentDate, paymentMethod, transactionId, referenceNumber, note } = req.body;

    // Validate required fields
    if (!amount || !paymentDate || !paymentMethod) {
      res.status(400).json({
        status: 'error',
        message: 'Amount, payment date, and payment method are required',
      });
      return;
    }

    const clientDb = req.tenantDb as ClientPrismaClient;

    // Get bill
    const bill = await clientDb.bill.findUnique({
      where: { id },
    });

    if (!bill) {
      res.status(404).json({
        status: 'error',
        message: 'Bill not found',
      });
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (paymentAmount <= 0) {
      res.status(400).json({
        status: 'error',
        message: 'Payment amount must be greater than 0',
      });
      return;
    }

    // Check if payment exceeds amount due
    if (paymentAmount > Number(bill.amountDue)) {
      res.status(400).json({
        status: 'error',
        message: `Payment amount (${paymentAmount}) exceeds amount due (${bill.amountDue})`,
      });
      return;
    }

    // Create payment
    const payment = await clientDb.billPayment.create({
      data: {
        billId: id,
        amount: paymentAmount,
        paymentDate: new Date(paymentDate),
        paymentMethod,
        transactionId: transactionId || null,
        referenceNumber: referenceNumber || null,
        note: note || null,
        paidBy: currentUser.sub,
      },
    });

    // Update bill amounts
    const newAmountPaid = Number(bill.amountPaid) + paymentAmount;
    const newAmountDue = Number(bill.totalAmount) - newAmountPaid;

    // Determine new status
    let newStatus = bill.status;
    if (newAmountDue <= 0) {
      newStatus = 'PAID';
    } else if (newAmountPaid > 0) {
      newStatus = 'PARTIAL_PAID';
    }

    await clientDb.bill.update({
      where: { id },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newStatus,
        paidDate: newStatus === 'PAID' ? new Date() : null,
      },
    });

    res.status(201).json({
      status: 'success',
      data: payment,
      message: 'Payment recorded successfully',
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to record payment',
    });
  }
});

/**
 * PUT /api/v1/admin/bills/:id/approve
 * Approve a bill for payment
 */
router.put('/:id/approve', async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const currentUser = req.user as JWTPayload;
    const { id } = req.params;
    const clientDb = req.tenantDb as ClientPrismaClient;

    const bill = await clientDb.bill.findUnique({
      where: { id },
    });

    if (!bill) {
      res.status(404).json({
        status: 'error',
        message: 'Bill not found',
      });
      return;
    }

    if (bill.status !== 'DRAFT' && bill.status !== 'RECEIVED') {
      res.status(400).json({
        status: 'error',
        message: 'Only draft or received bills can be approved',
      });
      return;
    }

    const updatedBill = await clientDb.bill.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: currentUser.sub,
        approvedAt: new Date(),
      },
      include: {
        vendor: true,
      },
    });

    res.status(200).json({
      status: 'success',
      data: updatedBill,
      message: 'Bill approved successfully',
    });
  } catch (error) {
    console.error('Error approving bill:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to approve bill',
    });
  }
});

/**
 * DELETE /api/v1/admin/bills/:id
 * Delete a bill (only if draft and no payments)
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

    // Check if bill exists
    const bill = await clientDb.bill.findUnique({
      where: { id },
      include: {
        _count: {
          select: { payments: true },
        },
      },
    });

    if (!bill) {
      res.status(404).json({
        status: 'error',
        message: 'Bill not found',
      });
      return;
    }

    // Can only delete draft bills with no payments
    if (bill.status !== 'DRAFT') {
      res.status(400).json({
        status: 'error',
        message: 'Only draft bills can be deleted',
      });
      return;
    }

    if (bill._count.payments > 0) {
      res.status(400).json({
        status: 'error',
        message: 'Cannot delete bill with payments',
      });
      return;
    }

    // Delete bill (items will cascade)
    await clientDb.bill.delete({
      where: { id },
    });

    res.status(200).json({
      status: 'success',
      message: 'Bill deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting bill:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete bill',
    });
  }
});

export default router;
