/**
 * Integration Tests for Client CRUD Operations
 *
 * Tests create, read, update, and delete operations for clients
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
import { cleanupTestDatabase, isDatabaseAvailable, seedTestDatabase } from '../helpers/test-seed';

describe('Client CRUD Integration Tests', () => {
  let dbAvailable = false;
  let adminToken: string;
  let createdClientId: string;
  let timestamp: number;

  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable();
    if (dbAvailable) {
      await cleanupTestDatabase();
      await seedTestDatabase();

      // Generate timestamp for unique test data
      timestamp = Date.now();

      // Login as tenant admin to get access token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: '000002@aragrow-llc.local',
          password: 'Open@2025',
          tenantKey: 'ARAGROW-LLC',
        })
        .expect(200);

      adminToken = loginResponse.body.data.accessToken;
    }
  });

  afterAll(async () => {
    if (dbAvailable) {
      await cleanupTestDatabase();
    }
  });

  describe('POST /api/v1/admin/clients', () => {
    it('should create a new client with minimal data', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const clientData = {
        name: `Test Client Corporation ${timestamp}`,
      };

      const response = await request(app)
        .post('/api/v1/admin/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(clientData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(clientData.name);
      expect(response.body.data.slug).toContain('test-client-corporation');
      expect(response.body.data.isActive).toBe(true);
      expect(response.body.data.discountPercentage).toBe('0');
      expect(response.body.data.invoiceNextNumber).toBe(1);
      expect(response.body.data.invoiceNumberPadding).toBe(5);

      createdClientId = response.body.data.id;
    });

    it('should create a client with complete billing information', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const clientData = {
        name: `Acme Corporation ${timestamp}`,
        hourlyRate: 150.0,
        discountPercentage: 10.5,
        email: `billing-${timestamp}@acme.com`,
        phone: '+1-555-123-4567',
        website: 'https://acme.com',
        contactPerson: 'John Doe',
        billingAddressLine1: '123 Main Street',
        billingAddressLine2: 'Suite 100',
        billingCity: 'San Francisco',
        billingState: 'CA',
        billingPostalCode: '94105',
        billingCountry: 'USA',
        invoicePrefix: `ACME-${timestamp}-`,
        invoiceNextNumber: 1000,
        invoiceNumberPadding: 6,
      };

      const response = await request(app)
        .post('/api/v1/admin/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(clientData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.name).toBe(clientData.name);
      expect(response.body.data.hourlyRate).toBe(clientData.hourlyRate.toString());
      expect(response.body.data.discountPercentage).toBe(clientData.discountPercentage.toString());
      expect(response.body.data.email).toBe(clientData.email);
      expect(response.body.data.phone).toBe(clientData.phone);
      expect(response.body.data.website).toBe(clientData.website);
      expect(response.body.data.contactPerson).toBe(clientData.contactPerson);
      expect(response.body.data.billingAddressLine1).toBe(clientData.billingAddressLine1);
      expect(response.body.data.billingCity).toBe(clientData.billingCity);
      expect(response.body.data.invoicePrefix).toBe(clientData.invoicePrefix);
      expect(response.body.data.invoiceNextNumber).toBe(clientData.invoiceNextNumber);
      expect(response.body.data.invoiceNumberPadding).toBe(clientData.invoiceNumberPadding);
    });

    it('should reject client creation without name', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .post('/api/v1/admin/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('required');
    });

    it('should reject client with negative hourly rate', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .post('/api/v1/admin/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Invalid Client Hourly ${timestamp}`,
          hourlyRate: -10,
        })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('positive');
    });

    it('should reject client with discount percentage > 100', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .post('/api/v1/admin/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Invalid Client Discount ${timestamp}`,
          discountPercentage: 150,
        })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('between 0 and 100');
    });

    it('should reject unauthorized client creation', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .post('/api/v1/admin/clients')
        .send({ name: 'Unauthorized Client' })
        .expect(401);

      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /api/v1/admin/clients', () => {
    it('should list all clients with pagination', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .get('/api/v1/admin/clients?page=1&limit=20')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.clients).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(20);
      expect(response.body.data.pagination.total).toBeGreaterThan(0);
    });

    it('should search clients by name', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .get('/api/v1/admin/clients?search=Acme')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.clients).toBeInstanceOf(Array);
      if (response.body.data.clients.length > 0) {
        expect(response.body.data.clients[0].name).toContain('Acme');
      }
    });

    it('should filter active clients only', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .get('/api/v1/admin/clients?includeInactive=false')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      response.body.data.clients.forEach((client: any) => {
        expect(client.isActive).toBe(true);
      });
    });
  });

  describe('GET /api/v1/admin/clients/:id', () => {
    it('should get client by ID with user count', async () => {
      if (!dbAvailable || !createdClientId) {
        console.log('⏭️  Skipping test - database not available or no client created');
        return;
      }

      const response = await request(app)
        .get(`/api/v1/admin/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.id).toBe(createdClientId);
      expect(response.body.data._count).toBeDefined();
    });

    it('should return 404 for non-existent client', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .get('/api/v1/admin/clients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
    });
  });

  describe('PUT /api/v1/admin/clients/:id', () => {
    it('should update client information', async () => {
      if (!dbAvailable || !createdClientId) {
        console.log('⏭️  Skipping test - database not available or no client created');
        return;
      }

      const updateData = {
        name: `Updated Test Client ${timestamp}`,
        hourlyRate: 175.5,
        discountPercentage: 15,
        email: 'updated@test.com',
        phone: '+1-555-999-8888',
      };

      const response = await request(app)
        .put(`/api/v1/admin/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.hourlyRate).toBe(updateData.hourlyRate.toString());
      expect(response.body.data.discountPercentage).toBe(updateData.discountPercentage.toString());
      expect(response.body.data.email).toBe(updateData.email);
      expect(response.body.data.phone).toBe(updateData.phone);
    });

    it('should update only specified fields', async () => {
      if (!dbAvailable || !createdClientId) {
        console.log('⏭️  Skipping test - database not available or no client created');
        return;
      }

      const response = await request(app)
        .put(`/api/v1/admin/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ hourlyRate: 200 })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.hourlyRate).toBe('200');
      expect(response.body.data.name).toBe(`Updated Test Client ${timestamp}`); // Name should remain unchanged from previous update
    });

    it('should reject invalid hourly rate update', async () => {
      if (!dbAvailable || !createdClientId) {
        console.log('⏭️  Skipping test - database not available or no client created');
        return;
      }

      const response = await request(app)
        .put(`/api/v1/admin/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ hourlyRate: -50 })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should return 404 for non-existent client update', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .put('/api/v1/admin/clients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Non-Existent Client' })
        .expect(404);

      expect(response.body.status).toBe('error');
    });
  });

  describe('DELETE /api/v1/admin/clients/:id', () => {
    it('should soft delete (deactivate) a client', async () => {
      if (!dbAvailable || !createdClientId) {
        console.log('⏭️  Skipping test - database not available or no client created');
        return;
      }

      const response = await request(app)
        .delete(`/api/v1/admin/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('deactivated');
      expect(response.body.data.isActive).toBe(false);
    });

    it('should not delete client with active users', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      // Get a client with users (system client should have admin user)
      const clientsResponse = await request(app)
        .get('/api/v1/admin/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const systemClient = clientsResponse.body.data.clients.find((c: any) => c.name === 'System');

      if (systemClient) {
        const response = await request(app)
          .delete(`/api/v1/admin/clients/${systemClient.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toContain('active user');
      }
    });

    it('should return 404 for non-existent client deletion', async () => {
      if (!dbAvailable) {
        console.log('⏭️  Skipping test - database not available');
        return;
      }

      const response = await request(app)
        .delete('/api/v1/admin/clients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /api/v1/admin/clients/:id/reactivate', () => {
    it('should reactivate a deactivated client', async () => {
      if (!dbAvailable || !createdClientId) {
        console.log('⏭️  Skipping test - database not available or no client created');
        return;
      }

      const response = await request(app)
        .post(`/api/v1/admin/clients/${createdClientId}/reactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('reactivated');
      expect(response.body.data.isActive).toBe(true);
    });

    it('should reject reactivation of already active client', async () => {
      if (!dbAvailable || !createdClientId) {
        console.log('⏭️  Skipping test - database not available or no client created');
        return;
      }

      const response = await request(app)
        .post(`/api/v1/admin/clients/${createdClientId}/reactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('already active');
    });
  });

  describe('GET /api/v1/admin/clients/:id/stats', () => {
    it('should get client statistics', async () => {
      if (!dbAvailable || !createdClientId) {
        console.log('⏭️  Skipping test - database not available or no client created');
        return;
      }

      const response = await request(app)
        .get(`/api/v1/admin/clients/${createdClientId}/stats`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.userCount).toBeDefined();
      expect(response.body.data.activeUserCount).toBeDefined();
      expect(typeof response.body.data.userCount).toBe('number');
      expect(typeof response.body.data.activeUserCount).toBe('number');
    });
  });
});
