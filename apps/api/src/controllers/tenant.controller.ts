/**
 * Tenant Controller
 *
 * Handles HTTP requests for tenant management
 * All endpoints require admin privileges
 */

import { getPasswordService } from '../services/password.service';
import { getRoleService } from '../services/role.service';
import { getTenantService } from '../services/tenant.service';
import { getUserService } from '../services/user.service';
import type { JWTPayload } from '@freetimechat/types';
import type { Request, Response } from 'express';

export class TenantController {
  private tenantService = getTenantService();
  private userService = getUserService();
  private roleService = getRoleService();
  private passwordService = getPasswordService();

  /**
   * Get all tenants with optional filtering and pagination
   * GET /api/v1/admin/tenants
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      // Tenant filtering: tenantadmin users can only see their own tenant
      const currentUser = req.user as JWTPayload;
      const userRoles = currentUser.roles || [];
      const isTenantAdmin = userRoles.includes('tenantadmin');
      const isAdmin = userRoles.includes('admin');

      // If user is tenantadmin (not admin), return only their own tenant
      if (isTenantAdmin && !isAdmin && currentUser.tenantId) {
        const tenant = await this.tenantService.findById(currentUser.tenantId);

        if (!tenant) {
          res.status(404).json({
            status: 'error',
            message: 'Tenant not found',
          });
          return;
        }

        // Return as a paginated result with single tenant
        res.status(200).json({
          status: 'success',
          data: {
            tenants: [tenant],
            pagination: {
              page: 1,
              limit: 1,
              total: 1,
              totalPages: 1,
            },
          },
        });
        return;
      }

      // Admin users can see all tenants with filtering
      const { isActive, search, page, limit } = req.query;

      const filters: any = {};
      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }
      if (search) {
        filters.search = String(search);
      }

      const pagination: any = {};
      if (page) {
        pagination.page = parseInt(String(page), 10);
      }
      if (limit) {
        pagination.limit = parseInt(String(limit), 10);
      }

      const result = await this.tenantService.findAll(filters, pagination);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      console.error('Error fetching tenants:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch tenants',
        error: error.message,
      });
    }
  }

  /**
   * Get tenant by ID
   * GET /api/v1/admin/tenants/:id
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const tenant = await this.tenantService.findById(id);

      if (!tenant) {
        res.status(404).json({
          status: 'error',
          message: 'Tenant not found',
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: { tenant },
      });
    } catch (error: any) {
      console.error('Error fetching tenant:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch tenant',
        error: error.message,
      });
    }
  }

  /**
   * Create new tenant
   * POST /api/v1/admin/tenants
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        slug,
        tenantKey,
        databaseName,
        databaseHost,
        contactName,
        contactEmail,
        contactPhone,
        billingStreet,
        billingCity,
        billingState,
        billingZip,
        billingCountry,
        billingEmail,
        isActive,
        adminUsername,
      } = req.body;

      // Validate required fields
      if (!name || !slug || !tenantKey || !adminUsername) {
        res.status(400).json({
          status: 'error',
          message: 'Missing required fields: name, slug, tenantKey, adminUsername',
        });
        return;
      }

      // Validate admin username format (exactly 6 digits)
      const usernameRegex = /^\d{6}$/;
      if (!usernameRegex.test(adminUsername)) {
        res.status(400).json({
          status: 'error',
          message: 'Admin username must be exactly 6 digits',
        });
        return;
      }

      // Validate slug format (lowercase, alphanumeric, hyphens only)
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(slug)) {
        res.status(400).json({
          status: 'error',
          message: 'Slug must be lowercase alphanumeric with hyphens only',
        });
        return;
      }

      // Validate tenant key format (uppercase alphanumeric with hyphens)
      const keyRegex = /^[A-Z0-9-]+$/;
      if (!keyRegex.test(tenantKey)) {
        res.status(400).json({
          status: 'error',
          message: 'Tenant key must be uppercase alphanumeric with hyphens only',
        });
        return;
      }

      // Validate email formats if provided
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (contactEmail && !emailRegex.test(contactEmail)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid contact email format',
        });
        return;
      }

      if (billingEmail && !emailRegex.test(billingEmail)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid billing email format',
        });
        return;
      }

      const tenant = await this.tenantService.create({
        name,
        slug,
        tenantKey,
        databaseName,
        databaseHost,
        contactName,
        contactEmail,
        contactPhone,
        billingStreet,
        billingCity,
        billingState,
        billingZip,
        billingCountry,
        billingEmail,
        isActive,
      });

      // Create admin user for the tenant
      const adminEmail = `${adminUsername}@${slug}.local`;
      const passwordHash = await this.passwordService.hash('firsttime');

      const adminUser = await this.userService.createUser({
        email: adminEmail,
        passwordHash,
        name: `Admin ${adminUsername}`,
        tenantId: tenant.id,
        requirePasswordChange: true,
      });

      // Assign TenantAdmin role to the new user
      const tenantAdminRole = await this.roleService.findByName('tenantadmin');
      if (!tenantAdminRole) {
        throw new Error('TenantAdmin role not found. Please run database seed.');
      }
      await this.roleService.assignToUser(adminUser.id, tenantAdminRole.id);

      res.status(201).json({
        status: 'success',
        data: {
          tenant,
          adminUser: {
            id: adminUser.id,
            email: adminUser.email,
            name: adminUser.name,
            requirePasswordChange: adminUser.requirePasswordChange,
          },
        },
        message: 'Tenant and admin user created successfully',
      });
    } catch (error: any) {
      console.error('Error creating tenant:', error);

      if (error.message.includes('already exists')) {
        res.status(409).json({
          status: 'error',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to create tenant',
        error: error.message,
      });
    }
  }

  /**
   * Update tenant
   * PUT /api/v1/admin/tenants/:id
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        name,
        slug,
        tenantKey,
        databaseName,
        databaseHost,
        contactName,
        contactEmail,
        contactPhone,
        billingStreet,
        billingCity,
        billingState,
        billingZip,
        billingCountry,
        billingEmail,
        isActive,
      } = req.body;

      // Validate slug format if provided
      if (slug) {
        const slugRegex = /^[a-z0-9-]+$/;
        if (!slugRegex.test(slug)) {
          res.status(400).json({
            status: 'error',
            message: 'Slug must be lowercase alphanumeric with hyphens only',
          });
          return;
        }
      }

      // Validate tenant key format if provided
      if (tenantKey) {
        const keyRegex = /^[A-Z0-9-]+$/;
        if (!keyRegex.test(tenantKey)) {
          res.status(400).json({
            status: 'error',
            message: 'Tenant key must be uppercase alphanumeric with hyphens only',
          });
          return;
        }
      }

      // Validate email formats if provided
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (contactEmail && !emailRegex.test(contactEmail)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid contact email format',
        });
        return;
      }

      if (billingEmail && !emailRegex.test(billingEmail)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid billing email format',
        });
        return;
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (slug !== undefined) updateData.slug = slug;
      if (tenantKey !== undefined) updateData.tenantKey = tenantKey;
      if (databaseName !== undefined) updateData.databaseName = databaseName;
      if (databaseHost !== undefined) updateData.databaseHost = databaseHost;
      if (contactName !== undefined) updateData.contactName = contactName;
      if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
      if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
      if (billingStreet !== undefined) updateData.billingStreet = billingStreet;
      if (billingCity !== undefined) updateData.billingCity = billingCity;
      if (billingState !== undefined) updateData.billingState = billingState;
      if (billingZip !== undefined) updateData.billingZip = billingZip;
      if (billingCountry !== undefined) updateData.billingCountry = billingCountry;
      if (billingEmail !== undefined) updateData.billingEmail = billingEmail;
      if (isActive !== undefined) updateData.isActive = isActive;

      const tenant = await this.tenantService.update(id, updateData);

      res.status(200).json({
        status: 'success',
        data: { tenant },
        message: 'Tenant updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating tenant:', error);

      if (error.message === 'Tenant not found') {
        res.status(404).json({
          status: 'error',
          message: error.message,
        });
        return;
      }

      if (error.message.includes('already exists')) {
        res.status(409).json({
          status: 'error',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to update tenant',
        error: error.message,
      });
    }
  }

  /**
   * Delete tenant
   * DELETE /api/v1/admin/tenants/:id
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await this.tenantService.delete(id);

      res.status(200).json({
        status: 'success',
        message: 'Tenant deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting tenant:', error);

      if (error.message === 'Tenant not found') {
        res.status(404).json({
          status: 'error',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to delete tenant',
        error: error.message,
      });
    }
  }

  /**
   * Activate/deactivate tenant
   * PATCH /api/v1/admin/tenants/:id/status
   */
  async setStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        res.status(400).json({
          status: 'error',
          message: 'isActive must be a boolean value',
        });
        return;
      }

      const tenant = await this.tenantService.setActive(id, isActive);

      res.status(200).json({
        status: 'success',
        data: { tenant },
        message: `Tenant ${isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      console.error('Error updating tenant status:', error);

      if (error.message === 'Tenant not found') {
        res.status(404).json({
          status: 'error',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to update tenant status',
        error: error.message,
      });
    }
  }

  /**
   * Get tenant statistics
   * GET /api/v1/admin/tenants/statistics
   */
  async getStatistics(_req: Request, res: Response): Promise<void> {
    try {
      const statistics = await this.tenantService.getStatistics();

      res.status(200).json({
        status: 'success',
        data: { statistics },
      });
    } catch (error: any) {
      console.error('Error fetching tenant statistics:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch tenant statistics',
        error: error.message,
      });
    }
  }
}
