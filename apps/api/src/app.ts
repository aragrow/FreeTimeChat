/**
 * Express Application Configuration
 *
 * Sets up Express app with middleware, routes, and error handling
 */

// Load environment variables first (before any imports that might use them)
import path from 'path';
import dotenv from 'dotenv';

// Explicitly specify .env file path (works regardless of where the process is run from)
dotenv.config({ path: path.join(__dirname, '../.env') });

import express from 'express';
import type { Application, Request, Response } from 'express';
import { setupMiddleware } from '@/middleware';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler.middleware';
import apiRoutes from '@/routes';

// Create Express app
export const app: Application = express();

// Setup middleware (security, parsing, compression, logging)
setupMiddleware(app);

// Root health check route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'FreeTimeChat API',
    version: '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Mount API routes
app.use('/api', apiRoutes);

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Error handler - must be last
app.use(errorHandler);
