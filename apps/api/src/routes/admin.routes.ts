/**
 * Admin Routes
 *
 * Main admin router that combines all admin sub-routes
 * All routes require authentication and admin role
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import { attachClientDatabase } from '../middleware/client-database.middleware';
import { requireAnyRole } from '../middleware/permission.middleware';
import accountRequestsRoutes from './admin/account-requests.routes';
import capabilitiesRoutes from './admin/capabilities.routes';
import clientsRoutes from './admin/clients.routes';
import integrationTemplatesRoutes from './admin/integration-templates.routes';
import invoicesRoutes from './admin/invoices.routes';
import llmConfigRoutes from './admin/llm-config.routes';
import paypalConfigRoutes from './admin/paypal-config.routes';
import paypalIntegrationRoutes from './admin/paypal-integration.routes';
import projectMembersRoutes from './admin/project-members.routes';
import projectsRoutes from './admin/projects.routes';
import reportsRoutes from './admin/reports.routes';
import rolesRoutes from './admin/roles.routes';
import statsRoutes from './admin/stats.routes';
import systemSettingsRoutes from './admin/system-settings.routes';
import tasksRoutes from './admin/tasks.routes';
import timeEntriesRoutes from './admin/time-entries.routes';
import usersRoutes from './admin/users.routes';
import tenantRoutes from './tenant.routes';

const router = Router();

// All admin routes require authentication and admin or tenantadmin role
router.use(authenticateJWT);
router.use(requireAnyRole(['admin', 'tenantadmin']));

// Mount admin sub-routes that DON'T need tenant database
router.use('/account-requests', accountRequestsRoutes);
router.use('/users', usersRoutes);
router.use('/roles', rolesRoutes);
router.use('/capabilities', capabilitiesRoutes);
router.use('/integration-templates', integrationTemplatesRoutes);
router.use('/llm-config', llmConfigRoutes);
router.use('/paypal-integration', paypalIntegrationRoutes);
router.use('/stats', statsRoutes);
router.use('/tenants', tenantRoutes);
router.use('/system-settings', systemSettingsRoutes);

// Mount admin sub-routes that NEED tenant database (attach middleware first)
router.use('/clients', attachClientDatabase, clientsRoutes);
router.use('/invoices', attachClientDatabase, invoicesRoutes);
router.use('/paypal-config', attachClientDatabase, paypalConfigRoutes);
router.use('/projects', attachClientDatabase, projectsRoutes);
router.use('/project-members', attachClientDatabase, projectMembersRoutes);
router.use('/reports', attachClientDatabase, reportsRoutes);
router.use('/tasks', attachClientDatabase, tasksRoutes);
router.use('/time-entries', attachClientDatabase, timeEntriesRoutes);

// Admin dashboard root endpoint
router.get('/', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Admin API',
    endpoints: {
      accountRequests: '/api/v1/admin/account-requests',
      users: '/api/v1/admin/users',
      roles: '/api/v1/admin/roles',
      capabilities: '/api/v1/admin/capabilities',
      clients: '/api/v1/admin/clients',
      integrationTemplates: '/api/v1/admin/integration-templates',
      invoices: '/api/v1/admin/invoices',
      llmConfig: '/api/v1/admin/llm-config',
      paypalIntegration: '/api/v1/admin/paypal-integration',
      paypalConfig: '/api/v1/admin/paypal-config',
      projects: '/api/v1/admin/projects',
      projectMembers: '/api/v1/admin/project-members',
      reports: '/api/v1/admin/reports',
      stats: '/api/v1/admin/stats',
      tasks: '/api/v1/admin/tasks',
      tenants: '/api/v1/admin/tenants',
      timeEntries: '/api/v1/admin/time-entries',
    },
  });
});

export default router;
