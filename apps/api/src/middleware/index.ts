/**
 * Middleware Configuration
 *
 * Centralized middleware setup with environment-specific configuration
 */

import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import passport from 'passport';
import { sanitizeInput, setSecurityHeaders } from './sanitization.middleware';
import type { Application, RequestHandler } from 'express';

/**
 * Configure CORS middleware
 */
export function configureCors() {
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
    maxAge: 86400, // 24 hours
  });
}

/**
 * Configure Helmet security middleware
 */
export function configureHelmet() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
  });
}

/**
 * Configure Morgan logging middleware
 */
export function configureLogger() {
  const format = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

  // Custom token for response time in ms
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  morgan.token('response-time-ms', (req: any, res: any) => {
    if (!req._startAt || !res._startAt) {
      return '-';
    }
    const ms =
      (res._startAt[0] - req._startAt[0]) * 1000 + (res._startAt[1] - req._startAt[1]) / 1000000;
    return ms.toFixed(3);
  });

  return morgan(format, {
    skip: (_req, res) => {
      // Skip logging for health check in production
      return process.env.NODE_ENV === 'production' && res.statusCode < 400;
    },
  });
}

/**
 * Configure compression middleware
 */
export function configureCompression(): RequestHandler {
  return compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6, // Default compression level
  });
}

/**
 * Setup all middleware for the Express app
 */
export function setupMiddleware(app: Application): void {
  // Security Headers
  app.use(setSecurityHeaders);
  app.use(configureHelmet());
  app.use(configureCors());

  // Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Input Sanitization (CRITICAL: Prevents XSS, SQL Injection)
  app.use(sanitizeInput);

  // Compression
  app.use(configureCompression());

  // Logging
  app.use(configureLogger());

  // Passport (OAuth)
  app.use(passport.initialize());

  // Trust proxy (for rate limiting and IP detection)
  app.set('trust proxy', 1);
}
