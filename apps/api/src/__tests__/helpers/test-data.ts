/**
 * Test Data Helpers
 *
 * Provides mock data for tests
 */

import type { User } from '../../generated/prisma-main';
import type { JWTPayload } from '@freetimechat/types';

export const mockUser: Partial<User> = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  tenantId: 'test-client-id',
  isActive: true,
  twoFactorEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockAdminUser: Partial<User> = {
  id: 'admin-user-id',
  email: 'admin@example.com',
  name: 'Admin User',
  tenantId: 'test-client-id',
  isActive: true,
  twoFactorEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockJWTPayload: JWTPayload = {
  sub: 'test-user-id',
  email: 'test@example.com',
  role: 'user',
  roles: ['user'],
  tenantId: 'test-client-id',
  databaseName: 'test_client_db',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
};

export const mockAdminJWTPayload: JWTPayload = {
  sub: 'admin-user-id',
  email: 'admin@example.com',
  role: 'admin',
  roles: ['admin'],
  tenantId: 'test-client-id',
  databaseName: 'test_client_db',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 900,
};
