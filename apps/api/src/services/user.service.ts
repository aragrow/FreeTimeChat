/**
 * User Service
 *
 * Handles user management operations
 */

import { PrismaClient as MainPrismaClient } from '../generated/prisma-main';
import type { User } from '../generated/prisma-main';

export class UserService {
  private prisma: MainPrismaClient;

  constructor(prisma?: MainPrismaClient) {
    this.prisma = prisma || new MainPrismaClient();
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        tenant: true,
        roles: {
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
        },
      },
    });
  }

  /**
   * Find user by email (excludes soft-deleted users)
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
      include: {
        tenant: true,
        roles: {
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
        },
      },
    });
  }

  /**
   * Find user by email including soft-deleted users
   * Use this for admin operations that need to see all users
   */
  async findByEmailIncludingDeleted(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        tenant: true,
        roles: {
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
        },
      },
    });
  }

  /**
   * Find user by Google ID
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { googleId },
      include: {
        tenant: true,
        roles: {
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
        },
      },
    });
  }

  /**
   * Create a new user
   */
  async create(data: {
    email: string;
    passwordHash?: string;
    name: string;
    tenantId: string | null;
    googleId?: string;
    requirePasswordChange?: boolean;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name,
        tenantId: data.tenantId,
        googleId: data.googleId,
        requirePasswordChange: data.requirePasswordChange,
      },
      include: {
        tenant: true,
        roles: {
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
        },
      },
    });
  }

  /**
   * Create a new user (alias for create)
   */
  async createUser(data: {
    email: string;
    passwordHash?: string;
    name: string;
    tenantId: string | null;
    googleId?: string;
    requirePasswordChange?: boolean;
  }): Promise<User> {
    return this.create(data);
  }

  /**
   * Update user information
   */
  async update(
    id: string,
    data: {
      name?: string;
      passwordHash?: string;
      googleId?: string;
      twoFactorEnabled?: boolean;
      twoFactorSecret?: string;
      isActive?: boolean;
      requirePasswordChange?: boolean;
    }
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
      include: {
        tenant: true,
        roles: {
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
        },
      },
    });
  }

  /**
   * Update user information (alias for update)
   */
  async updateUser(
    id: string,
    data: {
      name?: string;
      passwordHash?: string;
      googleId?: string;
      twoFactorEnabled?: boolean;
      twoFactorSecret?: string;
      isActive?: boolean;
      requirePasswordChange?: boolean;
    }
  ): Promise<User> {
    return this.update(id, data);
  }

  /**
   * Update last login time
   */
  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

  /**
   * Soft delete a user
   */
  async softDelete(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  /**
   * Link Google account to existing user
   */
  async linkGoogleAccount(userId: string, googleId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { googleId },
      include: {
        tenant: true,
        roles: {
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
        },
      },
    });
  }

  /**
   * Get user's primary role
   */
  async getPrimaryRole(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || user.roles.length === 0) {
      return null;
    }

    // Return the first role (you can implement priority logic here)
    return user.roles[0].role.name;
  }

  /**
   * Get all user roles
   */
  async getUserRoles(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || user.roles.length === 0) {
      return [];
    }

    // Return all role names
    return user.roles.map((userRole) => userRole.role.name);
  }

  /**
   * Check if user is active
   */
  async isActive(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true, deletedAt: true },
    });

    return user !== null && user.isActive && user.deletedAt === null;
  }
}

// Singleton instance
let userServiceInstance: UserService | null = null;

/**
 * Get UserService singleton instance
 */
export function getUserService(): UserService {
  if (!userServiceInstance) {
    userServiceInstance = new UserService();
  }
  return userServiceInstance;
}
