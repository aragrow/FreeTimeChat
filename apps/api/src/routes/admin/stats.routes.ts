/**
 * Admin Dashboard Statistics Routes
 *
 * Provides overview statistics for admin dashboard
 */

import { Router } from 'express';
import { PrismaClient as MainPrismaClient } from '../../generated/prisma-main';
import type { Request, Response } from 'express';

const router = Router();
const prisma = new MainPrismaClient();

/**
 * GET /api/v1/admin/stats
 * Get overview statistics (total users, roles, clients, capabilities)
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
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
      // User counts
      prisma.user.count(),
      prisma.user.count({
        where: {
          isActive: true,
          deletedAt: null,
        },
      }),
      prisma.user.count({
        where: {
          isActive: false,
          deletedAt: null,
        },
      }),
      prisma.user.count({
        where: {
          deletedAt: { not: null },
        },
      }),

      // Client counts
      prisma.tenant.count(),
      prisma.tenant.count({
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
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
      }),
      prisma.tenant.count({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
      }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
          deleted: deletedUsers,
          activeInLast30Days: activeUsersLast30Days,
          newInLast7Days: newUsersLast7Days,
        },
        clients: {
          total: totalClients,
          active: activeClients,
          inactive: totalClients - activeClients,
          newInLast7Days: newClientsLast7Days,
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
