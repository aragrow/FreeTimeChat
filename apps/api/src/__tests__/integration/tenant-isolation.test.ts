/**
 * Integration Tests for Multi-Tenant Isolation
 *
 * Tests that data is properly isolated between different clients/tenants
 *
 * NOTE: These tests require a running database. They will be skipped if:
 * - SKIP_INTEGRATION_TESTS=true environment variable is set
 * - Database connection fails
 *
 * To run these tests:
 * 1. Start database: docker-compose up -d
 * 2. Run migrations: pnpm prisma:migrate:deploy:main && pnpm prisma:migrate:deploy:client
 * 3. Run tests: pnpm test:integration
 */

import request from 'supertest';
import { app } from '../../app';
import { PrismaClient as ClientPrismaClient } from '../../generated/prisma-client';
import { PrismaClient as MainPrismaClient } from '../../generated/prisma-main';
import { isDatabaseAvailable } from '../helpers/database-checker';
import type { User } from '../../generated/prisma-main';

describe('Multi-Tenant Isolation Integration Tests', () => {
  let dbAvailable = false;
  let mainPrisma: MainPrismaClient;
  let clientPrisma: ClientPrismaClient;

  // Test clients
  let client1Id: string;
  let client2Id: string;

  // Test users (one per client)
  let user1: User;
  let user2: User;
  let user1Token: string;
  let user2Token: string;

  // Test project IDs
  let project1Id: string;
  let project2Id: string;

  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable();

    if (!dbAvailable) {
      console.log('⚠️  Database not available - skipping tenant isolation tests');
      return;
    }

    mainPrisma = new MainPrismaClient();
    clientPrisma = new ClientPrismaClient();

    try {
      // Create two test clients with unique database names
      const timestamp = Date.now();
      const client1 = await mainPrisma.tenant.create({
        data: {
          tenantKey: `TENANT-1-TEST-${timestamp}`,
          name: 'Test Client 1',
          slug: `test-client-1-${timestamp}`,
          databaseName: `freetimechat_test_client_1_${timestamp}`,
          isActive: true,
        },
      });
      client1Id = client1.id;

      const client2 = await mainPrisma.tenant.create({
        data: {
          tenantKey: `TENANT-2-TEST-${timestamp}`,
          name: 'Test Client 2',
          slug: `test-client-2-${timestamp}`,
          databaseName: `freetimechat_test_client_2_${timestamp}`,
          isActive: true,
        },
      });
      client2Id = client2.id;

      // Create user for client 1
      const registerRes1 = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `tenant1-${Date.now()}@example.com`,
          password: 'SecurePassword123!',
          name: 'Tenant 1 User',
          clientSlug: client1.slug,
        });

      user1 = registerRes1.body.user;
      user1Token = registerRes1.body.accessToken;

      // Create user for client 2
      const registerRes2 = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `tenant2-${Date.now()}@example.com`,
          password: 'SecurePassword123!',
          name: 'Tenant 2 User',
          clientSlug: client2.slug,
        });

      user2 = registerRes2.body.user;
      user2Token = registerRes2.body.accessToken;

      // Create projects for each user
      const project1Res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Client 1 Project',
          description: 'Project for client 1',
          isBillableProject: true,
        });
      project1Id = project1Res.body.id;

      const project2Res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          name: 'Client 2 Project',
          description: 'Project for client 2',
          isBillableProject: true,
        });
      project2Id = project2Res.body.id;
    } catch (error) {
      console.error('Setup failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    if (dbAvailable) {
      try {
        // Clean up projects
        if (project1Id) {
          await clientPrisma.project.deleteMany({
            where: { id: project1Id },
          });
        }
        if (project2Id) {
          await clientPrisma.project.deleteMany({
            where: { id: project2Id },
          });
        }

        // Clean up users and clients
        if (user1?.id) {
          await mainPrisma.user.delete({ where: { id: user1.id } }).catch(() => {});
        }
        if (user2?.id) {
          await mainPrisma.user.delete({ where: { id: user2.id } }).catch(() => {});
        }
        if (client1Id) {
          await mainPrisma.tenant.delete({ where: { id: client1Id } }).catch(() => {});
        }
        if (client2Id) {
          await mainPrisma.tenant.delete({ where: { id: client2Id } }).catch(() => {});
        }

        await mainPrisma.$disconnect();
        await clientPrisma.$disconnect();
      } catch (error) {
        console.error('Cleanup failed:', error);
      }
    }
  });

  describe('Cross-Tenant Data Access Prevention', () => {
    it('should prevent user from accessing another tenants projects', async () => {
      if (!dbAvailable) return;

      // User 1 tries to access User 2's project
      const res = await request(app)
        .get(`/api/v1/projects/${project2Id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(404); // Not found (or 403 Forbidden)
    });

    it('should prevent user from listing another tenants projects', async () => {
      if (!dbAvailable) return;

      // User 1 lists projects (should only see their own)
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);

      // Should not contain any of client 2's projects
      const hasClient2Project = res.body.some((p: { id: string }) => p.id === project2Id);
      expect(hasClient2Project).toBe(false);
    });

    it('should prevent user from updating another tenants project', async () => {
      if (!dbAvailable) return;

      // User 1 tries to update User 2's project
      const res = await request(app)
        .put(`/api/v1/projects/${project2Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Hacked Project Name',
        });

      expect([403, 404]).toContain(res.status);
    });

    it('should prevent user from deleting another tenants project', async () => {
      if (!dbAvailable) return;

      // User 1 tries to delete User 2's project
      const res = await request(app)
        .delete(`/api/v1/projects/${project2Id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect([403, 404]).toContain(res.status);

      // Verify project still exists
      const checkRes = await request(app)
        .get(`/api/v1/projects/${project2Id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(checkRes.status).toBe(200);
    });
  });

  describe('JWT Client ID Validation', () => {
    it('should extract correct clientId from JWT', async () => {
      if (!dbAvailable) return;

      // Make request with user 1's token
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.tenantId).toBe(client1Id);
    });

    it('should not accept JWT with invalid clientId', async () => {
      if (!dbAvailable) return;

      // This test verifies that even if someone modifies the JWT,
      // the signature verification will fail
      const invalidToken = `${user1Token}tampered`;

      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(res.status).toBe(401); // Unauthorized
    });
  });

  describe('User Profile Access Control', () => {
    it('should allow user to access their own profile', async () => {
      if (!dbAvailable) return;

      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(user1.id);
      expect(res.body.email).toBe(user1.email);
    });

    it('should prevent user from accessing another tenants user profile', async () => {
      if (!dbAvailable) return;

      // User 1 tries to access User 2's profile
      const res = await request(app)
        .get(`/api/v1/users/${user2.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect([403, 404]).toContain(res.status);
    });

    it('should prevent listing users from another tenant', async () => {
      if (!dbAvailable) return;

      // User 1 lists users (should only see their tenant's users)
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);

      // Should not contain any users from client 2
      const hasClient2User = res.body.some((u: { id: string }) => u.id === user2.id);
      expect(hasClient2User).toBe(false);
    });
  });

  describe('Time Entry Isolation', () => {
    let timeEntry1Id: string;
    let timeEntry2Id: string;

    beforeAll(async () => {
      if (!dbAvailable) return;

      // Create time entries for each user
      const entry1Res = await request(app)
        .post('/api/v1/time-entries')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          projectId: project1Id,
          description: 'Client 1 time entry',
          startTime: new Date().toISOString(),
          isBillable: true,
        });
      timeEntry1Id = entry1Res.body.id;

      const entry2Res = await request(app)
        .post('/api/v1/time-entries')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          projectId: project2Id,
          description: 'Client 2 time entry',
          startTime: new Date().toISOString(),
          isBillable: true,
        });
      timeEntry2Id = entry2Res.body.id;
    });

    afterAll(async () => {
      if (dbAvailable && timeEntry1Id) {
        await clientPrisma.timeEntry
          .deleteMany({
            where: { id: timeEntry1Id },
          })
          .catch(() => {});
      }
      if (dbAvailable && timeEntry2Id) {
        await clientPrisma.timeEntry
          .deleteMany({
            where: { id: timeEntry2Id },
          })
          .catch(() => {});
      }
    });

    it('should prevent accessing another tenants time entries', async () => {
      if (!dbAvailable) return;

      // User 1 tries to access User 2's time entry
      const res = await request(app)
        .get(`/api/v1/time-entries/${timeEntry2Id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect([403, 404]).toContain(res.status);
    });

    it('should not return another tenants time entries in list', async () => {
      if (!dbAvailable) return;

      // User 1 lists time entries
      const res = await request(app)
        .get('/api/v1/time-entries')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);

      // Should not contain client 2's time entries
      const hasClient2Entry = res.body.some((e: { id: string }) => e.id === timeEntry2Id);
      expect(hasClient2Entry).toBe(false);
    });
  });

  describe('Database-Level Isolation', () => {
    it('should confirm users are associated with correct client', async () => {
      if (!dbAvailable) return;

      const dbUser1 = await mainPrisma.user.findUnique({
        where: { id: user1.id },
      });

      const dbUser2 = await mainPrisma.user.findUnique({
        where: { id: user2.id },
      });

      expect(dbUser1?.tenantId).toBe(client1Id);
      expect(dbUser2?.tenantId).toBe(client2Id);
      expect(dbUser1?.tenantId).not.toBe(dbUser2?.tenantId);
    });

    it('should confirm projects are in correct client database', async () => {
      if (!dbAvailable) return;

      const project1 = await clientPrisma.project.findUnique({
        where: { id: project1Id },
      });

      const project2 = await clientPrisma.project.findUnique({
        where: { id: project2Id },
      });

      expect(project1).toBeDefined();
      expect(project2).toBeDefined();

      // Projects should have correct clientId
      expect(project1?.clientId).toBe(client1Id);
      expect(project2?.clientId).toBe(client2Id);
    });
  });

  describe('Inactive Client Validation', () => {
    it('should prevent inactive client users from accessing API', async () => {
      if (!dbAvailable) return;

      // Deactivate client 1
      await mainPrisma.tenant.update({
        where: { id: client1Id },
        data: { isActive: false },
      });

      // User 1 tries to access projects
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${user1Token}`);

      expect([401, 403]).toContain(res.status);

      // Reactivate for cleanup
      await mainPrisma.tenant.update({
        where: { id: client1Id },
        data: { isActive: true },
      });
    });
  });
});
