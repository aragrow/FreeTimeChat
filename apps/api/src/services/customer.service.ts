/**
 * Customer Service
 *
 * Handles customer (tenant) management operations
 */

import crypto from 'crypto';
import { PrismaClient as MainPrismaClient } from '../generated/prisma-main';
import { getDatabaseService } from './database.service';
import type { Customer } from '../generated/prisma-main';

export interface CreateCustomerRequest {
  name: string;
  hourlyRate?: number;
  discountPercentage?: number;
  // Contact Information
  email?: string;
  phone?: string;
  website?: string;
  contactPerson?: string;
  // Billing Address
  billingAddressLine1?: string;
  billingAddressLine2?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
  // Invoice Numbering
  invoicePrefix?: string;
  invoiceNextNumber?: number;
  invoiceNumberPadding?: number;
}

export interface CreateCustomerResponse {
  customer: Customer;
}

export class CustomerService {
  private prisma: MainPrismaClient;
  private databaseService: ReturnType<typeof getDatabaseService>;

  constructor() {
    this.prisma = new MainPrismaClient();
    this.databaseService = getDatabaseService();
  }

  /**
   * Generate a unique tenant key
   * Format: CUST-XXXX where XXXX is a random alphanumeric string
   */
  private async generateCustomerKey(): Promise<string> {
    const prefix = 'CUST';
    let tenantKey: string;
    let exists = true;

    // Keep generating until we find a unique key
    while (exists) {
      const randomPart = crypto.randomBytes(2).toString('hex').toUpperCase();
      tenantKey = `${prefix}-${randomPart}`;

      const existing = await this.prisma.tenant.findUnique({
        where: { tenantKey },
      });
      exists = !!existing;
    }

    return tenantKey!;
  }

  /**
   * Create a new customer (billing/organization entity)
   * Note: This creates the customer record only. Database provisioning can be done separately if needed.
   */
  async createCustomer(data: CreateCustomerRequest): Promise<CreateCustomerResponse> {
    const {
      name,
      hourlyRate,
      discountPercentage,
      email,
      phone,
      website,
      contactPerson,
      billingAddressLine1,
      billingAddressLine2,
      billingCity,
      billingState,
      billingPostalCode,
      billingCountry,
      invoicePrefix,
      invoiceNextNumber,
      invoiceNumberPadding,
    } = data;

    // Generate customer ID, slug, and unique tenant key
    const tenantId = crypto.randomUUID();
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    const tenantKey = await this.generateCustomerKey();

    // Create customer record in main database (without database provisioning)
    const customer = await this.prisma.tenant.create({
      data: {
        id: tenantId,
        name,
        slug,
        tenantKey,
        hourlyRate,
        discountPercentage: discountPercentage ?? 0,
        email,
        phone,
        website,
        contactPerson,
        billingAddressLine1,
        billingAddressLine2,
        billingCity,
        billingState,
        billingPostalCode,
        billingCountry,
        invoicePrefix,
        invoiceNextNumber: invoiceNextNumber ?? 1,
        invoiceNumberPadding: invoiceNumberPadding ?? 5,
      },
    });

    return {
      customer,
    };
  }

  /**
   * Find customer by ID
   */
  async findById(id: string): Promise<Customer | null> {
    return this.prisma.tenant.findUnique({
      where: { id },
    });
  }

  /**
   * Find customer by name
   */
  async findByName(name: string): Promise<Customer | null> {
    return this.prisma.tenant.findFirst({
      where: { name },
    });
  }

  /**
   * Find customer by tenantKey
   */
  async findByCustomerKey(tenantKey: string): Promise<Customer | null> {
    return this.prisma.tenant.findUnique({
      where: { tenantKey },
    });
  }

  /**
   * List all customers
   */
  async list(options?: {
    skip?: number;
    take?: number;
    includeInactive?: boolean;
  }): Promise<Customer[]> {
    return this.prisma.tenant.findMany({
      where: options?.includeInactive
        ? {}
        : {
            isActive: true,
          },
      skip: options?.skip,
      take: options?.take,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Count customers
   */
  async count(includeInactive: boolean = false): Promise<number> {
    return this.prisma.tenant.count({
      where: includeInactive
        ? {}
        : {
            isActive: true,
          },
    });
  }

  /**
   * Update customer
   */
  async update(
    id: string,
    data: {
      name?: string;
      hourlyRate?: number;
      discountPercentage?: number;
      email?: string;
      phone?: string;
      website?: string;
      contactPerson?: string;
      billingAddressLine1?: string;
      billingAddressLine2?: string;
      billingCity?: string;
      billingState?: string;
      billingPostalCode?: string;
      billingCountry?: string;
      invoicePrefix?: string;
      invoiceNextNumber?: number;
      invoiceNumberPadding?: number;
    }
  ): Promise<Customer> {
    return this.prisma.tenant.update({
      where: { id },
      data,
    });
  }

  /**
   * Deactivate customer
   */
  async deactivate(id: string): Promise<Customer> {
    return this.prisma.tenant.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Permanently delete customer and its database
   * WARNING: This permanently deletes all customer data
   */
  async permanentDelete(id: string): Promise<void> {
    // Delete customer database
    await this.databaseService.deleteCustomerDatabase(id);

    // Delete customer record
    await this.prisma.tenant.delete({
      where: { id },
    });
  }

  /**
   * Reactivate customer
   */
  async reactivate(id: string): Promise<Customer> {
    return this.prisma.tenant.update({
      where: { id },
      data: {
        isActive: true,
      },
    });
  }

  /**
   * Get customer statistics
   */
  async getStats(tenantId: string): Promise<{
    userCount: number;
    activeUserCount: number;
    databaseSize?: string;
  }> {
    const userCount = await this.prisma.user.count({
      where: {
        tenantId,
        deletedAt: null,
      },
    });

    const activeUserCount = await this.prisma.user.count({
      where: {
        tenantId,
        deletedAt: null,
        lastLoginAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    });

    return {
      userCount,
      activeUserCount,
    };
  }
}

// Singleton instance
let customerServiceInstance: CustomerService | null = null;

/**
 * Get CustomerService singleton instance
 */
export function getCustomerService(): CustomerService {
  if (!customerServiceInstance) {
    customerServiceInstance = new CustomerService();
  }
  return customerServiceInstance;
}
