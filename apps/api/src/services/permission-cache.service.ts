/**
 * Permission Cache Service
 *
 * Caches user permissions and capabilities to reduce database queries
 */

import { getCacheService } from './redis.service';
import type { CacheService } from './redis.service';

interface UserPermissions {
  userId: string;
  capabilities: string[];
  roles: string[];
  lastUpdated: string;
}

export class PermissionCacheService {
  private cache: CacheService;
  private readonly CACHE_PREFIX = 'permissions';
  private readonly CACHE_TTL = 900; // 15 minutes

  constructor() {
    this.cache = getCacheService();
  }

  /**
   * Generate cache key for user permissions
   */
  private getUserPermissionKey(userId: string): string {
    return `${this.CACHE_PREFIX}:user:${userId}`;
  }

  /**
   * Get user permissions from cache
   */
  async getUserPermissions(userId: string): Promise<UserPermissions | null> {
    const key = this.getUserPermissionKey(userId);
    return await this.cache.get<UserPermissions>(key);
  }

  /**
   * Set user permissions in cache
   */
  async setUserPermissions(permissions: UserPermissions): Promise<boolean> {
    const key = this.getUserPermissionKey(permissions.userId);
    return await this.cache.set(key, permissions, this.CACHE_TTL);
  }

  /**
   * Invalidate user permissions cache
   */
  async invalidateUserPermissions(userId: string): Promise<boolean> {
    const key = this.getUserPermissionKey(userId);
    return await this.cache.delete(key);
  }

  /**
   * Invalidate all permission caches matching pattern
   */
  async invalidateAll(): Promise<number> {
    return await this.cache.deletePattern(`${this.CACHE_PREFIX}:*`);
  }

  /**
   * Check if user has a specific capability (cached)
   */
  async hasCapability(userId: string, capability: string): Promise<boolean | null> {
    const permissions = await this.getUserPermissions(userId);
    if (!permissions) return null; // Cache miss

    return permissions.capabilities.includes(capability);
  }

  /**
   * Check if user has a specific role (cached)
   */
  async hasRole(userId: string, role: string): Promise<boolean | null> {
    const permissions = await this.getUserPermissions(userId);
    if (!permissions) return null; // Cache miss

    return permissions.roles.includes(role);
  }

  /**
   * Cache user permissions with allow/deny logic
   */
  async cacheUserPermissions(
    userId: string,
    capabilities: Array<{ capability: string; isAllowed: boolean }>,
    roles: string[]
  ): Promise<boolean> {
    // Filter out denied capabilities, keep only allowed ones
    const allowedCapabilities = capabilities.filter((c) => c.isAllowed).map((c) => c.capability);

    const permissions: UserPermissions = {
      userId,
      capabilities: allowedCapabilities,
      roles,
      lastUpdated: new Date().toISOString(),
    };

    return await this.setUserPermissions(permissions);
  }

  /**
   * Get cache statistics for permissions
   */
  async getStats(): Promise<{
    totalCachedUsers: number;
    cacheHitRate?: number;
  }> {
    try {
      const allStats = await this.cache.getStats();
      // Count permission keys
      const redis = this.cache['redis']; // Access private redis instance
      const permissionKeys = await redis.keys(`${this.CACHE_PREFIX}:*`);

      return {
        totalCachedUsers: permissionKeys.length,
        cacheHitRate:
          allStats.hits + allStats.misses > 0
            ? (allStats.hits / (allStats.hits + allStats.misses)) * 100
            : undefined,
      };
    } catch (error) {
      console.error('Failed to get permission cache stats:', error);
      return {
        totalCachedUsers: 0,
      };
    }
  }
}

// Export singleton instance
let permissionCacheInstance: PermissionCacheService | null = null;

export function getPermissionCacheService(): PermissionCacheService {
  if (!permissionCacheInstance) {
    permissionCacheInstance = new PermissionCacheService();
  }
  return permissionCacheInstance;
}
