/**
 * Express Application Configuration
 *
 * Sets up Express app with middleware, routes, and error handling
 */

import express, { Application, Request, Response } from 'express';
import { setupMiddleware } from '@/middleware';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler.middleware';

// Create Express app
export const app: Application = express();

// Setup middleware (security, parsing, compression, logging)
setupMiddleware(app);

// Health check route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'FreeTimeChat API',
    version: '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// API routes will be mounted here
// app.use('/api', apiRoutes);

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Error handler - must be last
app.use(errorHandler);
