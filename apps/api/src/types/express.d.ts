/**
 * Express type extensions
 *
 * Extends Express Request to include authenticated user information
 */

import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { JWTPayload } from '@freetimechat/types';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      clientDatabaseUrl?: string;
      clientDb?: ClientPrismaClient;
    }
  }
}

export {};
