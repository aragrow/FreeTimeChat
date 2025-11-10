/**
 * Admin Integration Templates Routes
 *
 * Provides CRUD operations for integration templates
 */

import { Router } from 'express';
import { PrismaClient } from '../../generated/prisma-main';
import {
  IntegrationTemplateService,
  type CreateIntegrationTemplateInput,
  type UpdateIntegrationTemplateInput,
} from '../../services/integration-template.service';
import type { Request, Response } from 'express';

const router = Router();
const prisma = new PrismaClient();
const integrationTemplateService = new IntegrationTemplateService(prisma);

/**
 * GET /api/v1/admin/integration-templates
 * List all integration templates
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, isActive, includeDeleted, skip, take } = req.query;

    const templates = await integrationTemplateService.list({
      category: category as any,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      includeDeleted: includeDeleted === 'true',
      skip: skip ? parseInt(skip as string) : undefined,
      take: take ? parseInt(take as string) : undefined,
    });

    res.status(200).json({
      status: 'success',
      data: templates,
    });
  } catch (error) {
    console.error('Error listing integration templates:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list integration templates',
    });
  }
});

/**
 * GET /api/v1/admin/integration-templates/stats
 * Get integration template statistics
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const countByCategory = await integrationTemplateService.countByCategory();
    const total = await integrationTemplateService.list();

    res.status(200).json({
      status: 'success',
      data: {
        total: total.length,
        byCategory: countByCategory,
        categories: Object.keys({
          AI: 'AI',
          EMAIL: 'EMAIL',
          VECTOR_DB: 'VECTOR_DB',
          PAYMENT: 'PAYMENT',
          MONITORING: 'MONITORING',
          STORAGE: 'STORAGE',
          COMMUNICATION: 'COMMUNICATION',
          ANALYTICS: 'ANALYTICS',
          OTHER: 'OTHER',
        }),
      },
    });
  } catch (error) {
    console.error('Error getting integration template stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get integration template statistics',
    });
  }
});

/**
 * GET /api/v1/admin/integration-templates/:id
 * Get a specific integration template by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const template = await integrationTemplateService.getById(id);

    if (!template) {
      res.status(404).json({
        status: 'error',
        message: 'Integration template not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: template,
    });
  } catch (error) {
    console.error('Error getting integration template:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get integration template',
    });
  }
});

/**
 * POST /api/v1/admin/integration-templates
 * Create a new integration template
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const data: CreateIntegrationTemplateInput = req.body;

    // Validate required fields
    if (!data.name || !data.slug || !data.category || !data.provider || !data.configSchema) {
      res.status(400).json({
        status: 'error',
        message: 'Missing required fields: name, slug, category, provider, configSchema',
      });
      return;
    }

    const template = await integrationTemplateService.create(data);

    res.status(201).json({
      status: 'success',
      data: template,
    });
  } catch (error) {
    console.error('Error creating integration template:', error);
    res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to create integration template',
    });
  }
});

/**
 * PATCH /api/v1/admin/integration-templates/:id
 * Update an integration template
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: UpdateIntegrationTemplateInput = req.body;

    const template = await integrationTemplateService.update(id, data);

    res.status(200).json({
      status: 'success',
      data: template,
    });
  } catch (error) {
    console.error('Error updating integration template:', error);
    res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to update integration template',
    });
  }
});

/**
 * DELETE /api/v1/admin/integration-templates/:id
 * Soft delete an integration template
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const template = await integrationTemplateService.delete(id);

    res.status(200).json({
      status: 'success',
      data: template,
      message: 'Integration template deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting integration template:', error);
    res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to delete integration template',
    });
  }
});

/**
 * POST /api/v1/admin/integration-templates/:id/restore
 * Restore a soft-deleted integration template
 */
router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const template = await integrationTemplateService.restore(id);

    res.status(200).json({
      status: 'success',
      data: template,
      message: 'Integration template restored successfully',
    });
  } catch (error) {
    console.error('Error restoring integration template:', error);
    res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to restore integration template',
    });
  }
});

export default router;
