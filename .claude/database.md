# Database Configuration & Setup Guide

This document provides comprehensive guidance for selecting, configuring, and managing your database for FreeTimeChat, whether locally hosted or cloud-based.

## Overview

FreeTimeChat supports **PostgreSQL** as the primary database with the following features:
- ✅ Relational data model for time tracking
- ✅ ACID compliance
- ✅ JSON support for flexible data
- ✅ Vector search via pgvector extension
- ✅ Full-text search
- ✅ Excellent TypeScript/Prisma support
- ✅ Multi-tenant architecture with database-per-client isolation

---

## Multi-Tenant Database Architecture

FreeTimeChat implements a **database-per-tenant** architecture for maximum data isolation and security.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Main Database                        │
│                   (Authentication)                      │
│                                                         │
│  Tables:                                                │
│  - users                 (user accounts)                │
│  - roles                 (role definitions)             │
│  - capabilities          (permissions)                  │
│  - user_roles            (role assignments)             │
│  - role_capabilities     (permission assignments)       │
│  - refresh_tokens        (JWT refresh tokens)           │
│  - clients               (client registry)              │
│  - client_databases      (database assignments)         │
│                                                         │
└─────────────────────────────────────────────────────────┘
                            │
                            │ Client authenticated
                            ↓
        ┌───────────────────────────────────────┐
        │    Route to Client-Specific Database  │
        └───────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ↓                                       ↓
┌─────────────────┐                    ┌─────────────────┐
│  Client DB 1    │                    │  Client DB 2    │
│  UUID: abc123...│                    │  UUID: def456...│
│                 │                    │                 │
│  Tables:        │                    │  Tables:        │
│  - projects     │                    │  - projects     │
│  - time_entries │                    │  - time_entries │
│  - tasks        │                    │  - tasks        │
│  - conversations│                    │  - conversations│
│  - messages     │                    │  - messages     │
│                 │                    │                 │
└─────────────────┘                    └─────────────────┘
```

### Why Database-Per-Tenant?

**Advantages:**
- ✅ **Maximum Data Isolation**: Each client's data is completely separate
- ✅ **Security**: Data breach in one tenant doesn't affect others
- ✅ **Compliance**: Easier to meet data residency requirements
- ✅ **Performance**: No cross-tenant queries, better query optimization
- ✅ **Scalability**: Easy to move specific clients to dedicated servers
- ✅ **Backup/Restore**: Can backup and restore individual client data
- ✅ **Schema Flexibility**: Can customize schema per client if needed
- ✅ **Client Deletion**: Simple to completely remove a client's data

**Disadvantages:**
- ❌ More complex connection management
- ❌ More databases to maintain and migrate
- ❌ Higher infrastructure costs at scale

### Database Naming Convention

Each client database follows this naming pattern:

```
freetimechat_<CLIENT_UUID>

Examples:
- freetimechat_550e8400-e29b-41d4-a716-446655440000
- freetimechat_7c9e6679-7425-40de-944b-e07fc1f90ae7
```

**UUID Format:** UUID v4 (randomly generated)

### Main Database Schema

The main database stores authentication, authorization, and client registry:

```prisma
// prisma/schema-main.prisma

model User {
  id                String          @id @default(uuid())
  email             String          @unique
  passwordHash      String?         @map("password_hash")
  name              String
  clientId          String          @map("client_id") // Links user to client
  client            Client          @relation(fields: [clientId], references: [id])
  roles             UserRole[]
  refreshTokens     RefreshToken[]
  googleId          String?         @unique @map("google_id")
  twoFactorEnabled  Boolean         @default(false) @map("two_factor_enabled")
  twoFactorSecret   String?         @map("two_factor_secret")
  createdAt         DateTime        @default(now()) @map("created_at")
  updatedAt         DateTime        @updatedAt @map("updated_at")
  deletedAt         DateTime?       @map("deleted_at")

  @@index([email])
  @@index([clientId])
  @@map("users")
}

model Client {
  id              String          @id @default(uuid())
  name            String          // Client/Company name
  slug            String          @unique // URL-friendly identifier
  databaseName    String          @unique @map("database_name") // UUID-based DB name
  databaseHost    String          @map("database_host") // For multi-region support
  isActive        Boolean         @default(true) @map("is_active")
  users           User[]
  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")

  @@index([slug])
  @@index([databaseName])
  @@map("clients")
}

model Role {
  id           String           @id @default(uuid())
  name         String           @unique
  description  String?
  users        UserRole[]
  capabilities RoleCapability[]
  createdAt    DateTime         @default(now()) @map("created_at")

  @@map("roles")
}

model Capability {
  id          String           @id @default(uuid())
  name        String           @unique  // e.g., "user.read", "project.write"
  description String?
  roles       RoleCapability[]
  createdAt   DateTime         @default(now()) @map("created_at")

  @@map("capabilities")
}

model UserRole {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  roleId    String   @map("role_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([userId, roleId])
  @@index([userId])
  @@index([roleId])
  @@map("user_roles")
}

model RoleCapability {
  id           String     @id @default(uuid())
  roleId       String     @map("role_id")
  capabilityId String     @map("capability_id")
  isAllowed    Boolean    @default(true) @map("is_allowed") // true = allow, false = explicit deny
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  capability   Capability @relation(fields: [capabilityId], references: [id], onDelete: Cascade)
  createdAt    DateTime   @default(now()) @map("created_at")

  @@unique([roleId, capabilityId])
  @@index([roleId])
  @@index([capabilityId])
  @@map("role_capabilities")
}

model RefreshToken {
  id         String    @id @default(uuid())
  userId     String    @map("user_id")
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  token      String    @unique
  familyId   String    @map("family_id")
  expiresAt  DateTime  @map("expires_at")
  createdAt  DateTime  @default(now()) @map("created_at")
  revoked    Boolean   @default(false)
  deviceInfo String?   @map("device_info")

  @@index([userId])
  @@index([token])
  @@index([familyId])
  @@index([expiresAt])
  @@map("refresh_tokens")
}
```

### Client Database Schema

Each client database contains transactional data:

```prisma
// prisma/schema-client.prisma

model Project {
  id          String       @id @default(uuid())
  name        String
  description String?
  startDate   DateTime?    @map("start_date")
  endDate     DateTime?    @map("end_date")
  status      String       @default("active")
  timeEntries TimeEntry[]
  tasks       Task[]
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")
  deletedAt   DateTime?    @map("deleted_at")

  @@index([status])
  @@map("projects")
}

model TimeEntry {
  id          String    @id @default(uuid())
  userId      String    @map("user_id") // References main DB user
  projectId   String    @map("project_id")
  project     Project   @relation(fields: [projectId], references: [id])
  description String?
  startTime   DateTime  @map("start_time")
  endTime     DateTime? @map("end_time")
  duration    Int?      // Duration in minutes
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  @@index([userId])
  @@index([projectId])
  @@index([startTime])
  @@map("time_entries")
}

model Task {
  id          String    @id @default(uuid())
  projectId   String    @map("project_id")
  project     Project   @relation(fields: [projectId], references: [id])
  title       String
  description String?
  status      String    @default("pending")
  assignedTo  String?   @map("assigned_to") // References main DB user
  dueDate     DateTime? @map("due_date")
  completedAt DateTime? @map("completed_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  @@index([projectId])
  @@index([status])
  @@index([assignedTo])
  @@map("tasks")
}

model Conversation {
  id        String    @id @default(uuid())
  userId    String    @map("user_id") // References main DB user
  title     String?
  status    String    @default("active")
  messages  Message[]
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  @@index([userId])
  @@index([status])
  @@map("conversations")
}

model Message {
  id             String       @id @default(uuid())
  conversationId String       @map("conversation_id")
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  userId         String       @map("user_id") // References main DB user
  role           String       // "user" or "assistant"
  content        String       @db.Text
  createdAt      DateTime     @default(now()) @map("created_at")

  @@index([conversationId])
  @@index([userId])
  @@map("messages")
}
```

### Database Connection Management

#### Connection Service

```typescript
// apps/api/src/services/DatabaseService.ts
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

interface DatabaseConnection {
  prisma: PrismaClient;
  lastUsed: Date;
}

export class DatabaseService {
  private static mainDb: PrismaClient;
  private static clientConnections: Map<string, DatabaseConnection> = new Map();
  private static readonly MAX_CONNECTIONS = 100;
  private static readonly CONNECTION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  /**
   * Get main database connection (authentication/authorization)
   */
  static getMainDatabase(): PrismaClient {
    if (!this.mainDb) {
      this.mainDb = new PrismaClient({
        datasources: {
          db: {
            url: process.env.MAIN_DATABASE_URL,
          },
        },
      });
    }
    return this.mainDb;
  }

  /**
   * Get client-specific database connection
   */
  static async getClientDatabase(clientId: string): Promise<PrismaClient> {
    // Check if connection exists and is fresh
    const existing = this.clientConnections.get(clientId);
    if (existing) {
      existing.lastUsed = new Date();
      return existing.prisma;
    }

    // Get client database info from main database
    const mainDb = this.getMainDatabase();
    const client = await mainDb.client.findUnique({
      where: { id: clientId },
    });

    if (!client || !client.isActive) {
      throw new Error('Client not found or inactive');
    }

    // Create connection URL for client database
    const clientDbUrl = this.buildClientDatabaseUrl(
      client.databaseHost,
      client.databaseName
    );

    // Create new Prisma client for this database
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: clientDbUrl,
        },
      },
    });

    // Store connection
    this.clientConnections.set(clientId, {
      prisma,
      lastUsed: new Date(),
    });

    // Clean up old connections if limit reached
    if (this.clientConnections.size > this.MAX_CONNECTIONS) {
      this.cleanupStaleConnections();
    }

    return prisma;
  }

  /**
   * Build client database URL
   */
  private static buildClientDatabaseUrl(host: string, dbName: string): string {
    const baseUrl = process.env.DATABASE_URL_TEMPLATE || process.env.DATABASE_URL;

    if (!baseUrl) {
      throw new Error('DATABASE_URL_TEMPLATE not configured');
    }

    // Replace database name in template
    // Example: postgresql://user:pass@localhost:5432/{DB_NAME}
    return baseUrl.replace('{DB_NAME}', dbName);
  }

  /**
   * Create a new client database
   */
  static async createClientDatabase(
    clientName: string,
    clientSlug: string
  ): Promise<{ clientId: string; databaseName: string }> {
    const mainDb = this.getMainDatabase();

    // Generate UUID for database name
    const dbUuid = uuidv4();
    const databaseName = `freetimechat_${dbUuid.replace(/-/g, '')}`;
    const databaseHost = process.env.DATABASE_HOST || 'localhost';

    // Create client record
    const client = await mainDb.client.create({
      data: {
        name: clientName,
        slug: clientSlug,
        databaseName,
        databaseHost,
        isActive: true,
      },
    });

    // Create the actual database
    await this.provisionDatabase(databaseName);

    // Run migrations on new database
    await this.migrateClientDatabase(databaseName);

    return {
      clientId: client.id,
      databaseName: client.databaseName,
    };
  }

  /**
   * Provision a new PostgreSQL database
   */
  private static async provisionDatabase(dbName: string): Promise<void> {
    const mainDb = this.getMainDatabase();

    // Use raw SQL to create database
    // Note: This requires superuser privileges
    await mainDb.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);

    console.log(`✓ Created database: ${dbName}`);
  }

  /**
   * Run migrations on client database
   */
  private static async migrateClientDatabase(dbName: string): Promise<void> {
    const { execSync } = require('child_process');

    // Set database URL for migration
    const dbUrl = this.buildClientDatabaseUrl(
      process.env.DATABASE_HOST || 'localhost',
      dbName
    );

    // Run Prisma migrations
    execSync(`DATABASE_URL="${dbUrl}" npx prisma migrate deploy`, {
      stdio: 'inherit',
    });

    console.log(`✓ Migrated database: ${dbName}`);
  }

  /**
   * Clean up stale connections
   */
  private static cleanupStaleConnections(): void {
    const now = new Date();

    for (const [clientId, conn] of this.clientConnections.entries()) {
      const age = now.getTime() - conn.lastUsed.getTime();

      if (age > this.CONNECTION_TIMEOUT) {
        conn.prisma.$disconnect();
        this.clientConnections.delete(clientId);
        console.log(`Cleaned up stale connection for client: ${clientId}`);
      }
    }
  }

  /**
   * Disconnect all databases
   */
  static async disconnectAll(): Promise<void> {
    // Disconnect main database
    if (this.mainDb) {
      await this.mainDb.$disconnect();
    }

    // Disconnect all client databases
    for (const conn of this.clientConnections.values()) {
      await conn.prisma.$disconnect();
    }

    this.clientConnections.clear();
  }

  /**
   * Get user's client ID from main database
   */
  static async getUserClient(userId: string): Promise<string> {
    const mainDb = this.getMainDatabase();

    const user = await mainDb.user.findUnique({
      where: { id: userId },
      select: { clientId: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user.clientId;
  }
}
```

#### Middleware for Client Database Routing

```typescript
// apps/api/src/middleware/clientDatabase.ts
import { Request, Response, NextFunction } from 'express';
import { DatabaseService } from '../services/DatabaseService';

export async function attachClientDatabase(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // User must be authenticated (JWT middleware runs first)
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;

    // Get user's client ID from main database
    const clientId = await DatabaseService.getUserClient(userId);

    // Get client database connection
    const clientDb = await DatabaseService.getClientDatabase(clientId);

    // Attach to request
    req.clientDb = clientDb;
    req.clientId = clientId;

    next();
  } catch (error) {
    console.error('Error attaching client database:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      clientDb?: PrismaClient;
      clientId?: string;
    }
  }
}
```

#### Usage in Routes

```typescript
// apps/api/src/routes/projects/index.ts
import { Router } from 'express';
import { authenticateJWT } from '@/middleware/auth';
import { attachClientDatabase } from '@/middleware/clientDatabase';

const router = Router();

// All routes use client database
router.use(authenticateJWT);
router.use(attachClientDatabase);

// GET /projects - List projects (from client database)
router.get('/', async (req, res) => {
  try {
    const projects = await req.clientDb!.project.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: projects });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// POST /projects - Create project (in client database)
router.post('/', async (req, res) => {
  try {
    const { name, description, startDate } = req.body;

    const project = await req.clientDb!.project.create({
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : null,
      },
    });

    res.status(201).json({ data: project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

export default router;
```

### Environment Configuration

```env
# Main Database (Authentication/Authorization)
MAIN_DATABASE_URL="postgresql://user:password@localhost:5432/freetimechat_main"

# Client Database Template
# {DB_NAME} will be replaced with actual client database name
DATABASE_URL_TEMPLATE="postgresql://user:password@localhost:5432/{DB_NAME}"

# Database Host (for multi-region support)
DATABASE_HOST="localhost"

# Connection Pool Settings
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
```

### Database Migration Strategy

#### Main Database Migrations

```bash
# Run migrations for main database
DATABASE_URL=$MAIN_DATABASE_URL npx prisma migrate dev --name init-main-db

# Generate Prisma client for main database
DATABASE_URL=$MAIN_DATABASE_URL npx prisma generate
```

#### Client Database Migrations

```bash
# Migrate all client databases
node scripts/migrate-all-clients.js

# Migrate specific client database
DATABASE_NAME="freetimechat_abc123" node scripts/migrate-client.js
```

**Migration Script** (`scripts/migrate-all-clients.js`):

```javascript
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

async function migrateAllClients() {
  const mainDb = new PrismaClient({
    datasources: {
      db: { url: process.env.MAIN_DATABASE_URL },
    },
  });

  try {
    // Get all active clients
    const clients = await mainDb.client.findMany({
      where: { isActive: true },
    });

    console.log(`Found ${clients.length} active clients`);

    for (const client of clients) {
      console.log(`\nMigrating: ${client.name} (${client.databaseName})`);

      const dbUrl = process.env.DATABASE_URL_TEMPLATE.replace(
        '{DB_NAME}',
        client.databaseName
      );

      try {
        execSync(`DATABASE_URL="${dbUrl}" npx prisma migrate deploy`, {
          stdio: 'inherit',
        });

        console.log(`✓ Successfully migrated ${client.name}`);
      } catch (error) {
        console.error(`✗ Failed to migrate ${client.name}:`, error.message);
      }
    }
  } finally {
    await mainDb.$disconnect();
  }
}

migrateAllClients();
```

### Client Onboarding Flow

1. **Create Client Account**
```typescript
async function onboardNewClient(data: {
  name: string;
  slug: string;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
}) {
  // 1. Create client database
  const { clientId, databaseName } = await DatabaseService.createClientDatabase(
    data.name,
    data.slug
  );

  // 2. Create admin user in main database
  const mainDb = DatabaseService.getMainDatabase();

  const hashedPassword = await bcrypt.hash(data.adminPassword, 12);

  const adminUser = await mainDb.user.create({
    data: {
      email: data.adminEmail,
      name: data.adminName,
      passwordHash: hashedPassword,
      clientId,
    },
  });

  // 3. Assign admin role
  const adminRole = await mainDb.role.findFirst({
    where: { name: 'admin' },
  });

  if (adminRole) {
    await mainDb.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    });
  }

  return {
    clientId,
    databaseName,
    adminUserId: adminUser.id,
  };
}
```

### Security Considerations

1. **Connection Isolation**: Each client can only access their own database
2. **User Validation**: Always verify user belongs to client before allowing access
3. **Database Credentials**: Use different credentials per client in production
4. **Connection Limits**: Implement connection pooling and limits
5. **Audit Logging**: Log all cross-database operations
6. **Data Deletion**: Provide secure client database deletion process

### Monitoring and Maintenance

```typescript
// Get database usage statistics
async function getClientDatabaseStats(clientId: string) {
  const clientDb = await DatabaseService.getClientDatabase(clientId);

  const stats = {
    projects: await clientDb.project.count(),
    timeEntries: await clientDb.timeEntry.count(),
    conversations: await clientDb.conversation.count(),
    messages: await clientDb.message.count(),
  };

  return stats;
}

// Health check for all client databases
async function healthCheckAllDatabases() {
  const mainDb = DatabaseService.getMainDatabase();
  const clients = await mainDb.client.findMany({ where: { isActive: true } });

  const results = [];

  for (const client of clients) {
    try {
      const clientDb = await DatabaseService.getClientDatabase(client.id);
      await clientDb.$queryRaw`SELECT 1`;

      results.push({
        clientId: client.id,
        name: client.name,
        status: 'healthy',
      });
    } catch (error) {
      results.push({
        clientId: client.id,
        name: client.name,
        status: 'unhealthy',
        error: error.message,
      });
    }
  }

  return results;
}
```

---

## Database Selection Matrix

| Criteria | Local (Dev) | Cloud (Production) |
|----------|-------------|-------------------|
| **Cost** | Free | $0-25/month |
| **Setup Time** | 5-10 minutes | 10-15 minutes |
| **Maintenance** | Manual | Managed |
| **Backups** | Manual | Automatic |
| **Scaling** | Limited | Easy |
| **Best For** | Development/Testing | Production |

---

## Top 3 Cloud Options (Affordable)

### 1. Supabase (Recommended for MVP)

**Best for:** Full-featured PostgreSQL with built-in auth and real-time features

**Pricing:**
- **Free Tier**: 500 MB database, 2 GB bandwidth, 50,000 monthly active users
- **Pro Plan**: $25/month - 8 GB database, 50 GB bandwidth, 100,000 MAU
- **Team Plan**: $599/month - 100 GB database, 250 GB bandwidth

**Advantages:**
- ✅ Free tier is generous
- ✅ PostgreSQL 15+
- ✅ Built-in authentication (can replace custom auth)
- ✅ Row-level security (RLS)
- ✅ Auto-generated REST API
- ✅ Real-time subscriptions
- ✅ Storage for files
- ✅ Edge functions
- ✅ Automatic backups (Pro+)
- ✅ Point-in-time recovery (Pro+)
- ✅ pgvector extension supported

**Disadvantages:**
- ❌ Shared resources on free tier
- ❌ Connection limits on free tier (60 connections)
- ❌ Some vendor lock-in features

**Setup:**
```bash
# 1. Create account at https://supabase.com
# 2. Create new project
# 3. Get connection string from Settings > Database
# 4. Add to .env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

**Connection Pooling (Recommended):**
```bash
# Use pooler connection for better performance
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true"
```

**When to choose:** Best for startups and MVPs, especially if you want built-in auth and real-time features.

---

### 2. Railway (Recommended for Simplicity)

**Best for:** Simple, developer-friendly PostgreSQL hosting

**Pricing:**
- **Free Trial**: $5 credit
- **Pay as you go**: Usage-based pricing
  - PostgreSQL: ~$5-10/month for small apps
  - Includes: 100 GB outbound bandwidth, shared CPU, 512 MB RAM
- **Team Plan**: $20/month (includes $20 credits)

**Advantages:**
- ✅ Extremely simple setup
- ✅ Pay only for what you use
- ✅ No credit card required for trial
- ✅ PostgreSQL 16
- ✅ Automatic backups
- ✅ Easy to scale
- ✅ Deploy from GitHub
- ✅ Environment variables sync
- ✅ Redis and other services available
- ✅ Great developer experience

**Disadvantages:**
- ❌ No free tier (trial only)
- ❌ Can get expensive with high usage
- ❌ Limited configuration options

**Setup:**
```bash
# 1. Create account at https://railway.app
# 2. Create new project
# 3. Add PostgreSQL service
# 4. Copy connection string from Variables tab
# 5. Add to .env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/railway"
```

**When to choose:** Best for developers who want simplicity and are willing to pay for convenience. Great for production if you're already using Railway for backend deployment.

---

### 3. Neon (Serverless PostgreSQL)

**Best for:** Serverless PostgreSQL with automatic scaling and branching

**Pricing:**
- **Free Tier**: 0.5 GB storage, shared compute, 10 branches
- **Pro Plan**: $19/month - 10 GB storage, 2 vCPU, unlimited branches
- **Custom**: Enterprise pricing

**Advantages:**
- ✅ Serverless (pay per usage)
- ✅ Instant database branching (great for dev/staging)
- ✅ Auto-scaling compute
- ✅ Auto-suspend inactive databases
- ✅ PostgreSQL 16
- ✅ Very fast cold starts
- ✅ Built-in connection pooling
- ✅ Point-in-time restore

**Disadvantages:**
- ❌ Free tier has storage limits
- ❌ Newer service (less mature than others)
- ❌ Some PostgreSQL extensions not yet supported

**Setup:**
```bash
# 1. Create account at https://neon.tech
# 2. Create new project
# 3. Copy connection string
# 4. Add to .env
DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST]/[DATABASE]?sslmode=require"
```

**When to choose:** Best for projects with variable traffic or need database branching for development workflows.

---

## Comparison Table: Cloud Options

| Feature | Supabase | Railway | Neon |
|---------|----------|---------|------|
| **Free Tier** | ✅ 500 MB | ❌ Trial only | ✅ 0.5 GB |
| **Starting Price** | $25/month | ~$5/month | $19/month |
| **PostgreSQL Version** | 15+ | 16 | 16 |
| **Automatic Backups** | Pro+ | ✅ | ✅ |
| **Connection Pooling** | ✅ | ❌ (use PgBouncer) | ✅ Built-in |
| **Extensions** | Most | Most | Limited |
| **Auth Built-in** | ✅ | ❌ | ❌ |
| **Real-time** | ✅ | ❌ | ❌ |
| **Branching** | ❌ | ❌ | ✅ |
| **Best For** | MVPs with auth | Simple hosting | Variable traffic |

---

## Top 3 Local/Self-Hosted Options

### 1. PostgreSQL via Docker (Recommended)

**Best for:** Cross-platform development, consistent environments

**Pricing:** Free

**Advantages:**
- ✅ Consistent across all platforms (Windows/Mac/Linux)
- ✅ Easy to start/stop
- ✅ Isolated from system
- ✅ Can run multiple versions
- ✅ Easy to reset/recreate
- ✅ Included in docker-compose.yml
- ✅ Ideal for team development

**Disadvantages:**
- ❌ Requires Docker installation
- ❌ Uses more resources than native
- ❌ Slightly slower than native

**Setup:**

**Option A: Using docker-compose.yml** (Recommended)
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    container_name: freetimechat-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: freetimechat
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: freetimechat-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

```bash
# Start database
docker-compose up -d

# Stop database
docker-compose down

# View logs
docker-compose logs postgres

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
```

**Option B: Docker run command**
```bash
# Start PostgreSQL
docker run --name freetimechat-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=freetimechat \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  -d postgres:16-alpine

# Install pgvector extension
docker exec -it freetimechat-db psql -U postgres -d freetimechat -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

**Connection String:**
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/freetimechat"
```

**When to choose:** Best for all developers, especially teams. Most flexible and consistent.

---

### 2. PostgreSQL.app (macOS Only)

**Best for:** macOS developers who want native PostgreSQL

**Pricing:** Free

**Advantages:**
- ✅ Native macOS app
- ✅ Very fast (no Docker overhead)
- ✅ Menu bar icon for easy start/stop
- ✅ Includes multiple PostgreSQL versions
- ✅ Command-line tools included
- ✅ GUI for database management

**Disadvantages:**
- ❌ macOS only
- ❌ Not portable to other platforms
- ❌ Manual backup management

**Setup:**
```bash
# 1. Download from https://postgresapp.com
# 2. Install and open Postgres.app
# 3. Click "Initialize" to create a new server
# 4. Add psql to PATH (in ~/.zshrc or ~/.bash_profile)
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"

# 5. Create database
psql postgres
CREATE DATABASE freetimechat;
CREATE USER freetimechat_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE freetimechat TO freetimechat_user;
\q

# 6. Install pgvector
psql freetimechat
CREATE EXTENSION vector;
\q
```

**Connection String:**
```bash
DATABASE_URL="postgresql://postgres@localhost:5432/freetimechat"
# Or with custom user:
DATABASE_URL="postgresql://freetimechat_user:your_password@localhost:5432/freetimechat"
```

**When to choose:** Best for macOS developers who prefer native apps and maximum performance.

---

### 3. PostgreSQL via Package Manager

**Best for:** Developers who want system-level PostgreSQL installation

**Pricing:** Free

**Advantages:**
- ✅ Native installation
- ✅ Best performance
- ✅ System service (auto-start on boot)
- ✅ Standard location for tools
- ✅ Lower resource usage than Docker

**Disadvantages:**
- ❌ Different commands per OS
- ❌ Can conflict with other PostgreSQL installations
- ❌ Harder to run multiple versions

**Setup by Platform:**

**macOS (Homebrew):**
```bash
# Install PostgreSQL
brew install postgresql@16

# Start PostgreSQL service
brew services start postgresql@16

# Create database
createdb freetimechat

# Install pgvector
brew install pgvector
psql freetimechat -c "CREATE EXTENSION vector;"

# Connection string
DATABASE_URL="postgresql://$(whoami)@localhost:5432/freetimechat"
```

**Ubuntu/Debian:**
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE freetimechat;
CREATE USER freetimechat_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE freetimechat TO freetimechat_user;
\q

# Install pgvector
sudo apt install postgresql-16-pgvector
psql -U freetimechat_user -d freetimechat -c "CREATE EXTENSION vector;"

# Connection string
DATABASE_URL="postgresql://freetimechat_user:your_password@localhost:5432/freetimechat"
```

**Windows (Chocolatey):**
```powershell
# Install PostgreSQL
choco install postgresql

# Start service (usually auto-starts)
# Check Services app or:
net start postgresql-x64-16

# Create database (using pgAdmin or psql)
psql -U postgres
CREATE DATABASE freetimechat;
\q

# Connection string
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/freetimechat"
```

**When to choose:** Best for developers comfortable with system administration and prefer native installations.

---

## Database Selection During Setup

### Interactive Setup Wizard

Create a setup script that guides users through database selection:

```typescript
// scripts/setup-database.ts
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface DatabaseConfig {
  type: 'local' | 'cloud';
  provider?: 'docker' | 'native' | 'supabase' | 'railway' | 'neon';
  connectionString?: string;
}

async function setupDatabase() {
  console.log('🗄️  FreeTimeChat Database Setup\n');

  // Step 1: Choose environment
  const { environment } = await inquirer.prompt([
    {
      type: 'list',
      name: 'environment',
      message: 'What environment are you setting up?',
      choices: [
        { name: 'Development (Local)', value: 'development' },
        { name: 'Production (Cloud)', value: 'production' },
      ],
    },
  ]);

  let config: DatabaseConfig;

  if (environment === 'development') {
    config = await setupLocalDatabase();
  } else {
    config = await setupCloudDatabase();
  }

  // Step 2: Write to .env file
  updateEnvFile(config);

  // Step 3: Test connection
  await testConnection(config);

  // Step 4: Run migrations
  const { runMigrations } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'runMigrations',
      message: 'Would you like to run database migrations now?',
      default: true,
    },
  ]);

  if (runMigrations) {
    await runDatabaseMigrations();
  }

  console.log('\n✅ Database setup complete!');
  console.log('\nNext steps:');
  console.log('1. Review your .env file');
  console.log('2. Run: pnpm prisma studio (to view database)');
  console.log('3. Run: pnpm dev (to start development server)');
}

async function setupLocalDatabase(): Promise<DatabaseConfig> {
  const { provider } = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'How would you like to run PostgreSQL locally?',
      choices: [
        {
          name: '🐳 Docker (Recommended - Cross-platform)',
          value: 'docker',
        },
        {
          name: '📦 System Package Manager (brew/apt/choco)',
          value: 'native',
        },
        {
          name: '🍎 Postgres.app (macOS only)',
          value: 'postgresapp',
        },
      ],
    },
  ]);

  if (provider === 'docker') {
    return await setupDockerDatabase();
  } else if (provider === 'native') {
    return await setupNativeDatabase();
  } else {
    return await setupPostgresApp();
  }
}

async function setupDockerDatabase(): Promise<DatabaseConfig> {
  console.log('\n📦 Setting up PostgreSQL with Docker...\n');

  // Check if Docker is installed
  try {
    execSync('docker --version', { stdio: 'ignore' });
  } catch {
    console.error('❌ Docker is not installed. Please install Docker first:');
    console.error('   https://docs.docker.com/get-docker/');
    process.exit(1);
  }

  const { password, port } = await inquirer.prompt([
    {
      type: 'password',
      name: 'password',
      message: 'Set a password for PostgreSQL:',
      default: 'postgres',
    },
    {
      type: 'input',
      name: 'port',
      message: 'PostgreSQL port:',
      default: '5432',
    },
  ]);

  // Check if docker-compose.yml exists
  const dockerComposePath = path.join(process.cwd(), 'docker-compose.yml');
  if (fs.existsSync(dockerComposePath)) {
    console.log('✅ docker-compose.yml found');

    const { startNow } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'startNow',
        message: 'Start database with docker-compose now?',
        default: true,
      },
    ]);

    if (startNow) {
      console.log('Starting PostgreSQL with Docker...');
      execSync('docker-compose up -d postgres', { stdio: 'inherit' });
      console.log('✅ PostgreSQL started');

      // Wait for database to be ready
      console.log('Waiting for database to be ready...');
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  } else {
    console.log('⚠️  docker-compose.yml not found. You can start it later with:');
    console.log('   docker-compose up -d postgres');
  }

  return {
    type: 'local',
    provider: 'docker',
    connectionString: `postgresql://postgres:${password}@localhost:${port}/freetimechat`,
  };
}

async function setupNativeDatabase(): Promise<DatabaseConfig> {
  console.log('\n💻 Setting up native PostgreSQL...\n');

  const { username, password, port, database } = await inquirer.prompt([
    {
      type: 'input',
      name: 'username',
      message: 'PostgreSQL username:',
      default: 'postgres',
    },
    {
      type: 'password',
      name: 'password',
      message: 'PostgreSQL password:',
      default: 'postgres',
    },
    {
      type: 'input',
      name: 'port',
      message: 'PostgreSQL port:',
      default: '5432',
    },
    {
      type: 'input',
      name: 'database',
      message: 'Database name:',
      default: 'freetimechat',
    },
  ]);

  console.log('\n📝 Manual steps required:');
  console.log('1. Make sure PostgreSQL is installed and running');
  console.log(`2. Create database: createdb ${database}`);
  console.log(`3. Install pgvector: psql ${database} -c "CREATE EXTENSION vector;"`);

  return {
    type: 'local',
    provider: 'native',
    connectionString: `postgresql://${username}:${password}@localhost:${port}/${database}`,
  };
}

async function setupPostgresApp(): Promise<DatabaseConfig> {
  console.log('\n🍎 Setting up Postgres.app...\n');

  const { database } = await inquirer.prompt([
    {
      type: 'input',
      name: 'database',
      message: 'Database name:',
      default: 'freetimechat',
    },
  ]);

  console.log('\n📝 Manual steps:');
  console.log('1. Open Postgres.app');
  console.log('2. Click "Initialize" if not already done');
  console.log(`3. Create database: psql -c "CREATE DATABASE ${database}"`);
  console.log(`4. Install pgvector: psql ${database} -c "CREATE EXTENSION vector;"`);

  return {
    type: 'local',
    provider: 'postgresapp',
    connectionString: `postgresql://postgres@localhost:5432/${database}`,
  };
}

async function setupCloudDatabase(): Promise<DatabaseConfig> {
  const { provider } = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Choose a cloud database provider:',
      choices: [
        {
          name: '🚀 Supabase (Free tier, includes auth)',
          value: 'supabase',
        },
        {
          name: '🚂 Railway (Simple, pay-as-you-go)',
          value: 'railway',
        },
        {
          name: '⚡ Neon (Serverless, auto-scaling)',
          value: 'neon',
        },
        {
          name: '🔧 Custom (Enter connection string manually)',
          value: 'custom',
        },
      ],
    },
  ]);

  console.log('\n📝 Steps to set up your database:\n');

  if (provider === 'supabase') {
    console.log('1. Go to https://supabase.com');
    console.log('2. Create a new project');
    console.log('3. Go to Settings > Database');
    console.log('4. Copy the connection string (use "Connection pooling" for better performance)');
  } else if (provider === 'railway') {
    console.log('1. Go to https://railway.app');
    console.log('2. Create a new project');
    console.log('3. Add "PostgreSQL" service');
    console.log('4. Click on PostgreSQL > Variables');
    console.log('5. Copy the DATABASE_URL');
  } else if (provider === 'neon') {
    console.log('1. Go to https://neon.tech');
    console.log('2. Create a new project');
    console.log('3. Copy the connection string');
  } else {
    console.log('You chose custom setup.');
  }

  const { connectionString } = await inquirer.prompt([
    {
      type: 'input',
      name: 'connectionString',
      message: 'Paste your database connection string:',
      validate: (input) => {
        if (!input.startsWith('postgresql://') && !input.startsWith('postgres://')) {
          return 'Please enter a valid PostgreSQL connection string';
        }
        return true;
      },
    },
  ]);

  return {
    type: 'cloud',
    provider,
    connectionString,
  };
}

function updateEnvFile(config: DatabaseConfig) {
  const envPath = path.join(process.cwd(), 'apps/api/.env');
  const envExamplePath = path.join(process.cwd(), 'apps/api/.env.example');

  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  } else if (fs.existsSync(envExamplePath)) {
    envContent = fs.readFileSync(envExamplePath, 'utf-8');
  }

  // Update or add DATABASE_URL
  const dbUrlRegex = /^DATABASE_URL=.*/m;
  const newDbUrl = `DATABASE_URL="${config.connectionString}"`;

  if (dbUrlRegex.test(envContent)) {
    envContent = envContent.replace(dbUrlRegex, newDbUrl);
  } else {
    envContent += `\n${newDbUrl}\n`;
  }

  // Write to .env
  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ Updated apps/api/.env');
}

async function testConnection(config: DatabaseConfig) {
  console.log('\n🔍 Testing database connection...');

  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.connectionString,
        },
      },
    });

    await prisma.$connect();
    console.log('✅ Database connection successful!');
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('\nPlease check:');
    console.error('1. Database is running');
    console.error('2. Connection string is correct');
    console.error('3. Network/firewall allows connection');
    process.exit(1);
  }
}

async function runDatabaseMigrations() {
  console.log('\n🔄 Running database migrations...');

  try {
    execSync('cd apps/api && pnpm prisma migrate dev', {
      stdio: 'inherit',
    });
    console.log('✅ Migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

// Run setup
setupDatabase().catch((error) => {
  console.error('Setup failed:', error);
  process.exit(1);
});
```

### Usage

```bash
# Add to package.json scripts
{
  "scripts": {
    "setup:db": "tsx scripts/setup-database.ts"
  }
}

# Run setup
pnpm setup:db
```

---

## Environment-Based Configuration

### Multi-Environment Setup

```typescript
// apps/api/src/config/database.ts
import { PrismaClient } from '@prisma/client';

const DATABASE_CONFIGS = {
  development: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/freetimechat',
    // Force local in development
    preferLocal: true,
  },
  test: {
    url: process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@localhost:5432/freetimechat_test',
  },
  staging: {
    url: process.env.DATABASE_URL,
  },
  production: {
    url: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10,
    },
  },
};

const env = (process.env.NODE_ENV || 'development') as keyof typeof DATABASE_CONFIGS;
const config = DATABASE_CONFIGS[env];

// Use local database in development even if cloud URL is provided
if (env === 'development' && config.preferLocal) {
  const localUrl = 'postgresql://postgres:postgres@localhost:5432/freetimechat';

  // Check if local database is available
  const useLocal = process.env.FORCE_LOCAL_DB === 'true' || !process.env.DATABASE_URL;

  if (useLocal) {
    config.url = localUrl;
    console.log('📍 Using local database for development');
  }
}

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.url,
    },
  },
  log: env === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Connection pooling for production
if (env === 'production' && config.pool) {
  // Configure connection pool
  process.env.DATABASE_CONNECTION_LIMIT = config.pool.max.toString();
}
```

### Environment Variables

```bash
# apps/api/.env.development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/freetimechat"
FORCE_LOCAL_DB=true  # Always use local in dev

# apps/api/.env.staging
DATABASE_URL="postgresql://user:pass@staging-db.example.com:5432/freetimechat"

# apps/api/.env.production
DATABASE_URL="postgresql://user:pass@production-db.example.com:5432/freetimechat"
```

---

## Connection Pooling

### Using PgBouncer

```yaml
# docker-compose.yml (with PgBouncer)
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: freetimechat
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - db_network

  pgbouncer:
    image: edoburu/pgbouncer
    environment:
      DATABASE_URL: "postgres://postgres:postgres@postgres:5432/freetimechat"
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 1000
      DEFAULT_POOL_SIZE: 20
    ports:
      - "6432:5432"
    networks:
      - db_network
    depends_on:
      - postgres

networks:
  db_network:

volumes:
  postgres_data:
```

```bash
# Use PgBouncer connection
DATABASE_URL="postgresql://postgres:postgres@localhost:6432/freetimechat"
```

---

## Backup Strategies

### Local Backups

```bash
# Automated backup script
# scripts/backup-database.sh
#!/bin/bash

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/freetimechat_$DATE.sql"

mkdir -p $BACKUP_DIR

# Backup database
pg_dump $DATABASE_URL > $BACKUP_FILE

# Compress
gzip $BACKUP_FILE

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

### Cloud Backups

**Supabase:** Automatic daily backups (Pro plan)

**Railway:** Automatic backups, manual restore via CLI:
```bash
railway backup create
railway backup restore [backup-id]
```

**Neon:** Point-in-time restore up to 7 days (Pro plan)

---

## Recommended Setup by Use Case

### For Solo Developer (MVP)
- **Development**: Docker (easy, portable)
- **Production**: Supabase free tier
- **Cost**: $0/month

### For Small Team
- **Development**: Docker (consistent across team)
- **Staging**: Railway ($5-10/month)
- **Production**: Supabase Pro ($25/month)
- **Cost**: $30-35/month

### For Production App
- **Development**: Docker
- **Staging**: Railway
- **Production**: Neon Pro or Supabase Team
- **Cost**: $50-100/month

---

## Quick Start Commands

### Setup Database (All-in-one)

```bash
# Install dependencies
pnpm install

# Run setup wizard
pnpm setup:db

# Or manual setup:
# 1. Copy env example
cp apps/api/.env.example apps/api/.env

# 2. Edit .env and add your DATABASE_URL
nano apps/api/.env

# 3. Start local database (if using Docker)
docker-compose up -d postgres

# 4. Run migrations
cd apps/api && pnpm prisma migrate dev

# 5. Seed database (optional)
pnpm prisma db seed

# 6. Open Prisma Studio
pnpm prisma studio
```

---

## Troubleshooting

### Connection Issues

```bash
# Test connection
psql $DATABASE_URL

# Check if PostgreSQL is running (Docker)
docker ps | grep postgres

# Check logs
docker logs freetimechat-db

# Restart database
docker-compose restart postgres
```

### Migration Issues

```bash
# Reset database (WARNING: deletes all data)
cd apps/api
pnpm prisma migrate reset

# Generate Prisma client
pnpm prisma generate

# Push schema without migration
pnpm prisma db push
```

### Performance Issues

```bash
# Check slow queries
psql $DATABASE_URL
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

# Analyze table
ANALYZE table_name;

# Vacuum database
VACUUM ANALYZE;
```

---

## Summary

**Recommended for Most Users:**
- **Development**: Docker (cross-platform, easy)
- **Production**: Supabase (generous free tier, managed) or Railway (simple, affordable)

**Total Monthly Cost:**
- **Development**: Free (Docker)
- **Production**: $0-25/month (Supabase free to Pro)

**Setup Time:**
- Interactive setup wizard: 5-10 minutes
- Manual setup: 10-15 minutes
