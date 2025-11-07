/**
 * Tenant Routes
 *
 * Routes for tenant management (admin only)
 * Note: Authentication and admin role are enforced by parent admin.routes
 */

import { Router } from 'express';
import { TenantController } from '../controllers/tenant.controller';

const router = Router();
const controller = new TenantController();

/**
 * @route   GET /api/v1/admin/tenants/statistics
 * @desc    Get tenant statistics
 * @access  Admin only
 */
router.get('/statistics', controller.getStatistics.bind(controller));

/**
 * @route   GET /api/v1/admin/tenants
 * @desc    Get all tenants with optional filtering
 * @access  Admin only
 * @query   isActive - Filter by active status (boolean)
 * @query   search - Search by name, slug, or contact email
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20)
 */
router.get('/', controller.getAll.bind(controller));

/**
 * @route   GET /api/v1/admin/tenants/:id
 * @desc    Get tenant by ID
 * @access  Admin only
 */
router.get('/:id', controller.getById.bind(controller));

/**
 * @route   POST /api/v1/admin/tenants
 * @desc    Create new tenant
 * @access  Admin only
 * @body    { name, slug, tenantKey, databaseName?, databaseHost?, contactName?, contactEmail?, contactPhone?, billingStreet?, billingCity?, billingState?, billingZip?, billingCountry?, billingEmail?, isActive? }
 */
router.post('/', controller.create.bind(controller));

/**
 * @route   PUT /api/v1/admin/tenants/:id
 * @desc    Update tenant
 * @access  Admin only
 * @body    { name?, slug?, tenantKey?, databaseName?, databaseHost?, contactName?, contactEmail?, contactPhone?, billingStreet?, billingCity?, billingState?, billingZip?, billingCountry?, billingEmail?, isActive? }
 */
router.put('/:id', controller.update.bind(controller));

/**
 * @route   PATCH /api/v1/admin/tenants/:id/status
 * @desc    Activate/deactivate tenant
 * @access  Admin only
 * @body    { isActive: boolean }
 */
router.patch('/:id/status', controller.setStatus.bind(controller));

/**
 * @route   DELETE /api/v1/admin/tenants/:id
 * @desc    Delete tenant
 * @access  Admin only
 * @warning This will cascade delete all users and data associated with the tenant
 */
router.delete('/:id', controller.delete.bind(controller));

export default router;
