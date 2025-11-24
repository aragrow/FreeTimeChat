/**
 * Express type extensions
 *
 * Extends Express Request to include authenticated user information
 */

import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { PrismaClient as MainPrismaClient } from '../generated/prisma-main';
import type { JWTPayload } from '@freetimechat/types';
import type { Request } from 'express';

declare global {
  namespace Express {
    // Override Passport's User type with our JWTPayload
    interface User extends JWTPayload {}

    interface Request {
      user?: JWTPayload;
      clientDatabaseUrl?: string;
      tenantDb?: ClientPrismaClient | MainPrismaClient; // Tenant database (contains clients, projects, invoices, etc.)
      mainDb?: MainPrismaClient; // Main database (contains users, tenants, roles, etc.)
      useTenantDb?: boolean; // Flag to indicate if tenant DB is being used (for chat)
    }
  }
}

/**
 * Request type with required authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: JWTPayload;
  tenantDb: ClientPrismaClient | MainPrismaClient;
  mainDb: MainPrismaClient;
}
