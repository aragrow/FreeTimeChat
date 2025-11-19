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
      clientDb?: ClientPrismaClient | MainPrismaClient; // Can be client DB or main DB (for admin users)
      mainDb?: MainPrismaClient;
      useTenantDb?: boolean; // Flag to indicate if tenant DB is being used (for chat)
    }
  }
}

/**
 * Request type with required authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: JWTPayload;
  clientDb: ClientPrismaClient | MainPrismaClient;
  mainDb: MainPrismaClient;
}
