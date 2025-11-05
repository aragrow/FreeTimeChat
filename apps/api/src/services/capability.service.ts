/**
 * Capability Service
 *
 * Handles permission/capability management and authorization
 */

import { PrismaClient as MainPrismaClient } from '../generated/prisma-main';
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
    allow: boolean = true
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

    if (existing) {
      // Update existing assignment
      return this.prisma.roleCapability.update({
        where: {
          roleId_capabilityId: {
            roleId,
            capabilityId,
          },
        },
        data: { allow },
        include: {
          role: true,
          capability: true,
        },
      });
    }

    return this.prisma.roleCapability.create({
      data: {
        roleId,
        capabilityId,
        allow,
      },
      include: {
        role: true,
        capability: true,
      },
    });
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
    // Get all user's role capabilities for this specific capability
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
      return false; // No capability assigned
    }

    // If any role explicitly denies, return false
    const hasExplicitDeny = roleCapabilities.some((rc) => !rc.allow);
    if (hasExplicitDeny) {
      return false;
    }

    // If at least one role allows and no explicit denies, return true
    return roleCapabilities.some((rc) => rc.allow);
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
  ): Promise<Array<{ capability: Capability; allow: boolean }>> {
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
    const capabilityMap = new Map<string, { capability: Capability; allow: boolean }>();

    for (const rc of roleCapabilities) {
      const existing = capabilityMap.get(rc.capability.id);

      if (!existing) {
        capabilityMap.set(rc.capability.id, {
          capability: rc.capability,
          allow: rc.allow,
        });
      } else {
        // If any role denies, set to deny
        if (!rc.allow) {
          existing.allow = false;
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
