/**
 * Role Service
 *
 * Handles role management and user-role assignments with RBAC capability management
 */

import { getDatabaseService } from './database.service';
import type { PrismaClient as MainPrismaClient } from '../generated/prisma-main';

export interface CreateRoleData {
  name: string;
  description?: string;
  capabilityIds?: string[]; // IDs of capabilities to assign
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  capabilityIds?: string[]; // IDs of capabilities to assign (replaces existing)
}

export interface RoleFilters {
  search?: string; // Search by name or description
  hasCapability?: string; // Filter by capability name
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export class RoleService {
  private prisma: MainPrismaClient;

  constructor() {
    const databaseService = getDatabaseService();
    this.prisma = databaseService.getMainDatabase();
  }

  /**
   * Get all roles with optional filtering and pagination
   */
  async findAll(
    filters: RoleFilters = {},
    pagination: PaginationParams = {}
  ): Promise<{ roles: any[]; total: number; page: number; limit: number }> {
    const { search, hasCapability } = filters;
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (hasCapability) {
      where.capabilities = {
        some: {
          capability: {
            name: hasCapability,
          },
          isAllowed: true,
        },
      };
    }

    // Get roles and total count
    const [roles, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          isSeeded: true,
          createdAt: true,
          _count: {
            select: {
              users: true,
              capabilities: true,
            },
          },
        },
      }),
      this.prisma.role.count({ where }),
    ]);

    return {
      roles,
      total,
      page,
      limit,
    };
  }

  /**
   * Get role by ID with full capability details
   */
  async findById(id: string): Promise<any | null> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        isSeeded: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      return null;
    }

    // Get capabilities separately with allow/deny status
    const roleCapabilities = await this.prisma.roleCapability.findMany({
      where: { roleId: id },
      select: {
        id: true,
        isAllowed: true,
        capability: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        capability: {
          name: 'asc',
        },
      },
    });

    return {
      ...role,
      capabilities: roleCapabilities.map((rc) => ({
        id: rc.capability.id,
        name: rc.capability.name,
        description: rc.capability.description,
        isAllowed: rc.isAllowed,
        roleCapabilityId: rc.id,
      })),
    };
  }

  /**
   * Get role by name
   */
  async findByName(name: string): Promise<any | null> {
    return this.prisma.role.findUnique({
      where: { name },
      select: {
        id: true,
        name: true,
        description: true,
        isSeeded: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            capabilities: true,
          },
        },
      },
    });
  }

  /**
   * Create a new role
   */
  async create(data: CreateRoleData): Promise<any> {
    // Check for duplicate name
    const existingRole = await this.prisma.role.findUnique({
      where: { name: data.name },
    });

    if (existingRole) {
      throw new Error('Role name already exists');
    }

    // Create role
    const role = await this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
      },
      select: {
        id: true,
        name: true,
        description: true,
        isSeeded: true,
        createdAt: true,
      },
    });

    // Assign capabilities if provided
    if (data.capabilityIds && data.capabilityIds.length > 0) {
      await this.assignCapabilities(role.id, data.capabilityIds);
    }

    // Fetch and return complete role with capabilities
    return this.findById(role.id);
  }

  /**
   * Update role
   */
  async update(id: string, data: UpdateRoleData): Promise<any> {
    // Check if role exists
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    // Prevent modification of seeded roles' names
    if (role.isSeeded && data.name && data.name !== role.name) {
      throw new Error('Cannot modify name of seeded role');
    }

    // Check for duplicate name (if changing)
    if (data.name && data.name !== role.name) {
      const existingRole = await this.prisma.role.findUnique({
        where: { name: data.name },
      });

      if (existingRole) {
        throw new Error('Role name already exists');
      }
    }

    // Update role basic info
    await this.prisma.role.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
      },
    });

    // Update capabilities if provided
    if (data.capabilityIds !== undefined) {
      // Remove all existing non-seeded capabilities
      await this.prisma.roleCapability.deleteMany({
        where: { roleId: id, isSeeded: false },
      });

      // Add new capabilities
      if (data.capabilityIds.length > 0) {
        await this.assignCapabilities(id, data.capabilityIds);
      }
    }

    // Fetch and return complete role with capabilities
    return this.findById(id);
  }

  /**
   * Delete role
   * WARNING: Cannot delete seeded roles or roles with assigned users
   */
  async delete(id: string): Promise<void> {
    // Check if role exists
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    // Prevent deletion of seeded roles
    if (role.isSeeded) {
      throw new Error('Cannot delete seeded role');
    }

    // Prevent deletion of roles with assigned users
    if (role._count.users > 0) {
      throw new Error(`Cannot delete role with ${role._count.users} assigned user(s)`);
    }

    // Delete role (will cascade delete role capabilities)
    await this.prisma.role.delete({
      where: { id },
    });
  }

  /**
   * Assign capabilities to role
   */
  async assignCapabilities(roleId: string, capabilityIds: string[]): Promise<void> {
    // Verify role exists
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    // Verify all capabilities exist
    const capabilities = await this.prisma.capability.findMany({
      where: {
        id: {
          in: capabilityIds,
        },
      },
    });

    if (capabilities.length !== capabilityIds.length) {
      throw new Error('One or more capabilities not found');
    }

    // Create role-capability assignments
    const roleCapabilities = capabilityIds.map((capabilityId) => ({
      roleId,
      capabilityId,
      isAllowed: true,
      isSeeded: false,
    }));

    await this.prisma.roleCapability.createMany({
      data: roleCapabilities,
      skipDuplicates: true,
    });
  }

  /**
   * Remove capability from role
   */
  async removeCapability(roleId: string, capabilityId: string): Promise<void> {
    // Find the role capability
    const roleCapability = await this.prisma.roleCapability.findFirst({
      where: {
        roleId,
        capabilityId,
      },
    });

    if (!roleCapability) {
      throw new Error('Role capability assignment not found');
    }

    // Prevent removal of seeded capabilities
    if (roleCapability.isSeeded) {
      throw new Error('Cannot remove seeded capability');
    }

    // Delete the role capability
    await this.prisma.roleCapability.delete({
      where: {
        id: roleCapability.id,
      },
    });
  }

  /**
   * Toggle capability allow/deny for role
   */
  async toggleCapability(roleId: string, capabilityId: string, isAllowed: boolean): Promise<void> {
    // Find the role capability
    const roleCapability = await this.prisma.roleCapability.findFirst({
      where: {
        roleId,
        capabilityId,
      },
    });

    if (!roleCapability) {
      throw new Error('Role capability assignment not found');
    }

    // Update the allow/deny status
    await this.prisma.roleCapability.update({
      where: {
        id: roleCapability.id,
      },
      data: {
        isAllowed,
      },
    });
  }

  /**
   * Get role statistics
   */
  async getStatistics(): Promise<{
    total: number;
    seeded: number;
    custom: number;
    totalUsers: number;
  }> {
    const [total, seeded, custom, allRoles] = await Promise.all([
      this.prisma.role.count(),
      this.prisma.role.count({ where: { isSeeded: true } }),
      this.prisma.role.count({ where: { isSeeded: false } }),
      this.prisma.role.findMany({
        select: {
          _count: {
            select: {
              users: true,
            },
          },
        },
      }),
    ]);

    const totalUsers = allRoles.reduce((sum, role) => sum + role._count.users, 0);

    return {
      total,
      seeded,
      custom,
      totalUsers,
    };
  }

  /**
   * Assign role to user
   */
  async assignToUser(userId: string, roleId: string): Promise<any> {
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
  async getUserRoles(userId: string): Promise<any[]> {
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
