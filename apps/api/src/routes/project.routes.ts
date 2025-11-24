/**
 * Project Routes
 *
 * Handles project CRUD operations
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import { attachTenantDatabase } from '../middleware/tenant-database.middleware';
import { validate } from '../middleware/validation.middleware';
import { ProjectService } from '../services/project.service';
import {
  createProjectSchema,
  deleteProjectSchema,
  getProjectByIdSchema,
  listProjectsSchema,
  restoreProjectSchema,
  updateProjectSchema,
} from '../validation/project.validation';
import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { Request, Response } from 'express';

const router = Router();

// All routes require authentication and client database
router.use(authenticateJWT, attachTenantDatabase);

/**
 * POST /api/v1/projects
 * Create a new project
 */
router.post('/', validate(createProjectSchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { name, description, startDate, endDate } = req.body;

    if (!name) {
      res.status(400).json({ status: 'error', message: 'Project name is required' });
      return;
    }

    const projectService = new ProjectService(req.tenantDb as ClientPrismaClient);
    const project = await projectService.create({
      name,
      description,
      clientId: req.user.tenantId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
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
 * GET /api/v1/projects
 * List all projects with pagination
 */
router.get('/', validate(listProjectsSchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const isActive =
      req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
    const includeDeleted = req.query.includeDeleted === 'true';

    const skip = (page - 1) * limit;

    const projectService = new ProjectService(req.tenantDb as ClientPrismaClient);
    const [projects, total] = await Promise.all([
      projectService.list({ skip, take: limit, isActive, includeDeleted }),
      projectService.count(isActive, includeDeleted),
    ]);

    res.json({
      status: 'success',
      data: projects,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to list projects:', error);
    res.status(500).json({ status: 'error', message: 'Failed to list projects' });
  }
});

/**
 * GET /api/v1/projects/:id
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

    // Get statistics
    const stats = await projectService.getStats(id);

    res.json({
      status: 'success',
      data: {
        ...project,
        stats,
      },
    });
  } catch (error) {
    console.error('Failed to get project:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get project' });
  }
});

/**
 * PATCH /api/v1/projects/:id
 * Update project
 */
router.patch('/:id', validate(updateProjectSchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { id } = req.params;
    const { name, description, isActive, startDate, endDate } = req.body;

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
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
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
 * DELETE /api/v1/projects/:id
 * Delete project (soft delete by default)
 */
router.delete('/:id', validate(deleteProjectSchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { id } = req.params;
    const permanent = req.query.permanent === 'true';

    const projectService = new ProjectService(req.tenantDb as ClientPrismaClient);

    // Check if project exists
    const existing = await projectService.getById(id);
    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Project not found' });
      return;
    }

    if (permanent) {
      await projectService.permanentDelete(id);
      res.json({
        status: 'success',
        message: 'Project permanently deleted',
      });
    } else {
      const deleted = await projectService.softDelete(id);
      res.json({
        status: 'success',
        data: deleted,
        message: 'Project soft deleted',
      });
    }
  } catch (error) {
    console.error('Failed to delete project:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete project' });
  }
});

/**
 * POST /api/v1/projects/:id/restore
 * Restore soft-deleted project
 */
router.post('/:id/restore', validate(restoreProjectSchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { id } = req.params;

    const projectService = new ProjectService(req.tenantDb as ClientPrismaClient);
    const restored = await projectService.restore(id);

    res.json({
      status: 'success',
      data: restored,
      message: 'Project restored successfully',
    });
  } catch (error) {
    console.error('Failed to restore project:', error);
    res.status(500).json({ status: 'error', message: 'Failed to restore project' });
  }
});

export default router;
