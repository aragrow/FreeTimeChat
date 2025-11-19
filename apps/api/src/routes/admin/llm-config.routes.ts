/**
 * LLM Configuration Routes
 *
 * Admin and TenantAdmin endpoints to manage LLM provider configurations
 * - Admin: Manages system-wide configurations (tenantId = null)
 * - TenantAdmin: Manages tenant-specific configurations (tenantId from their account)
 */

import { Router } from 'express';
import { LLMProvider } from '../../generated/prisma-main';
import { llmConfigService } from '../../services/llm-config.service';
import type { Request, Response } from 'express';

const router = Router();

/**
 * Helper to determine tenantId based on user role
 * - admin: can manage system-wide configs (tenantId = null)
 * - tenantadmin: can only manage their tenant's configs (tenantId from user.tenantId)
 */
function getTenantIdForUser(req: Request): string | null {
  const user = (req as any).user;

  // Check if user has admin role
  const isAdmin = user.roles?.includes('admin');

  if (isAdmin) {
    // Admins manage system-wide configs (tenantId = null)
    return null;
  }

  // TenantAdmins manage their tenant's configs
  return user.tenantId || null;
}

/**
 * GET /api/v1/admin/llm-config
 * Get all LLM configurations for the user's scope
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantIdForUser(req);
    const configs = await llmConfigService.getAllConfigs(tenantId);

    res.status(200).json({
      status: 'success',
      data: configs,
    });
  } catch (error: any) {
    console.error('Error fetching LLM configs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch LLM configurations',
    });
  }
});

/**
 * GET /api/v1/admin/llm-config/active
 * Get the currently active LLM configuration
 */
router.get('/active', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantIdForUser(req);
    const config = await llmConfigService.getActiveConfig(tenantId);

    if (!config) {
      res.status(404).json({
        status: 'error',
        message: 'No active LLM configuration found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: config,
    });
  } catch (error: any) {
    console.error('Error fetching active LLM config:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch active LLM configuration',
    });
  }
});

/**
 * POST /api/v1/admin/llm-config
 * Create a new LLM configuration
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = getTenantIdForUser(req);

    const {
      provider,
      apiKey,
      defaultModel,
      temperature,
      maxTokens,
      baseUrl,
      organization,
      timeout,
      embeddingModel,
      embeddingEnabled,
    } = req.body;

    // Validate required fields
    if (!provider || !apiKey || !defaultModel) {
      res.status(400).json({
        status: 'error',
        message: 'provider, apiKey, and defaultModel are required',
      });
      return;
    }

    // Validate provider enum
    const validProviders = Object.values(LLMProvider);
    if (!validProviders.includes(provider as LLMProvider)) {
      res.status(400).json({
        status: 'error',
        message: `Invalid provider. Must be one of: ${validProviders.join(', ')}`,
      });
      return;
    }

    // Validate temperature if provided
    if (temperature !== undefined && (temperature < 0 || temperature > 1)) {
      res.status(400).json({
        status: 'error',
        message: 'temperature must be between 0 and 1',
      });
      return;
    }

    // Validate embeddingEnabled if provided
    if (embeddingEnabled !== undefined && typeof embeddingEnabled !== 'boolean') {
      res.status(400).json({
        status: 'error',
        message: 'embeddingEnabled must be a boolean',
      });
      return;
    }

    // Create configuration
    const config = await llmConfigService.createConfig(user.sub, tenantId, {
      provider: provider as LLMProvider,
      apiKey,
      defaultModel,
      temperature,
      maxTokens,
      baseUrl,
      organization,
      timeout,
      embeddingModel,
      embeddingEnabled,
    });

    res.status(201).json({
      status: 'success',
      data: config,
      message: 'LLM configuration created successfully',
    });
  } catch (error: any) {
    console.error('Error creating LLM config:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create LLM configuration',
    });
  }
});

/**
 * PATCH /api/v1/admin/llm-config/:id
 * Update an existing LLM configuration
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = getTenantIdForUser(req);

    const {
      apiKey,
      defaultModel,
      temperature,
      maxTokens,
      baseUrl,
      organization,
      timeout,
      isActive,
    } = req.body;

    // Validate temperature if provided
    if (temperature !== undefined && (temperature < 0 || temperature > 1)) {
      res.status(400).json({
        status: 'error',
        message: 'temperature must be between 0 and 1',
      });
      return;
    }

    // Update configuration
    const config = await llmConfigService.updateConfig(id, tenantId, {
      apiKey,
      defaultModel,
      temperature,
      maxTokens,
      baseUrl,
      organization,
      timeout,
      isActive,
    });

    res.status(200).json({
      status: 'success',
      data: config,
      message: 'LLM configuration updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating LLM config:', error);

    // Handle not found error
    if (error.code === 'P2025') {
      res.status(404).json({
        status: 'error',
        message: 'LLM configuration not found',
      });
      return;
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to update LLM configuration',
    });
  }
});

/**
 * DELETE /api/v1/admin/llm-config/:id
 * Delete an LLM configuration
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = getTenantIdForUser(req);

    await llmConfigService.deleteConfig(id, tenantId);

    res.status(200).json({
      status: 'success',
      message: 'LLM configuration deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting LLM config:', error);

    // Handle not found error
    if (error.code === 'P2025') {
      res.status(404).json({
        status: 'error',
        message: 'LLM configuration not found',
      });
      return;
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to delete LLM configuration',
    });
  }
});

/**
 * POST /api/v1/admin/llm-config/:id/test
 * Test an LLM configuration by attempting a simple API call
 */
router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = getTenantIdForUser(req);

    const result = await llmConfigService.testConfig(id, tenantId);

    if (result.success) {
      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: result.message,
      });
    }
  } catch (error: any) {
    console.error('Error testing LLM config:', error);

    res.status(500).json({
      status: 'error',
      message: 'Failed to test LLM configuration',
    });
  }
});

/**
 * GET /api/v1/admin/llm-config/providers
 * Get list of available LLM providers
 */
router.get('/providers', (_req: Request, res: Response) => {
  try {
    const providers = Object.values(LLMProvider).map((provider) => ({
      value: provider,
      label: provider.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    }));

    res.status(200).json({
      status: 'success',
      data: providers,
    });
  } catch (error: any) {
    console.error('Error fetching providers:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch providers',
    });
  }
});

export default router;
