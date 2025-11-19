/**
 * Project Member Routes
 *
 * Routes for managing project member assignments
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import { attachClientDatabase } from '../middleware/client-database.middleware';
import { validate } from '../middleware/validation.middleware';
import { ProjectMemberService } from '../services/project-member.service';
import {
  assignUserToProjectSchema,
  bulkAssignUsersSchema,
  getEffectiveBillabilitySchema,
  getProjectMembersSchema,
  getUserProjectsSchema,
  removeUserFromProjectSchema,
  updateMemberBillabilitySchema,
} from '../validation/project-member.validation';
import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';

const router: Router = Router();

// All routes require authentication and client database
router.use(authenticateJWT, attachClientDatabase);

/**
 * @route   POST /projects/:id/members
 * @desc    Assign user to project
 * @access  Private (requires project:manage capability)
 */
router.post('/:id/members', validate(assignUserToProjectSchema), async (req, res, next) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { id: projectId } = req.params;
    const { userId, isBillable } = req.body;

    const service = new ProjectMemberService(req.clientDb as ClientPrismaClient);
    const member = await service.assignUserToProject({
      projectId,
      userId,
      isBillable,
    });

    res.status(201).json({
      status: 'success',
      data: member,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /projects/:id/members/bulk
 * @desc    Assign multiple users to project
 * @access  Private (requires project:manage capability)
 */
router.post('/:id/members/bulk', validate(bulkAssignUsersSchema), async (req, res, next) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { id: projectId } = req.params;
    const { userIds, isBillable } = req.body;

    const service = new ProjectMemberService(req.clientDb as ClientPrismaClient);
    const count = await service.bulkAssignUsers(projectId, userIds, isBillable);

    res.status(201).json({
      status: 'success',
      data: {
        assignedCount: count,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /projects/:id/members
 * @desc    Get project members
 * @access  Private (requires project:read capability)
 */
router.get('/:id/members', validate(getProjectMembersSchema), async (req, res, next) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { id: projectId } = req.params;

    const service = new ProjectMemberService(req.clientDb as ClientPrismaClient);
    const members = await service.getProjectMembers(projectId);

    res.json({
      status: 'success',
      data: members,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /projects/:id/members/:userId
 * @desc    Update project member billability
 * @access  Private (requires project:manage capability)
 */
router.patch(
  '/:id/members/:userId',
  validate(updateMemberBillabilitySchema),
  async (req, res, next) => {
    try {
      if (!req.clientDb) {
        res.status(500).json({ status: 'error', message: 'Client database not available' });
        return;
      }

      const { id: projectId, userId } = req.params;
      const { isBillable } = req.body;

      const service = new ProjectMemberService(req.clientDb as ClientPrismaClient);
      const member = await service.setUserBillability(projectId, userId, { isBillable });

      res.json({
        status: 'success',
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /projects/:id/members/:userId
 * @desc    Remove user from project
 * @access  Private (requires project:manage capability)
 */
router.delete(
  '/:id/members/:userId',
  validate(removeUserFromProjectSchema),
  async (req, res, next) => {
    try {
      if (!req.clientDb) {
        res.status(500).json({ status: 'error', message: 'Client database not available' });
        return;
      }

      const { id: projectId, userId } = req.params;

      const service = new ProjectMemberService(req.clientDb as ClientPrismaClient);
      await service.removeUserFromProject(projectId, userId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /users/:userId/projects
 * @desc    Get user's projects
 * @access  Private (requires project:read capability)
 */
router.get('/users/:userId/projects', validate(getUserProjectsSchema), async (req, res, next) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Client database not available' });
      return;
    }

    const { userId } = req.params;

    const service = new ProjectMemberService(req.clientDb as ClientPrismaClient);
    const projects = await service.getUserProjects(userId);

    res.json({
      status: 'success',
      data: projects,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /projects/:id/members/:userId/effective-billability
 * @desc    Get effective billability for a user on a project
 * @access  Private (requires project:read capability)
 */
router.get(
  '/:id/members/:userId/effective-billability',
  validate(getEffectiveBillabilitySchema),
  async (req, res, next) => {
    try {
      if (!req.clientDb) {
        res.status(500).json({ status: 'error', message: 'Client database not available' });
        return;
      }

      const { id: projectId, userId } = req.params;

      const service = new ProjectMemberService(req.clientDb as ClientPrismaClient);
      const effectiveBillability = await service.getEffectiveBillability(projectId, userId);

      res.json({
        status: 'success',
        data: {
          projectId,
          userId,
          isBillable: effectiveBillability,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
