/**
 * API Routes Index
 *
 * Aggregates all API routes with versioning
 */

import { Router } from 'express';
import adminRoutes from './admin.routes';
import authRoutes from './auth.routes';
import clientRoutes from './client.routes';
import compensationRoutes from './compensation.routes';
import conversationRoutes from './conversation.routes';
import healthRoutes from './health.routes';
import impersonationRoutes from './impersonation.routes';
import oauthRoutes from './oauth.routes';
import projectMemberRoutes from './project-member.routes';
import projectRoutes from './project.routes';
import taskRoutes from './task.routes';
import timeEntryRoutes from './time-entry.routes';
import twoFactorRoutes from './two-factor.routes';

// Create main API router
const apiRouter: Router = Router();

/**
 * API v1 Routes
 */
const v1Router: Router = Router();

// Mount v1 routes
v1Router.use('/health', healthRoutes);
v1Router.use('/auth', authRoutes);
v1Router.use('/oauth', oauthRoutes);
v1Router.use('/2fa', twoFactorRoutes);
v1Router.use('/admin', adminRoutes);
v1Router.use('/admin/clients', clientRoutes);
v1Router.use('/admin', compensationRoutes);
v1Router.use('/impersonate', impersonationRoutes);
v1Router.use('/projects', projectRoutes);
v1Router.use('/projects', projectMemberRoutes);
v1Router.use('/time-entries', timeEntryRoutes);
v1Router.use('/tasks', taskRoutes);
v1Router.use('/conversations', conversationRoutes);

// Future routes will be added here:
// v1Router.use('/users', usersRoutes);
// v1Router.use('/chat', chatRoutes);

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
      auth: '/api/v1/auth',
    },
  });
});

export default apiRouter;
