/**
 * Admin Capability Management Routes
 *
 * Handles capability CRUD operations
 */

import { Router } from 'express';
import { PrismaClient as MainPrismaClient } from '../../generated/prisma-main';
import { getCapabilityService } from '../../services/capability.service';
import type { Request, Response } from 'express';

const router = Router();
const capabilityService = getCapabilityService();
const prisma = new MainPrismaClient();

/**
 * GET /api/v1/admin/capabilities
 * List all capabilities with search
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;

    // Build where clause
    const where: any = {};

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const capabilities = await prisma.capability.findMany({
      where,
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        _count: {
          select: {
            roles: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.status(200).json({
      status: 'success',
      data: capabilities,
    });
  } catch (error) {
    console.error('Error listing capabilities:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list capabilities',
    });
  }
});

/**
 * GET /api/v1/admin/capabilities/:id
 * Get capability by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const capability = await prisma.capability.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        _count: {
          select: {
            roles: true,
          },
        },
      },
    });

    if (!capability) {
      res.status(404).json({
        status: 'error',
        message: 'Capability not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: capability,
    });
  } catch (error) {
    console.error('Error getting capability:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get capability',
    });
  }
});

/**
 * POST /api/v1/admin/capabilities
 * Create new capability
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      res.status(400).json({
        status: 'error',
        message: 'Capability name is required',
      });
      return;
    }

    // Check if capability name already exists
    const existingCapability = await capabilityService.findByName(name);
    if (existingCapability) {
      res.status(409).json({
        status: 'error',
        message: 'Capability name already exists',
      });
      return;
    }

    const capability = await capabilityService.create({ name, description });

    res.status(201).json({
      status: 'success',
      data: capability,
    });
  } catch (error) {
    console.error('Error creating capability:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create capability',
    });
  }
});

/**
 * PUT /api/v1/admin/capabilities/:id
 * Update capability
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Check if capability exists
    const existingCapability = await capabilityService.findById(id);
    if (!existingCapability) {
      res.status(404).json({
        status: 'error',
        message: 'Capability not found',
      });
      return;
    }

    // Check if it's a seeded capability
    if (existingCapability.isSeeded) {
      res.status(403).json({
        status: 'error',
        message: 'Cannot modify seeded capabilities',
      });
      return;
    }

    // If name is being changed, check if new name already exists
    if (name && name !== existingCapability.name) {
      const capabilityWithName = await capabilityService.findByName(name);
      if (capabilityWithName) {
        res.status(409).json({
          status: 'error',
          message: 'Capability name already exists',
        });
        return;
      }
    }

    const capability = await capabilityService.update(id, { name, description });

    res.status(200).json({
      status: 'success',
      data: capability,
    });
  } catch (error) {
    console.error('Error updating capability:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update capability',
    });
  }
});

/**
 * DELETE /api/v1/admin/capabilities/:id
 * Delete capability
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if capability exists
    const existingCapability = await capabilityService.findById(id);
    if (!existingCapability) {
      res.status(404).json({
        status: 'error',
        message: 'Capability not found',
      });
      return;
    }

    // Check if it's a seeded capability
    if (existingCapability.isSeeded) {
      res.status(403).json({
        status: 'error',
        message: 'Cannot delete seeded capabilities',
      });
      return;
    }

    // Check if capability is assigned to any roles
    const roleCapabilities = await prisma.roleCapability.findMany({
      where: { capabilityId: id },
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (roleCapabilities.length > 0) {
      res.status(400).json({
        status: 'error',
        message: `Cannot delete capability. It is assigned to ${roleCapabilities.length} role(s)`,
        data: {
          roleCount: roleCapabilities.length,
          roles: roleCapabilities.map((rc) => rc.role),
        },
      });
      return;
    }

    await capabilityService.delete(id);

    res.status(200).json({
      status: 'success',
      message: 'Capability deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting capability:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete capability',
    });
  }
});

/**
 * GET /api/v1/admin/capabilities/:id/roles
 * Get roles that have this capability
 */
router.get('/:id/roles', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if capability exists
    const capability = await capabilityService.findById(id);
    if (!capability) {
      res.status(404).json({
        status: 'error',
        message: 'Capability not found',
      });
      return;
    }

    const roleCapabilities = await prisma.roleCapability.findMany({
      where: { capabilityId: id },
      include: {
        role: {
          include: {
            _count: {
              select: {
                users: true,
                capabilities: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      status: 'success',
      data: roleCapabilities,
    });
  } catch (error) {
    console.error('Error getting capability roles:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get capability roles',
    });
  }
});

export default router;
