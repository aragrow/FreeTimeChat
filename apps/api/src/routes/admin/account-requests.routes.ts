/**
 * Admin Account Request Management Routes
 *
 * Handles account request review, approval, and rejection
 */

import { Router } from 'express';
import { PrismaClient as MainPrismaClient } from '../../generated/prisma-main';
import { requireCapability } from '../../middleware/permission.middleware';
import type { JWTPayload } from '@freetimechat/types';
import type { Request, Response } from 'express';

const router = Router();
const prisma = new MainPrismaClient();

/**
 * GET /api/v1/admin/account-requests
 * List all account requests with pagination, search, and filtering
 */
router.get('/', requireCapability('account-requests:read'), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string; // 'PENDING', 'APPROVED', 'REJECTED', 'SPAM', 'all'

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Search filter
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Status filter
    if (status && status !== 'all') {
      where.status = status;
    }

    // Get account requests with pagination
    const [accountRequests, total] = await Promise.all([
      prisma.accountRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.accountRequest.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        accountRequests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error listing account requests:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list account requests',
    });
  }
});

/**
 * GET /api/v1/admin/account-requests/stats
 * Get account request statistics
 * NOTE: This route MUST come before /:id to avoid matching 'stats' as an ID
 */
router.get(
  '/stats',
  requireCapability('account-requests:read'),
  async (req: Request, res: Response) => {
    try {
      const [pending, approved, rejected, spam, total] = await Promise.all([
        prisma.accountRequest.count({ where: { status: 'PENDING' } }),
        prisma.accountRequest.count({ where: { status: 'APPROVED' } }),
        prisma.accountRequest.count({ where: { status: 'REJECTED' } }),
        prisma.accountRequest.count({ where: { status: 'SPAM' } }),
        prisma.accountRequest.count(),
      ]);

      res.status(200).json({
        status: 'success',
        data: {
          pending,
          approved,
          rejected,
          spam,
          total,
        },
      });
    } catch (error) {
      console.error('Error getting account request stats:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get account request statistics',
      });
    }
  }
);

/**
 * GET /api/v1/admin/account-requests/:id
 * Get account request by ID with full details
 */
router.get(
  '/:id',
  requireCapability('account-requests:read'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const accountRequest = await prisma.accountRequest.findUnique({
        where: { id },
      });

      if (!accountRequest) {
        res.status(404).json({
          status: 'error',
          message: 'Account request not found',
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: accountRequest,
      });
    } catch (error) {
      console.error('Error getting account request:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get account request',
      });
    }
  }
);

/**
 * POST /api/v1/admin/account-requests/:id/approve
 * Approve an account request
 */
router.post(
  '/:id/approve',
  requireCapability('account-requests:approve'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reviewNotes } = req.body;
      const currentUser = req.user as JWTPayload;

      // Check if account request exists
      const accountRequest = await prisma.accountRequest.findUnique({
        where: { id },
      });

      if (!accountRequest) {
        res.status(404).json({
          status: 'error',
          message: 'Account request not found',
        });
        return;
      }

      // Check if already reviewed
      if (accountRequest.status !== 'PENDING') {
        res.status(400).json({
          status: 'error',
          message: `Account request has already been ${accountRequest.status.toLowerCase()}`,
        });
        return;
      }

      // Update account request status
      const updatedRequest = await prisma.accountRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedBy: currentUser.sub,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || null,
        },
      });

      // TODO: Send approval email to the user
      // TODO: Create user account if auto-provisioning is enabled

      res.status(200).json({
        status: 'success',
        message: 'Account request approved successfully',
        data: updatedRequest,
      });
    } catch (error) {
      console.error('Error approving account request:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to approve account request',
      });
    }
  }
);

/**
 * POST /api/v1/admin/account-requests/:id/reject
 * Reject an account request
 */
router.post(
  '/:id/reject',
  requireCapability('account-requests:reject'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reviewNotes } = req.body;
      const currentUser = req.user as JWTPayload;

      // Validate review notes for rejection
      if (!reviewNotes || reviewNotes.trim() === '') {
        res.status(400).json({
          status: 'error',
          message: 'Review notes are required when rejecting an account request',
        });
        return;
      }

      // Check if account request exists
      const accountRequest = await prisma.accountRequest.findUnique({
        where: { id },
      });

      if (!accountRequest) {
        res.status(404).json({
          status: 'error',
          message: 'Account request not found',
        });
        return;
      }

      // Check if already reviewed
      if (accountRequest.status !== 'PENDING') {
        res.status(400).json({
          status: 'error',
          message: `Account request has already been ${accountRequest.status.toLowerCase()}`,
        });
        return;
      }

      // Update account request status
      const updatedRequest = await prisma.accountRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedBy: currentUser.sub,
          reviewedAt: new Date(),
          reviewNotes,
        },
      });

      // TODO: Send rejection email to the user (optional, based on business requirements)

      res.status(200).json({
        status: 'success',
        message: 'Account request rejected successfully',
        data: updatedRequest,
      });
    } catch (error) {
      console.error('Error rejecting account request:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to reject account request',
      });
    }
  }
);

/**
 * POST /api/v1/admin/account-requests/:id/mark-spam
 * Mark an account request as spam
 */
router.post(
  '/:id/mark-spam',
  requireCapability('account-requests:reject'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reviewNotes } = req.body;
      const currentUser = req.user as JWTPayload;

      // Check if account request exists
      const accountRequest = await prisma.accountRequest.findUnique({
        where: { id },
      });

      if (!accountRequest) {
        res.status(404).json({
          status: 'error',
          message: 'Account request not found',
        });
        return;
      }

      // Check if already reviewed
      if (accountRequest.status !== 'PENDING') {
        res.status(400).json({
          status: 'error',
          message: `Account request has already been ${accountRequest.status.toLowerCase()}`,
        });
        return;
      }

      // Update account request status
      const updatedRequest = await prisma.accountRequest.update({
        where: { id },
        data: {
          status: 'SPAM',
          reviewedBy: currentUser.sub,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || 'Marked as spam',
        },
      });

      res.status(200).json({
        status: 'success',
        message: 'Account request marked as spam successfully',
        data: updatedRequest,
      });
    } catch (error) {
      console.error('Error marking account request as spam:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to mark account request as spam',
      });
    }
  }
);

export default router;
