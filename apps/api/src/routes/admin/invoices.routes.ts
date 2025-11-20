/**
 * Invoice Routes
 *
 * Manages invoices with PayPal integration
 * Stored in tenant database
 */

import { Router } from 'express';
import { PrismaClient as MainPrismaClient } from '../../generated/prisma-main';
import type { PrismaClient as ClientPrismaClient } from '../../generated/prisma-client';
import type { JWTPayload } from '@freetimechat/types';
import type { Request, Response } from 'express';

const router = Router();
const mainDb = new MainPrismaClient();

// Valid status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  PROCESSING: [
    'SENT_TO_CLIENT',
    'SENT_EMAIL',
    'SENT_MAIL',
    'SENT_PAYPAL',
    'SENT_STRIPE',
    'INVALID',
    'VOID',
    'CANCELLED',
  ],
  SENT_TO_CLIENT: ['VOID', 'CANCELLED', 'COMPLETED'],
  SENT_EMAIL: ['VOID', 'CANCELLED', 'COMPLETED'],
  SENT_MAIL: ['VOID', 'CANCELLED', 'COMPLETED'],
  SENT_PAYPAL: ['VOID', 'CANCELLED', 'COMPLETED'],
  SENT_STRIPE: ['VOID', 'CANCELLED', 'COMPLETED'],
  INVALID: ['VOID'],
  VOID: [],
  CANCELLED: [],
  COMPLETED: [],
};

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

    const clientDb = req.clientDb as ClientPrismaClient;
    const [invoices, total] = await Promise.all([
      clientDb.invoice.findMany({
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
      clientDb.invoice.count({ where }),
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
    const clientDb = req.clientDb as ClientPrismaClient;

    const invoice = await clientDb.invoice.findUnique({
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
 * POST /api/v1/admin/invoices/preview
 * Preview invoices that would be generated from time entries
 */
router.post('/preview', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { clientId, projectIds, dateFrom, dateTo } = req.body;

    const clientDb = req.clientDb as ClientPrismaClient;

    // Build time entry filter
    const timeEntryWhere: Record<string, unknown> = {
      isBillable: true,
      invoiceId: null, // Not yet invoiced
      deletedAt: null,
    };

    // Date filters
    if (dateFrom || dateTo) {
      timeEntryWhere.startTime = {};
      if (dateFrom) {
        (timeEntryWhere.startTime as Record<string, Date>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (timeEntryWhere.startTime as Record<string, Date>).lte = new Date(dateTo);
      }
    }

    // Project filter
    if (projectIds && projectIds.length > 0) {
      timeEntryWhere.projectId = { in: projectIds };
    }

    // Get all billable time entries with project and client info
    const timeEntries = await clientDb.timeEntry.findMany({
      where: timeEntryWhere,
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Filter by client if specified
    let filteredEntries = timeEntries;
    if (clientId) {
      filteredEntries = timeEntries.filter((entry) => entry.project.clientId === clientId);
    }

    // Filter to only include entries from billable projects
    filteredEntries = filteredEntries.filter((entry) => entry.project.isBillableProject);

    // Group by client, then by project
    const clientGroups: Record<
      string,
      {
        client: {
          id: string;
          name: string;
          invoicePrefix: string | null;
          invoiceNextNumber: number;
          invoiceNumberPadding: number;
          hourlyRate: number | null;
        };
        projects: Record<
          string,
          {
            project: { id: string; name: string; hourlyRate: number | null };
            entries: typeof filteredEntries;
            totalHours: number;
            totalAmount: number;
          }
        >;
        totalHours: number;
        totalAmount: number;
      }
    > = {};

    for (const entry of filteredEntries) {
      const client = entry.project.client;
      if (!client) continue;

      // Initialize client group
      if (!clientGroups[client.id]) {
        clientGroups[client.id] = {
          client: {
            id: client.id,
            name: client.name,
            invoicePrefix: client.invoicePrefix,
            invoiceNextNumber: client.invoiceNextNumber,
            invoiceNumberPadding: client.invoiceNumberPadding,
            hourlyRate: client.hourlyRate ? Number(client.hourlyRate) : null,
          },
          projects: {},
          totalHours: 0,
          totalAmount: 0,
        };
      }

      // Initialize project group
      if (!clientGroups[client.id].projects[entry.projectId]) {
        clientGroups[client.id].projects[entry.projectId] = {
          project: {
            id: entry.project.id,
            name: entry.project.name,
            hourlyRate: entry.project.hourlyRate ? Number(entry.project.hourlyRate) : null,
          },
          entries: [],
          totalHours: 0,
          totalAmount: 0,
        };
      }

      // Calculate hours
      const hours = entry.duration ? entry.duration / 3600 : 0;

      // Determine hourly rate (project > client > default)
      const hourlyRate = entry.project.hourlyRate
        ? Number(entry.project.hourlyRate)
        : client.hourlyRate
          ? Number(client.hourlyRate)
          : 0;

      const amount = hours * hourlyRate;

      // Add entry to project
      clientGroups[client.id].projects[entry.projectId].entries.push(entry);
      clientGroups[client.id].projects[entry.projectId].totalHours += hours;
      clientGroups[client.id].projects[entry.projectId].totalAmount += amount;
      clientGroups[client.id].totalHours += hours;
      clientGroups[client.id].totalAmount += amount;
    }

    // Convert to array format for response
    const preview = Object.values(clientGroups).map((clientGroup) => ({
      client: clientGroup.client,
      projects: Object.values(clientGroup.projects).map((projectGroup) => ({
        project: projectGroup.project,
        entries: projectGroup.entries.map((entry) => ({
          id: entry.id,
          description: entry.description,
          startTime: entry.startTime,
          endTime: entry.endTime,
          duration: entry.duration,
          hours: entry.duration ? entry.duration / 3600 : 0,
        })),
        totalHours: projectGroup.totalHours,
        totalAmount: projectGroup.totalAmount,
      })),
      totalHours: clientGroup.totalHours,
      totalAmount: clientGroup.totalAmount,
    }));

    res.status(200).json({
      status: 'success',
      data: {
        preview,
        summary: {
          clientCount: preview.length,
          totalHours: preview.reduce((sum, c) => sum + c.totalHours, 0),
          totalAmount: preview.reduce((sum, c) => sum + c.totalAmount, 0),
        },
      },
    });
  } catch (error) {
    console.error('Error previewing invoices:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to preview invoices',
    });
  }
});

/**
 * POST /api/v1/admin/invoices/generate
 * Generate invoices from billable time entries
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const currentUser = req.user as JWTPayload;
    const { clientId, projectIds, dateFrom, dateTo, taxRate = 0, note } = req.body;

    const clientDb = req.clientDb as ClientPrismaClient;

    // Get tenant settings for fallback invoice numbering
    const tenant = await mainDb.tenant.findUnique({
      where: { id: currentUser.tenantId },
      select: {
        invoicePrefix: true,
        nextInvoiceNumber: true,
      },
    });

    // Build time entry filter
    const timeEntryWhere: Record<string, unknown> = {
      isBillable: true,
      invoiceId: null,
      deletedAt: null,
    };

    if (dateFrom || dateTo) {
      timeEntryWhere.startTime = {};
      if (dateFrom) {
        (timeEntryWhere.startTime as Record<string, Date>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (timeEntryWhere.startTime as Record<string, Date>).lte = new Date(dateTo);
      }
    }

    if (projectIds && projectIds.length > 0) {
      timeEntryWhere.projectId = { in: projectIds };
    }

    // Get all billable time entries
    const timeEntries = await clientDb.timeEntry.findMany({
      where: timeEntryWhere,
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Filter by client if specified
    let filteredEntries = timeEntries;
    if (clientId) {
      filteredEntries = timeEntries.filter((entry) => entry.project.clientId === clientId);
    }

    // Filter to only include entries from billable projects
    filteredEntries = filteredEntries.filter((entry) => entry.project.isBillableProject);

    if (filteredEntries.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'No billable time entries found matching the criteria',
      });
      return;
    }

    // Group by client, then by project
    const clientGroups: Record<
      string,
      {
        client: (typeof filteredEntries)[0]['project']['client'];
        projects: Record<
          string,
          {
            project: (typeof filteredEntries)[0]['project'];
            entries: typeof filteredEntries;
          }
        >;
      }
    > = {};

    for (const entry of filteredEntries) {
      const client = entry.project.client;
      if (!client) continue;

      if (!clientGroups[client.id]) {
        clientGroups[client.id] = {
          client,
          projects: {},
        };
      }

      if (!clientGroups[client.id].projects[entry.projectId]) {
        clientGroups[client.id].projects[entry.projectId] = {
          project: entry.project,
          entries: [],
        };
      }

      clientGroups[client.id].projects[entry.projectId].entries.push(entry);
    }

    // Create invoices for each client
    const createdInvoices = [];
    let tenantNextNumber = tenant?.nextInvoiceNumber || 1;

    for (const clientGroup of Object.values(clientGroups)) {
      const client = clientGroup.client;
      if (!client) continue;

      // Generate invoice number
      let invoiceNumber: string;
      let usedClientNumbering = false;

      if (client.invoicePrefix) {
        // Use client-specific numbering
        invoiceNumber = `${client.invoicePrefix}${String(client.invoiceNextNumber).padStart(client.invoiceNumberPadding, '0')}`;
        usedClientNumbering = true;
      } else {
        // Fall back to tenant numbering
        const prefix = tenant?.invoicePrefix || 'INV-';
        invoiceNumber = `${prefix}${String(tenantNextNumber).padStart(5, '0')}`;
        tenantNextNumber++;
      }

      // Build invoice items from projects
      const items: {
        projectId: string;
        description: string;
        quantity: number;
        unitPrice: number;
        amount: number;
        timeEntryIds: string[];
      }[] = [];

      const timeEntryIds: string[] = [];

      for (const projectGroup of Object.values(clientGroup.projects)) {
        const project = projectGroup.project;
        const entries = projectGroup.entries;

        // Calculate total hours for this project
        const totalHours = entries.reduce((sum, entry) => {
          return sum + (entry.duration ? entry.duration / 3600 : 0);
        }, 0);

        // Determine hourly rate
        const hourlyRate = project.hourlyRate
          ? Number(project.hourlyRate)
          : client.hourlyRate
            ? Number(client.hourlyRate)
            : 0;

        const amount = totalHours * hourlyRate;

        // Collect time entry IDs
        const entryIds = entries.map((e) => e.id);
        timeEntryIds.push(...entryIds);

        items.push({
          projectId: project.id,
          description: `${project.name} - ${totalHours.toFixed(2)} hours`,
          quantity: totalHours,
          unitPrice: hourlyRate,
          amount,
          timeEntryIds: entryIds,
        });
      }

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
      const taxAmount = (subtotal * taxRate) / 100;
      const totalAmount = subtotal + taxAmount;

      // Create the invoice
      const invoice = await clientDb.invoice.create({
        data: {
          invoiceNumber,
          clientId: client.id,
          status: 'PROCESSING',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          subtotal,
          taxRate,
          taxAmount,
          discountAmount: 0,
          totalAmount,
          amountDue: totalAmount,
          note: note?.trim() || null,
          createdBy: currentUser.sub,
          items: {
            create: items.map((item) => ({
              projectId: item.projectId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount,
              timeEntryIds: item.timeEntryIds,
            })),
          },
        },
        include: {
          client: true,
          items: true,
        },
      });

      // Mark time entries as invoiced
      await clientDb.timeEntry.updateMany({
        where: { id: { in: timeEntryIds } },
        data: {
          invoiceId: invoice.id,
          invoicedAt: new Date(),
        },
      });

      // Update client's next invoice number if using client numbering
      if (usedClientNumbering) {
        await clientDb.client.update({
          where: { id: client.id },
          data: { invoiceNextNumber: client.invoiceNextNumber + 1 },
        });
      }

      createdInvoices.push(invoice);
    }

    // Update tenant's next invoice number if we used it
    if (tenantNextNumber > (tenant?.nextInvoiceNumber || 1)) {
      await mainDb.tenant.update({
        where: { id: currentUser.tenantId },
        data: { nextInvoiceNumber: tenantNextNumber },
      });
    }

    res.status(201).json({
      status: 'success',
      data: {
        invoices: createdInvoices,
        count: createdInvoices.length,
      },
      message: `Generated ${createdInvoices.length} invoice(s) successfully`,
    });
  } catch (error) {
    console.error('Error generating invoices:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate invoices',
    });
  }
});

/**
 * PUT /api/v1/admin/invoices/:id
 * Update invoice (only when status is PROCESSING)
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { id } = req.params;
    const { items, issueDate, dueDate, taxRate, discountAmount, note, termsAndConditions } =
      req.body;

    const clientDb = req.clientDb as ClientPrismaClient;

    // Get existing invoice
    const invoice = await clientDb.invoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!invoice) {
      res.status(404).json({
        status: 'error',
        message: 'Invoice not found',
      });
      return;
    }

    // Only allow editing when status is PROCESSING
    if (invoice.status !== 'PROCESSING') {
      res.status(400).json({
        status: 'error',
        message: 'Only invoices with PROCESSING status can be edited',
      });
      return;
    }

    // Calculate new totals if items provided
    let subtotal = Number(invoice.subtotal);
    const newTaxRate = taxRate !== undefined ? taxRate : Number(invoice.taxRate);
    const newDiscountAmount =
      discountAmount !== undefined ? discountAmount : Number(invoice.discountAmount);

    // Update items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items
      await clientDb.invoiceItem.deleteMany({
        where: { invoiceId: id },
      });

      // Calculate new subtotal
      subtotal = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) => {
        return sum + item.quantity * item.unitPrice;
      }, 0);

      // Create new items
      await clientDb.invoiceItem.createMany({
        data: items.map(
          (item: {
            projectId?: string;
            description: string;
            quantity: number;
            unitPrice: number;
            timeEntryIds?: string[];
          }) => ({
            invoiceId: id,
            projectId: item.projectId || null,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
            timeEntryIds: item.timeEntryIds || [],
          })
        ),
      });
    }

    const taxAmount = (subtotal * newTaxRate) / 100;
    const totalAmount = subtotal + taxAmount - newDiscountAmount;
    const amountDue = totalAmount - Number(invoice.amountPaid);

    // Update invoice
    const updatedInvoice = await clientDb.invoice.update({
      where: { id },
      data: {
        issueDate: issueDate ? new Date(issueDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        subtotal,
        taxRate: newTaxRate,
        taxAmount,
        discountAmount: newDiscountAmount,
        totalAmount,
        amountDue,
        note: note !== undefined ? note?.trim() || null : undefined,
        termsAndConditions:
          termsAndConditions !== undefined ? termsAndConditions?.trim() || null : undefined,
      },
      include: {
        client: true,
        items: true,
        payments: true,
      },
    });

    res.status(200).json({
      status: 'success',
      data: updatedInvoice,
      message: 'Invoice updated successfully',
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update invoice',
    });
  }
});

/**
 * PATCH /api/v1/admin/invoices/:id/status
 * Update invoice status
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const currentUser = req.user as JWTPayload;
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({
        status: 'error',
        message: 'Status is required',
      });
      return;
    }

    const clientDb = req.clientDb as ClientPrismaClient;

    // Get existing invoice
    const invoice = await clientDb.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      res.status(404).json({
        status: 'error',
        message: 'Invoice not found',
      });
      return;
    }

    // Validate status transition
    const allowedTransitions = STATUS_TRANSITIONS[invoice.status] || [];
    if (!allowedTransitions.includes(status)) {
      res.status(400).json({
        status: 'error',
        message: `Cannot transition from ${invoice.status} to ${status}. Allowed: ${allowedTransitions.join(', ') || 'none'}`,
      });
      return;
    }

    // Build update data
    const updateData: Record<string, unknown> = { status };

    // Set sentAt and sentBy for SENT_* statuses
    if (status.startsWith('SENT_')) {
      updateData.sentAt = new Date();
      updateData.sentBy = currentUser.sub;
    }

    // Set paidDate for COMPLETED status
    if (status === 'COMPLETED') {
      updateData.paidDate = new Date();
    }

    // Update invoice
    const updatedInvoice = await clientDb.invoice.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        items: true,
        payments: true,
      },
    });

    res.status(200).json({
      status: 'success',
      data: updatedInvoice,
      message: `Invoice status updated to ${status}`,
    });
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update invoice status',
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

    const clientDb = req.clientDb as ClientPrismaClient;
    // Verify client exists
    const client = await clientDb.client.findUnique({
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
    const invoice = await clientDb.invoice.create({
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
    await clientDb.client.update({
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
    const clientDb = req.clientDb as ClientPrismaClient;

    const invoice = await clientDb.invoice.findUnique({
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
    const paypalConfig = await clientDb.payPalTenantConfig.findFirst({
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
    const updatedInvoice = await clientDb.invoice.update({
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

    const clientDb = req.clientDb as ClientPrismaClient;
    const invoice = await clientDb.invoice.findUnique({
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
    const payment = await clientDb.invoicePayment.create({
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
    const updatedInvoice = await clientDb.invoice.update({
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
