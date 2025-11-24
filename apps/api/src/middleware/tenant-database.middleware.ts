/**
 * Tenant Database Middleware
 *
 * Attaches the appropriate tenant database connection to each request
 * based on the authenticated user's tenantId
 *
 * Note: Each tenant has their own database where their business data is stored
 * (projects, time entries, tasks, clients, invoices, etc.)
 */

import { getDatabaseService } from '../services/database.service';
import type { NextFunction, Request, Response } from 'express';

/**
 * Middleware to attach tenant database to request
 * Requires authentication middleware to run first
 */
export async function attachTenantDatabase(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // For admin users, allow tenant ID from header or query parameter
    // For regular users, use tenantId from JWT
    let tenantId: string | undefined;

    if (req.user.roles?.includes('admin') || req.user.roles?.includes('tenantadmin')) {
      // Admin can specify tenant via header or query, or use their own tenantId
      tenantId =
        (req.headers['x-tenant-id'] as string) ||
        (req.query.tenantId as string) ||
        req.user.tenantId;
    } else {
      // Regular users must use their own tenantId
      tenantId = req.user.tenantId;
    }

    // Get database service
    const databaseService = getDatabaseService();

    // Skip tenant database attachment for system admins without a specific tenant
    if (!tenantId || tenantId === 'system') {
      // Attach only main database for admin operations
      req.mainDb = databaseService.getMainDatabase();
      next();
      return;
    }

    // Get tenant database connection
    try {
      const tenantDb = await databaseService.getTenantDatabase(tenantId);
      const mainDb = databaseService.getMainDatabase();

      // Attach to request
      req.tenantDb = tenantDb;
      req.mainDb = mainDb;

      next();
    } catch (error) {
      console.error('Failed to connect to tenant database:', error);

      res.status(500).json({
        status: 'error',
        message: 'Failed to connect to tenant database',
        details:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Unknown error'
            : undefined,
      });
    }
  } catch (error) {
    console.error('Tenant database middleware error:', error);

    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
}

/**
 * Optional middleware that attaches tenant database only if user is authenticated
 * Does not fail if user is not authenticated, just skips attaching database
 */
export async function attachTenantDatabaseOptional(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Only attach database if user is authenticated and has tenantId
    if (req.user && req.user.tenantId) {
      const databaseService = getDatabaseService();

      try {
        const tenantDb = await databaseService.getTenantDatabase(req.user.tenantId);
        const mainDb = databaseService.getMainDatabase();
        req.tenantDb = tenantDb;
        req.mainDb = mainDb;
      } catch (error) {
        console.error('Failed to connect to tenant database:', error);
        // Continue without tenant database
      }
    }

    next();
  } catch (error) {
    console.error('Tenant database middleware error:', error);
    // Continue without tenant database
    next();
  }
}
