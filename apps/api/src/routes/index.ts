/**
 * API Routes Index
 *
 * Aggregates all API routes with versioning
 */

import { Router } from 'express';
import accountRequestRoutes from './account-request.routes';
import adminRoutes from './admin.routes';
import authRoutes from './auth.routes';
import chatRoutes from './chat.routes';
import clientsRoutes from './clients.routes';
import compensationRoutes from './compensation.routes';
import conversationRoutes from './conversation.routes';
import healthRoutes from './health.routes';
import impersonationRoutes from './impersonation.routes';
import oauthRoutes from './oauth.routes';
import projectMemberRoutes from './project-member.routes';
import projectRoutes from './project.routes';
import reportRoutes from './report.routes';
import securitySettingsRoutes from './security-settings.routes';
import taskRoutes from './task.routes';
import timeEntryRoutes from './time-entry.routes';
import twoFactorRoutes from './two-factor.routes';
import userProfileRoutes from './user/profile.routes';
import userSecurityRoutes from './user/security.routes';

// Create main API router
const apiRouter: Router = Router();

/**
 * API v1 Routes
 */
const v1Router: Router = Router();

// Mount v1 routes
v1Router.use('/health', healthRoutes);
v1Router.use('/account-requests', accountRequestRoutes); // Public route for requesting account access
v1Router.use('/auth', authRoutes);
v1Router.use('/oauth', oauthRoutes);
v1Router.use('/2fa', twoFactorRoutes);

// Admin routes (includes users, roles, clients, capabilities, stats)
v1Router.use('/admin', adminRoutes);

// Legacy routes - kept for backward compatibility
// Note: These may be deprecated in future versions in favor of the new admin routes structure
v1Router.use('/admin', compensationRoutes);
v1Router.use('/admin/security-settings', securitySettingsRoutes);

// Impersonation routes
v1Router.use('/impersonate', impersonationRoutes);

// Application routes
v1Router.use('/clients', clientsRoutes);
v1Router.use('/projects', projectRoutes);
v1Router.use('/projects', projectMemberRoutes);
v1Router.use('/time-entries', timeEntryRoutes);
v1Router.use('/tasks', taskRoutes);
v1Router.use('/conversations', conversationRoutes);
v1Router.use('/chat', chatRoutes);
v1Router.use('/reports', reportRoutes);

// User profile and security routes
v1Router.use('/user/profile', userProfileRoutes);
v1Router.use('/user/security', userSecurityRoutes);

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
