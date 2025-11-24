/**
 * Chat Routes
 *
 * Handles chat and AI assistant operations
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import { attachChatDatabase } from '../middleware/chat-database.middleware';
import { validate } from '../middleware/validation.middleware';
import { ChatService } from '../services/chat.service';
import { RatingService } from '../services/rating.service';
import {
  endConversationSchema,
  getConversationContextSchema,
  sendMessageSchema,
} from '../validation/chat.validation';
import {
  createRatingSchema,
  getRatingsSchema,
  getRatingAnalyticsSchema,
} from '../validation/rating.validation';
import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { Request, Response } from 'express';

const router = Router();

// All routes require authentication and conditional database (main for admins, tenant for users)
router.use(authenticateJWT, attachChatDatabase);

/**
 * POST /api/v1/chat
 * Send a chat message
 */
router.post('/', validate(sendMessageSchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb || !req.mainDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Database not available' });
      return;
    }

    const { message, conversationId, includeContext, debugMode, confirmQuery } = req.body;

    const chatService = new ChatService(req.tenantDb, req.mainDb);

    const response = await chatService.processMessage({
      userId: req.user.sub,
      tenantId: req.user.tenantId,
      userRoles: req.user.roles || ['user'], // For Phase 2 RBAC
      message,
      conversationId,
      includeContext,
      debugMode,
      confirmQuery, // Phase 3: User confirmation for query execution
    });

    // Convert BigInt to number for JSON serialization
    const responseData = {
      status: response.success ? 'success' : 'error',
      data: {
        message: response.message,
        conversationId: response.conversationId,
        messageId: response.messageId,
        intent: response.intent,
        confidence: response.confidence,
        additionalData: response.data,
        context: response.context,
        debug: response.debug,
        queryPreview: response.queryPreview, // Phase 3: Query preview data
      },
    };

    // Use custom JSON serializer that converts BigInt to number
    res
      .status(response.success ? 200 : 400)
      .type('application/json')
      .send(JSON.stringify(responseData, (_, v) => (typeof v === 'bigint' ? Number(v) : v)));
  } catch (error) {
    console.error('Failed to process chat message:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process message',
    });
  }
});

/**
 * GET /api/v1/chat/:id/context
 * Get conversation context
 */
router.get(
  '/:id/context',
  validate(getConversationContextSchema),
  async (req: Request, res: Response) => {
    try {
      if (!req.tenantDb || !req.mainDb || !req.user) {
        res.status(500).json({ status: 'error', message: 'Database not available' });
        return;
      }

      const { id: conversationId } = req.params;

      const chatService = new ChatService(req.tenantDb, req.mainDb);

      const context = await chatService.getConversationContext(conversationId, req.user.sub);

      if (!context) {
        res.status(404).json({
          status: 'error',
          message: 'Conversation not found',
        });
        return;
      }

      res.json({
        status: 'success',
        data: context,
      });
    } catch (error) {
      console.error('Failed to get conversation context:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get conversation context',
      });
    }
  }
);

/**
 * POST /api/v1/chat/:id/end
 * End a conversation
 */
router.post('/:id/end', validate(endConversationSchema), async (req: Request, res: Response) => {
  try {
    if (!req.tenantDb || !req.mainDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Database not available' });
      return;
    }

    const { id: conversationId } = req.params;

    const chatService = new ChatService(req.tenantDb, req.mainDb);

    const success = await chatService.endConversation(conversationId, req.user.sub);

    if (!success) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to end conversation',
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'Conversation ended successfully',
    });
  } catch (error) {
    console.error('Failed to end conversation:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to end conversation',
    });
  }
});

/**
 * POST /api/v1/chat/:messageId/rate
 * Rate a chat response (Phase 5)
 */
router.post(
  '/:messageId/rate',
  validate(createRatingSchema),
  async (req: Request, res: Response) => {
    try {
      if (!req.tenantDb || !req.user) {
        res.status(500).json({ status: 'error', message: 'Database not available' });
        return;
      }

      const { messageId } = req.params;
      const { ratingType, rating, feedback, metadata } = req.body;

      const ratingService = new RatingService(req.tenantDb as ClientPrismaClient);

      // Use getOrCreateRating to prevent duplicates and allow updates
      const result = await ratingService.getOrCreateRating({
        messageId,
        userId: req.user.sub,
        ratingType,
        rating,
        feedback,
        metadata,
      });

      res.status(result.created ? 201 : 200).json({
        status: 'success',
        message: result.created ? 'Rating created successfully' : 'Rating updated successfully',
        data: {
          rating: result.rating,
          created: result.created,
        },
      });
    } catch (error) {
      console.error('Failed to create rating:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to create rating',
      });
    }
  }
);

/**
 * GET /api/v1/chat/:messageId/ratings
 * Get all ratings for a message
 */
router.get(
  '/:messageId/ratings',
  validate(getRatingsSchema),
  async (req: Request, res: Response) => {
    try {
      if (!req.tenantDb || !req.user) {
        res.status(500).json({ status: 'error', message: 'Database not available' });
        return;
      }

      const { messageId } = req.params;
      const ratingService = new RatingService(req.tenantDb as ClientPrismaClient);

      const ratings = await ratingService.getRatingsByMessage(messageId);

      res.json({
        status: 'success',
        data: {
          ratings,
          count: ratings.length,
        },
      });
    } catch (error) {
      console.error('Failed to get ratings:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get ratings',
      });
    }
  }
);

/**
 * GET /api/v1/chat/ratings/analytics
 * Get rating analytics
 */
router.get(
  '/ratings/analytics',
  validate(getRatingAnalyticsSchema),
  async (req: Request, res: Response) => {
    try {
      if (!req.tenantDb || !req.user) {
        res.status(500).json({ status: 'error', message: 'Database not available' });
        return;
      }

      const ratingService = new RatingService(req.tenantDb as ClientPrismaClient);
      const analytics = await ratingService.getRatingAnalytics();

      res.json({
        status: 'success',
        data: analytics,
      });
    } catch (error) {
      console.error('Failed to get rating analytics:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get rating analytics',
      });
    }
  }
);

export default router;
