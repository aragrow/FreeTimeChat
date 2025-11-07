/**
 * Tenant Service
 *
 * Handles CRUD operations for tenant management
 * Note: This service only manages tenant records in the main database.
 * It does NOT create or manage the actual tenant databases.
 */

import { getDatabaseService } from './database.service';
import type { PrismaClient as MainPrismaClient } from '../generated/prisma-main';

export interface CreateTenantData {
  name: string;
  slug: string;
  tenantKey: string;
  databaseName?: string;
  databaseHost?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  billingCountry?: string;
  billingEmail?: string;
  isActive?: boolean;
}

export interface UpdateTenantData {
  name?: string;
  slug?: string;
  tenantKey?: string;
  databaseName?: string;
  databaseHost?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  billingCountry?: string;
  billingEmail?: string;
  isActive?: boolean;
}

export interface TenantFilters {
  isActive?: boolean;
  search?: string; // Search by name, slug, or contact email
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export class TenantService {
  private prisma: MainPrismaClient;

  constructor() {
    const databaseService = getDatabaseService();
    this.prisma = databaseService.getMainDatabase();
  }

  /**
   * Get all tenants with optional filtering and pagination
   */
  async findAll(
    filters: TenantFilters = {},
    pagination: PaginationParams = {}
  ): Promise<{ tenants: any[]; total: number; page: number; limit: number }> {
    const { isActive, search } = filters;
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
        { tenantKey: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get tenants and total count
    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          tenantKey: true,
          databaseName: true,
          databaseHost: true,
          isActive: true,
          contactName: true,
          contactEmail: true,
          contactPhone: true,
          billingStreet: true,
          billingCity: true,
          billingState: true,
          billingZip: true,
          billingCountry: true,
          billingEmail: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              users: true,
            },
          },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      tenants,
      total,
      page,
      limit,
    };
  }

  /**
   * Get tenant by ID
   */
  async findById(id: string): Promise<any | null> {
    return this.prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        tenantKey: true,
        databaseName: true,
        databaseHost: true,
        isActive: true,
        isSeeded: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        billingStreet: true,
        billingCity: true,
        billingState: true,
        billingZip: true,
        billingCountry: true,
        billingEmail: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    });
  }

  /**
   * Get tenant by slug
   */
  async findBySlug(slug: string): Promise<any | null> {
    return this.prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        tenantKey: true,
        databaseName: true,
        databaseHost: true,
        isActive: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        billingStreet: true,
        billingCity: true,
        billingState: true,
        billingZip: true,
        billingCountry: true,
        billingEmail: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Get tenant by tenant key
   */
  async findByTenantKey(tenantKey: string): Promise<any | null> {
    return this.prisma.tenant.findUnique({
      where: { tenantKey },
      select: {
        id: true,
        name: true,
        slug: true,
        tenantKey: true,
        databaseName: true,
        databaseHost: true,
        isActive: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Create a new tenant
   * Note: This only creates the tenant record. It does NOT create the actual tenant database.
   */
  async create(data: CreateTenantData): Promise<any> {
    // Check for duplicate slug
    const existingSlug = await this.prisma.tenant.findUnique({
      where: { slug: data.slug },
    });

    if (existingSlug) {
      throw new Error('Tenant slug already exists');
    }

    // Check for duplicate tenant key
    const existingKey = await this.prisma.tenant.findUnique({
      where: { tenantKey: data.tenantKey },
    });

    if (existingKey) {
      throw new Error('Tenant key already exists');
    }

    // Check for duplicate database name (if provided)
    if (data.databaseName) {
      const existingDb = await this.prisma.tenant.findUnique({
        where: { databaseName: data.databaseName },
      });

      if (existingDb) {
        throw new Error('Database name already exists');
      }
    }

    // Create tenant
    return this.prisma.tenant.create({
      data: {
        name: data.name,
        slug: data.slug,
        tenantKey: data.tenantKey,
        databaseName: data.databaseName,
        databaseHost: data.databaseHost || 'localhost',
        isActive: data.isActive !== undefined ? data.isActive : true,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        billingStreet: data.billingStreet,
        billingCity: data.billingCity,
        billingState: data.billingState,
        billingZip: data.billingZip,
        billingCountry: data.billingCountry,
        billingEmail: data.billingEmail,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        tenantKey: true,
        databaseName: true,
        databaseHost: true,
        isActive: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        billingStreet: true,
        billingCity: true,
        billingState: true,
        billingZip: true,
        billingCountry: true,
        billingEmail: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Update tenant
   */
  async update(id: string, data: UpdateTenantData): Promise<any> {
    // Check if tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Check for duplicate slug (if changing)
    if (data.slug && data.slug !== tenant.slug) {
      const existingSlug = await this.prisma.tenant.findUnique({
        where: { slug: data.slug },
      });

      if (existingSlug) {
        throw new Error('Tenant slug already exists');
      }
    }

    // Check for duplicate tenant key (if changing)
    if (data.tenantKey && data.tenantKey !== tenant.tenantKey) {
      const existingKey = await this.prisma.tenant.findUnique({
        where: { tenantKey: data.tenantKey },
      });

      if (existingKey) {
        throw new Error('Tenant key already exists');
      }
    }

    // Check for duplicate database name (if changing)
    if (data.databaseName && data.databaseName !== tenant.databaseName) {
      const existingDb = await this.prisma.tenant.findUnique({
        where: { databaseName: data.databaseName },
      });

      if (existingDb) {
        throw new Error('Database name already exists');
      }
    }

    // Update tenant
    return this.prisma.tenant.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        tenantKey: true,
        databaseName: true,
        databaseHost: true,
        isActive: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        billingStreet: true,
        billingCity: true,
        billingState: true,
        billingZip: true,
        billingCountry: true,
        billingEmail: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Delete tenant
   * WARNING: This will cascade delete all users and data associated with this tenant.
   * It does NOT delete the actual tenant database.
   */
  async delete(id: string): Promise<void> {
    // Check if tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Delete tenant (will cascade delete users, security settings, etc.)
    await this.prisma.tenant.delete({
      where: { id },
    });
  }

  /**
   * Activate/deactivate tenant
   */
  async setActive(id: string, isActive: boolean): Promise<any> {
    return this.prisma.tenant.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Get tenant statistics
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    totalUsers: number;
  }> {
    const [total, active, inactive, allTenants] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { isActive: true } }),
      this.prisma.tenant.count({ where: { isActive: false } }),
      this.prisma.tenant.findMany({
        select: {
          _count: {
            select: {
              users: true,
            },
          },
        },
      }),
    ]);

    const totalUsers = allTenants.reduce((sum, tenant) => sum + tenant._count.users, 0);

    return {
      total,
      active,
      inactive,
      totalUsers,
    };
  }
}

// Singleton instance
let tenantServiceInstance: TenantService | null = null;

/**
 * Get TenantService singleton instance
 */
export function getTenantService(): TenantService {
  if (!tenantServiceInstance) {
    tenantServiceInstance = new TenantService();
  }
  return tenantServiceInstance;
}
