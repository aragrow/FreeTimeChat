# Long-Term Memory Architecture for Chat System

This document outlines the comprehensive memory system for FreeTimeChat's conversational interface, enabling context-aware interactions and continuous learning from user behavior.

## Overview

The memory system provides:
- **Short-term memory**: Active conversation context (current session)
- **Long-term memory**: Historical conversations and learned patterns
- **Semantic memory**: Understanding of user preferences, projects, and work patterns
- **Episodic memory**: Specific conversation instances and their outcomes

### Memory Hierarchy

```
┌─────────────────────────────────────────────────────┐
│                  User Interaction                    │
└─────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼────────┐          ┌──────▼─────────┐
│  Short-term    │          │   Long-term    │
│  Memory        │          │   Memory       │
│  (Redis)       │◄────────►│   (PostgreSQL) │
│  - Session     │          │   - History    │
│  - Context     │          │   - Patterns   │
└────────────────┘          └────────┬───────┘
                                     │
                            ┌────────▼────────┐
                            │  Semantic       │
                            │  Memory         │
                            │  (Vector Store) │
                            │  - Embeddings   │
                            │  - Similarity   │
                            └─────────────────┘
```

---

## Storage Options Analysis

### Option 1: PostgreSQL + pgvector (Recommended)

**Best for:** Production-ready system with all memory types in one database

**Advantages:**
- ✅ Single database for all data (already using PostgreSQL)
- ✅ ACID compliance for conversation integrity
- ✅ pgvector extension for semantic search
- ✅ Complex queries and joins
- ✅ Transaction support
- ✅ Battle-tested and reliable
- ✅ Free and open source

**Disadvantages:**
- ❌ Requires pgvector extension setup
- ❌ Vector operations slower than specialized vector DBs at massive scale

**When to use:** Default choice for most deployments

---

### Option 2: PostgreSQL + Redis + Pinecone/Weaviate

**Best for:** High-scale production with advanced semantic search

**Advantages:**
- ✅ PostgreSQL for structured data
- ✅ Redis for fast session/cache
- ✅ Specialized vector DB for semantic search
- ✅ Optimized vector operations
- ✅ Advanced semantic features

**Disadvantages:**
- ❌ Multiple databases to manage
- ❌ Additional cost (Pinecone is paid)
- ❌ More complex architecture

**When to use:** Large-scale deployment with millions of conversations

---

### Option 3: Flat Files + SQLite

**Best for:** Development, prototyping, or single-user deployments

**Advantages:**
- ✅ Simple setup
- ✅ No external dependencies
- ✅ Easy to backup (just copy files)
- ✅ Good for local development

**Disadvantages:**
- ❌ Not suitable for multi-user production
- ❌ No concurrent write support
- ❌ Limited query capabilities
- ❌ No built-in vector search

**When to use:** Development/testing only

---

### Option 4: Google Cloud Firestore + Cloud Storage

**Best for:** Google Cloud-native deployments

**Advantages:**
- ✅ Managed service (no server maintenance)
- ✅ Real-time sync capabilities
- ✅ Automatic scaling
- ✅ Good mobile/offline support
- ✅ Integrated with Google ecosystem

**Disadvantages:**
- ❌ Vendor lock-in
- ❌ Different query model than SQL
- ❌ Can get expensive at scale
- ❌ Limited complex query support

**When to use:** If fully committed to Google Cloud Platform

---

## Recommended Architecture: PostgreSQL + pgvector + Redis

### Why This Combination?

1. **PostgreSQL**: Already our primary database, handles structured data perfectly
2. **pgvector**: Extension adds vector similarity search to PostgreSQL
3. **Redis**: Fast in-memory cache for active conversations

### Cost: **FREE** (all open source)

---

## Database Schema

### Conversations Table

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255), -- Auto-generated or user-provided
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  message_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'archived', 'deleted'
  metadata JSONB DEFAULT '{}', -- Flexible metadata

  -- Indexes
  CONSTRAINT valid_status CHECK (status IN ('active', 'archived', 'deleted'))
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at);
CREATE INDEX idx_conversations_status ON conversations(status);
```

### Messages Table (Enhanced)

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Message content
  role VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,

  -- Intent and extraction
  intent VARCHAR(100), -- 'log_time', 'view_entries', 'create_project', etc.
  extracted_data JSONB, -- Parsed entities (project, hours, date, etc.)
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00

  -- Action tracking
  action_performed BOOLEAN DEFAULT false,
  action_result JSONB, -- Result of the action (success, error, data)

  -- Metadata
  tokens_used INTEGER, -- Token count for cost tracking
  processing_time_ms INTEGER, -- Response time in milliseconds
  model_version VARCHAR(50), -- Which model/version was used

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_role CHECK (role IN ('user', 'assistant', 'system'))
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_intent ON messages(intent);
```

### Conversation Context Table (Working Memory)

```sql
CREATE TABLE conversation_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,

  -- Active context
  current_project_id UUID REFERENCES projects(id),
  current_date DATE DEFAULT CURRENT_DATE,
  pending_clarification JSONB, -- Questions waiting for user response

  -- Recent entities mentioned
  recent_projects JSONB DEFAULT '[]', -- Array of project IDs
  recent_time_entries JSONB DEFAULT '[]', -- Array of entry IDs
  recent_dates JSONB DEFAULT '[]', -- Array of dates discussed

  -- Conversation state
  conversation_stage VARCHAR(50), -- 'greeting', 'logging_time', 'clarifying', etc.
  awaiting_user_input BOOLEAN DEFAULT false,
  last_intent VARCHAR(100),

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_conversation_context UNIQUE(conversation_id)
);

CREATE INDEX idx_conversation_context_conversation_id ON conversation_context(conversation_id);
```

### User Memory (Long-term Preferences)

```sql
CREATE TABLE user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Learned preferences
  preferred_time_format VARCHAR(50), -- '12h', '24h', 'duration'
  default_project_id UUID REFERENCES projects(id),
  typical_work_hours JSONB, -- e.g., {"start": "09:00", "end": "17:00"}
  common_tasks JSONB DEFAULT '[]', -- Frequently mentioned tasks

  -- Interaction patterns
  preferred_confirmation_style VARCHAR(50), -- 'verbose', 'concise'
  language_preference VARCHAR(10) DEFAULT 'en',

  -- Statistics
  total_conversations INTEGER DEFAULT 0,
  total_time_entries_via_chat INTEGER DEFAULT 0,
  average_session_length_minutes INTEGER,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_user_memory UNIQUE(user_id)
);
```

### Semantic Memory (Vector Embeddings)

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE message_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Vector embedding (1536 dimensions for OpenAI text-embedding-ada-002)
  embedding vector(1536),

  -- Metadata for filtering
  intent VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_message_embedding UNIQUE(message_id)
);

-- Vector similarity index (HNSW for fast approximate nearest neighbor search)
CREATE INDEX idx_message_embeddings_vector ON message_embeddings
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_message_embeddings_user_id ON message_embeddings(user_id);
CREATE INDEX idx_message_embeddings_conversation_id ON message_embeddings(conversation_id);
```

### Conversation Summaries (for Long Conversations)

```sql
CREATE TABLE conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,

  -- Summary content
  summary_text TEXT NOT NULL,
  message_count_summarized INTEGER, -- How many messages were summarized
  key_topics JSONB DEFAULT '[]', -- Main topics discussed
  key_entities JSONB DEFAULT '{}', -- Projects, dates, tasks mentioned

  -- Summary metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_conversation_summary UNIQUE(conversation_id)
);
```

---

## Prisma Schema

```prisma
model Conversation {
  id             String              @id @default(uuid())
  userId         String              @map("user_id")
  user           User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  title          String?
  startedAt      DateTime            @default(now()) @map("started_at")
  lastMessageAt  DateTime            @default(now()) @map("last_message_at")
  messageCount   Int                 @default(0) @map("message_count")
  status         ConversationStatus  @default(ACTIVE)
  metadata       Json                @default("{}")

  messages       Message[]
  context        ConversationContext?
  summary        ConversationSummary?
  embeddings     MessageEmbedding[]

  @@index([userId])
  @@index([lastMessageAt])
  @@index([status])
  @@map("conversations")
}

model Message {
  id                 String        @id @default(uuid())
  conversationId     String        @map("conversation_id")
  conversation       Conversation  @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  userId             String        @map("user_id")
  user               User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  role               MessageRole
  content            String
  intent             String?
  extractedData      Json?         @map("extracted_data")
  confidenceScore    Decimal?      @map("confidence_score") @db.Decimal(3, 2)

  actionPerformed    Boolean       @default(false) @map("action_performed")
  actionResult       Json?         @map("action_result")

  tokensUsed         Int?          @map("tokens_used")
  processingTimeMs   Int?          @map("processing_time_ms")
  modelVersion       String?       @map("model_version")

  createdAt          DateTime      @default(now()) @map("created_at")

  embedding          MessageEmbedding?

  @@index([conversationId])
  @@index([userId])
  @@index([createdAt])
  @@index([intent])
  @@map("messages")
}

model ConversationContext {
  id                   String       @id @default(uuid())
  conversationId       String       @unique @map("conversation_id")
  conversation         Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  currentProjectId     String?      @map("current_project_id")
  currentDate          DateTime?    @default(now()) @map("current_date") @db.Date
  pendingClarification Json?        @map("pending_clarification")

  recentProjects       Json         @default("[]") @map("recent_projects")
  recentTimeEntries    Json         @default("[]") @map("recent_time_entries")
  recentDates          Json         @default("[]") @map("recent_dates")

  conversationStage    String?      @map("conversation_stage")
  awaitingUserInput    Boolean      @default(false) @map("awaiting_user_input")
  lastIntent           String?      @map("last_intent")

  updatedAt            DateTime     @updatedAt @map("updated_at")

  @@map("conversation_context")
}

model UserMemory {
  id                            String   @id @default(uuid())
  userId                        String   @unique @map("user_id")
  user                          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  preferredTimeFormat           String?  @map("preferred_time_format")
  defaultProjectId              String?  @map("default_project_id")
  typicalWorkHours              Json?    @map("typical_work_hours")
  commonTasks                   Json     @default("[]") @map("common_tasks")

  preferredConfirmationStyle    String?  @map("preferred_confirmation_style")
  languagePreference            String   @default("en") @map("language_preference")

  totalConversations            Int      @default(0) @map("total_conversations")
  totalTimeEntriesViaChat       Int      @default(0) @map("total_time_entries_via_chat")
  averageSessionLengthMinutes   Int?     @map("average_session_length_minutes")

  createdAt                     DateTime @default(now()) @map("created_at")
  updatedAt                     DateTime @updatedAt @map("updated_at")

  @@map("user_memory")
}

model MessageEmbedding {
  id             String       @id @default(uuid())
  messageId      String       @unique @map("message_id")
  message        Message      @relation(fields: [messageId], references: [id], onDelete: Cascade)
  conversationId String       @map("conversation_id")
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  userId         String       @map("user_id")

  // Note: Prisma doesn't natively support vector type, use Unsupported
  embedding      Unsupported("vector(1536)")

  intent         String?
  createdAt      DateTime     @default(now()) @map("created_at")

  @@index([userId])
  @@index([conversationId])
  @@map("message_embeddings")
}

model ConversationSummary {
  id                    String       @id @default(uuid())
  conversationId        String       @unique @map("conversation_id")
  conversation          Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  summaryText           String       @map("summary_text")
  messageCountSummarized Int         @map("message_count_summarized")
  keyTopics             Json         @default("[]") @map("key_topics")
  keyEntities           Json         @default("{}") @map("key_entities")

  createdAt             DateTime     @default(now()) @map("created_at")

  @@map("conversation_summaries")
}

enum ConversationStatus {
  ACTIVE
  ARCHIVED
  DELETED
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}
```

---

## Memory Service Implementation

### 1. Conversation Memory Service

```typescript
// apps/api/src/services/memory/conversationMemoryService.ts
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export class ConversationMemoryService {
  /**
   * Start a new conversation
   */
  static async startConversation(userId: string) {
    const conversation = await prisma.conversation.create({
      data: {
        id: uuidv4(),
        userId,
        title: 'New Conversation',
        status: 'ACTIVE',
      },
    });

    // Initialize context
    await prisma.conversationContext.create({
      data: {
        conversationId: conversation.id,
        conversationStage: 'greeting',
      },
    });

    return conversation;
  }

  /**
   * Add message to conversation
   */
  static async addMessage(
    conversationId: string,
    userId: string,
    role: 'USER' | 'ASSISTANT' | 'SYSTEM',
    content: string,
    metadata: {
      intent?: string;
      extractedData?: any;
      confidenceScore?: number;
      actionPerformed?: boolean;
      actionResult?: any;
      tokensUsed?: number;
      processingTimeMs?: number;
      modelVersion?: string;
    } = {}
  ) {
    const message = await prisma.message.create({
      data: {
        conversationId,
        userId,
        role,
        content,
        ...metadata,
      },
    });

    // Update conversation last message time and count
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        messageCount: { increment: 1 },
      },
    });

    return message;
  }

  /**
   * Get conversation history with pagination
   */
  static async getConversationHistory(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ) {
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get recent conversations for user
   */
  static async getUserConversations(
    userId: string,
    limit: number = 10,
    status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE'
  ) {
    return prisma.conversation.findMany({
      where: {
        userId,
        status,
      },
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  /**
   * Update conversation context
   */
  static async updateContext(
    conversationId: string,
    updates: {
      currentProjectId?: string;
      currentDate?: Date;
      pendingClarification?: any;
      recentProjects?: string[];
      conversationStage?: string;
      awaitingUserInput?: boolean;
      lastIntent?: string;
    }
  ) {
    return prisma.conversationContext.upsert({
      where: { conversationId },
      update: updates,
      create: {
        conversationId,
        ...updates,
      },
    });
  }

  /**
   * Get conversation context
   */
  static async getContext(conversationId: string) {
    return prisma.conversationContext.findUnique({
      where: { conversationId },
    });
  }

  /**
   * Archive old conversations (for cleanup)
   */
  static async archiveOldConversations(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return prisma.conversation.updateMany({
      where: {
        lastMessageAt: { lt: cutoffDate },
        status: 'ACTIVE',
      },
      data: {
        status: 'ARCHIVED',
      },
    });
  }
}
```

### 2. Semantic Memory Service (Vector Search)

```typescript
// apps/api/src/services/memory/semanticMemoryService.ts
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class SemanticMemoryService {
  /**
   * Generate embedding for text
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  }

  /**
   * Store message with embedding
   */
  static async storeMessageEmbedding(
    messageId: string,
    conversationId: string,
    userId: string,
    content: string,
    intent?: string
  ) {
    const embedding = await this.generateEmbedding(content);

    // Note: Using raw SQL because Prisma doesn't fully support vector type
    await prisma.$executeRaw`
      INSERT INTO message_embeddings (id, message_id, conversation_id, user_id, embedding, intent)
      VALUES (gen_random_uuid(), ${messageId}, ${conversationId}, ${userId}, ${embedding}::vector, ${intent})
      ON CONFLICT (message_id) DO UPDATE
      SET embedding = ${embedding}::vector, intent = ${intent}
    `;
  }

  /**
   * Find similar conversations using vector similarity
   */
  static async findSimilarMessages(
    userId: string,
    queryText: string,
    limit: number = 5,
    minSimilarity: number = 0.7
  ) {
    const queryEmbedding = await this.generateEmbedding(queryText);

    // Cosine similarity search
    const results = await prisma.$queryRaw<Array<{
      message_id: string;
      content: string;
      intent: string;
      similarity: number;
      created_at: Date;
    }>>`
      SELECT
        m.id as message_id,
        m.content,
        m.intent,
        1 - (me.embedding <=> ${queryEmbedding}::vector) as similarity,
        m.created_at
      FROM message_embeddings me
      JOIN messages m ON me.message_id = m.id
      WHERE me.user_id = ${userId}
      AND 1 - (me.embedding <=> ${queryEmbedding}::vector) > ${minSimilarity}
      ORDER BY me.embedding <=> ${queryEmbedding}::vector
      LIMIT ${limit}
    `;

    return results;
  }

  /**
   * Get context for current conversation based on semantic similarity
   */
  static async getRelevantContext(
    userId: string,
    currentMessage: string,
    excludeConversationId?: string
  ) {
    const similarMessages = await this.findSimilarMessages(
      userId,
      currentMessage,
      3,
      0.75
    );

    // Filter out current conversation if specified
    const filtered = excludeConversationId
      ? similarMessages.filter((msg) => msg.conversation_id !== excludeConversationId)
      : similarMessages;

    return filtered;
  }
}
```

### 3. User Memory Service

```typescript
// apps/api/src/services/memory/userMemoryService.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class UserMemoryService {
  /**
   * Initialize user memory
   */
  static async initializeUserMemory(userId: string) {
    return prisma.userMemory.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        preferredTimeFormat: '24h',
        languagePreference: 'en',
      },
    });
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(
    userId: string,
    preferences: {
      preferredTimeFormat?: string;
      defaultProjectId?: string;
      typicalWorkHours?: any;
      preferredConfirmationStyle?: string;
    }
  ) {
    return prisma.userMemory.upsert({
      where: { userId },
      update: preferences,
      create: {
        userId,
        ...preferences,
      },
    });
  }

  /**
   * Learn from user interaction
   */
  static async recordInteraction(
    userId: string,
    interaction: {
      conversationIncrement?: boolean;
      timeEntryCreated?: boolean;
      task?: string;
    }
  ) {
    const memory = await prisma.userMemory.findUnique({
      where: { userId },
    });

    if (!memory) {
      await this.initializeUserMemory(userId);
    }

    const updates: any = {};

    if (interaction.conversationIncrement) {
      updates.totalConversations = { increment: 1 };
    }

    if (interaction.timeEntryCreated) {
      updates.totalTimeEntriesViaChat = { increment: 1 };
    }

    if (interaction.task) {
      // Add to common tasks if not already there
      const commonTasks = (memory?.commonTasks as string[]) || [];
      if (!commonTasks.includes(interaction.task)) {
        updates.commonTasks = [...commonTasks, interaction.task].slice(-20); // Keep last 20
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.userMemory.update({
        where: { userId },
        data: updates,
      });
    }
  }

  /**
   * Get user memory/preferences
   */
  static async getUserMemory(userId: string) {
    let memory = await prisma.userMemory.findUnique({
      where: { userId },
    });

    if (!memory) {
      memory = await this.initializeUserMemory(userId);
    }

    return memory;
  }

  /**
   * Get user's common projects (from history)
   */
  static async getCommonProjects(userId: string, limit: number = 5) {
    const result = await prisma.$queryRaw<Array<{
      project_id: string;
      project_name: string;
      entry_count: number;
    }>>`
      SELECT
        p.id as project_id,
        p.name as project_name,
        COUNT(*) as entry_count
      FROM time_entries te
      JOIN projects p ON te.project_id = p.id
      WHERE te.user_id = ${userId}
      AND te.created_at > NOW() - INTERVAL '30 days'
      GROUP BY p.id, p.name
      ORDER BY entry_count DESC
      LIMIT ${limit}
    `;

    return result;
  }
}
```

### 4. Redis Cache Service (Short-term Memory)

```typescript
// apps/api/src/services/memory/cacheService.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export class CacheService {
  /**
   * Store active conversation state in Redis
   */
  static async setConversationState(
    conversationId: string,
    state: {
      stage?: string;
      pendingAction?: any;
      lastUserMessage?: string;
      lastAssistantMessage?: string;
      context?: any;
    }
  ) {
    const key = `conversation:${conversationId}:state`;
    await redis.setex(key, 3600, JSON.stringify(state)); // 1 hour TTL
  }

  /**
   * Get active conversation state
   */
  static async getConversationState(conversationId: string) {
    const key = `conversation:${conversationId}:state`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Store user's active conversation ID
   */
  static async setActiveConversation(userId: string, conversationId: string) {
    const key = `user:${userId}:active_conversation`;
    await redis.setex(key, 3600, conversationId); // 1 hour TTL
  }

  /**
   * Get user's active conversation
   */
  static async getActiveConversation(userId: string): Promise<string | null> {
    const key = `user:${userId}:active_conversation`;
    return redis.get(key);
  }

  /**
   * Cache recent messages for fast retrieval
   */
  static async cacheRecentMessages(
    conversationId: string,
    messages: any[]
  ) {
    const key = `conversation:${conversationId}:recent`;
    await redis.setex(key, 1800, JSON.stringify(messages)); // 30 minutes
  }

  /**
   * Get cached recent messages
   */
  static async getCachedRecentMessages(conversationId: string) {
    const key = `conversation:${conversationId}:recent`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Invalidate conversation cache
   */
  static async invalidateConversationCache(conversationId: string) {
    await redis.del(`conversation:${conversationId}:state`);
    await redis.del(`conversation:${conversationId}:recent`);
  }
}
```

---

## Memory Retrieval Strategy

### Context Window Construction

When a user sends a message, build context in this order:

```typescript
// apps/api/src/services/chat/contextBuilder.ts
import { ConversationMemoryService } from '../memory/conversationMemoryService';
import { SemanticMemoryService } from '../memory/semanticMemoryService';
import { UserMemoryService } from '../memory/userMemoryService';
import { CacheService } from '../memory/cacheService';

export class ContextBuilder {
  static async buildContext(userId: string, conversationId: string, userMessage: string) {
    // 1. Get recent conversation history (last 10 messages)
    const recentMessages = await ConversationMemoryService.getConversationHistory(
      conversationId,
      10
    );

    // 2. Get conversation context (current state)
    const context = await ConversationMemoryService.getContext(conversationId);

    // 3. Get user memory/preferences
    const userMemory = await UserMemoryService.getUserMemory(userId);

    // 4. Get semantically similar past interactions
    const similarPastMessages = await SemanticMemoryService.getRelevantContext(
      userId,
      userMessage,
      conversationId
    );

    // 5. Get user's common projects
    const commonProjects = await UserMemoryService.getCommonProjects(userId);

    // Construct system prompt with context
    return {
      systemPrompt: this.buildSystemPrompt(userMemory, commonProjects, context),
      conversationHistory: recentMessages.reverse(), // Chronological order
      relevantPastContext: similarPastMessages,
      currentContext: context,
    };
  }

  private static buildSystemPrompt(userMemory: any, commonProjects: any[], context: any) {
    return `You are a time tracking assistant for ${userMemory.user?.name || 'the user'}.

User Preferences:
- Time format: ${userMemory.preferredTimeFormat || '24h'}
- Language: ${userMemory.languagePreference || 'en'}
- Confirmation style: ${userMemory.preferredConfirmationStyle || 'concise'}

Common Projects:
${commonProjects.map((p) => `- ${p.project_name} (${p.entry_count} recent entries)`).join('\n')}

Current Conversation Stage: ${context?.conversationStage || 'active'}
${context?.currentProjectId ? `Current Project Context: ${context.currentProjectId}` : ''}

Help the user track their time naturally and efficiently.`;
  }
}
```

---

## Data Retention & Privacy

### Retention Policies

```typescript
// apps/api/src/services/memory/retentionService.ts
export class RetentionService {
  /**
   * Archive conversations older than specified days
   */
  static async archiveOldConversations(daysOld: number = 90) {
    await ConversationMemoryService.archiveOldConversations(daysOld);
  }

  /**
   * Delete conversations older than specified days (GDPR compliance)
   */
  static async deleteOldConversations(daysOld: number = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Soft delete first (set status to DELETED)
    await prisma.conversation.updateMany({
      where: {
        lastMessageAt: { lt: cutoffDate },
        status: { in: ['ARCHIVED', 'ACTIVE'] },
      },
      data: {
        status: 'DELETED',
      },
    });

    // Hard delete after 30 days in DELETED status
    const hardDeleteDate = new Date();
    hardDeleteDate.setDate(hardDeleteDate.getDate() - (daysOld + 30));

    await prisma.conversation.deleteMany({
      where: {
        status: 'DELETED',
        lastMessageAt: { lt: hardDeleteDate },
      },
    });
  }

  /**
   * Export user's conversation data (GDPR right to access)
   */
  static async exportUserData(userId: string) {
    const conversations = await prisma.conversation.findMany({
      where: { userId },
      include: {
        messages: true,
        context: true,
        summary: true,
      },
    });

    const userMemory = await prisma.userMemory.findUnique({
      where: { userId },
    });

    return {
      conversations,
      userMemory,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Delete all user data (GDPR right to be forgotten)
   */
  static async deleteUserData(userId: string) {
    // Cascade delete handles related records
    await prisma.conversation.deleteMany({
      where: { userId },
    });

    await prisma.userMemory.delete({
      where: { userId },
    });
  }
}
```

---

## Performance Optimization

### 1. Caching Strategy

- **Redis**: Active conversation state (1 hour TTL)
- **Redis**: Recent messages (30 min TTL)
- **PostgreSQL**: Historical data
- **Batch Operations**: Insert messages in batches for high-volume

### 2. Query Optimization

```sql
-- Compound indexes for common queries
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_user_intent ON messages(user_id, intent, created_at DESC);

-- Partial indexes for active conversations
CREATE INDEX idx_conversations_active ON conversations(user_id, last_message_at DESC)
  WHERE status = 'active';
```

### 3. Vector Search Optimization

```sql
-- Use HNSW index for faster approximate nearest neighbor search
CREATE INDEX idx_message_embeddings_vector ON message_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

---

## Implementation Checklist

### Phase 1: Basic Memory
- [ ] Set up conversations and messages tables
- [ ] Implement ConversationMemoryService
- [ ] Add conversation context tracking
- [ ] Redis cache for active sessions

### Phase 2: User Memory
- [ ] Create user_memory table
- [ ] Implement UserMemoryService
- [ ] Learn user preferences automatically
- [ ] Track interaction patterns

### Phase 3: Semantic Memory
- [ ] Install pgvector extension
- [ ] Create message_embeddings table
- [ ] Implement SemanticMemoryService
- [ ] Generate embeddings for new messages
- [ ] Vector similarity search

### Phase 4: Advanced Features
- [ ] Conversation summarization for long threads
- [ ] Automatic context pruning
- [ ] Data retention policies
- [ ] GDPR compliance (export/delete)

### Phase 5: Optimization
- [ ] Query optimization and indexing
- [ ] Caching strategy with Redis
- [ ] Background jobs for embeddings
- [ ] Monitoring and analytics

---

## Cost Analysis

### Option 1: PostgreSQL + pgvector + Redis (Recommended)
- **Database**: $0 (local) or $10-25/month (hosted)
- **Redis**: $0 (local) or $10/month (Upstash/Railway)
- **OpenAI Embeddings**: ~$0.0001 per 1K tokens
  - 100 messages/day = ~$0.10/month
- **Total**: ~$20-35/month for production

### Option 2: Pinecone (Vector DB)
- **Pinecone**: $70/month (starter plan)
- **PostgreSQL**: $10-25/month
- **Redis**: $10/month
- **OpenAI**: $0.10/month
- **Total**: ~$90-105/month

### Option 3: Google Cloud Firestore
- **Firestore**: $0.06 per 100K reads, $0.18 per 100K writes
- **Estimated**: $20-50/month depending on usage
- **Vector Search**: Additional $20-30/month

---

## Monitoring & Analytics

```typescript
// Track memory system health
export class MemoryMetrics {
  static async getMetrics(userId?: string) {
    const where = userId ? { userId } : {};

    return {
      totalConversations: await prisma.conversation.count({ where }),
      activeConversations: await prisma.conversation.count({
        where: { ...where, status: 'ACTIVE' },
      }),
      totalMessages: await prisma.message.count({ where: userId ? { userId } : {} }),
      averageMessagesPerConversation: await this.getAverageMessagesPerConversation(userId),
      embeddingsCovered: await prisma.messageEmbedding.count({ where: userId ? { userId } : {} }),
      storageUsed: await this.getStorageUsed(),
    };
  }

  private static async getAverageMessagesPerConversation(userId?: string) {
    const result = await prisma.conversation.aggregate({
      where: userId ? { userId } : {},
      _avg: { messageCount: true },
    });
    return result._avg.messageCount || 0;
  }

  private static async getStorageUsed() {
    // Query database size
    const result = await prisma.$queryRaw<Array<{ size_mb: number }>>`
      SELECT pg_database_size(current_database()) / 1024.0 / 1024.0 as size_mb
    `;
    return result[0]?.size_mb || 0;
  }
}
```

---

## Summary

**Recommended Setup for FreeTimeChat:**

1. **PostgreSQL** with **pgvector** for all memory storage
2. **Redis** for fast session/cache
3. **OpenAI embeddings** for semantic search
4. **Auto-archival** after 90 days, deletion after 1 year
5. **Cost**: ~$20-35/month total

This provides enterprise-grade long-term memory with semantic search capabilities while keeping costs minimal.
