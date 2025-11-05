/**
 * Conversation Routes
 *
 * Handles conversation and message operations
 */

import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import { attachClientDatabase } from '../middleware/client-database.middleware';
import { validate } from '../middleware/validation.middleware';
import { ConversationService } from '../services/conversation.service';
import { MessageService } from '../services/message.service';
import {
  addMessageSchema,
  createConversationSchema,
  deleteConversationSchema,
  getConversationByIdSchema,
  getMessagesSchema,
  listConversationsSchema,
  searchMessagesSchema,
  updateConversationSchema,
} from '../validation/conversation.validation';
import type { Request, Response } from 'express';

const router = Router();

// All routes require authentication and client database
router.use(authenticateJWT, attachClientDatabase);

/**
 * POST /api/v1/conversations
 * Create a new conversation
 */
router.post('/', validate(createConversationSchema), async (req: Request, res: Response) => {
  try {
    if (!req.clientDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Database not available' });
      return;
    }

    const { title } = req.body;

    const conversationService = new ConversationService(req.clientDb);
    const conversation = await conversationService.startConversation({
      userId: req.user.userId,
      title,
    });

    res.status(201).json({
      status: 'success',
      data: conversation,
      message: 'Conversation created successfully',
    });
  } catch (error) {
    console.error('Failed to create conversation:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to create conversation',
    });
  }
});

/**
 * GET /api/v1/conversations
 * List conversations for the current user
 */
router.get('/', validate(listConversationsSchema), async (req: Request, res: Response) => {
  try {
    if (!req.clientDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Database not available' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const isActive = req.query.isActive as boolean | undefined;

    const skip = (page - 1) * limit;

    const conversationService = new ConversationService(req.clientDb);
    const [conversations, total] = await Promise.all([
      conversationService.listConversations({
        skip,
        take: limit,
        userId: req.user.userId,
        isActive,
      }),
      conversationService.count(req.user.userId, isActive),
    ]);

    res.json({
      status: 'success',
      data: conversations,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to list conversations:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list conversations',
    });
  }
});

/**
 * GET /api/v1/conversations/active
 * Get user's active conversation
 */
router.get('/active', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Database not available' });
      return;
    }

    const conversationService = new ConversationService(req.clientDb);
    const conversation = await conversationService.getActiveConversation(req.user.userId);

    res.json({
      status: 'success',
      data: conversation,
    });
  } catch (error) {
    console.error('Failed to get active conversation:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get active conversation',
    });
  }
});

/**
 * GET /api/v1/conversations/stats
 * Get conversation statistics for current user
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb || !req.user) {
      res.status(500).json({ status: 'error', message: 'Database not available' });
      return;
    }

    const conversationService = new ConversationService(req.clientDb);
    const stats = await conversationService.getUserStats(req.user.userId);

    res.json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    console.error('Failed to get conversation stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get conversation stats',
    });
  }
});

/**
 * GET /api/v1/conversations/:id
 * Get conversation by ID
 */
router.get('/:id', validate(getConversationByIdSchema), async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Database not available' });
      return;
    }

    const { id } = req.params;

    const conversationService = new ConversationService(req.clientDb);
    const conversation = await conversationService.getConversation(id);

    if (!conversation) {
      res.status(404).json({
        status: 'error',
        message: 'Conversation not found',
      });
      return;
    }

    res.json({
      status: 'success',
      data: conversation,
    });
  } catch (error) {
    console.error('Failed to get conversation:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get conversation',
    });
  }
});

/**
 * PATCH /api/v1/conversations/:id
 * Update conversation
 */
router.patch('/:id', validate(updateConversationSchema), async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Database not available' });
      return;
    }

    const { id } = req.params;
    const { title, isActive } = req.body;

    const conversationService = new ConversationService(req.clientDb);
    const conversation = await conversationService.updateConversation(id, {
      title,
      isActive,
    });

    res.json({
      status: 'success',
      data: conversation,
      message: 'Conversation updated successfully',
    });
  } catch (error) {
    console.error('Failed to update conversation:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to update conversation',
    });
  }
});

/**
 * DELETE /api/v1/conversations/:id
 * Delete conversation
 */
router.delete('/:id', validate(deleteConversationSchema), async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Database not available' });
      return;
    }

    const { id } = req.params;

    const conversationService = new ConversationService(req.clientDb);
    await conversationService.deleteConversation(id);

    res.json({
      status: 'success',
      message: 'Conversation deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete conversation',
    });
  }
});

/**
 * POST /api/v1/conversations/:id/archive
 * Archive conversation
 */
router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Database not available' });
      return;
    }

    const { id } = req.params;

    const conversationService = new ConversationService(req.clientDb);
    const conversation = await conversationService.archiveConversation(id);

    res.json({
      status: 'success',
      data: conversation,
      message: 'Conversation archived successfully',
    });
  } catch (error) {
    console.error('Failed to archive conversation:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to archive conversation',
    });
  }
});

/**
 * POST /api/v1/conversations/:id/restore
 * Restore archived conversation
 */
router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Database not available' });
      return;
    }

    const { id } = req.params;

    const conversationService = new ConversationService(req.clientDb);
    const conversation = await conversationService.restoreConversation(id);

    res.json({
      status: 'success',
      data: conversation,
      message: 'Conversation restored successfully',
    });
  } catch (error) {
    console.error('Failed to restore conversation:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to restore conversation',
    });
  }
});

/**
 * POST /api/v1/conversations/:id/messages
 * Add a message to a conversation
 */
router.post('/:id/messages', validate(addMessageSchema), async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Database not available' });
      return;
    }

    const { id: conversationId } = req.params;
    const { content, role = 'USER', metadata } = req.body;

    const messageService = new MessageService(req.clientDb);
    const message = await messageService.addMessage({
      conversationId,
      content,
      role,
      metadata,
    });

    res.status(201).json({
      status: 'success',
      data: message,
      message: 'Message added successfully',
    });
  } catch (error) {
    console.error('Failed to add message:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to add message',
    });
  }
});

/**
 * GET /api/v1/conversations/:id/messages
 * Get messages for a conversation
 */
router.get('/:id/messages', validate(getMessagesSchema), async (req: Request, res: Response) => {
  try {
    if (!req.clientDb) {
      res.status(500).json({ status: 'error', message: 'Database not available' });
      return;
    }

    const { id: conversationId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const role = req.query.role as 'USER' | 'ASSISTANT' | 'SYSTEM' | undefined;
    const fromDate = req.query.fromDate as Date | undefined;
    const toDate = req.query.toDate as Date | undefined;

    const skip = (page - 1) * limit;

    const messageService = new MessageService(req.clientDb);
    const [messages, total] = await Promise.all([
      messageService.getMessages(conversationId, {
        skip,
        take: limit,
        role,
        fromDate,
        toDate,
      }),
      messageService.countMessages(conversationId, role, fromDate, toDate),
    ]);

    res.json({
      status: 'success',
      data: messages,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to get messages:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get messages',
    });
  }
});

/**
 * GET /api/v1/conversations/:id/messages/search
 * Search messages in a conversation
 */
router.get(
  '/:id/messages/search',
  validate(searchMessagesSchema),
  async (req: Request, res: Response) => {
    try {
      if (!req.clientDb) {
        res.status(500).json({ status: 'error', message: 'Database not available' });
        return;
      }

      const { id: conversationId } = req.params;
      const query = req.query.q as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const skip = (page - 1) * limit;

      const messageService = new MessageService(req.clientDb);
      const messages = await messageService.searchMessages(conversationId, query, {
        skip,
        take: limit,
      });

      res.json({
        status: 'success',
        data: messages,
        meta: {
          page,
          limit,
          total: messages.length,
        },
      });
    } catch (error) {
      console.error('Failed to search messages:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to search messages',
      });
    }
  }
);

export default router;
