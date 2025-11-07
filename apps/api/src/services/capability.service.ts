/**
 * Capability Service
 *
 * Handles permission/capability management and authorization
 */

import { PrismaClient as MainPrismaClient } from '../generated/prisma-main';
import { getPermissionCacheService } from './permission-cache.service';
import type { Capability, RoleCapability } from '../generated/prisma-main';

export class CapabilityService {
  private prisma: MainPrismaClient;

  constructor(prisma?: MainPrismaClient) {
    this.prisma = prisma || new MainPrismaClient();
  }

  /**
   * Find capability by ID
   */
  async findById(id: string): Promise<Capability | null> {
    return this.prisma.capability.findUnique({
      where: { id },
    });
  }

  /**
   * Find capability by name
   */
  async findByName(name: string): Promise<Capability | null> {
    return this.prisma.capability.findUnique({
      where: { name },
    });
  }

  /**
   * List all capabilities
   */
  async list(): Promise<Capability[]> {
    return this.prisma.capability.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Alias for list() - used by tests
   */
  async getAll(): Promise<Capability[]> {
    return this.list();
  }

  /**
   * Alias for findByName() - used by tests
   */
  async getByName(name: string): Promise<Capability | null> {
    return this.findByName(name);
  }

  /**
   * Create a new capability
   */
  async create(data: { name: string; description?: string }): Promise<Capability> {
    return this.prisma.capability.create({
      data: {
        name: data.name,
        description: data.description,
      },
    });
  }

  /**
   * Update a capability
   */
  async update(id: string, data: { name?: string; description?: string }): Promise<Capability> {
    return this.prisma.capability.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a capability
   */
  async delete(id: string): Promise<Capability> {
    return this.prisma.capability.delete({
      where: { id },
    });
  }

  /**
   * Assign capability to role
   */
  async assignToRole(
    roleId: string,
    capabilityId: string,
    isAllowed: boolean = true
  ): Promise<RoleCapability> {
    // Check if assignment already exists
    const existing = await this.prisma.roleCapability.findUnique({
      where: {
        roleId_capabilityId: {
          roleId,
          capabilityId,
        },
      },
    });

    let result: RoleCapability;

    if (existing) {
      // Update existing assignment
      result = await this.prisma.roleCapability.update({
        where: {
          roleId_capabilityId: {
            roleId,
            capabilityId,
          },
        },
        data: { isAllowed },
        include: {
          role: true,
          capability: true,
        },
      });
    } else {
      result = await this.prisma.roleCapability.create({
        data: {
          roleId,
          capabilityId,
          isAllowed,
        },
        include: {
          role: true,
          capability: true,
        },
      });
    }

    // Invalidate cache for all users with this role
    await this.invalidateRoleCache(roleId);

    return result;
  }

  /**
   * Remove capability from role
   */
  async removeFromRole(roleId: string, capabilityId: string): Promise<void> {
    await this.prisma.roleCapability.delete({
      where: {
        roleId_capabilityId: {
          roleId,
          capabilityId,
        },
      },
    });

    // Invalidate cache for all users with this role
    await this.invalidateRoleCache(roleId);
  }

  /**
   * Invalidate permission cache for all users with a specific role
   */
  private async invalidateRoleCache(_roleId: string): Promise<void> {
    try {
      const permissionCache = getPermissionCacheService();
      // Invalidate all permissions since role capabilities changed
      await permissionCache.invalidateAll();
    } catch (error) {
      console.error('Error invalidating role cache:', error);
      // Don't throw - cache invalidation failure shouldn't break the operation
    }
  }

  /**
   * Get role's capabilities
   */
  async getRoleCapabilities(roleId: string): Promise<RoleCapability[]> {
    return this.prisma.roleCapability.findMany({
      where: { roleId },
      include: {
        capability: true,
        role: true,
      },
    });
  }

  /**
   * Check if user has a specific capability
   * Supports explicit deny: if any role denies a capability, it's denied
   */
  async userHasCapability(userId: string, capabilityName: string): Promise<boolean> {
    try {
      // Try to get from cache first
      const permissionCache = getPermissionCacheService();
      const cachedResult = await permissionCache.hasCapability(userId, capabilityName);

      if (cachedResult !== null) {
        // Cache hit
        return cachedResult;
      }

      // Cache miss - fetch from database
      const roleCapabilities = await this.prisma.roleCapability.findMany({
        where: {
          role: {
            users: {
              some: {
                userId,
              },
            },
          },
          capability: {
            name: capabilityName,
          },
        },
        include: {
          capability: true,
          role: true,
        },
      });

      if (roleCapabilities.length === 0) {
        // Cache the result (no capabilities)
        await this.cacheUserPermissions(userId);
        return false; // No capability assigned
      }

      // If any role explicitly denies, return false
      const hasExplicitDeny = roleCapabilities.some((rc) => !rc.isAllowed);
      if (hasExplicitDeny) {
        // Cache the result
        await this.cacheUserPermissions(userId);
        return false;
      }

      // If at least one role allows and no explicit denies, return true
      const hasCapability = roleCapabilities.some((rc) => rc.isAllowed);

      // Cache the result
      await this.cacheUserPermissions(userId);

      return hasCapability;
    } catch (error) {
      // If caching fails, fall back to database-only check
      console.error('Error in userHasCapability (falling back to DB):', error);

      const roleCapabilities = await this.prisma.roleCapability.findMany({
        where: {
          role: {
            users: {
              some: {
                userId,
              },
            },
          },
          capability: {
            name: capabilityName,
          },
        },
      });

      if (roleCapabilities.length === 0) {
        return false;
      }

      const hasExplicitDeny = roleCapabilities.some((rc) => !rc.isAllowed);
      if (hasExplicitDeny) {
        return false;
      }

      return roleCapabilities.some((rc) => rc.isAllowed);
    }
  }

  /**
   * Cache user permissions for future use
   * Helper method to populate the permission cache
   */
  private async cacheUserPermissions(userId: string): Promise<void> {
    try {
      const capabilities = await this.getUserCapabilities(userId);
      const roles = await this.prisma.userRole.findMany({
        where: { userId },
        include: { role: true },
      });

      const permissionCache = getPermissionCacheService();
      await permissionCache.cacheUserPermissions(
        userId,
        capabilities.map((c) => ({
          capability: c.capability.name,
          isAllowed: c.isAllowed,
        })),
        roles.map((r) => r.role.name)
      );
    } catch (error) {
      console.error('Error caching user permissions:', error);
      // Don't throw - caching failure shouldn't break permission checks
    }
  }

  /**
   * Check if roles have permission for a capability (by capability ID)
   * Used by tests - checks role-capability assignments directly
   */
  async checkPermission(roleIds: string[], capabilityId: string): Promise<boolean> {
    const roleCapabilities = await this.prisma.roleCapability.findMany({
      where: {
        roleId: { in: roleIds },
        capabilityId,
      },
    });

    if (roleCapabilities.length === 0) {
      return false; // No capability assigned
    }

    // If any role explicitly denies, return false
    const hasExplicitDeny = roleCapabilities.some((rc) => !rc.isAllowed);
    if (hasExplicitDeny) {
      return false;
    }

    // If at least one role allows and no explicit denies, return true
    return roleCapabilities.some((rc) => rc.isAllowed);
  }

  /**
   * Check if user has any of the specified capabilities
   */
  async userHasAnyCapability(userId: string, capabilityNames: string[]): Promise<boolean> {
    for (const capabilityName of capabilityNames) {
      if (await this.userHasCapability(userId, capabilityName)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has all of the specified capabilities
   */
  async userHasAllCapabilities(userId: string, capabilityNames: string[]): Promise<boolean> {
    for (const capabilityName of capabilityNames) {
      if (!(await this.userHasCapability(userId, capabilityName))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get all capabilities for a user (across all their roles)
   */
  async getUserCapabilities(
    userId: string
  ): Promise<Array<{ capability: Capability; isAllowed: boolean }>> {
    const roleCapabilities = await this.prisma.roleCapability.findMany({
      where: {
        role: {
          users: {
            some: {
              userId,
            },
          },
        },
      },
      include: {
        capability: true,
      },
    });

    // Group by capability and apply explicit deny logic
    const capabilityMap = new Map<string, { capability: Capability; isAllowed: boolean }>();

    for (const rc of roleCapabilities) {
      const existing = capabilityMap.get(rc.capability.id);

      if (!existing) {
        capabilityMap.set(rc.capability.id, {
          capability: rc.capability,
          isAllowed: rc.isAllowed,
        });
      } else {
        // If any role denies, set to deny
        if (!rc.isAllowed) {
          existing.isAllowed = false;
        }
      }
    }

    return Array.from(capabilityMap.values());
  }
}

// Singleton instance
let capabilityServiceInstance: CapabilityService | null = null;

/**
 * Get CapabilityService singleton instance
 */
export function getCapabilityService(): CapabilityService {
  if (!capabilityServiceInstance) {
    capabilityServiceInstance = new CapabilityService();
  }
  return capabilityServiceInstance;
}
