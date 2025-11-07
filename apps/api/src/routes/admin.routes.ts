/**
 * Admin Routes
 *
 * Main admin router that combines all admin sub-routes
 * All routes require authentication and admin role
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/permission.middleware';
import capabilitiesRoutes from './admin/capabilities.routes';
import clientsRoutes from './admin/clients.routes';
import rolesRoutes from './admin/roles.routes';
import statsRoutes from './admin/stats.routes';
import usersRoutes from './admin/users.routes';
import tenantRoutes from './tenant.routes';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticateJWT);
router.use(requireRole('admin'));

// Mount admin sub-routes
router.use('/users', usersRoutes);
router.use('/roles', rolesRoutes);
router.use('/clients', clientsRoutes);
router.use('/capabilities', capabilitiesRoutes);
router.use('/stats', statsRoutes);
router.use('/tenants', tenantRoutes);

// Admin dashboard root endpoint
router.get('/', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Admin API',
    endpoints: {
      users: '/api/v1/admin/users',
      roles: '/api/v1/admin/roles',
      clients: '/api/v1/admin/clients',
      tenants: '/api/v1/admin/tenants',
      capabilities: '/api/v1/admin/capabilities',
      stats: '/api/v1/admin/stats',
    },
  });
});

export default router;
