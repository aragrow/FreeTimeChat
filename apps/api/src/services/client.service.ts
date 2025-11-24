/**
 * Client Service
 *
 * Handles business client management for a tenant.
 * A tenant's "clients" are their customers/business clients.
 * Operates on the TENANT database (not main database).
 *
 * Architecture:
 * - Main Database: Contains tenants, users, roles
 * - Tenant Database: Contains tenant's business data (clients, projects, invoices, etc.)
 */

import crypto from 'crypto';
import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { Client } from '../generated/prisma-client';

export interface CreateClientRequest {
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

export interface CreateClientResponse {
  client: Client;
}

export class ClientService {
  private prisma: ClientPrismaClient;

  constructor(prisma: ClientPrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new business client (tenant's customer for billing)
   */
  async createClient(data: CreateClientRequest): Promise<CreateClientResponse> {
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

    // Generate client ID and slug
    const clientId = crypto.randomUUID();
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Create client record in tenant database
    const client = await this.prisma.client.create({
      data: {
        id: clientId,
        name,
        slug,
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
      client,
    };
  }

  /**
   * Find client by ID
   */
  async findById(id: string): Promise<Client | null> {
    return this.prisma.client.findUnique({
      where: { id },
    });
  }

  /**
   * Find client by name
   */
  async findByName(name: string): Promise<Client | null> {
    return this.prisma.client.findFirst({
      where: { name },
    });
  }

  /**
   * List all clients
   */
  async list(options?: {
    skip?: number;
    take?: number;
    includeInactive?: boolean;
  }): Promise<Client[]> {
    return this.prisma.client.findMany({
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
   * Count clients
   */
  async count(includeInactive: boolean = false): Promise<number> {
    return this.prisma.client.count({
      where: includeInactive
        ? {}
        : {
            isActive: true,
          },
    });
  }

  /**
   * Update client
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
  ): Promise<Client> {
    return this.prisma.client.update({
      where: { id },
      data,
    });
  }

  /**
   * Deactivate client
   */
  async deactivate(id: string): Promise<Client> {
    return this.prisma.client.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Soft delete client
   */
  async delete(id: string): Promise<Client> {
    return this.prisma.client.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  /**
   * Reactivate client
   */
  async reactivate(id: string): Promise<Client> {
    return this.prisma.client.update({
      where: { id },
      data: {
        isActive: true,
        deletedAt: null,
      },
    });
  }

  /**
   * Get client statistics
   */
  async getStats(clientId: string): Promise<{
    projectCount: number;
    activeProjectCount: number;
  }> {
    const projectCount = await this.prisma.project.count({
      where: {
        clientId,
        deletedAt: null,
      },
    });

    const activeProjectCount = await this.prisma.project.count({
      where: {
        clientId,
        isActive: true,
        deletedAt: null,
      },
    });

    return {
      projectCount,
      activeProjectCount,
    };
  }
}

/**
 * Create ClientService instance for a specific tenant database
 * Note: This service should be instantiated per-request with the tenant's database connection
 */
export function getClientService(tenantPrisma: ClientPrismaClient): ClientService {
  return new ClientService(tenantPrisma);
}
