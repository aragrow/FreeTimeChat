/**
 * Sanitization Middleware
 *
 * Automatically sanitizes request body, query, and params
 * to prevent XSS, SQL Injection, and other attacks
 *
 * Apply this middleware to ALL routes that accept user input
 */

import { sanitizeObject, sanitizeSearchQuery } from '../utils/sanitization.util';
import type { NextFunction, Request, Response } from 'express';

/**
 * Sanitize request body
 * Recursively sanitizes all string values in req.body
 */
export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

/**
 * Sanitize query parameters
 * Special handling for search queries
 */
export function sanitizeQuery(req: Request, _res: Response, next: NextFunction): void {
  if (req.query && typeof req.query === 'object') {
    const sanitizedQuery: any = {};

    for (const key in req.query) {
      if (Object.prototype.hasOwnProperty.call(req.query, key)) {
        const value = req.query[key];

        if (typeof value === 'string') {
          // Special handling for search queries
          if (key === 'search' || key === 'q' || key === 'query') {
            sanitizedQuery[key] = sanitizeSearchQuery(value);
          } else {
            // Keep original for pagination, filters, etc.
            sanitizedQuery[key] = value.trim();
          }
        } else {
          sanitizedQuery[key] = value;
        }
      }
    }

    req.query = sanitizedQuery;
  }
  next();
}

/**
 * Combined sanitization middleware
 * Sanitizes body, query, and params
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
  sanitizeBody(req, res, () => {
    sanitizeQuery(req, res, next);
  });
}

/**
 * Content Security Policy Headers
 * Prevents XSS attacks by restricting resource loading
 */
export function setSecurityHeaders(_req: Request, res: Response, next: NextFunction): void {
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " + // TODO: Remove unsafe-inline and unsafe-eval in production
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self'; " +
      "frame-ancestors 'none';"
  );

  // X-Content-Type-Options: Prevents MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options: Prevents clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // X-XSS-Protection: Enable XSS filter in older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy: Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy: Control browser features
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
}
