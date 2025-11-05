/**
 * API Routes Index
 *
 * Aggregates all API routes with versioning
 */

import { Router } from 'express';
import healthRoutes from './health.routes';

// Create main API router
const apiRouter: Router = Router();

/**
 * API v1 Routes
 */
const v1Router: Router = Router();

// Mount v1 routes
v1Router.use('/health', healthRoutes);

// Future routes will be added here:
// v1Router.use('/auth', authRoutes);
// v1Router.use('/users', usersRoutes);
// v1Router.use('/projects', projectsRoutes);
// v1Router.use('/time-entries', timeEntriesRoutes);
// v1Router.use('/chat', chatRoutes);
// v1Router.use('/admin', adminRoutes);

// Mount v1 router under /api/v1
apiRouter.use('/v1', v1Router);

// Default redirect from /api to /api/v1
apiRouter.get('/', (_req, res) => {
  res.json({
    status: 'success',
    message: 'FreeTimeChat API',
    version: 'v1',
    endpoints: {
      health: '/api/v1/health',
      healthDetailed: '/api/v1/health/detailed',
    },
  });
});

export default apiRouter;
