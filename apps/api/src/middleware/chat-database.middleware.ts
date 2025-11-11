/**
 * Chat Database Middleware
 *
 * Conditionally attaches database connections for chat routes:
 * - Admin users without tenant: Use main database for conversations
 * - Admin users with tenant: Use tenant database
 * - Regular users: Use tenant database (required)
 */

import { getDatabaseService } from '../services/database.service';
import type { NextFunction, Request, Response } from 'express';

/**
 * Middleware to conditionally attach database for chat
 * Requires authentication middleware to run first
 */
export async function attachChatDatabase(
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

    const databaseService = getDatabaseService();
    const mainDb = databaseService.getMainDatabase();

    // Always attach main database
    req.mainDb = mainDb;

    // Determine tenant ID
    let tenantId: string | undefined;
    const isAdmin = req.user.roles?.includes('admin') || req.user.roles?.includes('tenantadmin');

    if (isAdmin) {
      // Admin can ONLY specify tenant via header or query parameter
      // They do NOT use their own tenantId for chat by default
      tenantId = (req.headers['x-tenant-id'] as string) || (req.query.tenantId as string);

      // If admin doesn't specify a tenant, use main database
      if (!tenantId) {
        req.clientDb = mainDb; // Set clientDb to mainDb for compatibility
        req.useTenantDb = false;
        next();
        return;
      }
    } else {
      // Regular users must use their own tenantId
      tenantId = req.user.tenantId;

      if (!tenantId) {
        res.status(400).json({
          status: 'error',
          message: 'Tenant ID required for non-admin users',
        });
        return;
      }
    }

    // Get tenant database connection
    try {
      const clientDb = await databaseService.getTenantDatabase(tenantId);
      req.clientDb = clientDb;
      req.useTenantDb = true;
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
    console.error('Chat database middleware error:', error);

    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
}
