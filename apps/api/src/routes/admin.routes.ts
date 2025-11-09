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
import capabilitiesRoutes from './admin/capabilities.routes';
import clientsRoutes from './admin/clients.routes';
import projectMembersRoutes from './admin/project-members.routes';
import projectsRoutes from './admin/projects.routes';
import rolesRoutes from './admin/roles.routes';
import statsRoutes from './admin/stats.routes';
import systemSettingsRoutes from './admin/system-settings.routes';
import timeEntriesRoutes from './admin/time-entries.routes';
import usersRoutes from './admin/users.routes';
import tenantRoutes from './tenant.routes';

const router = Router();

// All admin routes require authentication and admin or tenantadmin role
router.use(authenticateJWT);
router.use(requireAnyRole(['admin', 'tenantadmin']));

// Mount admin sub-routes that DON'T need tenant database
router.use('/users', usersRoutes);
router.use('/roles', rolesRoutes);
router.use('/capabilities', capabilitiesRoutes);
router.use('/stats', statsRoutes);
router.use('/tenants', tenantRoutes);
router.use('/system-settings', systemSettingsRoutes);

// Mount admin sub-routes that NEED tenant database (attach middleware first)
router.use('/clients', attachClientDatabase, clientsRoutes);
router.use('/projects', attachClientDatabase, projectsRoutes);
router.use('/project-members', attachClientDatabase, projectMembersRoutes);
router.use('/time-entries', attachClientDatabase, timeEntriesRoutes);

// Admin dashboard root endpoint
router.get('/', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Admin API',
    endpoints: {
      users: '/api/v1/admin/users',
      roles: '/api/v1/admin/roles',
      clients: '/api/v1/admin/clients',
      projects: '/api/v1/admin/projects',
      projectMembers: '/api/v1/admin/project-members',
      timeEntries: '/api/v1/admin/time-entries',
      tenants: '/api/v1/admin/tenants',
      capabilities: '/api/v1/admin/capabilities',
      stats: '/api/v1/admin/stats',
    },
  });
});

export default router;
