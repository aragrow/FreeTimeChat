/**
 * Role Controller
 *
 * Handles HTTP requests for role management
 * All endpoints require admin privileges
 */

import { getRoleService } from '../services/role.service';
import type { Request, Response } from 'express';

export class RoleController {
  private roleService = getRoleService();

  /**
   * Get all roles with optional filtering and pagination
   * GET /api/v1/admin/roles
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { search, hasCapability, page, limit } = req.query;

      const filters: any = {};
      if (search) {
        filters.search = String(search);
      }
      if (hasCapability) {
        filters.hasCapability = String(hasCapability);
      }

      const pagination: any = {};
      if (page) {
        pagination.page = parseInt(String(page), 10);
      }
      if (limit) {
        pagination.limit = parseInt(String(limit), 10);
      }

      const result = await this.roleService.findAll(filters, pagination);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      console.error('Error fetching roles:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch roles',
        error: error.message,
      });
    }
  }

  /**
   * Get role by ID
   * GET /api/v1/admin/roles/:id
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const role = await this.roleService.findById(id);

      if (!role) {
        res.status(404).json({
          status: 'error',
          message: 'Role not found',
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: { role },
      });
    } catch (error: any) {
      console.error('Error fetching role:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch role',
        error: error.message,
      });
    }
  }

  /**
   * Create new role
   * POST /api/v1/admin/roles
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, capabilityIds } = req.body;

      // Validation
      if (!name || name.trim().length === 0) {
        res.status(400).json({
          status: 'error',
          message: 'Role name is required',
        });
        return;
      }

      if (name.length > 50) {
        res.status(400).json({
          status: 'error',
          message: 'Role name must be 50 characters or less',
        });
        return;
      }

      if (description && description.length > 255) {
        res.status(400).json({
          status: 'error',
          message: 'Role description must be 255 characters or less',
        });
        return;
      }

      if (capabilityIds && !Array.isArray(capabilityIds)) {
        res.status(400).json({
          status: 'error',
          message: 'capabilityIds must be an array',
        });
        return;
      }

      const roleData = {
        name: name.trim(),
        description: description?.trim(),
        capabilityIds,
      };

      const role = await this.roleService.create(roleData);

      res.status(201).json({
        status: 'success',
        message: 'Role created successfully',
        data: { role },
      });
    } catch (error: any) {
      console.error('Error creating role:', error);

      if (error.message === 'Role name already exists') {
        res.status(409).json({
          status: 'error',
          message: error.message,
        });
        return;
      }

      if (error.message === 'One or more capabilities not found') {
        res.status(400).json({
          status: 'error',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to create role',
        error: error.message,
      });
    }
  }

  /**
   * Update role
   * PUT /api/v1/admin/roles/:id
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, capabilityIds } = req.body;

      // Validation
      if (name !== undefined && name.trim().length === 0) {
        res.status(400).json({
          status: 'error',
          message: 'Role name cannot be empty',
        });
        return;
      }

      if (name && name.length > 50) {
        res.status(400).json({
          status: 'error',
          message: 'Role name must be 50 characters or less',
        });
        return;
      }

      if (description && description.length > 255) {
        res.status(400).json({
          status: 'error',
          message: 'Role description must be 255 characters or less',
        });
        return;
      }

      if (capabilityIds !== undefined && !Array.isArray(capabilityIds)) {
        res.status(400).json({
          status: 'error',
          message: 'capabilityIds must be an array',
        });
        return;
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description.trim();
      if (capabilityIds !== undefined) updateData.capabilityIds = capabilityIds;

      const role = await this.roleService.update(id, updateData);

      res.status(200).json({
        status: 'success',
        message: 'Role updated successfully',
        data: { role },
      });
    } catch (error: any) {
      console.error('Error updating role:', error);

      if (error.message === 'Role not found') {
        res.status(404).json({
          status: 'error',
          message: error.message,
        });
        return;
      }

      if (error.message === 'Cannot modify name of seeded role') {
        res.status(403).json({
          status: 'error',
          message: error.message,
        });
        return;
      }

      if (error.message === 'Role name already exists') {
        res.status(409).json({
          status: 'error',
          message: error.message,
        });
        return;
      }

      if (error.message === 'One or more capabilities not found') {
        res.status(400).json({
          status: 'error',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to update role',
        error: error.message,
      });
    }
  }

  /**
   * Delete role
   * DELETE /api/v1/admin/roles/:id
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await this.roleService.delete(id);

      res.status(200).json({
        status: 'success',
        message: 'Role deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting role:', error);

      if (error.message === 'Role not found') {
        res.status(404).json({
          status: 'error',
          message: error.message,
        });
        return;
      }

      if (error.message === 'Cannot delete seeded role') {
        res.status(403).json({
          status: 'error',
          message: error.message,
        });
        return;
      }

      if (error.message.includes('Cannot delete role with')) {
        res.status(409).json({
          status: 'error',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to delete role',
        error: error.message,
      });
    }
  }

  /**
   * Assign capabilities to role
   * POST /api/v1/admin/roles/:id/capabilities
   */
  async assignCapabilities(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { capabilityIds } = req.body;

      // Validation
      if (!capabilityIds || !Array.isArray(capabilityIds)) {
        res.status(400).json({
          status: 'error',
          message: 'capabilityIds array is required',
        });
        return;
      }

      if (capabilityIds.length === 0) {
        res.status(400).json({
          status: 'error',
          message: 'At least one capability ID is required',
        });
        return;
      }

      await this.roleService.assignCapabilities(id, capabilityIds);

      res.status(200).json({
        status: 'success',
        message: 'Capabilities assigned successfully',
      });
    } catch (error: any) {
      console.error('Error assigning capabilities:', error);

      if (error.message === 'Role not found') {
        res.status(404).json({
          status: 'error',
          message: error.message,
        });
        return;
      }

      if (error.message === 'One or more capabilities not found') {
        res.status(400).json({
          status: 'error',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to assign capabilities',
        error: error.message,
      });
    }
  }

  /**
   * Remove capability from role
   * DELETE /api/v1/admin/roles/:id/capabilities/:capabilityId
   */
  async removeCapability(req: Request, res: Response): Promise<void> {
    try {
      const { id, capabilityId } = req.params;

      await this.roleService.removeCapability(id, capabilityId);

      res.status(200).json({
        status: 'success',
        message: 'Capability removed successfully',
      });
    } catch (error: any) {
      console.error('Error removing capability:', error);

      if (error.message === 'Role capability assignment not found') {
        res.status(404).json({
          status: 'error',
          message: error.message,
        });
        return;
      }

      if (error.message === 'Cannot remove seeded capability') {
        res.status(403).json({
          status: 'error',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to remove capability',
        error: error.message,
      });
    }
  }

  /**
   * Toggle capability allow/deny for role
   * PATCH /api/v1/admin/roles/:id/capabilities/:capabilityId
   */
  async toggleCapability(req: Request, res: Response): Promise<void> {
    try {
      const { id, capabilityId } = req.params;
      const { isAllowed } = req.body;

      // Validation
      if (typeof isAllowed !== 'boolean') {
        res.status(400).json({
          status: 'error',
          message: 'isAllowed must be a boolean',
        });
        return;
      }

      await this.roleService.toggleCapability(id, capabilityId, isAllowed);

      res.status(200).json({
        status: 'success',
        message: 'Capability updated successfully',
      });
    } catch (error: any) {
      console.error('Error toggling capability:', error);

      if (error.message === 'Role capability assignment not found') {
        res.status(404).json({
          status: 'error',
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        status: 'error',
        message: 'Failed to update capability',
        error: error.message,
      });
    }
  }

  /**
   * Get role statistics
   * GET /api/v1/admin/roles/statistics
   */
  async getStatistics(_req: Request, res: Response): Promise<void> {
    try {
      const statistics = await this.roleService.getStatistics();

      res.status(200).json({
        status: 'success',
        data: { statistics },
      });
    } catch (error: any) {
      console.error('Error fetching role statistics:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch role statistics',
        error: error.message,
      });
    }
  }
}
