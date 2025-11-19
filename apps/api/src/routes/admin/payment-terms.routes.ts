/**
 * Payment Terms Admin Routes
 */

import { Router } from 'express';
import { PaymentTermService } from '../../services/payment-term.service';
import type { AuthenticatedRequest } from '../../types/express';
import type { Response } from 'express';

const router = Router();

// GET /api/v1/admin/payment-terms - List all payment terms
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.clientPrisma;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new PaymentTermService(prisma);
    const { search, isActive } = req.query;

    const terms = await service.findAll({
      search: search as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });

    res.json({ status: 'success', data: { paymentTerms: terms } });
  } catch (error) {
    console.error('Error fetching payment terms:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch payment terms' });
  }
});

// GET /api/v1/admin/payment-terms/default - Get default payment term
router.get('/default', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.clientPrisma;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new PaymentTermService(prisma);
    const term = await service.getDefault();

    if (!term) {
      return res.status(404).json({ status: 'error', message: 'No default payment term found' });
    }

    res.json({ status: 'success', data: { paymentTerm: term } });
  } catch (error) {
    console.error('Error fetching default payment term:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch default payment term' });
  }
});

// GET /api/v1/admin/payment-terms/:id - Get payment term by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.clientPrisma;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new PaymentTermService(prisma);
    const term = await service.findById(req.params.id);

    if (!term) {
      return res.status(404).json({ status: 'error', message: 'Payment term not found' });
    }

    res.json({ status: 'success', data: { paymentTerm: term } });
  } catch (error) {
    console.error('Error fetching payment term:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch payment term' });
  }
});

// POST /api/v1/admin/payment-terms - Create payment term
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.clientPrisma;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new PaymentTermService(prisma);
    const { name, description, daysUntilDue, discountPercent, discountDays, isDefault, isActive } =
      req.body;

    if (!name || daysUntilDue === undefined) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Name and daysUntilDue are required' });
    }

    const term = await service.create(
      { name, description, daysUntilDue, discountPercent, discountDays, isDefault, isActive },
      req.user!.id
    );

    res.status(201).json({ status: 'success', data: { paymentTerm: term } });
  } catch (error) {
    console.error('Error creating payment term:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create payment term' });
  }
});

// POST /api/v1/admin/payment-terms/seed - Seed default payment terms
router.post('/seed', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.clientPrisma;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new PaymentTermService(prisma);
    const result = await service.seedDefaults(req.user!.id);

    res.json({ status: 'success', data: result });
  } catch (error) {
    console.error('Error seeding payment terms:', error);
    res.status(500).json({ status: 'error', message: 'Failed to seed payment terms' });
  }
});

// PUT /api/v1/admin/payment-terms/:id - Update payment term
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.clientPrisma;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new PaymentTermService(prisma);
    const term = await service.update(req.params.id, req.body);

    res.json({ status: 'success', data: { paymentTerm: term } });
  } catch (error) {
    console.error('Error updating payment term:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update payment term' });
  }
});

// PUT /api/v1/admin/payment-terms/:id/default - Set as default
router.put('/:id/default', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.clientPrisma;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new PaymentTermService(prisma);
    const term = await service.setDefault(req.params.id);

    res.json({ status: 'success', data: { paymentTerm: term } });
  } catch (error) {
    console.error('Error setting default payment term:', error);
    res.status(500).json({ status: 'error', message: 'Failed to set default payment term' });
  }
});

// DELETE /api/v1/admin/payment-terms/:id - Delete payment term
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.clientPrisma;
    if (!prisma) {
      return res.status(400).json({ status: 'error', message: 'Client database not connected' });
    }

    const service = new PaymentTermService(prisma);
    await service.delete(req.params.id);

    res.json({ status: 'success', message: 'Payment term deleted' });
  } catch (error) {
    console.error('Error deleting payment term:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete payment term';
    res.status(500).json({ status: 'error', message });
  }
});

export default router;
