/**
 * Redis Service
 *
 * Manages Redis connection and provides caching functionality
 */

import Redis from 'ioredis';

let redisClient: Redis | null = null;

/**
 * Get or create Redis client instance (singleton)
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    const config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    };

    redisClient = new Redis(config);

    redisClient.on('connect', () => {
      console.log('Redis connected successfully');
    });

    redisClient.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    redisClient.on('close', () => {
      console.log('Redis connection closed');
    });
  }

  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('Redis connection closed gracefully');
  }
}

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return redisClient?.status === 'ready';
}

/**
 * Cache Service
 *
 * Provides high-level caching methods
 */
export class CacheService {
  private redis: Redis;
  private defaultTTL: number;

  constructor(ttl?: number) {
    this.redis = getRedisClient();
    this.defaultTTL = ttl || parseInt(process.env.REDIS_TTL || '3600', 10);
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Cache get error for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set(key: string, value: unknown, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const expiryTime = ttl || this.defaultTTL;

      if (expiryTime > 0) {
        await this.redis.setex(key, expiryTime, serialized);
      } else {
        await this.redis.set(key, serialized);
      }

      return true;
    } catch (error) {
      console.error(`Cache set error for key "${key}":`, error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error(`Cache delete error for key "${key}":`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;

      await this.redis.del(...keys);
      return keys.length;
    } catch (error) {
      console.error(`Cache delete pattern error for pattern "${pattern}":`, error);
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key "${key}":`, error);
      return false;
    }
  }

  /**
   * Set expiry time for a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      await this.redis.expire(key, seconds);
      return true;
    } catch (error) {
      console.error(`Cache expire error for key "${key}":`, error);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      console.error(`Cache TTL error for key "${key}":`, error);
      return -1;
    }
  }

  /**
   * Increment a counter
   */
  async increment(key: string, by: number = 1): Promise<number> {
    try {
      return await this.redis.incrby(key, by);
    } catch (error) {
      console.error(`Cache increment error for key "${key}":`, error);
      return 0;
    }
  }

  /**
   * Decrement a counter
   */
  async decrement(key: string, by: number = 1): Promise<number> {
    try {
      return await this.redis.decrby(key, by);
    } catch (error) {
      console.error(`Cache decrement error for key "${key}":`, error);
      return 0;
    }
  }

  /**
   * Get or set value (if key doesn't exist, call factory function and cache result)
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T | null> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // Call factory function to get value
      const value = await factory();

      // Store in cache
      await this.set(key, value, ttl);

      return value;
    } catch (error) {
      console.error(`Cache getOrSet error for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Clear all keys in current database
   */
  async flush(): Promise<boolean> {
    try {
      await this.redis.flushdb();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    keys: number;
    memory: string;
    hits: number;
    misses: number;
  }> {
    try {
      const info = await this.redis.info('stats');
      const keys = await this.redis.dbsize();

      // Parse stats from info string
      const hitsMatch = info.match(/keyspace_hits:(\d+)/);
      const missesMatch = info.match(/keyspace_misses:(\d+)/);

      const memoryInfo = await this.redis.info('memory');
      const memoryMatch = memoryInfo.match(/used_memory_human:([^\r\n]+)/);

      return {
        keys,
        memory: memoryMatch ? memoryMatch[1] : 'unknown',
        hits: hitsMatch ? parseInt(hitsMatch[1], 10) : 0,
        misses: missesMatch ? parseInt(missesMatch[1], 10) : 0,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        keys: 0,
        memory: 'unknown',
        hits: 0,
        misses: 0,
      };
    }
  }
}

// Export singleton instance
let cacheServiceInstance: CacheService | null = null;

export function getCacheService(): CacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new CacheService();
  }
  return cacheServiceInstance;
}
