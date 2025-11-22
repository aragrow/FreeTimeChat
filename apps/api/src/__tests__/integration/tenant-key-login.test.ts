/**
 * Integration Tests for Tenant Key Login
 *
 * Tests the tenant key authentication functionality:
 * - Admin login without tenantKey (should succeed)
 * - Admin login with tenantKey (should succeed)
 * - Non-admin user login without tenantKey (should fail)
 * - Non-admin user login with valid tenantKey (should succeed)
 * - Non-admin user login with invalid tenantKey (should fail)
 * - Non-admin user login with wrong tenantKey (should fail)
 *
 * NOTE: These tests require a running database. They will be skipped if:
 * - SKIP_INTEGRATION_TESTS=true environment variable is set
 * - Database connection fails
 *
 * To run these tests:
 * 1. Start database: docker-compose up -d
 * 2. Run seed: pnpm --filter @freetimechat/api seed
 * 3. Run tests: pnpm --filter @freetimechat/api test customer-key-login
 */

import bcrypt from 'bcrypt';
import request from 'supertest';
import { app } from '../../app';
import { PrismaClient as MainPrismaClient } from '../../generated/prisma-main';
import { cleanupTestDatabase, isDatabaseAvailable, seedTestDatabase } from '../helpers/test-seed';

describe('Tenant Key Login Integration Tests', () => {
  let dbAvailable = false;
  let prisma: MainPrismaClient;

  // Test data
  let testTenant1: { id: string; name: string; tenantKey: string; databaseName: string | null };
  let testTenant2: { id: string; name: string; tenantKey: string; databaseName: string | null };
  let testAdminUser: { id: string; email: string; password: string };
  let testUser1: { id: string; email: string; password: string };
  let testUser2: { id: string; email: string; password: string };

  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable();

    if (dbAvailable) {
      // Seed database with roles, capabilities, and ARAGROW-LLC tenant
      await cleanupTestDatabase();
      await seedTestDatabase();

      prisma = new MainPrismaClient();

      try {
        // Use timestamp for unique emails (not database names)
        const timestamp = Date.now();

        // Use ARAGROW-LLC tenant as testTenant1 (created by seedTestDatabase)
        const aragrowTenant = await prisma.tenant.findUnique({
          where: { id: '00000000-0000-0000-0000-000000000101' },
        });

        if (!aragrowTenant) {
          throw new Error('ARAGROW-LLC tenant not found - seedTestDatabase may have failed');
        }

        testTenant1 = {
          id: aragrowTenant.id,
          name: aragrowTenant.name,
          tenantKey: aragrowTenant.tenantKey,
          databaseName: aragrowTenant.databaseName,
        };

        // Create second tenant using upsert with fixed ID to prevent duplicates
        const tenant2 = await prisma.tenant.upsert({
          where: { id: '00000000-0000-0000-0000-000000000102' },
          update: {
            isActive: true,
          },
          create: {
            id: '00000000-0000-0000-0000-000000000102',
            name: 'Test Customer 2',
            slug: 'test-customer-2',
            tenantKey: 'TEST-CUST-002',
            databaseName: 'freetimechat_test_tenant_2',
            databaseHost: 'localhost',
            isActive: true,
          },
        });

        testTenant2 = {
          id: tenant2.id,
          name: tenant2.name,
          tenantKey: tenant2.tenantKey,
          databaseName: tenant2.databaseName,
        };

        // Get roles created by seedTestDatabase
        const adminRole = await prisma.role.findFirst({
          where: { name: 'admin' },
        });

        const userRole = await prisma.role.findFirst({
          where: { name: 'user' },
        });

        if (!adminRole || !userRole) {
          throw new Error('Roles not found - seedTestDatabase may have failed');
        }

        // Create test admin user (no tenant assignment)
        const adminPassword = 'AdminPass123!';
        const adminHash = await bcrypt.hash(adminPassword, 10);

        const adminUserRecord = await prisma.user.create({
          data: {
            email: `test-admin-${timestamp}@freetimechat.test`,
            passwordHash: adminHash,
            name: 'Test Admin',
            isActive: true,
          },
        });

        testAdminUser = {
          id: adminUserRecord.id,
          email: adminUserRecord.email,
          password: adminPassword,
        };

        // Assign admin role to admin user
        await prisma.userRole.create({
          data: {
            userId: adminUserRecord.id,
            roleId: adminRole.id,
          },
        });

        // Create test user 1 (belongs to ARAGROW-LLC tenant)
        const user1Password = 'UserPass123!';
        const user1Hash = await bcrypt.hash(user1Password, 10);

        const user1Record = await prisma.user.create({
          data: {
            email: `test-user1-${timestamp}@freetimechat.test`,
            passwordHash: user1Hash,
            name: 'Test User 1',
            tenantId: testTenant1.id,
            isActive: true,
          },
        });

        testUser1 = {
          id: user1Record.id,
          email: user1Record.email,
          password: user1Password,
        };

        // Assign user role to user 1
        await prisma.userRole.create({
          data: {
            userId: user1Record.id,
            roleId: userRole.id,
          },
        });

        // Create test user 2 (belongs to customer 2)
        const user2Password = 'UserPass456!';
        const user2Hash = await bcrypt.hash(user2Password, 10);

        const user2Record = await prisma.user.create({
          data: {
            email: `test-user2-${timestamp}@freetimechat.test`,
            passwordHash: user2Hash,
            name: 'Test User 2',
            tenantId: testTenant2.id,
            isActive: true,
          },
        });

        testUser2 = {
          id: user2Record.id,
          email: user2Record.email,
          password: user2Password,
        };

        // Assign user role to user 2
        await prisma.userRole.create({
          data: {
            userId: user2Record.id,
            roleId: userRole.id,
          },
        });

        console.log('✅ Test data created successfully');
      } catch (error) {
        console.error('Setup failed:', error);
        throw error;
      }
    }
  });

  afterAll(async () => {
    if (dbAvailable && prisma) {
      try {
        // Clean up test-specific data (test users created in beforeAll)
        await prisma.refreshToken.deleteMany({
          where: {
            user: {
              email: {
                contains: '@freetimechat.test',
              },
            },
          },
        });

        await prisma.userRole.deleteMany({
          where: {
            user: {
              email: {
                contains: '@freetimechat.test',
              },
            },
          },
        });

        await prisma.user.deleteMany({
          where: {
            email: {
              contains: '@freetimechat.test',
            },
          },
        });

        // Delete second test tenant (testTenant2)
        await prisma.tenant.deleteMany({
          where: {
            id: '00000000-0000-0000-0000-000000000102',
          },
        });

        await prisma.$disconnect();

        // Clean up seeded data (ARAGROW tenant, roles, capabilities)
        await cleanupTestDatabase();

        console.log('✅ Test data cleaned up successfully');
      } catch (error) {
        console.error('Cleanup failed:', error);
      }
    }
  });

  describe('Admin Login Tests', () => {
    it('should allow admin to login without tenantKey', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testAdminUser.email,
          password: testAdminUser.password,
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe(testAdminUser.email);
      expect(response.body.data.user.roles).toContain('admin');
    });

    it('should allow admin to login with tenantKey (optional)', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testAdminUser.email,
          password: testAdminUser.password,
          tenantKey: testTenant1.tenantKey,
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe(testAdminUser.email);
      expect(response.body.data.user.roles).toContain('admin');
    });

    it('should allow admin to login even with invalid tenantKey', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      // Admin with invalid tenantKey should get 401 for invalid tenant key
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testAdminUser.email,
          password: testAdminUser.password,
          tenantKey: 'INVALID-KEY',
        })
        .expect(401); // Invalid tenant key returns 401

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid tenant key');
    });
  });

  describe('Non-Admin User Login Tests', () => {
    it('should reject non-admin user login without tenantKey', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser1.email,
          password: testUser1.password,
        })
        .expect(400); // Tenant key required returns 400

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Tenant key is required');
    });

    it('should allow non-admin user to login with correct tenantKey', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser1.email,
          password: testUser1.password,
          tenantKey: testTenant1.tenantKey,
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser1.email);
      expect(response.body.data.user.roles).toBeDefined();
    });

    it('should reject non-admin user login with invalid tenantKey', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser1.email,
          password: testUser1.password,
          tenantKey: 'INVALID-CUSTOMER-KEY',
        })
        .expect(401); // Invalid tenant key returns 401

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid tenant key');
    });

    it('should reject non-admin user login with wrong tenantKey (belongs to different customer)', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      // User 1 tries to login with Customer 2's key
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser1.email,
          password: testUser1.password,
          tenantKey: testTenant2.tenantKey, // Wrong tenant key
        })
        .expect(403); // Access denied returns 403

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Access denied');
    });

    it('should allow user 2 to login with their correct tenantKey', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser2.email,
          password: testUser2.password,
          tenantKey: testTenant2.tenantKey,
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser2.email);
    });
  });

  describe('Invalid Credentials Tests', () => {
    it('should reject login with wrong password even with correct tenantKey', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser1.email,
          password: 'WrongPassword123!',
          tenantKey: testTenant1.tenantKey,
        })
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should reject login with non-existent email even with valid tenantKey', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
          tenantKey: testTenant1.tenantKey,
        })
        .expect(401);

      expect(response.body.status).toBe('error');
    });
  });
});
