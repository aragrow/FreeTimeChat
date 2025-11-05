# Prisma Multi-Database Setup

This directory contains Prisma schemas for FreeTimeChat's multi-database
architecture.

## Architecture Overview

FreeTimeChat uses a **database-per-tenant** architecture with two types of
databases:

1. **Main Database** (`schema-main.prisma`) - Shared across all clients
   - User authentication and accounts
   - Roles and capabilities (RBAC)
   - Client registry and routing
   - Refresh tokens
   - Impersonation sessions

2. **Client Databases** (`schema-client.prisma`) - One per client
   - Projects and time tracking
   - Tasks
   - Chat conversations and messages

## Schema Files

- **schema-main.prisma**: Main authentication database schema
- **schema-client.prisma**: Client-specific data schema template
- **schema.prisma**: Placeholder (points to development setup)

## Environment Variables

Configure these in your `.env` file:

```env
# Main database (authentication)
DATABASE_URL="postgresql://user:password@localhost:5432/freetimechat_main"

# Client database (for development/testing)
CLIENT_DATABASE_URL="postgresql://user:password@localhost:5432/freetimechat_client_dev"
```

## Available Scripts

### Generate Prisma Clients

```bash
# Generate both clients
pnpm prisma:generate

# Generate main database client only
pnpm prisma:generate:main

# Generate client database client only
pnpm prisma:generate:client
```

### Database Migrations

```bash
# Run migrations for main database
pnpm prisma:migrate:main

# Run migrations for client database
pnpm prisma:migrate:client

# Deploy migrations (production)
pnpm prisma:migrate:deploy:main
pnpm prisma:migrate:deploy:client
```

### Database Push (Development)

For rapid prototyping without migrations:

```bash
# Push main schema to database
pnpm prisma:push:main

# Push client schema to database
pnpm prisma:push:client
```

### Prisma Studio

Browse your data with Prisma Studio:

```bash
# Open studio for main database
pnpm prisma:studio:main

# Open studio for client database
pnpm prisma:studio:client
```

### Schema Management

```bash
# Format schema files
pnpm prisma:format

# Validate schema files
pnpm prisma:validate
```

## Usage in Code

### Main Database (Authentication)

```typescript
import { PrismaClient } from '@/generated/prisma-main';

const prismaMain = new PrismaClient();

// Example: Find user
const user = await prismaMain.user.findUnique({
  where: { email: 'user@example.com' },
  include: { client: true, roles: true },
});
```

### Client Database (Per-Tenant Data)

```typescript
import { PrismaClient } from '@/generated/prisma-client';

// Create client-specific connection
const prismaClient = new PrismaClient({
  datasources: {
    db: {
      url: `postgresql://user:password@localhost:5432/freetimechat_${clientId}`,
    },
  },
});

// Example: Create time entry
const timeEntry = await prismaClient.timeEntry.create({
  data: {
    userId: user.id,
    projectId: project.id,
    startTime: new Date(),
  },
});
```

## Database Naming Convention

Client databases follow this pattern:

```
freetimechat_<CLIENT_UUID>

Examples:
- freetimechat_550e8400-e29b-41d4-a716-446655440000
- freetimechat_7c9e6679-7425-40de-944b-e07fc1f90ae7
```

## Development Workflow

1. **Initial Setup**:

   ```bash
   # Create main database
   createdb freetimechat_main

   # Create dev client database
   createdb freetimechat_client_dev

   # Generate Prisma clients
   pnpm prisma:generate

   # Run migrations
   pnpm prisma:migrate:main
   pnpm prisma:migrate:client
   ```

2. **Making Schema Changes**:

   ```bash
   # Edit schema-main.prisma or schema-client.prisma

   # Format schemas
   pnpm prisma:format

   # Validate schemas
   pnpm prisma:validate

   # Create migration
   pnpm prisma:migrate:main  # or :client

   # Regenerate client
   pnpm prisma:generate
   ```

3. **Adding a New Client Database**:

   ```typescript
   // 1. Register client in main database
   const client = await prismaMain.client.create({
     data: {
       name: 'Acme Corp',
       slug: 'acme-corp',
       databaseName: `freetimechat_${uuid()}`,
     },
   });

   // 2. Create the database
   await createClientDatabase(client.databaseName);

   // 3. Run migrations on new database
   await migrateClientDatabase(client.databaseName);
   ```

## Migration Files

Migrations are stored in:

- `prisma/migrations-main/` - Main database migrations
- `prisma/migrations-client/` - Client database migrations

## Best Practices

1. **Always generate clients after schema changes**:

   ```bash
   pnpm prisma:generate
   ```

2. **Use migrations in production**, not `db push`:

   ```bash
   pnpm prisma:migrate:deploy:main
   pnpm prisma:migrate:deploy:client
   ```

3. **Keep schemas in sync** with TypeScript types in `packages/types`

4. **Test migrations** on a copy of production data before deploying

5. **Never modify migration files** after they've been applied

## Troubleshooting

### "Client not generated"

```bash
pnpm prisma:generate
```

### "Migration conflicts"

```bash
# Reset database (WARNING: deletes all data)
pnpm prisma migrate reset --schema=prisma/schema-main.prisma
```

### "Connection refused"

Check that PostgreSQL is running:

```bash
docker-compose up -d postgres
```

## Related Documentation

- [Main Documentation](../../../.claude/database.md)
- [Authentication](../../../.claude/authentication.md)
- [Prisma Documentation](https://www.prisma.io/docs)
