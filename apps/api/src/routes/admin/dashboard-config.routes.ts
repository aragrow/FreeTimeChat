/**
 * Dashboard Configuration Routes
 *
 * Allows users to customize their dashboard KPI cards
 */

import { Router } from 'express';
import { PrismaClient as MainPrismaClient } from '../../generated/prisma-main';
import type { JWTPayload } from '@freetimechat/types';
import type { Request, Response } from 'express';

const router = Router();
const prisma = new MainPrismaClient();

// Define all available KPIs with their metadata
export const AVAILABLE_KPIS = {
  // System KPIs
  totalUsers: {
    id: 'totalUsers',
    title: 'Total Users',
    category: 'system',
    icon: 'users',
    color: 'bg-blue-500',
    description: 'Total number of users in the system',
    valueKey: 'users.total',
    subtitleKey: 'users.active',
    subtitleLabel: 'active',
  },
  activeUsers: {
    id: 'activeUsers',
    title: 'Active Users',
    category: 'system',
    icon: 'user-check',
    color: 'bg-green-500',
    description: 'Users active in the last 30 days',
    valueKey: 'users.activeInLast30Days',
  },
  totalClients: {
    id: 'totalClients',
    title: 'Total Clients',
    category: 'system',
    icon: 'building',
    color: 'bg-indigo-500',
    description: 'Total business clients',
    valueKey: 'clients.total',
    subtitleKey: 'clients.active',
    subtitleLabel: 'active',
  },
  totalProjects: {
    id: 'totalProjects',
    title: 'Total Projects',
    category: 'system',
    icon: 'folder',
    color: 'bg-purple-500',
    description: 'Total number of projects',
    valueKey: 'projects.total',
    subtitleKey: 'projects.active',
    subtitleLabel: 'active',
  },
  // Timekeeping KPIs
  hoursThisWeek: {
    id: 'hoursThisWeek',
    title: 'Hours This Week',
    category: 'timekeeping',
    icon: 'clock',
    color: 'bg-cyan-500',
    description: 'Total hours tracked this week',
    valueKey: 'timekeeping.hoursThisWeek',
    format: 'hours',
  },
  hoursThisMonth: {
    id: 'hoursThisMonth',
    title: 'Hours This Month',
    category: 'timekeeping',
    icon: 'calendar',
    color: 'bg-teal-500',
    description: 'Total hours tracked this month',
    valueKey: 'timekeeping.hoursThisMonth',
    format: 'hours',
  },
  billableHours: {
    id: 'billableHours',
    title: 'Billable Hours',
    category: 'timekeeping',
    icon: 'dollar-sign',
    color: 'bg-emerald-500',
    description: 'Billable hours this month',
    valueKey: 'timekeeping.billableHoursThisMonth',
    format: 'hours',
  },
  totalTasks: {
    id: 'totalTasks',
    title: 'Total Tasks',
    category: 'timekeeping',
    icon: 'check-square',
    color: 'bg-violet-500',
    description: 'Total number of tasks',
    valueKey: 'timekeeping.totalTasks',
    subtitleKey: 'timekeeping.tasksDone',
    subtitleLabel: 'completed',
  },
  tasksInProgress: {
    id: 'tasksInProgress',
    title: 'Tasks In Progress',
    category: 'timekeeping',
    icon: 'loader',
    color: 'bg-amber-500',
    description: 'Tasks currently being worked on',
    valueKey: 'timekeeping.tasksInProgress',
  },
  overdueTasks: {
    id: 'overdueTasks',
    title: 'Overdue Tasks',
    category: 'timekeeping',
    icon: 'alert-triangle',
    color: 'bg-red-500',
    description: 'Tasks past their due date',
    valueKey: 'timekeeping.tasksOverdue',
  },
  // Accounting KPIs
  totalRevenue: {
    id: 'totalRevenue',
    title: 'Total Revenue',
    category: 'accounting',
    icon: 'trending-up',
    color: 'bg-green-600',
    description: 'Total revenue from paid invoices',
    valueKey: 'accounting.totalRevenue',
    format: 'currency',
  },
  outstandingBalance: {
    id: 'outstandingBalance',
    title: 'Outstanding Balance',
    category: 'accounting',
    icon: 'credit-card',
    color: 'bg-orange-500',
    description: 'Total amount due from unpaid invoices',
    valueKey: 'accounting.outstandingBalance',
    format: 'currency',
  },
  totalInvoices: {
    id: 'totalInvoices',
    title: 'Total Invoices',
    category: 'accounting',
    icon: 'file-text',
    color: 'bg-blue-600',
    description: 'Total number of invoices',
    valueKey: 'accounting.totalInvoices',
    subtitleKey: 'accounting.paidInvoices',
    subtitleLabel: 'paid',
  },
  pendingInvoices: {
    id: 'pendingInvoices',
    title: 'Pending Invoices',
    category: 'accounting',
    icon: 'send',
    color: 'bg-yellow-500',
    description: 'Invoices sent but not yet paid',
    valueKey: 'accounting.sentInvoices',
  },
  overdueInvoices: {
    id: 'overdueInvoices',
    title: 'Overdue Invoices',
    category: 'accounting',
    icon: 'alert-circle',
    color: 'bg-red-600',
    description: 'Invoices past their due date',
    valueKey: 'accounting.overdueInvoices',
  },
  totalExpenses: {
    id: 'totalExpenses',
    title: 'Total Expenses',
    category: 'accounting',
    icon: 'minus-circle',
    color: 'bg-rose-500',
    description: 'Total recorded expenses',
    valueKey: 'accounting.totalExpenses',
    format: 'currency',
  },
  pendingExpenses: {
    id: 'pendingExpenses',
    title: 'Pending Approvals',
    category: 'accounting',
    icon: 'clock',
    color: 'bg-amber-600',
    description: 'Expenses awaiting approval',
    valueKey: 'accounting.pendingExpenses',
  },
  activeDiscounts: {
    id: 'activeDiscounts',
    title: 'Active Discounts',
    category: 'accounting',
    icon: 'percent',
    color: 'bg-pink-500',
    description: 'Currently active discounts',
    valueKey: 'accounting.activeDiscounts',
  },
  activeCoupons: {
    id: 'activeCoupons',
    title: 'Active Coupons',
    category: 'accounting',
    icon: 'tag',
    color: 'bg-fuchsia-500',
    description: 'Currently active coupon codes',
    valueKey: 'accounting.activeCoupons',
  },
};

// Default KPI configuration for tenant admins
const DEFAULT_TENANT_ADMIN_KPIS = [
  'totalClients',
  'totalProjects',
  'hoursThisMonth',
  'billableHours',
  'totalRevenue',
  'outstandingBalance',
  'pendingInvoices',
  'overdueTasks',
];

// Default KPI configuration for system admins
const DEFAULT_ADMIN_KPIS = [
  'totalUsers',
  'totalClients',
  'totalProjects',
  'hoursThisMonth',
  'totalRevenue',
  'outstandingBalance',
];

/**
 * GET /api/v1/admin/dashboard-config
 * Get user's dashboard configuration
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const currentUser = req.user as JWTPayload;

    const user = await prisma.user.findUnique({
      where: { id: currentUser.sub },
      select: {
        dashboardConfig: true,
      },
    });

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    // Return user's config or default based on role
    const userRoles = currentUser.roles || [];
    const isAdmin = userRoles.includes('admin');
    const defaultKpis = isAdmin ? DEFAULT_ADMIN_KPIS : DEFAULT_TENANT_ADMIN_KPIS;

    const config = user.dashboardConfig || {
      kpis: defaultKpis,
    };

    res.status(200).json({
      status: 'success',
      data: {
        config,
        availableKpis: AVAILABLE_KPIS,
        categories: [
          { id: 'system', name: 'System', description: 'General business metrics' },
          { id: 'timekeeping', name: 'Timekeeping', description: 'Time tracking and tasks' },
          { id: 'accounting', name: 'Accounting', description: 'Invoices, payments, and expenses' },
        ],
      },
    });
  } catch (error) {
    console.error('Error getting dashboard config:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get dashboard configuration',
    });
  }
});

/**
 * PUT /api/v1/admin/dashboard-config
 * Update user's dashboard configuration
 */
router.put('/', async (req: Request, res: Response) => {
  try {
    const currentUser = req.user as JWTPayload;
    const { kpis } = req.body;

    // Validate KPIs
    if (!Array.isArray(kpis)) {
      res.status(400).json({
        status: 'error',
        message: 'KPIs must be an array',
      });
      return;
    }

    // Validate that all KPI IDs are valid
    const validKpiIds = Object.keys(AVAILABLE_KPIS);
    const invalidKpis = kpis.filter((kpi: string) => !validKpiIds.includes(kpi));
    if (invalidKpis.length > 0) {
      res.status(400).json({
        status: 'error',
        message: `Invalid KPI IDs: ${invalidKpis.join(', ')}`,
      });
      return;
    }

    // Update user's dashboard config
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.sub },
      data: {
        dashboardConfig: {
          kpis,
          updatedAt: new Date().toISOString(),
        },
      },
      select: {
        dashboardConfig: true,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Dashboard configuration updated successfully',
      data: {
        config: updatedUser.dashboardConfig,
      },
    });
  } catch (error) {
    console.error('Error updating dashboard config:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update dashboard configuration',
    });
  }
});

/**
 * POST /api/v1/admin/dashboard-config/reset
 * Reset user's dashboard configuration to defaults
 */
router.post('/reset', async (req: Request, res: Response) => {
  try {
    const currentUser = req.user as JWTPayload;
    const userRoles = currentUser.roles || [];
    const isAdmin = userRoles.includes('admin');
    const defaultKpis = isAdmin ? DEFAULT_ADMIN_KPIS : DEFAULT_TENANT_ADMIN_KPIS;

    const updatedUser = await prisma.user.update({
      where: { id: currentUser.sub },
      data: {
        dashboardConfig: {
          kpis: defaultKpis,
          updatedAt: new Date().toISOString(),
        },
      },
      select: {
        dashboardConfig: true,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Dashboard configuration reset to defaults',
      data: {
        config: updatedUser.dashboardConfig,
      },
    });
  } catch (error) {
    console.error('Error resetting dashboard config:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reset dashboard configuration',
    });
  }
});

export default router;
