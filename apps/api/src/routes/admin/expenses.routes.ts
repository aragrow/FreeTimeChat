/**
 * Expense Routes
 *
 * Manages expenses for the tenant including categories, attachments, and approval workflow
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { getExpenseService } from '../../services/expense.service';
import { getFileUploadService } from '../../services/file-upload.service';
import { getReceiptParserService } from '../../services/receipt-parser.service';

const router = Router();

// ==================== Category Routes ====================

/**
 * GET /api/v1/admin/expenses/categories
 * List all expense categories
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Tenant database not available' });
      return;
    }

    const expenseService = getExpenseService(req.clientDb);
    const includeInactive = req.query.includeInactive === 'true';
    const categories = await expenseService.listCategories(includeInactive);

    res.status(200).json({
      status: 'success',
      data: { categories },
    });
  } catch (error) {
    console.error('Error listing categories:', error);
    res.status(500).json({ status: 'error', message: 'Failed to list categories' });
  }
});

/**
 * POST /api/v1/admin/expenses/categories
 * Create a custom expense category
 */
router.post('/categories', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Tenant database not available' });
      return;
    }

    const { name, description, icon, color } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ status: 'error', message: 'Category name is required' });
      return;
    }

    const expenseService = getExpenseService(req.clientDb);
    const category = await expenseService.createCategory({
      name: name.trim(),
      description: description?.trim(),
      icon,
      color,
    });

    res.status(201).json({
      status: 'success',
      data: category,
      message: 'Category created successfully',
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create category' });
  }
});

/**
 * PUT /api/v1/admin/expenses/categories/:id
 * Update expense category
 */
router.put('/categories/:id', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Tenant database not available' });
      return;
    }

    const { id } = req.params;
    const { name, description, icon, color } = req.body;

    const expenseService = getExpenseService(req.clientDb);
    const category = await expenseService.updateCategory(id, {
      name: name?.trim(),
      description: description?.trim(),
      icon,
      color,
    });

    res.status(200).json({
      status: 'success',
      data: category,
      message: 'Category updated successfully',
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update category' });
  }
});

/**
 * DELETE /api/v1/admin/expenses/categories/:id
 * Delete expense category
 */
router.delete('/categories/:id', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Tenant database not available' });
      return;
    }

    const { id } = req.params;
    const expenseService = getExpenseService(req.clientDb);

    await expenseService.deleteCategory(id);

    res.status(200).json({
      status: 'success',
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    if (error instanceof Error) {
      res.status(400).json({ status: 'error', message: error.message });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Failed to delete category' });
  }
});

/**
 * POST /api/v1/admin/expenses/categories/seed
 * Seed default expense categories
 */
router.post('/categories/seed', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Tenant database not available' });
      return;
    }

    const expenseService = getExpenseService(req.clientDb);
    await expenseService.seedCategories();

    res.status(200).json({
      status: 'success',
      message: 'Default categories seeded successfully',
    });
  } catch (error) {
    console.error('Error seeding categories:', error);
    res.status(500).json({ status: 'error', message: 'Failed to seed categories' });
  }
});

// ==================== Expense Routes ====================

/**
 * GET /api/v1/admin/expenses
 * List all expenses with filtering and pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Tenant database not available' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Build filter from query params
    const filter: Record<string, unknown> = {};
    if (req.query.clientId) filter.clientId = req.query.clientId;
    if (req.query.productId) filter.productId = req.query.productId;
    if (req.query.projectId) filter.projectId = req.query.projectId;
    if (req.query.categoryId) filter.categoryId = req.query.categoryId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.createdBy) filter.createdBy = req.query.createdBy;
    if (req.query.isReimbursable) filter.isReimbursable = req.query.isReimbursable === 'true';
    if (req.query.startDate) filter.startDate = new Date(req.query.startDate as string);
    if (req.query.endDate) filter.endDate = new Date(req.query.endDate as string);
    if (req.query.minAmount) filter.minAmount = parseFloat(req.query.minAmount as string);
    if (req.query.maxAmount) filter.maxAmount = parseFloat(req.query.maxAmount as string);
    if (req.query.search) filter.search = req.query.search;

    const orderBy = (req.query.orderBy as 'date' | 'amount' | 'created') || 'date';
    const orderDir = (req.query.orderDir as 'asc' | 'desc') || 'desc';

    const expenseService = getExpenseService(req.clientDb);
    const { expenses, total } = await expenseService.list({
      filter,
      skip,
      take: limit,
      orderBy,
      orderDir,
    });

    res.status(200).json({
      status: 'success',
      data: {
        expenses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error listing expenses:', error);
    res.status(500).json({ status: 'error', message: 'Failed to list expenses' });
  }
});

/**
 * GET /api/v1/admin/expenses/stats
 * Get expense statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Tenant database not available' });
      return;
    }

    const filter: { startDate?: Date; endDate?: Date; clientId?: string; projectId?: string } = {};
    if (req.query.startDate) filter.startDate = new Date(req.query.startDate as string);
    if (req.query.endDate) filter.endDate = new Date(req.query.endDate as string);
    if (req.query.clientId) filter.clientId = req.query.clientId as string;
    if (req.query.projectId) filter.projectId = req.query.projectId as string;

    const expenseService = getExpenseService(req.clientDb);
    const stats = await expenseService.getStats(filter);

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    console.error('Error getting expense stats:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get expense stats' });
  }
});

/**
 * GET /api/v1/admin/expenses/:id
 * Get expense by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Tenant database not available' });
      return;
    }

    const { id } = req.params;
    const expenseService = getExpenseService(req.clientDb);
    const expense = await expenseService.findById(id);

    if (!expense) {
      res.status(404).json({ status: 'error', message: 'Expense not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: expense,
    });
  } catch (error) {
    console.error('Error getting expense:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get expense' });
  }
});

/**
 * POST /api/v1/admin/expenses
 * Create new expense
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Tenant database or user not available' });
      return;
    }

    const {
      description,
      amount,
      expenseDate,
      categoryId,
      clientId,
      productId,
      projectId,
      vendor,
      currency,
      paymentMethod,
      reference,
      isReimbursable,
      taxAmount,
      taxRate,
      notes,
    } = req.body;

    // Validate required fields
    if (!description || !description.trim()) {
      res.status(400).json({ status: 'error', message: 'Description is required' });
      return;
    }
    if (amount === undefined || amount === null || isNaN(parseFloat(amount))) {
      res.status(400).json({ status: 'error', message: 'Valid amount is required' });
      return;
    }
    if (!categoryId) {
      res.status(400).json({ status: 'error', message: 'Category is required' });
      return;
    }

    const expenseService = getExpenseService(req.clientDb);
    const expense = await expenseService.createExpense(
      {
        description: description.trim(),
        amount: parseFloat(amount),
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        categoryId,
        clientId: clientId || undefined,
        productId: productId || undefined,
        projectId: projectId || undefined,
        vendor: vendor?.trim(),
        currency: currency || 'USD',
        paymentMethod: paymentMethod?.trim(),
        reference: reference?.trim(),
        isReimbursable: isReimbursable || false,
        taxAmount: taxAmount ? parseFloat(taxAmount) : undefined,
        taxRate: taxRate ? parseFloat(taxRate) : undefined,
        notes: notes?.trim(),
      },
      req.user.sub
    );

    res.status(201).json({
      status: 'success',
      data: expense,
      message: 'Expense created successfully',
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create expense' });
  }
});

/**
 * PUT /api/v1/admin/expenses/:id
 * Update expense
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Tenant database or user not available' });
      return;
    }

    const { id } = req.params;
    const expenseService = getExpenseService(req.clientDb);

    // Check if expense exists
    const existing = await expenseService.findById(id);
    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Expense not found' });
      return;
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    const {
      description,
      amount,
      expenseDate,
      categoryId,
      clientId,
      productId,
      projectId,
      vendor,
      currency,
      paymentMethod,
      reference,
      isReimbursable,
      taxAmount,
      taxRate,
      notes,
      status,
    } = req.body;

    if (description !== undefined) updateData.description = description.trim();
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (expenseDate !== undefined) updateData.expenseDate = new Date(expenseDate);
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (clientId !== undefined) updateData.clientId = clientId || null;
    if (productId !== undefined) updateData.productId = productId || null;
    if (projectId !== undefined) updateData.projectId = projectId || null;
    if (vendor !== undefined) updateData.vendor = vendor?.trim();
    if (currency !== undefined) updateData.currency = currency;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod?.trim();
    if (reference !== undefined) updateData.reference = reference?.trim();
    if (isReimbursable !== undefined) updateData.isReimbursable = isReimbursable;
    if (taxAmount !== undefined) updateData.taxAmount = taxAmount ? parseFloat(taxAmount) : null;
    if (taxRate !== undefined) updateData.taxRate = taxRate ? parseFloat(taxRate) : null;
    if (notes !== undefined) updateData.notes = notes?.trim();
    if (status !== undefined) updateData.status = status;

    const expense = await expenseService.update(id, updateData, req.user.sub);

    res.status(200).json({
      status: 'success',
      data: expense,
      message: 'Expense updated successfully',
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update expense' });
  }
});

/**
 * DELETE /api/v1/admin/expenses/:id
 * Soft delete expense
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Tenant database not available' });
      return;
    }

    const { id } = req.params;
    const expenseService = getExpenseService(req.clientDb);

    const existing = await expenseService.findById(id);
    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Expense not found' });
      return;
    }

    await expenseService.delete(id);

    res.status(200).json({
      status: 'success',
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete expense' });
  }
});

// ==================== Approval Routes ====================

/**
 * POST /api/v1/admin/expenses/:id/approve
 * Approve expense
 */
router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Tenant database or user not available' });
      return;
    }

    const { id } = req.params;
    const expenseService = getExpenseService(req.clientDb);

    const expense = await expenseService.approve(id, req.user.sub);

    res.status(200).json({
      status: 'success',
      data: expense,
      message: 'Expense approved successfully',
    });
  } catch (error) {
    console.error('Error approving expense:', error);
    res.status(500).json({ status: 'error', message: 'Failed to approve expense' });
  }
});

/**
 * POST /api/v1/admin/expenses/:id/reject
 * Reject expense
 */
router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Tenant database or user not available' });
      return;
    }

    const { id } = req.params;
    const { reason } = req.body;
    const expenseService = getExpenseService(req.clientDb);

    const expense = await expenseService.reject(id, req.user.sub, reason);

    res.status(200).json({
      status: 'success',
      data: expense,
      message: 'Expense rejected',
    });
  } catch (error) {
    console.error('Error rejecting expense:', error);
    res.status(500).json({ status: 'error', message: 'Failed to reject expense' });
  }
});

/**
 * POST /api/v1/admin/expenses/:id/reimburse
 * Mark expense as reimbursed
 */
router.post('/:id/reimburse', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Tenant database or user not available' });
      return;
    }

    const { id } = req.params;
    const expenseService = getExpenseService(req.clientDb);

    const expense = await expenseService.markReimbursed(id, req.user.sub);

    res.status(200).json({
      status: 'success',
      data: expense,
      message: 'Expense marked as reimbursed',
    });
  } catch (error) {
    console.error('Error marking expense as reimbursed:', error);
    res.status(500).json({ status: 'error', message: 'Failed to mark expense as reimbursed' });
  }
});

// ==================== Attachment Routes ====================

/**
 * POST /api/v1/admin/expenses/:id/attachments
 * Upload attachment to expense
 */
router.post('/:id/attachments', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Tenant database or user not available' });
      return;
    }

    const fileUploadService = getFileUploadService();
    const middleware = fileUploadService.getMulterMiddleware({ fieldName: 'file', maxCount: 1 });

    // Handle file upload
    middleware(req, res, async (err) => {
      if (err) {
        console.error('Upload error:', err);
        res.status(400).json({ status: 'error', message: err.message });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ status: 'error', message: 'No file uploaded' });
        return;
      }

      const { id } = req.params;
      const expenseService = getExpenseService(req.clientDb!);

      // Verify expense exists
      const expense = await expenseService.findById(id);
      if (!expense) {
        res.status(404).json({ status: 'error', message: 'Expense not found' });
        return;
      }

      // Save file
      const uploadedFile = await fileUploadService.saveFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        {
          tenantId: req.user!.tenantId || 'system',
          subDirectory: 'expenses',
        }
      );

      // Create attachment record
      const attachment = await expenseService.addAttachment({
        expenseId: id,
        fileName: uploadedFile.originalName,
        fileType: uploadedFile.fileType,
        fileSize: uploadedFile.fileSize,
        filePath: uploadedFile.filePath,
        thumbnailPath: uploadedFile.thumbnailPath,
        isReceipt: req.body.isReceipt === 'true',
        uploadedBy: req.user!.sub,
      });

      res.status(201).json({
        status: 'success',
        data: attachment,
        message: 'Attachment uploaded successfully',
      });
    });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({ status: 'error', message: 'Failed to upload attachment' });
  }
});

/**
 * DELETE /api/v1/admin/expenses/:id/attachments/:attachmentId
 * Delete attachment
 */
router.delete('/:id/attachments/:attachmentId', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Tenant database not available' });
      return;
    }

    const { attachmentId } = req.params;
    const expenseService = getExpenseService(req.clientDb);

    // Get attachment to delete file
    const attachments = await expenseService.getAttachments(req.params.id);
    const attachment = attachments.find(a => a.id === attachmentId);

    if (attachment) {
      // Delete file from storage
      const fileUploadService = getFileUploadService();
      await fileUploadService.deleteFile(attachment.filePath);
    }

    await expenseService.deleteAttachment(attachmentId);

    res.status(200).json({
      status: 'success',
      message: 'Attachment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete attachment' });
  }
});

// ==================== Receipt Parsing Routes ====================

/**
 * POST /api/v1/admin/expenses/parse-receipt
 * Parse receipt image and extract expense data
 */
router.post('/parse-receipt', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Tenant database or user not available' });
      return;
    }

    const fileUploadService = getFileUploadService();
    const middleware = fileUploadService.getMulterMiddleware({ fieldName: 'receipt', maxCount: 1 });

    middleware(req, res, async (err) => {
      if (err) {
        console.error('Upload error:', err);
        res.status(400).json({ status: 'error', message: err.message });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ status: 'error', message: 'No receipt image uploaded' });
        return;
      }

      // Check if file is an image
      if (!file.mimetype.startsWith('image/')) {
        res.status(400).json({ status: 'error', message: 'Receipt must be an image file' });
        return;
      }

      try {
        const receiptParser = getReceiptParserService();
        const parsedData = await receiptParser.parseReceipt(
          file.buffer,
          file.mimetype,
          req.user!.tenantId || null
        );

        // Match category if found
        if (parsedData.category) {
          const expenseService = getExpenseService(req.clientDb!);
          const categories = await expenseService.listCategories();
          const categoryId = await receiptParser.matchCategory(parsedData.category, categories);
          if (categoryId) {
            (parsedData as Record<string, unknown>).categoryId = categoryId;
          }
        }

        // Generate description if not provided
        if (!parsedData.description) {
          parsedData.description = receiptParser.generateDescription(parsedData);
        }

        res.status(200).json({
          status: 'success',
          data: parsedData,
          message: 'Receipt parsed successfully',
        });
      } catch (parseError) {
        console.error('Receipt parsing error:', parseError);
        res.status(400).json({
          status: 'error',
          message: (parseError as Error).message || 'Failed to parse receipt',
        });
      }
    });
  } catch (error) {
    console.error('Error parsing receipt:', error);
    res.status(500).json({ status: 'error', message: 'Failed to parse receipt' });
  }
});

/**
 * POST /api/v1/admin/expenses/create-from-receipt
 * Create expense from receipt image (upload, parse, create in one step)
 */
router.post('/create-from-receipt', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Tenant database or user not available' });
      return;
    }

    const fileUploadService = getFileUploadService();
    const middleware = fileUploadService.getMulterMiddleware({ fieldName: 'receipt', maxCount: 1 });

    middleware(req, res, async (err) => {
      if (err) {
        console.error('Upload error:', err);
        res.status(400).json({ status: 'error', message: err.message });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ status: 'error', message: 'No receipt image uploaded' });
        return;
      }

      if (!file.mimetype.startsWith('image/')) {
        res.status(400).json({ status: 'error', message: 'Receipt must be an image file' });
        return;
      }

      try {
        const expenseService = getExpenseService(req.clientDb!);
        const receiptParser = getReceiptParserService();

        // Parse receipt
        const parsedData = await receiptParser.parseReceipt(
          file.buffer,
          file.mimetype,
          req.user!.tenantId || null
        );

        // Match category
        let categoryId: string | null = null;
        const categories = await expenseService.listCategories();

        if (parsedData.category) {
          categoryId = await receiptParser.matchCategory(parsedData.category, categories);
        }

        // Fall back to Miscellaneous if no category matched
        if (!categoryId) {
          const miscCategory = categories.find(c => c.name === 'Miscellaneous');
          categoryId = miscCategory?.id || categories[0]?.id;
        }

        if (!categoryId) {
          res.status(400).json({
            status: 'error',
            message: 'No expense categories available. Please seed categories first.'
          });
          return;
        }

        // Generate description
        const description = parsedData.description || receiptParser.generateDescription(parsedData);

        // Create expense
        const expense = await expenseService.createExpense(
          {
            description,
            amount: parsedData.amount || 0,
            expenseDate: parsedData.date ? new Date(parsedData.date) : new Date(),
            categoryId,
            vendor: parsedData.vendor,
            currency: parsedData.currency || 'USD',
            paymentMethod: parsedData.paymentMethod,
            reference: parsedData.reference,
            taxAmount: parsedData.taxAmount,
            ocrData: parsedData as Record<string, unknown>,
            aiConfidence: parsedData.confidence,
          },
          req.user!.sub
        );

        // Save receipt as attachment
        const uploadedFile = await fileUploadService.saveFile(
          file.buffer,
          file.originalname,
          file.mimetype,
          {
            tenantId: req.user!.tenantId || 'system',
            subDirectory: 'expenses',
          }
        );

        await expenseService.addAttachment({
          expenseId: expense.id,
          fileName: uploadedFile.originalName,
          fileType: uploadedFile.fileType,
          fileSize: uploadedFile.fileSize,
          filePath: uploadedFile.filePath,
          thumbnailPath: uploadedFile.thumbnailPath,
          isReceipt: true,
          uploadedBy: req.user!.sub,
        });

        // Fetch the expense with attachments
        const expenseWithAttachments = await expenseService.findById(expense.id);

        res.status(201).json({
          status: 'success',
          data: {
            expense: expenseWithAttachments,
            parsedData,
          },
          message: 'Expense created from receipt successfully',
        });
      } catch (parseError) {
        console.error('Error creating expense from receipt:', parseError);
        res.status(400).json({
          status: 'error',
          message: (parseError as Error).message || 'Failed to create expense from receipt',
        });
      }
    });
  } catch (error) {
    console.error('Error creating expense from receipt:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create expense from receipt' });
  }
});

export default router;
