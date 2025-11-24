/**
 * Admin Projects Routes
 *
 * Admin-specific project management endpoints
 * Requires admin or tenantadmin role
 */

import { Router } from 'express';
import { attachTenantDatabase } from '../../middleware/tenant-database.middleware';
import { validate } from '../../middleware/validation.middleware';
import { ProjectService } from '../../services/project.service';
import {
  createProjectSchema,
  deleteProjectSchema,
  getProjectByIdSchema,
  listProjectsSchema,
  updateProjectSchema,
} from '../../validation/project.validation';
import type { PrismaClient as ClientPrismaClient } from '../../generated/prisma-client';
import type { Request, Response } from 'express';

const router = Router();

// All routes require client database
router.use(attachTenantDatabase);

/**
 * POST /api/v1/admin/projects
 * Create a new project
 */
router.post('/', validate(createProjectSchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { name, description, clientId, isBillableProject, defaultBillable } = req.body;

    if (!name) {
      res.status(400).json({ status: 'error', message: 'Project name is required' });
      return;
    }

    const projectService = new ProjectService(req.tenantDb as ClientPrismaClient);
    const project = await projectService.create({
      name,
      description,
      clientId: clientId && clientId.trim() !== '' ? clientId : '',
      isBillableProject: isBillableProject ?? true,
      defaultBillable: defaultBillable ?? true,
    });

    res.status(201).json({
      status: 'success',
      data: project,
      message: 'Project created successfully',
    });
  } catch (error) {
    console.error('Failed to create project:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to create project',
    });
  }
});

/**
 * GET /api/v1/admin/projects
 * List all projects with pagination (admin view with all projects)
 */
router.get('/', validate(listProjectsSchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const take = parseInt(req.query.take as string) || 20;
    const isActive =
      req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

    const skip = (page - 1) * take;

    const projectService = new ProjectService(req.tenantDb as ClientPrismaClient);
    const projects = await projectService.list({
      skip,
      take,
      isActive,
      includeDeleted: false,
    });

    const total = await projectService.count(isActive, false);

    res.json({
      status: 'success',
      data: {
        projects,
        pagination: {
          page,
          take,
          total,
          totalPages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    console.error('Failed to list projects:', error);
    res.status(500).json({ status: 'error', message: 'Failed to list projects' });
  }
});

/**
 * GET /api/v1/admin/projects/:id
 * Get project by ID
 */
router.get('/:id', validate(getProjectByIdSchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { id } = req.params;

    const projectService = new ProjectService(req.tenantDb as ClientPrismaClient);
    const project = await projectService.getById(id);

    if (!project) {
      res.status(404).json({ status: 'error', message: 'Project not found' });
      return;
    }

    res.json({
      status: 'success',
      data: project,
    });
  } catch (error) {
    console.error('Failed to get project:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get project' });
  }
});

/**
 * PUT /api/v1/admin/projects/:id
 * Update project
 */
router.put('/:id', validate(updateProjectSchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { id } = req.params;
    const { name, description, isActive, isBillableProject, defaultBillable } = req.body;

    const projectService = new ProjectService(req.tenantDb as ClientPrismaClient);

    // Check if project exists
    const existing = await projectService.getById(id);
    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Project not found' });
      return;
    }

    const updated = await projectService.update(id, {
      name,
      description,
      isActive,
      isBillableProject,
      defaultBillable,
    });

    res.json({
      status: 'success',
      data: updated,
      message: 'Project updated successfully',
    });
  } catch (error) {
    console.error('Failed to update project:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update project' });
  }
});

/**
 * DELETE /api/v1/admin/projects/:id
 * Delete project (soft delete)
 */
router.delete('/:id', validate(deleteProjectSchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { id } = req.params;

    const projectService = new ProjectService(req.tenantDb as ClientPrismaClient);

    // Check if project exists
    const existing = await projectService.getById(id);
    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Project not found' });
      return;
    }

    const deleted = await projectService.softDelete(id);
    res.json({
      status: 'success',
      data: deleted,
      message: 'Project deleted',
    });
  } catch (error) {
    console.error('Failed to delete project:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete project' });
  }
});

export default router;
