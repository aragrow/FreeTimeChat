/**
 * Chat Service
 *
 * Main orchestration service for chat functionality
 * - Routes messages to appropriate handlers
 * - Manages conversation context
 * - Integrates memory system
 * - Generates responses
 */

import { getLLMService } from '../integrations/llm';
import { LLMRole } from '../integrations/llm/types';
import { ConversationService } from './conversation.service';
import { FieldCatalogService } from './field-catalog.service';
import { IntentParserService } from './intent-parser.service';
import { MessageService } from './message.service';
import { QueryHandlerService } from './query-handler.service';
import { reportFormatterService } from './report-formatter.service';
import { sqlGeneratorService } from './sql-generator.service';
import { sqlSecurityService } from './sql-security.service';
import { TimeEntryHandlerService } from './time-entry-handler.service';
import { UserMemoryService } from './user-memory.service';
import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { PrismaClient as MainPrismaClient } from '../generated/prisma-main';
import type { LLMMessage } from '../integrations/llm/types';
import type { DebugData } from '../types/debug.types';

export interface ChatRequest {
  userId: string;
  tenantId: string;
  userRoles: string[]; // For Phase 2 RBAC
  conversationId?: string;
  message: string;
  includeContext?: boolean;
  debugMode?: boolean;
  confirmQuery?: boolean; // Phase 3: Confirm query execution after preview
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
  debug?: DebugData;
  // Phase 3: SQL Preview
  queryPreview?: {
    sql: string;
    previewData: any[];
    totalEstimate?: number;
    requiresConfirmation: boolean;
  };
}

export class ChatService {
  private intentParser: IntentParserService;
  private timeEntryHandler: TimeEntryHandlerService;
  private queryHandler: QueryHandlerService;
  private conversationService: ConversationService;
  private messageService: MessageService;
  private memoryService: UserMemoryService;
  private fieldCatalogService: FieldCatalogService;
  private clientPrisma: ClientPrismaClient | MainPrismaClient;
  private mainPrisma: MainPrismaClient;

  constructor(clientPrisma: ClientPrismaClient | MainPrismaClient, mainPrisma: MainPrismaClient) {
    this.clientPrisma = clientPrisma;
    this.mainPrisma = mainPrisma;
    this.intentParser = new IntentParserService();
    this.timeEntryHandler = new TimeEntryHandlerService(
      clientPrisma as ClientPrismaClient,
      mainPrisma
    );
    this.queryHandler = new QueryHandlerService(clientPrisma as ClientPrismaClient, mainPrisma);
    this.conversationService = new ConversationService(clientPrisma as ClientPrismaClient);
    this.messageService = new MessageService(clientPrisma as ClientPrismaClient);
    this.memoryService = new UserMemoryService(clientPrisma as ClientPrismaClient);
    this.fieldCatalogService = new FieldCatalogService();
  }

  /**
   * Process a chat message
   */
  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const timing = {
      intentParsing: 0,
      contextBuilding: 0,
      llmCall: 0,
      total: 0,
    };

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
      const intentStartTime = Date.now();
      const parsed = await this.intentParser.parseMessage(request.message);
      timing.intentParsing = Date.now() - intentStartTime;

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
        default: {
          const result = await this.handleGeneralChat(
            request.userId,
            request.message,
            conversationId,
            request.debugMode,
            timing,
            request.tenantId,
            request.userRoles,
            request.confirmQuery
          );
          response = typeof result === 'string' ? result : result.response;
          if (typeof result !== 'string' && result.debugData) {
            // Store debug data for later use
            (request as any)._debugData = result.debugData;
          }
          if (typeof result !== 'string' && result.queryPreview) {
            // Store query preview for later use
            (request as any)._queryPreview = result.queryPreview;
          }
          break;
        }
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

      // Calculate total timing
      timing.total = Date.now() - startTime;

      // Build debug data if requested
      let debugData: DebugData | undefined;
      if (request.debugMode) {
        const storedDebugData = (request as any)._debugData;
        debugData = {
          intent: {
            type: parsed.intent,
            confidence: parsed.confidence,
            entities: parsed.entities || {},
          },
          systemContext: storedDebugData?.systemContext || {
            systemPrompt: '',
            userFacts: [],
            conversationHistory: [],
          },
          llmRequest: storedDebugData?.llmRequest || {
            provider: 'none',
            model: '',
            temperature: 0,
            maxTokens: 0,
            messages: [],
            config: {},
          },
          llmResponse: storedDebugData?.llmResponse || {
            content: response,
            usage: {
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
            },
            finishReason: 'stop',
            model: '',
          },
          timing,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success,
        message: response,
        conversationId,
        messageId: assistantMessage.id,
        intent: parsed.intent,
        confidence: parsed.confidence,
        data: additionalData,
        context: contextInfo,
        debug: debugData,
        queryPreview: (request as any)._queryPreview, // Phase 3: Query preview data
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
    console.log(
      '[ChatService] getOrCreateConversation - userId:',
      userId,
      'conversationId:',
      conversationId
    );

    // If conversation ID provided, verify it exists
    if (conversationId) {
      const existing = await this.conversationService.getConversation(conversationId);
      if (existing) {
        console.log('[ChatService] Using existing conversation:', conversationId);
        // Activate conversation in memory
        await this.memoryService.startConversation(userId, conversationId);
        return conversationId;
      } else {
        console.log('[ChatService] Provided conversationId not found:', conversationId);
      }
    }

    // Check for active conversation
    const activeConversation = await this.conversationService.getActiveConversation(userId);
    if (activeConversation) {
      console.log('[ChatService] Using active conversation:', activeConversation.id);
      await this.memoryService.startConversation(userId, activeConversation.id);
      return activeConversation.id;
    }

    // Create new conversation
    console.log('[ChatService] Creating new conversation for user:', userId);
    const newConversation = await this.conversationService.startConversation({
      userId,
      title: 'New Chat',
    });

    await this.memoryService.startConversation(userId, newConversation.id);
    console.log('[ChatService] Created new conversation:', newConversation.id);

    return newConversation.id;
  }

  /**
   * Handle general chat messages
   */
  private async handleGeneralChat(
    userId: string,
    message: string,
    conversationId: string,
    debugMode?: boolean,
    timing?: { intentParsing: number; contextBuilding: number; llmCall: number; total: number },
    tenantId?: string,
    userRoles?: string[],
    confirmQuery?: boolean
  ): Promise<string | { response: string; debugData: any; queryPreview?: any }> {
    // Get LLM service and provider for this tenant
    console.log('[ChatService] handleGeneralChat called with tenantId:', tenantId);
    const llmService = getLLMService();
    // Treat 'system' as null for system-wide LLM configuration
    const effectiveTenantId = !tenantId || tenantId === 'system' ? null : tenantId;
    console.log('[ChatService] Effective tenantId for LLM lookup:', effectiveTenantId);
    const llmProvider = await llmService.getProviderForTenant(effectiveTenantId);

    console.log('[ChatService] Provider loaded:', {
      hasProvider: !!llmProvider,
      providerName: llmProvider?.getProviderName(),
      defaultModel: llmProvider?.getDefaultModel(),
    });

    // Check if LLM is configured
    if (!llmProvider) {
      console.log('[ChatService] No provider available, falling back to pattern-based response');
      // Fall back to pattern-based responses
      return this.generateFallbackResponse(userId, message);
    }

    // Initialize queryPreviewData outside try block to avoid scope issues
    let queryPreviewData: any = null;

    try {
      // PHASE 1: SQL Generation
      // Determine which database to use (admin = main, user = client/tenant)
      const isAdmin = !effectiveTenantId || effectiveTenantId === null;
      const targetDatabase = isAdmin ? this.mainPrisma : this.clientPrisma;

      console.log('[ChatService] Phase 1: SQL Generation', {
        isAdmin,
        tenantId: effectiveTenantId,
        databaseType: isAdmin ? 'main' : 'client',
      });

      // Try to generate SQL from the user's query
      let sqlContext = '';
      try {
        const sqlResult = await sqlGeneratorService.generateSQL(message, isAdmin, llmProvider);

        console.log('[ChatService] SQL generated:', {
          tables: sqlResult.tables,
          explanation: sqlResult.explanation,
        });

        // Determine user role for RBAC from request
        const userRole = sqlSecurityService.getUserRole(userRoles || ['user']);

        // PHASE 3: SQL Preview and Confirmation
        if (!confirmQuery) {
          // First time: Execute preview with LIMIT 5
          console.log('[ChatService] Phase 3: Executing preview (no confirmation yet)');

          const previewResult = await sqlGeneratorService.executePreview(
            sqlResult.sql,
            targetDatabase,
            userRole,
            userId,
            effectiveTenantId
          );

          console.log('[ChatService] Preview result:', {
            success: previewResult.success,
            rowCount: previewResult.rowCount,
          });

          if (previewResult.success) {
            // Store preview data to return to user
            queryPreviewData = {
              sql: sqlResult.sql,
              previewData: previewResult.data || [],
              totalEstimate: previewResult.rowCount,
              requiresConfirmation: true,
            };

            // Set context for LLM to inform user about preview
            // Convert BigInt to strings for JSON serialization
            const previewDataSafe = JSON.parse(
              JSON.stringify(previewResult.data, (_, v) =>
                typeof v === 'bigint' ? v.toString() : v
              )
            );
            sqlContext = `\n\n**Query Preview (5 most recent results):**\nQuery: "${message}"\n\nPreview shows ${previewResult.rowCount} result${previewResult.rowCount !== 1 ? 's' : ''}:\n\`\`\`json\n${JSON.stringify(previewDataSafe, null, 2)}\n\`\`\`\n\nSQL: \`${sqlResult.sql}\`\n\n⚠️ IMPORTANT: This is a PREVIEW with LIMIT 5. The user must confirm if they want to execute the full query. Please inform the user:\n1. Show them a summary of the preview data\n2. Ask if they want to proceed with the full query\n3. Explain they should reply "yes" or "confirm" to execute the full query`;
            console.log(
              '[ChatService] sqlContext SET (length:',
              sqlContext.length,
              ', preview:',
              sqlContext.substring(0, 150),
              ')'
            );
          } else {
            sqlContext = `\n\n**Query Preview Failed:**\nAttempted to preview: "${message}"\nError: ${previewResult.error}\n\nPlease let the user know there was an issue with their query and suggest they rephrase it.`;
            console.log(
              '[ChatService] sqlContext SET (error case, length:',
              sqlContext.length,
              ')'
            );
          }
        } else {
          // User confirmed: Execute full query with Phase 2 security validation
          console.log('[ChatService] Phase 3: Executing FULL query (user confirmed)');

          const executionResult = await sqlGeneratorService.executeQuery(
            sqlResult.sql,
            targetDatabase,
            userRole,
            userId,
            effectiveTenantId
          );

          console.log('[ChatService] SQL execution result:', {
            success: executionResult.success,
            rowCount: executionResult.rowCount,
          });

          // PHASE 4: Report Formatting
          // Format results for LLM context with intelligent formatting
          if (executionResult.success && executionResult.rowCount && executionResult.rowCount > 0) {
            console.log('[ChatService] Phase 4: Detecting report format from user query');

            // Detect desired format from user query
            const formatResult = reportFormatterService.detectFormat(message);

            console.log('[ChatService] Detected format:', {
              primaryFormat: formatResult.primaryFormat,
              confidence: formatResult.confidence,
              keywords: formatResult.detectedKeywords,
            });

            // Use Phase 4 formatter to create enhanced LLM instructions
            sqlContext = reportFormatterService.formatResultsContext(
              message,
              executionResult.data || [],
              executionResult.rowCount,
              formatResult
            );
          } else if (executionResult.success && executionResult.rowCount === 0) {
            sqlContext = `\n\n**Database Query Results:**\nQuery: "${message}"\n\nNo matching records found in the database.\nSQL used: \`${sqlResult.sql}\`\n\nPlease let the user know that no results were found for their query.`;
          } else if (!executionResult.success) {
            sqlContext = `\n\n**Database Query Error:**\nAttempted to query: "${message}"\nError: ${executionResult.error}\n\nPlease let the user know there was an issue with their query and suggest they rephrase it.`;
          }
        }
      } catch (sqlError) {
        // SQL generation failed - this is okay, the query might not require database access
        console.log(
          '[ChatService] SQL generation skipped or failed:',
          sqlError instanceof Error ? sqlError.message : 'Unknown error'
        );
        // Continue with normal chat flow
      }

      // Get memory context
      const contextStartTime = Date.now();
      const memoryContext = await this.memoryService.getMemoryContext(userId);

      // Get recent conversation messages for context
      const recentMessages = await this.messageService.getMessages(conversationId, { take: 10 });

      // Build messages for LLM
      const llmMessages: LLMMessage[] = [];

      // System message with base context (without SQL - we'll add that separately)
      // Phase 1: Include field catalog for intent & field identification
      const systemContext = this.buildSystemContext(
        userId,
        userRoles || ['user'],
        tenantId || 'system',
        memoryContext
      );

      llmMessages.push({
        role: LLMRole.SYSTEM,
        content: systemContext,
      });

      // Add recent conversation history (EXCLUDING the current user message - we'll add that with SQL context)
      for (const msg of recentMessages.reverse()) {
        // Skip the last message if it matches our current message (we'll add it with SQL context below)
        if (msg.role === 'USER' && msg.content === message) {
          continue; // Skip it - we'll add it with SQL context below
        }
        llmMessages.push({
          role: msg.role === 'USER' ? LLMRole.USER : LLMRole.ASSISTANT,
          content: msg.content,
        });
      }

      // ALWAYS add the current user message with SQL context if available
      // This ensures the LLM sees the query results right before answering
      let userMessage = message;
      if (sqlContext) {
        // Inject SQL results directly into the user's message so LLM can't ignore it
        userMessage = `${message}\n\n[SYSTEM NOTE: I have executed a database query for you. Here are the results:${sqlContext}]\n\nPlease answer the user's question: "${message}" using the data provided above.`;
      }

      // Always add the current user message (with or without SQL context)
      llmMessages.push({
        role: LLMRole.USER,
        content: userMessage,
      });

      if (timing) {
        timing.contextBuilding = Date.now() - contextStartTime;
      }

      // Get LLM response
      const llmStartTime = Date.now();
      const llmConfig = {
        temperature: 0.7,
        maxTokens: 500,
      };
      console.log('[ChatService] Calling LLM with', llmMessages.length, 'messages');
      console.log('[ChatService] Has sqlContext:', !!sqlContext);

      // Log ALL messages being sent to LLM for debugging
      llmMessages.forEach((msg, idx) => {
        const contentStr =
          typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        const preview = contentStr.substring(0, 200).replace(/\n/g, '\\n');
        console.log(`[ChatService] Message ${idx} (${msg.role}):`, preview, '...');
      });

      const response = await llmProvider.complete(llmMessages, llmConfig);
      console.log('[ChatService] LLM response received:', {
        contentLength: response.content?.length || 0,
        contentPreview: response.content?.substring(0, 200) || '(empty)',
        model: response.model,
      });

      if (timing) {
        timing.llmCall = Date.now() - llmStartTime;
      }

      // Return debug data if requested
      if (debugMode) {
        const userFacts = memoryContext.longTerm?.userFacts || [];
        const debugDataToReturn = {
          response: response.content,
          debugData: {
            systemContext: {
              systemPrompt: systemContext,
              userFacts: userFacts.map((f) => f.fact),
              conversationHistory: recentMessages.map((m) => ({
                role: m.role,
                content: m.content,
              })),
            },
            llmRequest: {
              provider: llmProvider.getProviderName(),
              model: response.model || llmProvider.getDefaultModel(),
              temperature: llmConfig.temperature,
              maxTokens: llmConfig.maxTokens,
              messages: llmMessages.map((m) => ({
                role: m.role,
                content: m.content,
              })),
              config: llmConfig,
            },
            llmResponse: {
              content: response.content,
              usage: response.usage || {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
              },
              finishReason: response.finishReason || 'stop',
              model: response.model || llmProvider.getDefaultModel(),
            },
          },
        };
        console.log('[ChatService] Debug data generated:', {
          provider: debugDataToReturn.debugData.llmRequest.provider,
          model: debugDataToReturn.debugData.llmRequest.model,
        });
        return { ...debugDataToReturn, queryPreview: queryPreviewData };
      }

      // Return with query preview if available
      if (queryPreviewData) {
        return { response: response.content, debugData: null, queryPreview: queryPreviewData };
      }

      return response.content;
    } catch (error) {
      console.error(
        '[ChatService] LLM request failed, falling back to pattern-based response:',
        error
      );
      return this.generateFallbackResponse(userId, message);
    }
  }

  /**
   * Build system context for LLM
   * Phase 1: Includes field catalog for intent & field identification
   */
  private buildSystemContext(
    userId: string,
    userRoles: string[],
    tenantId: string,
    memoryContext: { longTerm?: { userFacts?: { factType: string; fact: string }[] } }
  ): string {
    const userFacts = memoryContext.longTerm?.userFacts || [];

    // Determine database type (main for admins, client for users)
    const isAdmin = userRoles.includes('admin');
    const effectiveTenantId = !tenantId || tenantId === 'system' ? null : tenantId;
    const databaseType = isAdmin && !effectiveTenantId ? 'main' : 'client';

    let systemMessage = `You are FreeTimeChat, an AI assistant for time tracking and project management.

Your capabilities:
- Log time entries for projects
- Query time tracking data and answer questions about the database
- Provide insights about work patterns
- Help with project management

Instructions:
- Be concise and helpful
- Use natural, conversational language
- When users ask questions about data, I will provide database query results in your context
- IMPORTANT: When you receive "Query Preview" or "Database Query Results" in the context, USE that data to answer the user's question directly
- Answer data questions with the actual numbers and information from the query results
- When users mention time entries, guide them to use specific commands
- Remember user context and preferences

`;

    // Phase 1: Append field catalog for intent & field identification
    try {
      const catalog = this.fieldCatalogService.getFieldCatalog({
        databaseType,
        userRole: userRoles,
        maxSynonymsPerField: 5,
      });

      // Use minimal format to save tokens
      const fieldCatalogContext = this.fieldCatalogService.formatForPromptMinimal(catalog, 3);

      systemMessage += `\n${fieldCatalogContext}\n\n`;

      console.log('[ChatService] Phase 1: Field catalog appended to system prompt');
      const stats = this.fieldCatalogService.getCatalogStats(catalog);
      console.log('[ChatService] Field catalog stats:', stats);
    } catch (error) {
      console.error('[ChatService] Failed to load field catalog:', error);
      // Continue without field catalog - it's not critical
    }

    if (userFacts.length > 0) {
      systemMessage += `\nContext about this user:\n`;
      for (const fact of userFacts) {
        systemMessage += `- ${fact.fact}\n`;
      }
    }

    systemMessage += `\nCurrent user ID: ${userId}`;

    return systemMessage;
  }

  /**
   * Generate fallback response when LLM is not available
   */
  private async generateFallbackResponse(userId: string, message: string): Promise<string> {
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
