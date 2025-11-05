/**
 * Express type extensions
 *
 * Extends Express Request to include authenticated user information
 */

import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { PrismaClient as MainPrismaClient } from '../generated/prisma-main';
import type { JWTPayload } from '@freetimechat/types';

declare global {
  namespace Express {
    // Override Passport's User type with our JWTPayload
    interface User extends JWTPayload {}

    interface Request {
      user?: JWTPayload;
      clientDatabaseUrl?: string;
      clientDb?: ClientPrismaClient;
      mainDb?: MainPrismaClient;
    }
  }
}

export {};
