/**
 * Chat Service
 *
 * Main orchestration service for chat functionality
 * - Routes messages to appropriate handlers
 * - Manages conversation context
 * - Integrates memory system
 * - Generates responses
 */

import { ConversationService } from './conversation.service';
import { IntentParserService } from './intent-parser.service';
import { MessageService } from './message.service';
import { QueryHandlerService } from './query-handler.service';
import { TimeEntryHandlerService } from './time-entry-handler.service';
import { UserMemoryService } from './user-memory.service';
import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { PrismaClient as MainPrismaClient } from '../generated/prisma-main';

export interface ChatRequest {
  userId: string;
  conversationId?: string;
  message: string;
  includeContext?: boolean;
}

export interface ChatResponse {
  success: boolean;
  message: string;
  conversationId: string;
  messageId: string;
  intent?: string;
  confidence?: number;
  data?: unknown;
  context?: {
    messagesRetrieved: number;
    memoryUsed: boolean;
  };
}

export class ChatService {
  private intentParser: IntentParserService;
  private timeEntryHandler: TimeEntryHandlerService;
  private queryHandler: QueryHandlerService;
  private conversationService: ConversationService;
  private messageService: MessageService;
  private memoryService: UserMemoryService;

  constructor(
    private clientPrisma: ClientPrismaClient,
    private mainPrisma: MainPrismaClient
  ) {
    this.intentParser = new IntentParserService();
    this.timeEntryHandler = new TimeEntryHandlerService(clientPrisma, mainPrisma);
    this.queryHandler = new QueryHandlerService(clientPrisma, mainPrisma);
    this.conversationService = new ConversationService(clientPrisma);
    this.messageService = new MessageService(clientPrisma);
    this.memoryService = new UserMemoryService(clientPrisma);
  }

  /**
   * Process a chat message
   */
  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      // Get or create conversation
      const conversationId = await this.getOrCreateConversation(
        request.userId,
        request.conversationId
      );

      // Store user message
      const userMessage = await this.messageService.addMessage({
        conversationId,
        role: 'USER',
        content: request.message,
        metadata: {},
      });

      // Update memory with user message
      await this.memoryService.storeMessage(conversationId, request.userId, userMessage);

      // Parse intent
      const parsed = await this.intentParser.parseMessage(request.message);

      // Store intent in user message metadata
      await this.messageService.updateMessageMetadata(userMessage.id, {
        intent: parsed.intent,
        confidence: parsed.confidence,
        entities: parsed.entities,
      });

      // Route to appropriate handler
      let response: string;
      let additionalData: unknown = null;
      let success = true;

      switch (parsed.intent) {
        case 'time_entry': {
          const timeEntryResult = await this.timeEntryHandler.handleTimeEntry(
            request.userId,
            request.message
          );
          response = timeEntryResult.message;
          additionalData = timeEntryResult.timeEntry;
          success = timeEntryResult.success;

          if (timeEntryResult.errors) {
            response += `\n\n${timeEntryResult.errors.join('\n')}`;
          }
          break;
        }

        case 'query': {
          const queryResult = await this.queryHandler.handleQuery(request.userId, request.message);
          response = queryResult.message;
          additionalData = queryResult.data;
          success = queryResult.success;
          break;
        }

        case 'help':
          response = this.generateHelpMessage();
          break;

        case 'general':
        default:
          response = await this.handleGeneralChat(request.userId, request.message, conversationId);
          break;
      }

      // Store assistant response
      const assistantMessage = await this.messageService.addMessage({
        conversationId,
        role: 'ASSISTANT',
        content: response,
        metadata: {
          intent: parsed.intent,
          confidence: parsed.confidence,
          success,
        },
      });

      // Update memory with assistant response
      await this.memoryService.storeMessage(conversationId, request.userId, assistantMessage);

      // Learn from interaction
      await this.memoryService.learnFromInteraction(
        request.userId,
        request.message,
        response,
        success
      );

      // Get context information
      const contextInfo = request.includeContext
        ? await this.getContextInfo(conversationId)
        : undefined;

      return {
        success,
        message: response,
        conversationId,
        messageId: assistantMessage.id,
        intent: parsed.intent,
        confidence: parsed.confidence,
        data: additionalData,
        context: contextInfo,
      };
    } catch (error) {
      console.error('Failed to process chat message:', error);

      // Return error response
      return {
        success: false,
        message:
          error instanceof Error
            ? `Sorry, I encountered an error: ${error.message}`
            : 'Sorry, I encountered an unexpected error. Please try again.',
        conversationId: request.conversationId || '',
        messageId: '',
      };
    }
  }

  /**
   * Get or create conversation
   */
  private async getOrCreateConversation(userId: string, conversationId?: string): Promise<string> {
    // If conversation ID provided, verify it exists
    if (conversationId) {
      const existing = await this.conversationService.getConversation(conversationId);
      if (existing) {
        // Activate conversation in memory
        await this.memoryService.startConversation(userId, conversationId);
        return conversationId;
      }
    }

    // Check for active conversation
    const activeConversation = await this.conversationService.getActiveConversation(userId);
    if (activeConversation) {
      await this.memoryService.startConversation(userId, activeConversation.id);
      return activeConversation.id;
    }

    // Create new conversation
    const newConversation = await this.conversationService.startConversation({
      userId,
      title: 'New Chat',
    });

    await this.memoryService.startConversation(userId, newConversation.id);

    return newConversation.id;
  }

  /**
   * Handle general chat messages
   */
  private async handleGeneralChat(
    userId: string,
    message: string,
    _conversationId: string
  ): Promise<string> {
    // Get memory context
    const memoryContext = await this.memoryService.getMemoryContext(userId);

    // Generate contextual response
    const greeting = /^(hi|hello|hey|good morning|good afternoon)\b/i.test(message);
    const thanks = /^(thanks|thank you|thx)\b/i.test(message);

    if (greeting) {
      const userFacts = memoryContext.longTerm?.userFacts || [];
      const recentWork = userFacts.find((f) => f.factType === 'work_pattern');

      let response = 'Hello! How can I help you today?';

      if (recentWork) {
        response +=
          '\n\nI remember your recent work patterns. Feel free to ask me to log time or check your hours.';
      }

      return response;
    }

    if (thanks) {
      return "You're welcome! Let me know if you need anything else.";
    }

    // Default response with suggestions
    return `I'm here to help with time tracking and project management. Try saying:
  • "I worked 2 hours on Project X"
  • "How much time did I log today?"
  • "Show me my hours this week"

Type "help" for more information.`;
  }

  /**
   * Generate help message
   */
  private generateHelpMessage(): string {
    return `**FreeTimeChat Help**

I can help you with:

**Time Entry:**
  • "I worked 2 hours on Project X today"
  • "Log 3.5 hours for the client meeting yesterday"
  • "Add time entry from 9am to 5pm for Development"

**Queries:**
  • "How much time did I log today?"
  • "Show me my hours this week"
  • "What did I work on yesterday?"
  • "Total hours for Project X this month"

**Tips:**
  • Be specific about projects
  • Use natural language
  • Check your time regularly

Need something else? Just ask!`;
  }

  /**
   * Get context information about the conversation
   */
  private async getContextInfo(conversationId: string): Promise<{
    messagesRetrieved: number;
    memoryUsed: boolean;
  }> {
    try {
      const messages = await this.messageService.getMessages(conversationId, { take: 10 });

      return {
        messagesRetrieved: messages.length,
        memoryUsed: true,
      };
    } catch (error) {
      console.error('Failed to get context info:', error);
      return {
        messagesRetrieved: 0,
        memoryUsed: false,
      };
    }
  }

  /**
   * Get conversation context for UI
   */
  async getConversationContext(conversationId: string, userId: string) {
    try {
      const [conversation, messages, memoryContext] = await Promise.all([
        this.conversationService.getConversation(conversationId),
        this.messageService.getConversationContext(conversationId, 20),
        this.memoryService.getMemoryContext(userId),
      ]);

      return {
        conversation,
        messages,
        memory: memoryContext,
      };
    } catch (error) {
      console.error('Failed to get conversation context:', error);
      return null;
    }
  }

  /**
   * End a conversation
   */
  async endConversation(conversationId: string, userId: string): Promise<boolean> {
    try {
      await this.conversationService.archiveConversation(conversationId);
      await this.memoryService.endConversation(userId, conversationId);

      return true;
    } catch (error) {
      console.error('Failed to end conversation:', error);
      return false;
    }
  }
}
