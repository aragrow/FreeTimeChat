/**
 * Health Check Routes
 *
 * Endpoints for monitoring API health and status
 */

import { Router, Request, Response } from 'express';
import type { HealthCheckResponse } from '@/types/api.types';

const router: Router = Router();

/**
 * GET /health
 * Basic health check endpoint
 */
router.get('/', (_req: Request, res: Response<HealthCheckResponse>) => {
  const uptime = process.uptime();

  const healthCheck: HealthCheckResponse = {
    status: 'ok',
    message: 'FreeTimeChat API is running',
    version: '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
  };

  res.json(healthCheck);
});

/**
 * GET /health/detailed
 * Detailed health check with service status
 */
router.get('/detailed', async (_req: Request, res: Response) => {
  const uptime = process.uptime();

  // TODO: Add actual service checks when database and redis are set up
  const services = {
    database: 'unknown' as const,
    redis: 'unknown' as const,
  };

  const healthCheck: HealthCheckResponse = {
    status: 'ok',
    message: 'FreeTimeChat API is running',
    version: '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    services,
  };

  res.json(healthCheck);
});

export default router;
