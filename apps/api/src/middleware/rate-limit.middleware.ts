/**
 * Rate Limiting Middleware
 *
 * Redis-backed rate limiting to prevent abuse
 */

import { getRedisClient } from '../services/redis.service';
import type { NextFunction, Request, Response } from 'express';

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string; // Custom error message
  keyGenerator?: (req: Request) => string; // Custom key generator
  skip?: (req: Request) => boolean; // Skip rate limiting for certain requests
}

/**
 * Create rate limiting middleware
 *
 * Uses Redis to track request counts per key (IP, user, etc.)
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later',
    keyGenerator = defaultKeyGenerator,
    skip,
  } = options;

  const redis = getRedisClient();
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip rate limiting if skip function returns true
      if (skip && skip(req)) {
        next();
        return;
      }

      // Generate key for this request
      const key = `ratelimit:${keyGenerator(req)}`;

      // Get current count
      const current = await redis.incr(key);

      // Set expiry on first request in window
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      // Get TTL for rate limit headers
      const ttl = await redis.ttl(key);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current).toString());
      res.setHeader('X-RateLimit-Reset', (Date.now() + ttl * 1000).toString());

      // Check if limit exceeded
      if (current > maxRequests) {
        res.status(429).json({
          status: 'error',
          message,
          retryAfter: ttl,
        });
        return;
      }

      next();
    } catch (error) {
      // If Redis fails, log error but don't block request
      console.error('Rate limit middleware error:', error);
      next();
    }
  };
}

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(req: Request): string {
  // Try to get real IP from headers (in case behind proxy)
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (forwarded as string).split(',')[0].trim()
    : req.ip || req.socket.remoteAddress;

  return ip || 'unknown';
}

/**
 * Key generator that uses authenticated user ID
 */
export function userKeyGenerator(req: Request): string {
  if (req.user?.userId) {
    return `user:${req.user.sub}`;
  }
  return defaultKeyGenerator(req);
}

/**
 * Key generator that uses IP + endpoint
 */
export function endpointKeyGenerator(req: Request): string {
  const ip = defaultKeyGenerator(req);
  const endpoint = `${req.method}:${req.path}`;
  return `${ip}:${endpoint}`;
}

/**
 * Preset rate limiters for common use cases
 */

/**
 * Strict rate limiter for sensitive endpoints (e.g., login, registration)
 * 5 requests per 15 minutes
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many attempts, please try again later',
  keyGenerator: endpointKeyGenerator,
});

/**
 * Standard rate limiter for API endpoints
 * 100 requests per minute
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  keyGenerator: userKeyGenerator,
});

/**
 * Lenient rate limiter for public endpoints
 * 1000 requests per hour
 */
export const publicRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 1000,
  keyGenerator: defaultKeyGenerator,
});

/**
 * Admin endpoints rate limiter
 * 500 requests per 5 minutes
 */
export const adminRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 500,
  keyGenerator: userKeyGenerator,
  skip: (req) => {
    // Skip rate limiting for super admins if needed
    return req.user?.role === 'super_admin';
  },
});

/**
 * File upload rate limiter
 * 10 uploads per hour
 */
export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  message: 'Upload limit exceeded, please try again later',
  keyGenerator: userKeyGenerator,
});

/**
 * Get rate limit status for a key
 */
export async function getRateLimitStatus(
  key: string,
  options: RateLimitOptions
): Promise<{
  current: number;
  remaining: number;
  resetAt: Date;
}> {
  const redis = getRedisClient();
  const rateLimitKey = `ratelimit:${key}`;

  try {
    const current = parseInt((await redis.get(rateLimitKey)) || '0', 10);
    const ttl = await redis.ttl(rateLimitKey);

    return {
      current,
      remaining: Math.max(0, options.maxRequests - current),
      resetAt: new Date(Date.now() + ttl * 1000),
    };
  } catch (error) {
    console.error('Failed to get rate limit status:', error);
    return {
      current: 0,
      remaining: options.maxRequests,
      resetAt: new Date(Date.now() + options.windowMs),
    };
  }
}

/**
 * Reset rate limit for a specific key
 */
export async function resetRateLimit(key: string): Promise<boolean> {
  const redis = getRedisClient();
  const rateLimitKey = `ratelimit:${key}`;

  try {
    await redis.del(rateLimitKey);
    return true;
  } catch (error) {
    console.error('Failed to reset rate limit:', error);
    return false;
  }
}
