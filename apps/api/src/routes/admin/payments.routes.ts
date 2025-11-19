/**
 * Payments Admin Routes
 */

import { Router } from 'express';
import { PaymentService } from '../../services/payment.service';
import type { AuthenticatedRequest } from '../../types/express';
import type { Response } from 'express';

const router = Router();

// GET /api/v1/admin/payments - List all payments
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.clientPrisma;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new PaymentService(prisma);
    const { search, clientId, invoiceId, paymentMethod, status, dateFrom, dateTo, page, limit } =
      req.query;

    const result = await service.findAll(
      {
        search: search as string,
        clientId: clientId as string,
        invoiceId: invoiceId as string,
        paymentMethod: paymentMethod as
          | 'CASH'
          | 'CHECK'
          | 'CREDIT_CARD'
          | 'DEBIT_CARD'
          | 'BANK_TRANSFER'
          | 'PAYPAL'
          | 'STRIPE'
          | 'WIRE'
          | 'ACH'
          | 'OTHER',
        status: status as 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED',
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
      },
      {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      }
    );

    res.json({ status: 'success', data: result });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch payments' });
  }
});

// GET /api/v1/admin/payments/stats - Get payment statistics
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.clientPrisma;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new PaymentService(prisma);
    const { dateFrom, dateTo, clientId } = req.query;

    const stats = await service.getStatistics({
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      clientId: clientId as string,
    });

    res.json({ status: 'success', data: { statistics: stats } });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch payment statistics' });
  }
});

// GET /api/v1/admin/payments/:id - Get payment by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.clientPrisma;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new PaymentService(prisma);
    const payment = await service.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ status: 'error', message: 'Payment not found' });
    }

    res.json({ status: 'success', data: { payment } });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch payment' });
  }
});

// POST /api/v1/admin/payments - Create payment
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.clientPrisma;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new PaymentService(prisma);
    const {
      invoiceId,
      clientId,
      amount,
      currency,
      paymentMethod,
      paymentDate,
      transactionId,
      referenceNumber,
      note,
    } = req.body;

    if (amount === undefined || !paymentMethod || !paymentDate) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Amount, paymentMethod, and paymentDate are required' });
    }

    const payment = await service.create(
      {
        invoiceId,
        clientId,
        amount,
        currency,
        paymentMethod,
        paymentDate: new Date(paymentDate),
        transactionId,
        referenceNumber,
        note,
      },
      req.user!.id
    );

    res.status(201).json({ status: 'success', data: { payment } });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create payment' });
  }
});

// POST /api/v1/admin/payments/:id/refund - Process refund
router.post('/:id/refund', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.clientPrisma;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new PaymentService(prisma);
    const { amount, note } = req.body;

    if (amount === undefined) {
      return res.status(400).json({ status: 'error', message: 'Refund amount is required' });
    }

    const refund = await service.refund(req.params.id, amount, req.user!.id, note);

    res.json({ status: 'success', data: { refund } });
  } catch (error) {
    console.error('Error processing refund:', error);
    const message = error instanceof Error ? error.message : 'Failed to process refund';
    res.status(500).json({ status: 'error', message });
  }
});

// PUT /api/v1/admin/payments/:id - Update payment
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.clientPrisma;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new PaymentService(prisma);
    const updateData = { ...req.body };

    if (updateData.paymentDate) updateData.paymentDate = new Date(updateData.paymentDate);

    const payment = await service.update(req.params.id, updateData);

    res.json({ status: 'success', data: { payment } });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update payment' });
  }
});

// DELETE /api/v1/admin/payments/:id - Delete payment
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.clientPrisma;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new PaymentService(prisma);
    await service.delete(req.params.id);

    res.json({ status: 'success', message: 'Payment deleted' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete payment';
    res.status(500).json({ status: 'error', message });
  }
});

export default router;
