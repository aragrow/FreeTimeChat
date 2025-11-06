# Database Performance Optimization Guide

## Overview

This document provides database performance optimization strategies for
FreeTimeChat based on static code analysis and industry best practices.

**Last Analysis**: Run `pnpm analyze:db` to get current metrics

## Table of Contents

1. [Index Optimization](#index-optimization)
2. [Query Optimization](#query-optimization)
3. [Connection Pooling](#connection-pooling)
4. [N+1 Query Prevention](#n1-query-prevention)
5. [Caching Strategies](#caching-strategies)
6. [Schema Improvements](#schema-improvements)
7. [Monitoring & Profiling](#monitoring--profiling)

---

## Index Optimization

### Current Status: ✅ GOOD

All foreign keys have proper indexes defined. The schemas use model-level
`@@index` directives which provide optimal query performance.

### Examples of Proper Indexing

```prisma
model User {
  id       String @id
  clientId String @map("client_id")
  client   Client @relation(fields: [clientId], references: [id])

  @@index([clientId])  // ✅ Indexed for JOIN performance
  @@index([email])     // ✅ Indexed for lookups
}
```

### Best Practices

1. **Foreign Keys**: Always index foreign keys (already done ✅)
2. **Lookup Fields**: Index frequently queried fields (email, googleId, etc.)
3. **Date Ranges**: Index date fields used in range queries
4. **Composite Indexes**: Consider composite indexes for multi-field queries

### When to Add More Indexes

Add indexes if you frequently query by:

- `User.isActive` + `User.clientId` together → `@@index([clientId, isActive])`
- `TimeEntry.userId` + `TimeEntry.startTime` together → Already indexed
  separately
- `Task.status` + `Task.priority` together → `@@index([status, priority])`

**Warning**: Too many indexes slow down writes. Only add indexes for proven slow
queries.

---

## Query Optimization

### N+1 Query Prevention

**Problem**: Loading a list of items, then fetching related data for each item
in a loop.

**Current Analysis**: 40+ locations flagged for potential improvement.

#### Bad Example (N+1):

```typescript
// ❌ Bad: N+1 queries
const users = await prisma.user.findMany();
for (const user of users) {
  const roles = await prisma.userRole.findMany({
    where: { userId: user.id },
  });
}
// This runs 1 + N queries (1 for users, N for roles)
```

#### Good Example (Include):

```typescript
// ✅ Good: Single query with JOIN
const users = await prisma.user.findMany({
  include: {
    roles: {
      include: {
        role: true,
      },
    },
  },
});
// This runs 1 query with JOIN
```

#### Good Example (Select):

```typescript
// ✅ Even better: Only fetch what you need
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    name: true,
    roles: {
      select: {
        role: {
          select: {
            name: true,
          },
        },
      },
    },
  },
});
```

### Query Optimization Checklist

- [ ] Use `include` to fetch related data in one query
- [ ] Use `select` to fetch only needed fields (reduces data transfer)
- [ ] Avoid queries inside loops
- [ ] Use `findUnique` instead of `findFirst` when possible (uses unique index)
- [ ] Use `cursor` based pagination for large datasets
- [ ] Limit `take` to reasonable values (10-100 items per page)

### Batch Operations

```typescript
// ❌ Bad: Multiple sequential queries
for (const projectId of projectIds) {
  await prisma.project.findUnique({ where: { id: projectId } });
}

// ✅ Good: Single batch query
const projects = await prisma.project.findMany({
  where: {
    id: { in: projectIds },
  },
});
```

---

## Connection Pooling

### Current Status: ⚠️ NEEDS CONFIGURATION

Connection pooling is not explicitly configured in `.env.example`.

### Recommended Configuration

Add to your `DATABASE_URL`:

```bash
# Development
DATABASE_URL="postgresql://user:pass@localhost:5432/db?connection_limit=10&pool_timeout=20"

# Production
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=30&statement_cache_size=500"
```

### Connection Pool Parameters

| Parameter              | Development | Production | Notes                                      |
| ---------------------- | ----------- | ---------- | ------------------------------------------ |
| `connection_limit`     | 10          | 20-50      | Max connections per Prisma Client instance |
| `pool_timeout`         | 20          | 30         | Seconds to wait for connection from pool   |
| `statement_cache_size` | 100         | 500        | Number of prepared statements to cache     |

### Best Practices

1. **Singleton Prisma Client**: Only create one Prisma Client instance per
   application
2. **Connection Limit**: Set to 2-3x your CPU core count
3. **Pool Timeout**: Set high enough to handle traffic spikes
4. **Graceful Shutdown**: Always disconnect Prisma on app shutdown

```typescript
// ✅ Good: Singleton pattern
import { PrismaClient } from '@prisma/client';

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
```

---

## N+1 Query Prevention

### Detection

Run the analysis script to detect potential N+1 patterns:

```bash
pnpm analyze:db
```

The script flags:

- `forEach` loops with database queries
- `findMany` without `include` or `select`
- Multiple sequential `await prisma` calls

### Common Patterns in FreeTimeChat

Based on analysis, these services have the most potential N+1 issues:

1. **message.service.ts** - 6 locations
2. **semantic-memory.service.ts** - 5 locations
3. **time-entry.service.ts** - 3 locations
4. **report.service.ts** - 4 locations
5. **task.service.ts** - 4 locations

### Fix Strategy

For each flagged location:

1. **Identify the query**: What data is being fetched?
2. **Check for loops**: Is this query inside a loop?
3. **Use include**: Can related data be fetched with the parent?
4. **Use select**: Can we fetch only needed fields?
5. **Batch queries**: Can multiple queries be combined?

---

## Caching Strategies

### What to Cache

| Data Type             | TTL              | Invalidation Strategy     |
| --------------------- | ---------------- | ------------------------- |
| User permissions      | 5 minutes        | On role/capability change |
| Client configuration  | 10 minutes       | On client update          |
| Static reference data | 1 hour           | On admin update           |
| Session data          | Session lifetime | On logout                 |

### Redis Integration

FreeTimeChat already has Redis configured. Use it for:

```typescript
import Redis from 'ioredis';

// Cache user permissions
async function getUserPermissions(userId: string) {
  const cacheKey = `user:${userId}:permissions`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const permissions = await fetchPermissionsFromDB(userId);
  await redis.setex(cacheKey, 300, JSON.stringify(permissions)); // 5 min TTL

  return permissions;
}

// Invalidate on role change
async function invalidateUserPermissions(userId: string) {
  await redis.del(`user:${userId}:permissions`);
}
```

### Cache Invalidation

**Patterns**:

- **Time-based**: Use TTL for data that changes infrequently
- **Event-based**: Invalidate on updates (role changes, etc.)
- **Tag-based**: Group related cache keys for bulk invalidation

---

## Schema Improvements

### Missing Timestamps

⚠️ **Warning**: 7 models missing timestamp fields

Models without `createdAt`/`updatedAt`:

- Role
- Capability
- UserRole
- RoleCapability
- RefreshToken
- ImpersonationSession
- Message

**Recommendation**: Add timestamps to track data lifecycle:

```prisma
model Role {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("roles")
}
```

**Benefits**:

- Audit trail for changes
- Debugging data issues
- Analytics on entity lifecycle
- Soft delete support (needs `deletedAt`)

### Soft Delete Recommendations

Consider adding `deletedAt` to:

- Client (prevent accidental client deletion)
- Role (preserve role history)
- Capability (preserve permission history)
- Task (track task lifecycle)
- Conversation (allow message recovery)
- Message (allow deletion without data loss)

**Implementation**:

```prisma
model Task {
  // ... existing fields
  deletedAt DateTime? @map("deleted_at")

  @@index([deletedAt]) // For filtering out deleted items
}
```

**Query Pattern**:

```typescript
// Always filter out soft-deleted items
const tasks = await prisma.task.findMany({
  where: {
    projectId,
    deletedAt: null, // Only active tasks
  },
});

// Soft delete instead of hard delete
await prisma.task.update({
  where: { id },
  data: { deletedAt: new Date() },
});
```

---

## Monitoring & Profiling

### Prisma Query Logging

Enable in development:

```typescript
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
  ],
});

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});
```

### Slow Query Detection

Log queries over 100ms:

```typescript
prisma.$on('query', (e) => {
  if (e.duration > 100) {
    console.warn(`⚠️ Slow query (${e.duration}ms): ${e.query}`);
  }
});
```

### Database Metrics to Monitor

| Metric                | Target   | Tool                 |
| --------------------- | -------- | -------------------- |
| Query latency (p95)   | < 100ms  | Prisma logs, APM     |
| Connection pool usage | < 80%    | Prisma metrics       |
| Cache hit rate        | > 80%    | Redis INFO           |
| Slow query count      | < 10/min | PostgreSQL logs      |
| Index usage           | > 95%    | pg_stat_user_indexes |

### Production Monitoring

**PostgreSQL Queries**:

```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexname NOT LIKE '%_pkey';
```

---

## Performance Optimization Roadmap

### Phase 1: Quick Wins (No Code Changes)

- [ ] Add connection pooling to `DATABASE_URL`
- [ ] Enable Prisma query logging in development
- [ ] Set up Redis for session storage
- [ ] Monitor slow queries in development

### Phase 2: Schema Improvements

- [ ] Add timestamps to models missing them
- [ ] Add soft delete support to critical models
- [ ] Review and add composite indexes for common query patterns

### Phase 3: Query Optimization

- [ ] Review all `findMany` without `include/select` (40+ locations)
- [ ] Implement DataLoader pattern for batch loading
- [ ] Add caching for user permissions
- [ ] Add caching for static configuration

### Phase 4: Advanced Optimization

- [ ] Implement read replicas for reporting queries
- [ ] Add database query result caching
- [ ] Implement cursor-based pagination for large lists
- [ ] Add database partitioning for time-series data (time_entries)

---

## Resources

- [Prisma Performance Guide](https://www.prisma.io/docs/guides/performance-and-optimization)
- [PostgreSQL Indexing Best Practices](https://www.postgresql.org/docs/current/indexes.html)
- [Database Connection Pooling](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [N+1 Query Problem](https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance)

---

## Next Steps

1. Run `pnpm analyze:db` to verify current status
2. Review flagged service files for N+1 patterns
3. Add connection pooling to environment configuration
4. Set up query logging for development
5. Plan schema improvements for next migration
