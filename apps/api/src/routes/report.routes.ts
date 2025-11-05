/**
 * Report Routes
 *
 * Handles reporting and analytics endpoints
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import { ReportService } from '../services/report.service';

const router = Router();
const reportService = new ReportService();

/**
 * GET /reports/time-by-user
 * Get time tracking report grouped by user
 */
router.get('/time-by-user', authenticateJWT, async (req, res, next) => {
  try {
    const { startDate, endDate, userId, projectId, format } = req.query;
    if (!req.user || !req.user.clientId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }
    const clientId = req.user.clientId;

    const options = {
      ...(startDate && { startDate: new Date(startDate as string) }),
      ...(endDate && { endDate: new Date(endDate as string) }),
      ...(userId && { userId: userId as string }),
      ...(projectId && { projectId: projectId as string }),
    };

    const report = await reportService.getTimeByUser(clientId, options);

    // CSV export
    if (format === 'csv') {
      const csv = convertTimeByUserToCSV(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=time-by-user.csv');
      return res.send(csv);
    }

    res.json({
      status: 'success',
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /reports/time-by-project
 * Get time tracking report grouped by project
 */
router.get('/time-by-project', authenticateJWT, async (req, res, next) => {
  try {
    const { startDate, endDate, userId, projectId, format } = req.query;
    if (!req.user || !req.user.clientId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }
    const clientId = req.user.clientId;

    const options = {
      ...(startDate && { startDate: new Date(startDate as string) }),
      ...(endDate && { endDate: new Date(endDate as string) }),
      ...(userId && { userId: userId as string }),
      ...(projectId && { projectId: projectId as string }),
    };

    const report = await reportService.getTimeByProject(clientId, options);

    // CSV export
    if (format === 'csv') {
      const csv = convertTimeByProjectToCSV(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=time-by-project.csv');
      return res.send(csv);
    }

    res.json({
      status: 'success',
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /reports/time-by-date
 * Get time tracking report grouped by date
 */
router.get('/time-by-date', authenticateJWT, async (req, res, next) => {
  try {
    const { startDate, endDate, userId, projectId, format } = req.query;
    if (!req.user || !req.user.clientId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }
    const clientId = req.user.clientId;

    const options = {
      ...(startDate && { startDate: new Date(startDate as string) }),
      ...(endDate && { endDate: new Date(endDate as string) }),
      ...(userId && { userId: userId as string }),
      ...(projectId && { projectId: projectId as string }),
    };

    const report = await reportService.getTimeByDate(clientId, options);

    // CSV export
    if (format === 'csv') {
      const csv = convertTimeByDateToCSV(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=time-by-date.csv');
      return res.send(csv);
    }

    res.json({
      status: 'success',
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /reports/summary
 * Get summary statistics
 */
router.get('/summary', authenticateJWT, async (req, res, next) => {
  try {
    const { startDate, endDate, userId, projectId } = req.query;
    if (!req.user || !req.user.clientId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }
    const clientId = req.user.clientId;

    const options = {
      ...(startDate && { startDate: new Date(startDate as string) }),
      ...(endDate && { endDate: new Date(endDate as string) }),
      ...(userId && { userId: userId as string }),
      ...(projectId && { projectId: projectId as string }),
    };

    const summary = await reportService.getSummaryStats(clientId, options);

    res.json({
      status: 'success',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Helper function to convert time by user report to CSV
 */
function convertTimeByUserToCSV(
  report: Awaited<ReturnType<typeof reportService.getTimeByUser>>
): string {
  const headers = ['User Name', 'User Email', 'Total Hours', 'Entry Count', 'Projects'];
  const rows = report.map((item) => [
    item.userName,
    item.userEmail,
    item.totalHours.toFixed(2),
    item.entryCount.toString(),
    item.projectBreakdown.map((p) => `${p.projectName} (${p.hours.toFixed(2)}h)`).join('; '),
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

/**
 * Helper function to convert time by project report to CSV
 */
function convertTimeByProjectToCSV(
  report: Awaited<ReturnType<typeof reportService.getTimeByProject>>
): string {
  const headers = ['Project Name', 'Total Hours', 'Entry Count', 'Team Members'];
  const rows = report.map((item) => [
    item.projectName,
    item.totalHours.toFixed(2),
    item.entryCount.toString(),
    item.userBreakdown.map((u) => `${u.userName} (${u.hours.toFixed(2)}h)`).join('; '),
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

/**
 * Helper function to convert time by date report to CSV
 */
function convertTimeByDateToCSV(
  report: Awaited<ReturnType<typeof reportService.getTimeByDate>>
): string {
  const headers = ['Date', 'Total Hours', 'Entry Count', 'Projects'];
  const rows = report.map((item) => [
    item.date,
    item.totalHours.toFixed(2),
    item.entryCount.toString(),
    item.projectBreakdown.map((p) => `${p.projectName} (${p.hours.toFixed(2)}h)`).join('; '),
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

export default router;
