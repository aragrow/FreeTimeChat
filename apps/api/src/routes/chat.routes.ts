/**
 * Chat Routes
 *
 * Handles chat and AI assistant operations
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import { attachClientDatabase } from '../middleware/client-database.middleware';
import { validate } from '../middleware/validation.middleware';
import { ChatService } from '../services/chat.service';
import {
  endConversationSchema,
  getConversationContextSchema,
  sendMessageSchema,
} from '../validation/chat.validation';
import type { Request, Response } from 'express';

const router = Router();

// All routes require authentication and client database
router.use(authenticateJWT, attachClientDatabase);

/**
 * POST /api/v1/chat
 * Send a chat message
 */
router.post('/', validate(sendMessageSchema), async (req: Request, res: Response) => {
  try {
    if (!req.clientDb || !req.mainDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Database not available' });
      return;
    }

    const { message, conversationId, includeContext } = req.body;

    const chatService = new ChatService(req.clientDb, req.mainDb);

    const response = await chatService.processMessage({
      userId: req.user.sub,
      message,
      conversationId,
      includeContext,
    });

    res.status(response.success ? 200 : 400).json({
      status: response.success ? 'success' : 'error',
      data: {
        message: response.message,
        conversationId: response.conversationId,
        messageId: response.messageId,
        intent: response.intent,
        confidence: response.confidence,
        additionalData: response.data,
        context: response.context,
      },
    });
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
      if (!req.clientDb || !req.mainDb || !req.user) {
        res.status(500).json({ status: 'error', message: 'Database not available' });
        return;
      }

      const { id: conversationId } = req.params;

      const chatService = new ChatService(req.clientDb, req.mainDb);

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
    if (!req.clientDb || !req.mainDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Database not available' });
      return;
    }

    const { id: conversationId } = req.params;

    const chatService = new ChatService(req.clientDb, req.mainDb);

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

export default router;
