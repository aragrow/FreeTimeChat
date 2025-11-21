/**
 * Admin Dashboard Statistics Routes
 *
 * Provides overview statistics for admin dashboard
 */

import { Router } from 'express';
import { PrismaClient as MainPrismaClient } from '../../generated/prisma-main';
import { getDatabaseService } from '../../services/database.service';
import type { Request, Response } from 'express';

const router = Router();
const prisma = new MainPrismaClient();

/**
 * GET /api/v1/admin/stats
 * Get overview statistics (total users, roles, clients, capabilities)
 * Supports optional tenantId query parameter to filter stats by tenant
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;

    // Build user filter based on tenant selection and user role
    const currentUser = req.user as any;
    const userRoles = currentUser.roles || [];
    const isTenantAdmin = userRoles.includes('tenantadmin');
    const isAdmin = userRoles.includes('admin');

    const userFilter: any = {};

    // Tenant filtering: tenantadmin users can only see stats for their own tenant
    if (isTenantAdmin && !isAdmin && currentUser.tenantId) {
      userFilter.tenantId = currentUser.tenantId;
    } else if (tenantId && tenantId !== 'all') {
      // Admin users can filter by any tenant
      userFilter.tenantId = String(tenantId);
    }

    // Get all stats in parallel
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      deletedUsers,
      totalClients,
      activeClients,
      totalRoles,
      seededRoles,
      totalCapabilities,
      seededCapabilities,
      recentUsers,
      recentClients,
      usersByClient,
      topRoles,
    ] = await Promise.all([
      // User counts (filtered by tenant if specified)
      prisma.user.count({
        where: userFilter,
      }),
      prisma.user.count({
        where: {
          ...userFilter,
          isActive: true,
          deletedAt: null,
        },
      }),
      prisma.user.count({
        where: {
          ...userFilter,
          isActive: false,
          deletedAt: null,
        },
      }),
      prisma.user.count({
        where: {
          ...userFilter,
          deletedAt: { not: null },
        },
      }),

      // Client counts (always show all, or filtered if specific tenant)
      tenantId && tenantId !== 'all' ? Promise.resolve(1) : prisma.tenant.count(),
      tenantId && tenantId !== 'all'
        ? prisma.tenant.count({
            where: { id: String(tenantId), isActive: true },
          })
        : prisma.tenant.count({
            where: { isActive: true },
          }),

      // Role counts
      prisma.role.count(),
      prisma.role.count({
        where: { isSeeded: true },
      }),

      // Capability counts
      prisma.capability.count(),
      prisma.capability.count({
        where: { isSeeded: true },
      }),

      // Recent users (last 10)
      prisma.user.findMany({
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          createdAt: true,
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),

      // Recent clients (last 10)
      prisma.tenant.findMany({
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              users: true,
            },
          },
        },
      }),

      // Users by client
      prisma.tenant.findMany({
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              users: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      }),

      // Top roles by user count
      prisma.role.findMany({
        take: 10,
        select: {
          id: true,
          name: true,
          description: true,
          _count: {
            select: {
              users: true,
              capabilities: true,
            },
          },
        },
        orderBy: {
          users: {
            _count: 'desc',
          },
        },
      }),
    ]);

    // Calculate active users in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsersLast30Days = await prisma.user.count({
      where: {
        ...userFilter,
        lastLoginAt: {
          gte: thirtyDaysAgo,
        },
        deletedAt: null,
      },
    });

    // Calculate growth metrics
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [newUsersLast7Days, newClientsLast7Days] = await Promise.all([
      prisma.user.count({
        where: {
          ...userFilter,
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
      }),
      tenantId && tenantId !== 'all'
        ? Promise.resolve(0)
        : prisma.tenant.count({
            where: {
              createdAt: {
                gte: sevenDaysAgo,
              },
            },
          }),
    ]);

    // Determine tenant to query (for tenant admins, always use their tenant)
    const queryTenantId =
      isTenantAdmin && !isAdmin && currentUser.tenantId
        ? currentUser.tenantId
        : tenantId && tenantId !== 'all'
          ? String(tenantId)
          : null;

    // Get selected tenant info if filtering by tenant
    let selectedTenant = null;
    if (queryTenantId) {
      selectedTenant = await prisma.tenant.findUnique({
        where: { id: queryTenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      });
    }

    // Get project, client, timekeeping and accounting stats from tenant database
    let projectStats = { total: 0, active: 0, inactive: 0 };
    let clientStats = { total: 0, active: 0, inactive: 0, newInLast7Days: 0 };
    let timekeepingStats = {
      totalEntries: 0,
      hoursThisWeek: 0,
      hoursThisMonth: 0,
      billableHoursThisMonth: 0,
      nonBillableHoursThisMonth: 0,
      totalTasks: 0,
      tasksTodo: 0,
      tasksInProgress: 0,
      tasksDone: 0,
      tasksOverdue: 0,
    };
    let accountingStats = {
      totalInvoices: 0,
      draftInvoices: 0,
      sentInvoices: 0,
      paidInvoices: 0,
      overdueInvoices: 0,
      totalRevenue: 0,
      outstandingBalance: 0,
      totalExpenses: 0,
      pendingExpenses: 0,
      approvedExpenses: 0,
      activeDiscounts: 0,
      activeCoupons: 0,
    };

    // Query tenant database for stats if filtering by tenant
    if (queryTenantId) {
      try {
        const databaseService = getDatabaseService();
        const clientDb = await databaseService.getTenantDatabase(queryTenantId);

        // Date calculations
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
          totalProjects,
          activeProjects,
          totalTenantClients,
          activeTenantClients,
          newTenantClientsLast7Days,
          // Timekeeping stats
          totalTimeEntries,
          timeEntriesThisWeek,
          timeEntriesThisMonth,
          billableEntriesThisMonth,
          nonBillableEntriesThisMonth,
          totalTasks,
          tasksTodo,
          tasksInProgress,
          tasksDone,
          overdueTasks,
          // Accounting stats
          totalInvoices,
          draftInvoices,
          sentInvoices,
          paidInvoices,
          overdueInvoices,
          invoiceRevenue,
          outstandingInvoices,
          totalExpenses,
          pendingExpenses,
          approvedExpenses,
          activeDiscounts,
          activeCoupons,
        ] = await Promise.all([
          // Projects
          clientDb.project.count({
            where: { deletedAt: null },
          }),
          clientDb.project.count({
            where: { deletedAt: null, isActive: true },
          }),
          // Clients
          clientDb.client.count({
            where: { deletedAt: null },
          }),
          clientDb.client.count({
            where: { isActive: true, deletedAt: null },
          }),
          clientDb.client.count({
            where: {
              deletedAt: null,
              createdAt: { gte: sevenDaysAgo },
            },
          }),
          // Time Entries
          clientDb.timeEntry.count({
            where: { deletedAt: null },
          }),
          clientDb.timeEntry.aggregate({
            where: {
              deletedAt: null,
              startTime: { gte: startOfWeek },
            },
            _sum: { duration: true },
          }),
          clientDb.timeEntry.aggregate({
            where: {
              deletedAt: null,
              startTime: { gte: startOfMonth },
            },
            _sum: { duration: true },
          }),
          clientDb.timeEntry.aggregate({
            where: {
              deletedAt: null,
              startTime: { gte: startOfMonth },
              isBillable: true,
            },
            _sum: { duration: true },
          }),
          clientDb.timeEntry.aggregate({
            where: {
              deletedAt: null,
              startTime: { gte: startOfMonth },
              isBillable: false,
            },
            _sum: { duration: true },
          }),
          // Tasks
          clientDb.task.count(),
          clientDb.task.count({ where: { status: 'TODO' } }),
          clientDb.task.count({ where: { status: 'IN_PROGRESS' } }),
          clientDb.task.count({ where: { status: 'DONE' } }),
          clientDb.task.count({
            where: {
              status: { in: ['TODO', 'IN_PROGRESS'] },
              dueDate: { lt: now },
            },
          }),
          // Invoices
          clientDb.invoice.count(),
          clientDb.invoice.count({ where: { status: 'PROCESSING' } }),
          clientDb.invoice.count({
            where: {
              status: {
                in: ['SENT_TO_CLIENT', 'SENT_EMAIL', 'SENT_MAIL', 'SENT_PAYPAL', 'SENT_STRIPE'],
              },
            },
          }),
          clientDb.invoice.count({ where: { status: 'COMPLETED' } }),
          clientDb.invoice.count({ where: { status: 'INVALID' } }),
          clientDb.invoice.aggregate({
            where: { status: 'COMPLETED' },
            _sum: { totalAmount: true },
          }),
          clientDb.invoice.aggregate({
            where: {
              status: {
                in: [
                  'SENT_TO_CLIENT',
                  'SENT_EMAIL',
                  'SENT_MAIL',
                  'SENT_PAYPAL',
                  'SENT_STRIPE',
                  'INVALID',
                ],
              },
            },
            _sum: { amountDue: true },
          }),
          // Expenses
          clientDb.expense.aggregate({
            where: { deletedAt: null },
            _sum: { amount: true },
          }),
          clientDb.expense.count({
            where: { deletedAt: null, status: 'PENDING' },
          }),
          clientDb.expense.count({
            where: { deletedAt: null, status: 'APPROVED' },
          }),
          // Discounts
          clientDb.discount.count({
            where: {
              deletedAt: null,
              isActive: true,
              OR: [{ validUntil: null }, { validUntil: { gte: now } }],
            },
          }),
          // Coupons
          clientDb.coupon.count({
            where: {
              deletedAt: null,
              isActive: true,
              validUntil: { gte: now },
            },
          }),
        ]);

        projectStats = {
          total: totalProjects,
          active: activeProjects,
          inactive: totalProjects - activeProjects,
        };

        clientStats = {
          total: totalTenantClients,
          active: activeTenantClients,
          inactive: totalTenantClients - activeTenantClients,
          newInLast7Days: newTenantClientsLast7Days,
        };

        // Convert duration (seconds) to hours
        const toHours = (seconds: number | null) => Math.round(((seconds || 0) / 3600) * 10) / 10;

        timekeepingStats = {
          totalEntries: totalTimeEntries,
          hoursThisWeek: toHours(timeEntriesThisWeek._sum.duration),
          hoursThisMonth: toHours(timeEntriesThisMonth._sum.duration),
          billableHoursThisMonth: toHours(billableEntriesThisMonth._sum.duration),
          nonBillableHoursThisMonth: toHours(nonBillableEntriesThisMonth._sum.duration),
          totalTasks,
          tasksTodo,
          tasksInProgress,
          tasksDone,
          tasksOverdue: overdueTasks,
        };

        accountingStats = {
          totalInvoices,
          draftInvoices,
          sentInvoices,
          paidInvoices,
          overdueInvoices,
          totalRevenue: Number(invoiceRevenue._sum?.totalAmount || 0),
          outstandingBalance: Number(outstandingInvoices._sum?.amountDue || 0),
          totalExpenses: Number(totalExpenses._sum.amount || 0),
          pendingExpenses,
          approvedExpenses,
          activeDiscounts,
          activeCoupons,
        };
      } catch (error) {
        console.error('Error fetching tenant database stats:', error);
        // Continue with zero counts if tenant database is unavailable
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        selectedTenant,
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
          deleted: deletedUsers,
          activeInLast30Days: activeUsersLast30Days,
          newInLast7Days: newUsersLast7Days,
        },
        clients: queryTenantId
          ? clientStats
          : {
              total: totalClients,
              active: activeClients,
              inactive: totalClients - activeClients,
              newInLast7Days: newClientsLast7Days,
            },
        projects: projectStats,
        timekeeping: timekeepingStats,
        accounting: accountingStats,
        tenants: {
          total: totalClients,
          active: activeClients,
          inactive: totalClients - activeClients,
        },
        roles: {
          total: totalRoles,
          seeded: seededRoles,
          custom: totalRoles - seededRoles,
        },
        capabilities: {
          total: totalCapabilities,
          seeded: seededCapabilities,
          custom: totalCapabilities - seededCapabilities,
        },
        recent: {
          users: recentUsers,
          clients: recentClients,
        },
        distribution: {
          usersByClient,
          topRoles,
        },
      },
    });
  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get admin statistics',
    });
  }
});

/**
 * GET /api/v1/admin/stats/users
 * Get detailed user statistics
 */
router.get('/users', async (_req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      activeUsers,
      usersWithTwoFactor,
      usersWithGoogleAuth,
      recentLogins,
      usersByRole,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          isActive: true,
          deletedAt: null,
        },
      }),
      prisma.user.count({
        where: {
          twoFactorEnabled: true,
        },
      }),
      prisma.user.count({
        where: {
          googleId: { not: null },
        },
      }),
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      prisma.userRole.groupBy({
        by: ['roleId'],
        _count: {
          userId: true,
        },
      }),
    ]);

    // Get role names for user distribution
    const roleIds = usersByRole.map((ur) => ur.roleId);
    const roles = await prisma.role.findMany({
      where: {
        id: { in: roleIds },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const roleMap = new Map(roles.map((r) => [r.id, r.name]));
    const userDistribution = usersByRole.map((ur) => ({
      role: roleMap.get(ur.roleId) || 'Unknown',
      count: ur._count.userId,
    }));

    res.status(200).json({
      status: 'success',
      data: {
        total: totalUsers,
        active: activeUsers,
        twoFactorEnabled: usersWithTwoFactor,
        googleAuth: usersWithGoogleAuth,
        recentLogins,
        distribution: userDistribution,
      },
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user statistics',
    });
  }
});

/**
 * GET /api/v1/admin/stats/clients
 * Get detailed client statistics
 */
router.get('/clients', async (_req: Request, res: Response) => {
  try {
    const [totalClients, activeClients, clientsWithUsers] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({
        where: { isActive: true },
      }),
      prisma.tenant.findMany({
        select: {
          id: true,
          name: true,
          isActive: true,
          _count: {
            select: {
              users: true,
            },
          },
        },
        orderBy: {
          users: {
            _count: 'desc',
          },
        },
      }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        total: totalClients,
        active: activeClients,
        inactive: totalClients - activeClients,
        clients: clientsWithUsers,
      },
    });
  } catch (error) {
    console.error('Error getting client stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get client statistics',
    });
  }
});

/**
 * GET /api/v1/admin/stats/activity
 * Get recent activity metrics
 */
router.get('/activity', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      loginsLast24Hours,
      loginsLast7Days,
      loginsLast30Days,
      newUsersLast24Hours,
      newUsersLast7Days,
      newUsersLast30Days,
    ] = await Promise.all([
      prisma.user.count({
        where: {
          lastLoginAt: { gte: last24Hours },
        },
      }),
      prisma.user.count({
        where: {
          lastLoginAt: { gte: last7Days },
        },
      }),
      prisma.user.count({
        where: {
          lastLoginAt: { gte: last30Days },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: last24Hours },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: last7Days },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: last30Days },
        },
      }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        logins: {
          last24Hours: loginsLast24Hours,
          last7Days: loginsLast7Days,
          last30Days: loginsLast30Days,
        },
        newUsers: {
          last24Hours: newUsersLast24Hours,
          last7Days: newUsersLast7Days,
          last30Days: newUsersLast30Days,
        },
      },
    });
  } catch (error) {
    console.error('Error getting activity stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get activity statistics',
    });
  }
});

export default router;
