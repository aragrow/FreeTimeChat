/**
 * Client Database Middleware
 *
 * Attaches the appropriate client database connection to each request
 * based on the authenticated user's tenantId
 */

import { getDatabaseService } from '../services/database.service';
import type { NextFunction, Request, Response } from 'express';

/**
 * Middleware to attach client database to request
 * Requires authentication middleware to run first
 */
export async function attachClientDatabase(
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

    // Get tenantId from JWT payload
    const { tenantId } = req.user;

    if (!tenantId) {
      res.status(400).json({
        status: 'error',
        message: 'User does not belong to a client',
      });
      return;
    }

    // Get database service
    const databaseService = getDatabaseService();

    // Get client database connection
    try {
      const clientDb = await databaseService.getTenantDatabase(tenantId);
      const mainDb = databaseService.getMainDatabase();

      // Attach to request
      req.clientDb = clientDb;
      req.mainDb = mainDb;

      next();
    } catch (error) {
      console.error('Failed to connect to client database:', error);

      res.status(500).json({
        status: 'error',
        message: 'Failed to connect to client database',
        details:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Unknown error'
            : undefined,
      });
    }
  } catch (error) {
    console.error('Client database middleware error:', error);

    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
}

/**
 * Optional middleware that attaches client database only if user is authenticated
 * Does not fail if user is not authenticated, just skips attaching database
 */
export async function attachClientDatabaseOptional(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Only attach database if user is authenticated and has tenantId
    if (req.user && req.user.tenantId) {
      const databaseService = getDatabaseService();

      try {
        const clientDb = await databaseService.getTenantDatabase(req.user.tenantId);
        const mainDb = databaseService.getMainDatabase();
        req.clientDb = clientDb;
        req.mainDb = mainDb;
      } catch (error) {
        console.error('Failed to connect to client database:', error);
        // Continue without client database
      }
    }

    next();
  } catch (error) {
    console.error('Client database middleware error:', error);
    // Continue without client database
    next();
  }
}
