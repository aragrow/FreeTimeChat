/**
 * Integration Tests for Authentication Flow
 *
 * Tests the complete authentication flow including registration, login, and token refresh
 *
 * NOTE: These tests require a running database. They will be skipped if:
 * - SKIP_INTEGRATION_TESTS=true environment variable is set
 * - Database connection fails
 *
 * To run these tests:
 * 1. Start database: docker-compose up -d
 * 2. Run migrations: pnpm prisma:migrate:deploy:main
 * 3. Run tests: pnpm test:integration
 */

import request from 'supertest';
import { app } from '../../app';
import { isDatabaseAvailable } from '../helpers/database-checker';
import { seedTestDatabase, cleanupTestDatabase } from '../helpers/test-seed';

describe('Authentication Flow Integration Tests', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable();
    if (dbAvailable) {
      // Clean up any leftover data from previous test runs
      await cleanupTestDatabase();
      // Seed fresh test data
      await seedTestDatabase();
    }
  });

  afterAll(async () => {
    if (dbAvailable) {
      await cleanupTestDatabase();
    }
  });

  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'SecurePassword123!',
    name: 'Test User',
  };

  let accessToken: string;
  let refreshToken: string;

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app).post('/api/v1/auth/register').send(testUser).expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.name).toBe(testUser.name);

      // Store tokens for later tests
      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should reject duplicate email registration', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app).post('/api/v1/auth/register').send(testUser).expect(409);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('already exists');
    });

    it('should validate email format', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePassword123!',
          name: 'Test User',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should enforce password requirements', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test2@example.com',
          password: 'weak',
          name: 'Test User',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should reject invalid credentials', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid');
    });

    it('should reject non-existent user', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        })
        .expect(401);

      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken,
      });

      // Log response for debugging
      if (response.status !== 200) {
        console.log('❌ Refresh failed with status:', response.status);
        console.log('❌ Response body:', JSON.stringify(response.body, null, 2));
        console.log('❌ Refresh token being used:', `${refreshToken.substring(0, 50)}...`);
      }

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.accessToken).not.toBe(accessToken);

      // Update tokens
      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should reject invalid refresh token', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(401);

      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should get current user with valid access token', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.email).toBe(testUser.email);
      expect(response.body.data.sub).toBeDefined(); // JWT includes sub (user ID)
      expect(response.body.data.role).toBeDefined(); // JWT includes role
    });

    it('should reject request without token', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app).get('/api/v1/auth/me').expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('No authorization header');
    });

    it('should reject invalid access token', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout and invalidate refresh token', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          refreshToken,
        })
        .expect(200);

      expect(response.body.status).toBe('success');

      // Try to use the refresh token after logout
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(401);

      expect(refreshResponse.body.status).toBe('error');
    });
  });
});
