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
  roleIds: string[];
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
    const { name, email, adminName, adminPassword, roleIds } = data;

    // Validate email is unique
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new Error('Email already in use');
    }

    // Validate all roleIds exist
    for (const roleId of roleIds) {
      const role = await this.roleService.findById(roleId);
      if (!role) {
        throw new Error(`Role with ID ${roleId} not found`);
      }
    }

    // Generate client ID and slug
    const clientId = crypto.randomUUID();
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    const databaseName = `freetimechat_client_${slug}_${Date.now()}`;

    // Create client record in main database
    const client = await this.prisma.client.create({
      data: {
        id: clientId,
        name,
        slug,
        databaseName,
      },
    });

    try {
      // Provision client database
      const databaseUrl = await this.databaseService.provisionClientDatabase(clientId);

      // Hash admin password
      const hashedPassword = await this.passwordService.hash(adminPassword);

      // Create admin user for this client
      const adminUser = await this.userService.create({
        email,
        name: adminName,
        passwordHash: hashedPassword,
        clientId,
      });

      // Assign all selected roles to user
      for (const roleId of roleIds) {
        await this.roleService.assignToUser(adminUser.id, roleId);
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
  async update(id: string, data: { name?: string }): Promise<Client> {
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
   * Reactivate client
   */
  async reactivate(id: string): Promise<Client> {
    return this.prisma.client.update({
      where: { id },
      data: {
        isActive: true,
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
