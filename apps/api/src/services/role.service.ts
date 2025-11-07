/**
 * Role Service
 *
 * Handles role management and user-role assignments
 */

import { PrismaClient as MainPrismaClient } from '../generated/prisma-main';
import type { Role, UserRole } from '../generated/prisma-main';

export class RoleService {
  private prisma: MainPrismaClient;

  constructor(prisma?: MainPrismaClient) {
    this.prisma = prisma || new MainPrismaClient();
  }

  /**
   * Find role by ID
   */
  async findById(id: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: { id },
      include: {
        capabilities: {
          include: {
            capability: true,
          },
        },
      },
    });
  }

  /**
   * Find role by name
   */
  async findByName(name: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: { name },
      include: {
        capabilities: {
          include: {
            capability: true,
          },
        },
      },
    });
  }

  /**
   * List all roles
   */
  async list(): Promise<Role[]> {
    return this.prisma.role.findMany({
      include: {
        capabilities: {
          include: {
            capability: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Create a new role
   */
  async create(data: { name: string; description?: string }): Promise<Role> {
    return this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
      },
      include: {
        capabilities: {
          include: {
            capability: true,
          },
        },
      },
    });
  }

  /**
   * Update a role
   */
  async update(id: string, data: { name?: string; description?: string }): Promise<Role> {
    return this.prisma.role.update({
      where: { id },
      data,
      include: {
        capabilities: {
          include: {
            capability: true,
          },
        },
      },
    });
  }

  /**
   * Delete a role
   */
  async delete(id: string): Promise<Role> {
    return this.prisma.role.delete({
      where: { id },
    });
  }

  /**
   * Assign role to user
   */
  async assignToUser(userId: string, roleId: string): Promise<UserRole> {
    // Check if assignment already exists
    const existing = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    if (existing) {
      throw new Error('User already has this role');
    }

    return this.prisma.userRole.create({
      data: {
        userId,
        roleId,
      },
      include: {
        role: {
          include: {
            capabilities: {
              include: {
                capability: true,
              },
            },
          },
        },
        user: true,
      },
    });
  }

  /**
   * Remove role from user
   */
  async removeFromUser(userId: string, roleId: string): Promise<void> {
    await this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });
  }

  /**
   * Get user's roles
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            capabilities: {
              include: {
                capability: true,
              },
            },
          },
        },
      },
    });

    return userRoles.map((ur) => ur.role);
  }

  /**
   * Get users with a specific role
   */
  async getUsersWithRole(roleId: string) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { roleId },
      include: {
        user: {
          include: {
            tenant: true,
          },
        },
      },
    });

    return userRoles.map((ur) => ur.user);
  }

  /**
   * Check if user has role
   */
  async userHasRole(userId: string, roleName: string): Promise<boolean> {
    const userRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: {
          name: roleName,
        },
      },
    });

    return userRole !== null;
  }

  /**
   * Check if user has any of the specified roles
   */
  async userHasAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
    const userRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: {
          name: {
            in: roleNames,
          },
        },
      },
    });

    return userRole !== null;
  }
}

// Singleton instance
let roleServiceInstance: RoleService | null = null;

/**
 * Get RoleService singleton instance
 */
export function getRoleService(): RoleService {
  if (!roleServiceInstance) {
    roleServiceInstance = new RoleService();
  }
  return roleServiceInstance;
}
