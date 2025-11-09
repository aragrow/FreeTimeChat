/**
 * Invoice Routes
 *
 * Manages invoices with PayPal integration
 * Stored in tenant database
 */

import { Router } from 'express';
import { mainDb } from '../../lib/prisma-main';
import type { Request, Response } from 'express';

const router = Router();

/**
 * GET /api/v1/admin/invoices
 * List all invoices
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { page = '1', limit = '20', status, clientId } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: Record<string, unknown> = {};
    if (status) where.status = status as string;
    if (clientId) where.clientId = clientId as string;

    const [invoices, total] = await Promise.all([
      req.clientDb.invoice.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          items: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      req.clientDb.invoice.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        invoices,
        pagination: {
          page: parseInt(page as string),
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    console.error('Error listing invoices:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list invoices',
    });
  }
});

/**
 * GET /api/v1/admin/invoices/:id
 * Get invoice by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { id } = req.params;

    const invoice = await req.clientDb.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        items: true,
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!invoice) {
      res.status(404).json({
        status: 'error',
        message: 'Invoice not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: invoice,
    });
  } catch (error) {
    console.error('Error getting invoice:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get invoice',
    });
  }
});

/**
 * POST /api/v1/admin/invoices
 * Create new invoice
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const {
      clientId,
      items,
      issueDate,
      dueDate,
      taxRate,
      discountAmount,
      note,
      termsAndConditions,
    } = req.body;

    // Validation
    if (!clientId || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'clientId and items array are required',
      });
      return;
    }

    // Verify client exists
    const client = await req.clientDb.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      res.status(404).json({
        status: 'error',
        message: 'Client not found',
      });
      return;
    }

    // Generate invoice number
    const invoiceNumber = `${client.invoicePrefix || 'INV-'}${String(client.invoiceNextNumber).padStart(client.invoiceNumberPadding, '0')}`;

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) => {
      return sum + item.quantity * item.unitPrice;
    }, 0);

    const taxAmount = (subtotal * (taxRate || 0)) / 100;
    const totalAmount = subtotal + taxAmount - (discountAmount || 0);
    const amountDue = totalAmount;

    // Create invoice
    const invoice = await req.clientDb.invoice.create({
      data: {
        invoiceNumber,
        clientId,
        status: 'DRAFT',
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
        subtotal,
        taxRate: taxRate || 0,
        taxAmount,
        discountAmount: discountAmount || 0,
        totalAmount,
        amountDue,
        note: note?.trim() || null,
        termsAndConditions: termsAndConditions?.trim() || null,
        createdBy: req.user?.sub || 'unknown',
        items: {
          create: items.map(
            (item: {
              projectId?: string;
              description: string;
              quantity: number;
              unitPrice: number;
              timeEntryIds?: string[];
            }) => ({
              projectId: item.projectId || null,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.quantity * item.unitPrice,
              timeEntryIds: item.timeEntryIds || [],
            })
          ),
        },
      },
      include: {
        client: true,
        items: true,
      },
    });

    // Update client's next invoice number
    await req.clientDb.client.update({
      where: { id: clientId },
      data: { invoiceNextNumber: client.invoiceNextNumber + 1 },
    });

    res.status(201).json({
      status: 'success',
      data: invoice,
      message: 'Invoice created successfully',
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    if (error instanceof Error) {
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to create invoice',
    });
  }
});

/**
 * POST /api/v1/admin/invoices/:id/send-paypal
 * Send invoice via PayPal
 */
router.post('/:id/send-paypal', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { id } = req.params;

    const invoice = await req.clientDb.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        items: true,
      },
    });

    if (!invoice) {
      res.status(404).json({
        status: 'error',
        message: 'Invoice not found',
      });
      return;
    }

    if (invoice.status !== 'DRAFT') {
      res.status(400).json({
        status: 'error',
        message: 'Only draft invoices can be sent',
      });
      return;
    }

    // Get PayPal tenant config
    const paypalConfig = await req.clientDb.payPalTenantConfig.findFirst({
      where: { isEnabled: true },
    });

    if (!paypalConfig) {
      res.status(400).json({
        status: 'error',
        message: 'PayPal is not configured for this tenant',
      });
      return;
    }

    // Get PayPal integration
    const paypalIntegration = await mainDb.payPalIntegration.findUnique({
      where: { id: paypalConfig.paypalIntegrationId },
    });

    if (!paypalIntegration || !paypalIntegration.isActive) {
      res.status(400).json({
        status: 'error',
        message: 'PayPal integration is not available',
      });
      return;
    }

    // Decrypt client secret
    const clientSecret = Buffer.from(paypalIntegration.clientSecretEnc, 'base64').toString('utf-8');

    const baseUrl = paypalIntegration.isProduction
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    // Get OAuth token
    const authResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${paypalIntegration.clientId}:${clientSecret}`
        ).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!authResponse.ok) {
      res.status(400).json({
        status: 'error',
        message: 'Failed to authenticate with PayPal',
        details: await authResponse.text(),
      });
      return;
    }

    const authData = (await authResponse.json()) as { access_token: string };

    // Create PayPal invoice
    const paypalInvoiceData = {
      detail: {
        invoice_number: invoice.invoiceNumber,
        reference: invoice.id,
        invoice_date: invoice.issueDate.toISOString().split('T')[0],
        currency_code: 'USD',
        note: invoice.note || paypalConfig.invoiceNote || '',
        term: paypalConfig.invoiceEmailSubject || 'Invoice from FreeTimeChat',
        payment_term: {
          term_type: `NET_${paypalConfig.dueInDays}`,
          due_date: invoice.dueDate.toISOString().split('T')[0],
        },
      },
      invoicer: {
        name: {
          given_name: 'Business',
          surname: 'Name',
        },
        email_address: invoice.client?.email || 'business@example.com',
      },
      primary_recipients: [
        {
          billing_info: {
            name: {
              given_name: invoice.client?.name || 'Client',
              surname: '',
            },
            email_address: invoice.client?.email || '',
          },
        },
      ],
      items: invoice.items.map((item) => ({
        name: item.description,
        quantity: item.quantity.toString(),
        unit_amount: {
          currency_code: 'USD',
          value: item.unitPrice.toString(),
        },
        unit_of_measure: 'HOURS',
      })),
      configuration: {
        partial_payment: {
          allow_partial_payment: paypalConfig.allowPartialPayment,
          minimum_amount_due: paypalConfig.minimumAmountDue
            ? {
                currency_code: 'USD',
                value: paypalConfig.minimumAmountDue.toString(),
              }
            : undefined,
        },
        tax_calculated_after_discount: true,
        tax_inclusive: false,
      },
      amount: {
        breakdown: {
          custom: {
            label: 'Subtotal',
            amount: {
              currency_code: 'USD',
              value: invoice.subtotal.toString(),
            },
          },
          discount: invoice.discountAmount
            ? {
                invoice_discount: {
                  amount: {
                    currency_code: 'USD',
                    value: invoice.discountAmount.toString(),
                  },
                },
              }
            : undefined,
        },
      },
    };

    // Create draft invoice in PayPal
    const createResponse = await fetch(`${baseUrl}/v2/invoicing/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authData.access_token}`,
      },
      body: JSON.stringify(paypalInvoiceData),
    });

    if (!createResponse.ok) {
      res.status(400).json({
        status: 'error',
        message: 'Failed to create PayPal invoice',
        details: await createResponse.text(),
      });
      return;
    }

    const createdInvoice = (await createResponse.json()) as { id: string; href: string };

    // Send the invoice
    const sendResponse = await fetch(`${baseUrl}/v2/invoicing/invoices/${createdInvoice.id}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authData.access_token}`,
      },
      body: JSON.stringify({
        send_to_invoicer: true,
      }),
    });

    if (!sendResponse.ok) {
      res.status(400).json({
        status: 'error',
        message: 'Failed to send PayPal invoice',
        details: await sendResponse.text(),
      });
      return;
    }

    // Update local invoice
    const updatedInvoice = await req.clientDb.invoice.update({
      where: { id },
      data: {
        status: 'SENT',
        paypalInvoiceId: createdInvoice.id,
        paypalInvoiceUrl: createdInvoice.href,
        sentBy: req.user?.sub || 'unknown',
        sentAt: new Date(),
      },
      include: {
        client: true,
        items: true,
      },
    });

    res.status(200).json({
      status: 'success',
      data: updatedInvoice,
      message: 'Invoice sent via PayPal successfully',
    });
  } catch (error) {
    console.error('Error sending PayPal invoice:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send PayPal invoice',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/admin/invoices/:id/record-payment
 * Record a payment for an invoice
 */
router.post('/:id/record-payment', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { id } = req.params;
    const { amount, paymentDate, paymentMethod, note, paypalPaymentId } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({
        status: 'error',
        message: 'Valid payment amount is required',
      });
      return;
    }

    const invoice = await req.clientDb.invoice.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!invoice) {
      res.status(404).json({
        status: 'error',
        message: 'Invoice not found',
      });
      return;
    }

    // Create payment record
    const payment = await req.clientDb.invoicePayment.create({
      data: {
        invoiceId: id,
        amount,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMethod: paymentMethod || 'PayPal',
        note: note?.trim() || null,
        paypalPaymentId: paypalPaymentId?.trim() || null,
      },
    });

    // Calculate new amounts
    const totalPaid = invoice.amountPaid.toNumber() + parseFloat(amount);
    const newAmountDue = invoice.totalAmount.toNumber() - totalPaid;

    // Determine new status
    let newStatus: string = invoice.status;
    if (newAmountDue <= 0) {
      newStatus = 'PAID';
    } else if (totalPaid > 0) {
      newStatus = 'PARTIAL_PAID';
    }

    // Update invoice
    const updatedInvoice = await req.clientDb.invoice.update({
      where: { id },
      data: {
        amountPaid: totalPaid,
        amountDue: Math.max(0, newAmountDue),
        status: newStatus as
          | 'DRAFT'
          | 'SENT'
          | 'VIEWED'
          | 'PAID'
          | 'PARTIAL_PAID'
          | 'CANCELLED'
          | 'REFUNDED'
          | 'OVERDUE',
        paidDate: newStatus === 'PAID' ? new Date() : invoice.paidDate,
      },
      include: {
        client: true,
        items: true,
        payments: true,
      },
    });

    res.status(201).json({
      status: 'success',
      data: {
        payment,
        invoice: updatedInvoice,
      },
      message: 'Payment recorded successfully',
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    if (error instanceof Error) {
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
      return;
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to record payment',
    });
  }
});

export default router;
