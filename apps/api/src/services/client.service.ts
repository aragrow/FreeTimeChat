/**
 * Client Service
 *
 * Handles client (tenant) management operations
 */

import crypto from 'crypto';
import { PrismaClient as MainPrismaClient } from '../generated/prisma-main';
import { getDatabaseService } from './database.service';
import { getPasswordService } from './password.service';
import { getRoleService } from './role.service';
import { getUserService } from './user.service';
import type { Client } from '../generated/prisma-main';

export interface CreateClientRequest {
  name: string;
  email: string;
  adminName: string;
  adminPassword: string;
}

export interface CreateClientResponse {
  client: Client;
  adminUser: {
    id: string;
    email: string;
    name: string;
  };
  databaseUrl: string;
}

export class ClientService {
  private prisma: MainPrismaClient;
  private databaseService: ReturnType<typeof getDatabaseService>;
  private userService: ReturnType<typeof getUserService>;
  private roleService: ReturnType<typeof getRoleService>;
  private passwordService: ReturnType<typeof getPasswordService>;

  constructor() {
    this.prisma = new MainPrismaClient();
    this.databaseService = getDatabaseService();
    this.userService = getUserService();
    this.roleService = getRoleService();
    this.passwordService = getPasswordService();
  }

  /**
   * Create a new client (tenant) with database and admin user
   */
  async createClient(data: CreateClientRequest): Promise<CreateClientResponse> {
    const { name, email, adminName, adminPassword } = data;

    // Validate email is unique
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new Error('Email already in use');
    }

    // Generate client ID
    const clientId = crypto.randomUUID();

    // Create client record in main database
    const client = await this.prisma.client.create({
      data: {
        id: clientId,
        name,
      },
    });

    try {
      // Provision client database
      const databaseUrl = await this.databaseService.provisionClientDatabase(clientId);

      // Hash admin password
      const hashedPassword = await this.passwordService.hashPassword(adminPassword);

      // Create admin user for this client
      const adminUser = await this.userService.create({
        email,
        name: adminName,
        passwordHash: hashedPassword,
        clientId,
        emailVerified: true, // Auto-verify admin email
      });

      // Assign admin role to user
      const adminRole = await this.roleService.findByName('admin');
      if (adminRole) {
        await this.roleService.assignRole(adminUser.id, adminRole.id);
      }

      return {
        client,
        adminUser: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
        },
        databaseUrl,
      };
    } catch (error) {
      // Rollback: Delete client if database provisioning or user creation fails
      await this.prisma.client.delete({
        where: { id: clientId },
      });

      throw new Error(
        `Failed to create client: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
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
    includeDeleted?: boolean;
  }): Promise<Client[]> {
    return this.prisma.client.findMany({
      where: {
        deletedAt: options?.includeDeleted ? undefined : null,
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
  async count(includeDeleted: boolean = false): Promise<number> {
    return this.prisma.client.count({
      where: {
        deletedAt: includeDeleted ? undefined : null,
      },
    });
  }

  /**
   * Update client
   */
  async update(id: string, data: { name?: string }): Promise<Client> {
    return this.prisma.client.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft delete client
   */
  async softDelete(id: string): Promise<Client> {
    return this.prisma.client.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Permanently delete client and its database
   * WARNING: This permanently deletes all client data
   */
  async permanentDelete(id: string): Promise<void> {
    // Delete client database
    await this.databaseService.deleteClientDatabase(id);

    // Delete client record
    await this.prisma.client.delete({
      where: { id },
    });
  }

  /**
   * Restore soft-deleted client
   */
  async restore(id: string): Promise<Client> {
    return this.prisma.client.update({
      where: { id },
      data: {
        deletedAt: null,
      },
    });
  }

  /**
   * Get client statistics
   */
  async getStats(clientId: string): Promise<{
    userCount: number;
    activeUserCount: number;
    databaseSize?: string;
  }> {
    const userCount = await this.prisma.user.count({
      where: {
        clientId,
        deletedAt: null,
      },
    });

    const activeUserCount = await this.prisma.user.count({
      where: {
        clientId,
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
let clientServiceInstance: ClientService | null = null;

/**
 * Get ClientService singleton instance
 */
export function getClientService(): ClientService {
  if (!clientServiceInstance) {
    clientServiceInstance = new ClientService();
  }
  return clientServiceInstance;
}
