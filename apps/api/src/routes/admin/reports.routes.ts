/**
 * Reports Routes
 *
 * Provides comprehensive reporting and analytics for time tracking
 * Includes time summaries, project analytics, and export capabilities
 */

import { Router } from 'express';
import type { PrismaClient as ClientPrismaClient } from '../../generated/prisma-client';
import type { Request, Response } from 'express';

const router = Router();

/**
 * GET /api/v1/admin/reports/time-summary
 * Get time summary with various grouping options
 */
router.get('/time-summary', async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { groupBy = 'day', startDate, endDate, projectId, userId } = req.query;

    // Build filter conditions
    const where: any = {
      deletedAt: null,
    };

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate as string);
      if (endDate) where.startTime.lte = new Date(endDate as string);
    }

    if (projectId) where.projectId = projectId as string;
    if (userId) where.userId = userId as string;

    // Fetch all matching time entries
    const entries = await (req.tenantDb as ClientPrismaClient).timeEntry.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            clientId: true,
            hourlyRate: true,
            isBillableProject: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Group entries based on groupBy parameter
    const groupedData: any = {};

    entries.forEach((entry) => {
      let groupKey: string;
      const date = new Date(entry.startTime);

      switch (groupBy) {
        case 'day':
          groupKey = date.toISOString().split('T')[0];
          break;
        case 'week': {
          // Get ISO week number
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          groupKey = weekStart.toISOString().split('T')[0];
          break;
        }
        case 'month':
          groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'year':
          groupKey = `${date.getFullYear()}`;
          break;
        case 'project':
          groupKey = entry.project?.name || 'No Project';
          break;
        case 'user':
          groupKey = entry.userId;
          break;
        default:
          groupKey = date.toISOString().split('T')[0];
      }

      if (!groupedData[groupKey]) {
        groupedData[groupKey] = {
          key: groupKey,
          totalDuration: 0,
          totalHours: 0,
          regularHours: 0,
          overtimeHours: 0,
          billableHours: 0,
          nonBillableHours: 0,
          entryCount: 0,
          estimatedRevenue: 0,
        };
      }

      const duration = entry.duration || 0;
      const hours = duration / 3600;
      const regular = entry.regularHours || 0;
      const overtime = entry.overtimeHours || 0;
      const hourlyRate = Number(entry.project?.hourlyRate) || 0;

      groupedData[groupKey].totalDuration += duration;
      groupedData[groupKey].totalHours += hours;
      groupedData[groupKey].regularHours += regular;
      groupedData[groupKey].overtimeHours += overtime;
      groupedData[groupKey].entryCount += 1;

      if (entry.isBillable && entry.project?.isBillableProject) {
        groupedData[groupKey].billableHours += hours;
        groupedData[groupKey].estimatedRevenue += hours * hourlyRate;
      } else {
        groupedData[groupKey].nonBillableHours += hours;
      }
    });

    // Convert to array and format
    const summary = Object.values(groupedData).map((group: any) => ({
      ...group,
      totalHours: parseFloat(group.totalHours.toFixed(2)),
      regularHours: parseFloat(group.regularHours.toFixed(2)),
      overtimeHours: parseFloat(group.overtimeHours.toFixed(2)),
      billableHours: parseFloat(group.billableHours.toFixed(2)),
      nonBillableHours: parseFloat(group.nonBillableHours.toFixed(2)),
      estimatedRevenue: parseFloat(group.estimatedRevenue.toFixed(2)),
    }));

    // Calculate totals
    const totals = summary.reduce(
      (
        acc: {
          totalHours: number;
          regularHours: number;
          overtimeHours: number;
          billableHours: number;
          nonBillableHours: number;
          estimatedRevenue: number;
          entryCount: number;
        },
        curr: {
          totalHours: number;
          regularHours: number;
          overtimeHours: number;
          billableHours: number;
          nonBillableHours: number;
          estimatedRevenue: number;
          entryCount: number;
        }
      ) => ({
        totalHours: acc.totalHours + curr.totalHours,
        regularHours: acc.regularHours + curr.regularHours,
        overtimeHours: acc.overtimeHours + curr.overtimeHours,
        billableHours: acc.billableHours + curr.billableHours,
        nonBillableHours: acc.nonBillableHours + curr.nonBillableHours,
        estimatedRevenue: acc.estimatedRevenue + curr.estimatedRevenue,
        entryCount: acc.entryCount + curr.entryCount,
      }),
      {
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        billableHours: 0,
        nonBillableHours: 0,
        estimatedRevenue: 0,
        entryCount: 0,
      }
    );

    res.status(200).json({
      status: 'success',
      data: {
        summary,
        totals: {
          ...totals,
          totalHours: parseFloat(totals.totalHours.toFixed(2)),
          regularHours: parseFloat(totals.regularHours.toFixed(2)),
          overtimeHours: parseFloat(totals.overtimeHours.toFixed(2)),
          billableHours: parseFloat(totals.billableHours.toFixed(2)),
          nonBillableHours: parseFloat(totals.nonBillableHours.toFixed(2)),
          estimatedRevenue: parseFloat(totals.estimatedRevenue.toFixed(2)),
        },
        groupBy,
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
          projectId: projectId || null,
          userId: userId || null,
        },
      },
    });
  } catch (error) {
    console.error('Error generating time summary:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate time summary',
    });
  }
});

/**
 * GET /api/v1/admin/reports/project-analytics
 * Get detailed analytics for projects
 */
router.get('/project-analytics', async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { startDate, endDate } = req.query;

    // Build date filter
    const where: any = {
      deletedAt: null,
    };

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate as string);
      if (endDate) where.startTime.lte = new Date(endDate as string);
    }

    // Fetch all projects with their time entries
    const projects = await (req.tenantDb as ClientPrismaClient).project.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        timeEntries: {
          where,
        },
        tasks: {
          where: {
            createdAt: startDate
              ? {
                  gte: new Date(startDate as string),
                }
              : undefined,
          },
        },
        members: true,
      },
    });

    // Calculate analytics for each project
    const analytics = projects.map((project) => {
      const timeEntries = project.timeEntries || [];
      const tasks = project.tasks || [];
      const members = project.members || [];

      const totalDuration = timeEntries.reduce(
        (sum: number, entry: { duration: number | null }) => sum + (entry.duration || 0),
        0
      );
      const totalHours = totalDuration / 3600;

      const billableEntries = timeEntries.filter(
        (entry: { isBillable: boolean; duration: number | null }) =>
          entry.isBillable && project.isBillableProject
      );
      const billableHours =
        billableEntries.reduce(
          (sum: number, entry: { duration: number | null }) => sum + (entry.duration || 0),
          0
        ) / 3600;
      const nonBillableHours = totalHours - billableHours;

      const estimatedRevenue = billableHours * (Number(project.hourlyRate) || 0);

      const taskStats = {
        total: tasks.length,
        todo: tasks.filter((t: { status: string }) => t.status === 'TODO').length,
        inProgress: tasks.filter((t: { status: string }) => t.status === 'IN_PROGRESS').length,
        review: tasks.filter((t: { status: string }) => t.status === 'REVIEW').length,
        done: tasks.filter((t: { status: string }) => t.status === 'DONE').length,
        cancelled: tasks.filter((t: { status: string }) => t.status === 'CANCELLED').length,
        completionRate:
          tasks.length > 0
            ? (
                (tasks.filter((t: { status: string }) => t.status === 'DONE').length /
                  tasks.length) *
                100
              ).toFixed(1)
            : '0.0',
      };

      return {
        projectId: project.id,
        projectName: project.name,
        clientId: project.clientId,
        clientName: project.client?.name || null,
        isActive: project.isActive,
        isBillableProject: project.isBillableProject,
        hourlyRate: project.hourlyRate,
        timeTracking: {
          totalHours: parseFloat(totalHours.toFixed(2)),
          billableHours: parseFloat(billableHours.toFixed(2)),
          nonBillableHours: parseFloat(nonBillableHours.toFixed(2)),
          entryCount: timeEntries.length,
          estimatedRevenue: parseFloat(estimatedRevenue.toFixed(2)),
        },
        tasks: taskStats,
        members: {
          total: members.length,
          billable: members.filter((m: any) => m.isBillable).length,
          nonBillable: members.filter((m: any) => !m.isBillable).length,
        },
      };
    });

    // Calculate overall totals
    const totals = analytics.reduce(
      (
        acc: {
          totalProjects: number;
          activeProjects: number;
          billableProjects: number;
          totalHours: number;
          billableHours: number;
          estimatedRevenue: number;
          totalTasks: number;
          completedTasks: number;
        },
        curr: {
          isActive: boolean;
          isBillableProject: boolean;
          timeTracking: { totalHours: number; billableHours: number; estimatedRevenue: number };
          tasks: { total: number; done: number };
        }
      ) => ({
        totalProjects: acc.totalProjects + 1,
        activeProjects: acc.activeProjects + (curr.isActive ? 1 : 0),
        billableProjects: acc.billableProjects + (curr.isBillableProject ? 1 : 0),
        totalHours: acc.totalHours + curr.timeTracking.totalHours,
        billableHours: acc.billableHours + curr.timeTracking.billableHours,
        estimatedRevenue: acc.estimatedRevenue + curr.timeTracking.estimatedRevenue,
        totalTasks: acc.totalTasks + curr.tasks.total,
        completedTasks: acc.completedTasks + curr.tasks.done,
      }),
      {
        totalProjects: 0,
        activeProjects: 0,
        billableProjects: 0,
        totalHours: 0,
        billableHours: 0,
        estimatedRevenue: 0,
        totalTasks: 0,
        completedTasks: 0,
      }
    );

    res.status(200).json({
      status: 'success',
      data: {
        projects: analytics,
        totals: {
          ...totals,
          totalHours: parseFloat(totals.totalHours.toFixed(2)),
          billableHours: parseFloat(totals.billableHours.toFixed(2)),
          estimatedRevenue: parseFloat(totals.estimatedRevenue.toFixed(2)),
          averageCompletionRate:
            totals.totalTasks > 0
              ? ((totals.completedTasks / totals.totalTasks) * 100).toFixed(1)
              : '0.0',
        },
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      },
    });
  } catch (error) {
    console.error('Error generating project analytics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate project analytics',
    });
  }
});

/**
 * GET /api/v1/admin/reports/user-productivity
 * Get productivity metrics for users
 */
router.get('/user-productivity', async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { startDate, endDate } = req.query;

    // Build date filter
    const where: any = {
      deletedAt: null,
    };

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate as string);
      if (endDate) where.startTime.lte = new Date(endDate as string);
    }

    // Fetch all time entries
    const timeEntries = await (req.tenantDb as ClientPrismaClient).timeEntry.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            isBillableProject: true,
            hourlyRate: true,
          },
        },
      },
    });

    // Group by user
    const userStats: any = {};

    timeEntries.forEach((entry) => {
      const userId = entry.userId;

      if (!userStats[userId]) {
        userStats[userId] = {
          userId,
          totalDuration: 0,
          totalHours: 0,
          billableHours: 0,
          nonBillableHours: 0,
          entryCount: 0,
          projectCount: new Set(),
          estimatedRevenue: 0,
        };
      }

      const duration = entry.duration || 0;
      const hours = duration / 3600;
      const hourlyRate = Number(entry.project?.hourlyRate) || 0;

      userStats[userId].totalDuration += duration;
      userStats[userId].totalHours += hours;
      userStats[userId].entryCount += 1;
      userStats[userId].projectCount.add(entry.projectId);

      if (entry.isBillable && entry.project?.isBillableProject) {
        userStats[userId].billableHours += hours;
        userStats[userId].estimatedRevenue += hours * hourlyRate;
      } else {
        userStats[userId].nonBillableHours += hours;
      }
    });

    // Fetch task data for each user
    const taskWhere: any = {};
    if (startDate) {
      taskWhere.createdAt = { gte: new Date(startDate as string) };
    }

    const tasks = await (req.tenantDb as ClientPrismaClient).task.findMany({
      where: taskWhere,
    });

    // Add task stats to user data
    const productivity = Object.values(userStats).map((user: any) => {
      const userTasks = tasks.filter(
        (t: { assignedToUserId: string | null; status: string }) =>
          t.assignedToUserId === user.userId
      );
      const completedTasks = userTasks.filter((t: { status: string }) => t.status === 'DONE');

      return {
        userId: user.userId,
        timeTracking: {
          totalHours: parseFloat(user.totalHours.toFixed(2)),
          billableHours: parseFloat(user.billableHours.toFixed(2)),
          nonBillableHours: parseFloat(user.nonBillableHours.toFixed(2)),
          entryCount: user.entryCount,
          estimatedRevenue: parseFloat(user.estimatedRevenue.toFixed(2)),
        },
        projects: {
          count: user.projectCount.size,
        },
        tasks: {
          total: userTasks.length,
          completed: completedTasks.length,
          inProgress: userTasks.filter((t: { status: string }) => t.status === 'IN_PROGRESS')
            .length,
          todo: userTasks.filter((t: { status: string }) => t.status === 'TODO').length,
          completionRate:
            userTasks.length > 0
              ? ((completedTasks.length / userTasks.length) * 100).toFixed(1)
              : '0.0',
        },
        metrics: {
          averageHoursPerEntry:
            user.entryCount > 0 ? parseFloat((user.totalHours / user.entryCount).toFixed(2)) : 0,
          billablePercentage:
            user.totalHours > 0
              ? parseFloat(((user.billableHours / user.totalHours) * 100).toFixed(1))
              : 0,
        },
      };
    });

    // Sort by total hours (most productive first)
    productivity.sort((a, b) => b.timeTracking.totalHours - a.timeTracking.totalHours);

    res.status(200).json({
      status: 'success',
      data: {
        users: productivity,
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      },
    });
  } catch (error) {
    console.error('Error generating user productivity report:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate user productivity report',
    });
  }
});

/**
 * GET /api/v1/admin/reports/revenue-forecast
 * Get revenue forecast based on billable hours
 */
router.get('/revenue-forecast', async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { startDate, endDate, projectId } = req.query;

    // Build filter
    const where: any = {
      deletedAt: null,
      isBillable: true,
    };

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate as string);
      if (endDate) where.startTime.lte = new Date(endDate as string);
    }

    if (projectId) where.projectId = projectId as string;

    // Fetch billable time entries
    const entries = await (req.tenantDb as ClientPrismaClient).timeEntry.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            clientId: true,
            hourlyRate: true,
            isBillableProject: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Group by month
    const monthlyRevenue: any = {};

    entries.forEach((entry) => {
      if (!entry.project?.isBillableProject) return;

      const date = new Date(entry.startTime);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyRevenue[monthKey]) {
        monthlyRevenue[monthKey] = {
          month: monthKey,
          billableHours: 0,
          revenue: 0,
          entryCount: 0,
          projects: new Set(),
        };
      }

      const hours = (entry.duration || 0) / 3600;
      const revenue = hours * (Number(entry.project.hourlyRate) || 0);

      monthlyRevenue[monthKey].billableHours += hours;
      monthlyRevenue[monthKey].revenue += revenue;
      monthlyRevenue[monthKey].entryCount += 1;
      monthlyRevenue[monthKey].projects.add(entry.projectId);
    });

    // Convert to array and format
    const forecast = Object.values(monthlyRevenue)
      .map((month: any) => ({
        month: month.month,
        billableHours: parseFloat(month.billableHours.toFixed(2)),
        revenue: parseFloat(month.revenue.toFixed(2)),
        entryCount: month.entryCount,
        projectCount: month.projects.size,
        averageHourlyRate:
          month.billableHours > 0
            ? parseFloat((month.revenue / month.billableHours).toFixed(2))
            : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate totals
    const totals = forecast.reduce(
      (
        acc: { billableHours: number; revenue: number; entryCount: number },
        curr: { billableHours: number; revenue: number; entryCount: number }
      ) => ({
        billableHours: acc.billableHours + curr.billableHours,
        revenue: acc.revenue + curr.revenue,
        entryCount: acc.entryCount + curr.entryCount,
      }),
      {
        billableHours: 0,
        revenue: 0,
        entryCount: 0,
      }
    );

    res.status(200).json({
      status: 'success',
      data: {
        forecast,
        totals: {
          ...totals,
          billableHours: parseFloat(totals.billableHours.toFixed(2)),
          revenue: parseFloat(totals.revenue.toFixed(2)),
          averageMonthlyRevenue:
            forecast.length > 0 ? parseFloat((totals.revenue / forecast.length).toFixed(2)) : 0,
        },
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
          projectId: projectId || null,
        },
      },
    });
  } catch (error) {
    console.error('Error generating revenue forecast:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate revenue forecast',
    });
  }
});

/**
 * POST /api/v1/admin/reports/export/csv
 * Export time entries to CSV
 */
router.post('/export/csv', async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({
        status: 'error',
        message: 'Tenant database not available',
      });
      return;
    }

    const { startDate, endDate, projectId, userId } = req.body;

    // Build filter
    const where: any = {
      deletedAt: null,
    };

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }

    if (projectId) where.projectId = projectId;
    if (userId) where.userId = userId;

    // Fetch time entries
    const entries = await (req.tenantDb as ClientPrismaClient).timeEntry.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            clientId: true,
            hourlyRate: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Generate CSV
    const csvHeader = [
      'Entry ID',
      'User ID',
      'Project ID',
      'Project Name',
      'Client ID',
      'Client Name',
      'Description',
      'Start Time',
      'End Time',
      'Duration (hours)',
      'Regular Hours',
      'Overtime Hours',
      'Is Billable',
      'Hourly Rate',
      'Revenue',
      'Created At',
    ].join(',');

    const csvRows = entries.map((entry) => {
      const hours = (entry.duration || 0) / 3600;
      const revenue = entry.isBillable ? hours * (Number(entry.project?.hourlyRate) || 0) : 0;

      return [
        entry.id,
        entry.userId,
        entry.projectId,
        `"${entry.project?.name || ''}"`,
        entry.project?.clientId || '',
        `"${entry.project?.client?.name || ''}"`,
        `"${entry.description || ''}"`,
        entry.startTime.toISOString(),
        entry.endTime?.toISOString() || '',
        hours.toFixed(2),
        entry.regularHours || 0,
        entry.overtimeHours || 0,
        entry.isBillable,
        entry.project?.hourlyRate || 0,
        revenue.toFixed(2),
        entry.createdAt.toISOString(),
      ].join(',');
    });

    const csv = [csvHeader, ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="time-entries-${new Date().toISOString().split('T')[0]}.csv"`
    );
    res.status(200).send(csv);
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to export to CSV',
    });
  }
});

export default router;
