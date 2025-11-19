/**
 * Expense Service
 *
 * Handles expense management including categories, attachments, and approval workflow
 * Operates on the customer's database (not main database)
 */

import type { PrismaClient as ClientPrismaClient, Prisma } from '../generated/prisma-client';
import type {
  Expense,
  ExpenseCategory,
  ExpenseAttachment,
  ExpenseStatus,
} from '../generated/prisma-client';

export interface CreateExpenseRequest {
  description: string;
  amount: number;
  expenseDate: Date;
  categoryId: string;
  clientId?: string;
  productId?: string;
  projectId?: string;
  vendor?: string;
  currency?: string;
  paymentMethod?: string;
  reference?: string;
  isReimbursable?: boolean;
  taxAmount?: number;
  taxRate?: number;
  notes?: string;
  ocrData?: Record<string, unknown>;
  aiConfidence?: number;
}

export interface UpdateExpenseRequest {
  description?: string;
  amount?: number;
  expenseDate?: Date;
  categoryId?: string;
  clientId?: string | null;
  productId?: string | null;
  projectId?: string | null;
  vendor?: string;
  currency?: string;
  paymentMethod?: string;
  reference?: string;
  isReimbursable?: boolean;
  taxAmount?: number;
  taxRate?: number;
  notes?: string;
  status?: ExpenseStatus;
}

export interface ExpenseFilter {
  clientId?: string;
  productId?: string;
  projectId?: string;
  categoryId?: string;
  status?: ExpenseStatus;
  startDate?: Date;
  endDate?: Date;
  createdBy?: string;
  isReimbursable?: boolean;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface CreateAttachmentRequest {
  expenseId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  thumbnailPath?: string;
  isReceipt?: boolean;
  uploadedBy: string;
}

// Default expense categories
const DEFAULT_CATEGORIES = [
  {
    name: 'Office Supplies',
    icon: 'office',
    color: '#3B82F6',
    description: 'Pens, paper, printer ink, etc.',
  },
  {
    name: 'Travel',
    icon: 'plane',
    color: '#8B5CF6',
    description: 'Flights, hotels, transportation',
  },
  {
    name: 'Meals & Entertainment',
    icon: 'utensils',
    color: '#F59E0B',
    description: 'Business meals and client entertainment',
  },
  {
    name: 'Software & Subscriptions',
    icon: 'laptop',
    color: '#10B981',
    description: 'Software licenses and subscriptions',
  },
  {
    name: 'Equipment',
    icon: 'computer',
    color: '#6366F1',
    description: 'Computers, phones, tools',
  },
  {
    name: 'Professional Services',
    icon: 'briefcase',
    color: '#EC4899',
    description: 'Legal, accounting, consulting',
  },
  {
    name: 'Utilities',
    icon: 'bolt',
    color: '#F97316',
    description: 'Electricity, internet, phone',
  },
  {
    name: 'Marketing & Advertising',
    icon: 'megaphone',
    color: '#14B8A6',
    description: 'Ads, promotional materials',
  },
  {
    name: 'Insurance',
    icon: 'shield',
    color: '#6B7280',
    description: 'Business insurance premiums',
  },
  {
    name: 'Taxes & Licenses',
    icon: 'document',
    color: '#DC2626',
    description: 'Business taxes and license fees',
  },
  { name: 'Rent', icon: 'building', color: '#7C3AED', description: 'Office or workspace rent' },
  {
    name: 'Maintenance & Repairs',
    icon: 'wrench',
    color: '#0EA5E9',
    description: 'Equipment and facility repairs',
  },
  {
    name: 'Shipping & Postage',
    icon: 'truck',
    color: '#84CC16',
    description: 'Shipping and mailing costs',
  },
  {
    name: 'Training & Education',
    icon: 'academic',
    color: '#A855F7',
    description: 'Courses, conferences, books',
  },
  { name: 'Bank Fees', icon: 'bank', color: '#64748B', description: 'Bank charges and fees' },
  { name: 'Miscellaneous', icon: 'dots', color: '#9CA3AF', description: 'Other business expenses' },
];

export class ExpenseService {
  private prisma: ClientPrismaClient;

  constructor(prisma: ClientPrismaClient) {
    this.prisma = prisma;
  }

  // ==================== Category Management ====================

  /**
   * Seed default expense categories
   */
  async seedCategories(): Promise<void> {
    const existingCount = await this.prisma.expenseCategory.count();
    if (existingCount > 0) {
      return; // Categories already exist
    }

    await this.prisma.expenseCategory.createMany({
      data: DEFAULT_CATEGORIES.map((cat) => ({
        ...cat,
        isSystem: true,
      })),
    });
  }

  /**
   * Create a custom expense category
   */
  async createCategory(data: CreateCategoryRequest): Promise<ExpenseCategory> {
    return this.prisma.expenseCategory.create({
      data: {
        name: data.name,
        description: data.description,
        icon: data.icon,
        color: data.color,
        isSystem: false,
      },
    });
  }

  /**
   * List all expense categories
   */
  async listCategories(includeInactive: boolean = false): Promise<ExpenseCategory[]> {
    return this.prisma.expenseCategory.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Update expense category
   */
  async updateCategory(id: string, data: Partial<CreateCategoryRequest>): Promise<ExpenseCategory> {
    return this.prisma.expenseCategory.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete expense category (soft delete for system categories)
   */
  async deleteCategory(id: string): Promise<void> {
    const category = await this.prisma.expenseCategory.findUnique({
      where: { id },
    });

    if (category?.isSystem) {
      // Soft delete system categories
      await this.prisma.expenseCategory.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      // Hard delete custom categories (only if no expenses use it)
      const expenseCount = await this.prisma.expense.count({
        where: { categoryId: id },
      });

      if (expenseCount > 0) {
        throw new Error('Cannot delete category with existing expenses');
      }

      await this.prisma.expenseCategory.delete({
        where: { id },
      });
    }
  }

  // ==================== Expense Management ====================

  /**
   * Create a new expense
   */
  async createExpense(data: CreateExpenseRequest, userId: string): Promise<Expense> {
    return this.prisma.expense.create({
      data: {
        description: data.description,
        amount: data.amount,
        expenseDate: data.expenseDate,
        categoryId: data.categoryId,
        clientId: data.clientId,
        productId: data.productId,
        projectId: data.projectId,
        vendor: data.vendor,
        currency: data.currency || 'USD',
        paymentMethod: data.paymentMethod,
        reference: data.reference,
        isReimbursable: data.isReimbursable || false,
        taxAmount: data.taxAmount,
        taxRate: data.taxRate,
        notes: data.notes,
        ocrData: data.ocrData as Prisma.InputJsonValue | undefined,
        aiConfidence: data.aiConfidence,
        createdBy: userId,
        status: 'PENDING',
      },
      include: {
        category: true,
        client: true,
        product: true,
        project: true,
        attachments: true,
      },
    });
  }

  /**
   * Find expense by ID
   */
  async findById(id: string): Promise<Expense | null> {
    return this.prisma.expense.findUnique({
      where: { id },
      include: {
        category: true,
        client: true,
        product: true,
        project: true,
        attachments: true,
      },
    });
  }

  /**
   * List expenses with filtering and pagination
   */
  async list(options: {
    filter?: ExpenseFilter;
    skip?: number;
    take?: number;
    orderBy?: 'date' | 'amount' | 'created';
    orderDir?: 'asc' | 'desc';
  }): Promise<{ expenses: Expense[]; total: number }> {
    const { filter, skip = 0, take = 20, orderBy = 'date', orderDir = 'desc' } = options;

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (filter) {
      if (filter.clientId) where.clientId = filter.clientId;
      if (filter.productId) where.productId = filter.productId;
      if (filter.projectId) where.projectId = filter.projectId;
      if (filter.categoryId) where.categoryId = filter.categoryId;
      if (filter.status) where.status = filter.status;
      if (filter.createdBy) where.createdBy = filter.createdBy;
      if (filter.isReimbursable !== undefined) where.isReimbursable = filter.isReimbursable;

      if (filter.startDate || filter.endDate) {
        where.expenseDate = {};
        if (filter.startDate) (where.expenseDate as Record<string, Date>).gte = filter.startDate;
        if (filter.endDate) (where.expenseDate as Record<string, Date>).lte = filter.endDate;
      }

      if (filter.minAmount !== undefined || filter.maxAmount !== undefined) {
        where.amount = {};
        if (filter.minAmount !== undefined)
          (where.amount as Record<string, number>).gte = filter.minAmount;
        if (filter.maxAmount !== undefined)
          (where.amount as Record<string, number>).lte = filter.maxAmount;
      }

      if (filter.search) {
        where.OR = [
          { description: { contains: filter.search, mode: 'insensitive' } },
          { vendor: { contains: filter.search, mode: 'insensitive' } },
          { notes: { contains: filter.search, mode: 'insensitive' } },
        ];
      }
    }

    const orderByField = {
      date: 'expenseDate',
      amount: 'amount',
      created: 'createdAt',
    }[orderBy];

    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take,
        orderBy: { [orderByField]: orderDir },
        include: {
          category: true,
          client: true,
          product: true,
          project: true,
          attachments: true,
        },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return { expenses, total };
  }

  /**
   * Update expense
   */
  async update(id: string, data: UpdateExpenseRequest, userId: string): Promise<Expense> {
    return this.prisma.expense.update({
      where: { id },
      data: {
        ...data,
        updatedBy: userId,
      },
      include: {
        category: true,
        client: true,
        product: true,
        project: true,
        attachments: true,
      },
    });
  }

  /**
   * Soft delete expense
   */
  async delete(id: string): Promise<void> {
    await this.prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Approve expense
   */
  async approve(id: string, userId: string): Promise<Expense> {
    return this.prisma.expense.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
      },
      include: {
        category: true,
        client: true,
        product: true,
        project: true,
        attachments: true,
      },
    });
  }

  /**
   * Reject expense
   */
  async reject(id: string, userId: string, reason?: string): Promise<Expense> {
    return this.prisma.expense.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedBy: userId,
        rejectedAt: new Date(),
        rejectionReason: reason,
        approvedBy: null,
        approvedAt: null,
      },
      include: {
        category: true,
        client: true,
        product: true,
        project: true,
        attachments: true,
      },
    });
  }

  /**
   * Mark expense as reimbursed
   */
  async markReimbursed(id: string, userId: string): Promise<Expense> {
    return this.prisma.expense.update({
      where: { id },
      data: {
        status: 'PAID',
        isReimbursed: true,
        reimbursedAt: new Date(),
        reimbursedBy: userId,
      },
      include: {
        category: true,
        client: true,
        product: true,
        project: true,
        attachments: true,
      },
    });
  }

  // ==================== Attachment Management ====================

  /**
   * Add attachment to expense
   */
  async addAttachment(data: CreateAttachmentRequest): Promise<ExpenseAttachment> {
    return this.prisma.expenseAttachment.create({
      data: {
        expenseId: data.expenseId,
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize,
        filePath: data.filePath,
        thumbnailPath: data.thumbnailPath,
        isReceipt: data.isReceipt || false,
        uploadedBy: data.uploadedBy,
      },
    });
  }

  /**
   * Get attachments for expense
   */
  async getAttachments(expenseId: string): Promise<ExpenseAttachment[]> {
    return this.prisma.expenseAttachment.findMany({
      where: { expenseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete attachment
   */
  async deleteAttachment(attachmentId: string): Promise<void> {
    await this.prisma.expenseAttachment.delete({
      where: { id: attachmentId },
    });
  }

  /**
   * Mark attachment as primary receipt
   */
  async setReceiptAttachment(expenseId: string, attachmentId: string): Promise<void> {
    // Reset all receipts for this expense
    await this.prisma.expenseAttachment.updateMany({
      where: { expenseId },
      data: { isReceipt: false },
    });

    // Set the new primary receipt
    await this.prisma.expenseAttachment.update({
      where: { id: attachmentId },
      data: { isReceipt: true },
    });
  }

  // ==================== Statistics & Reports ====================

  /**
   * Get expense statistics
   */
  async getStats(filter?: {
    startDate?: Date;
    endDate?: Date;
    clientId?: string;
    projectId?: string;
  }): Promise<{
    totalExpenses: number;
    totalAmount: number;
    byCategory: Array<{ categoryId: string; categoryName: string; count: number; total: number }>;
    byStatus: Array<{ status: string; count: number; total: number }>;
    pendingApproval: number;
    pendingReimbursement: number;
  }> {
    const where: Record<string, unknown> = { deletedAt: null };

    if (filter?.startDate || filter?.endDate) {
      where.expenseDate = {};
      if (filter.startDate) (where.expenseDate as Record<string, Date>).gte = filter.startDate;
      if (filter.endDate) (where.expenseDate as Record<string, Date>).lte = filter.endDate;
    }
    if (filter?.clientId) where.clientId = filter.clientId;
    if (filter?.projectId) where.projectId = filter.projectId;

    const expenses = await this.prisma.expense.findMany({
      where,
      include: { category: true },
    });

    const totalExpenses = expenses.length;
    const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Group by category
    const categoryMap = new Map<string, { name: string; count: number; total: number }>();
    expenses.forEach((e) => {
      const existing = categoryMap.get(e.categoryId) || {
        name: e.category.name,
        count: 0,
        total: 0,
      };
      existing.count++;
      existing.total += Number(e.amount);
      categoryMap.set(e.categoryId, existing);
    });

    const byCategory = Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name,
      count: data.count,
      total: data.total,
    }));

    // Group by status
    const statusMap = new Map<string, { count: number; total: number }>();
    expenses.forEach((e) => {
      const existing = statusMap.get(e.status) || { count: 0, total: 0 };
      existing.count++;
      existing.total += Number(e.amount);
      statusMap.set(e.status, existing);
    });

    const byStatus = Array.from(statusMap.entries()).map(([status, data]) => ({
      status,
      count: data.count,
      total: data.total,
    }));

    const pendingApproval = expenses.filter((e) => e.status === 'PENDING').length;
    const pendingReimbursement = expenses.filter(
      (e) => e.isReimbursable && !e.isReimbursed && e.status === 'APPROVED'
    ).length;

    return {
      totalExpenses,
      totalAmount,
      byCategory,
      byStatus,
      pendingApproval,
      pendingReimbursement,
    };
  }
}

/**
 * Create ExpenseService instance for a specific customer database
 */
export function getExpenseService(customerPrisma: ClientPrismaClient): ExpenseService {
  return new ExpenseService(customerPrisma);
}
