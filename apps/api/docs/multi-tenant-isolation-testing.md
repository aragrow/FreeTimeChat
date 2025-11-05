# Multi-Tenant Isolation Testing Guide

This guide explains how to test and verify multi-tenant database isolation in
FreeTimeChat.

## Architecture Overview

FreeTimeChat uses a **database-per-tenant** architecture for maximum data
isolation:

- **Main Database**: Stores authentication data, users, clients (tenants),
  roles, and capabilities
- **Client Databases**: Each tenant has a separate PostgreSQL database for their
  data (projects, time entries, tasks, conversations)

## Isolation Mechanisms

### 1. Physical Database Separation

Each client has their own database:

```
freetimechat_main                    # Main auth database
freetimechat_client_<uuid>           # Client 1 database
freetimechat_client_<uuid>           # Client 2 database
```

### 2. Connection Management

- `DatabaseService` manages connections to all databases
- Connection pooling prevents resource exhaustion
- Each request gets the correct client database based on JWT payload

### 3. Request-Level Isolation

The `attachClientDatabase` middleware:

1. Extracts `clientId` from authenticated user's JWT
2. Fetches the appropriate client database connection
3. Attaches it to `req.clientDb`
4. All subsequent operations use this isolated database

## Testing Multi-Tenant Isolation

### Prerequisites

1. Docker services running:

   ```bash
   docker-compose up -d
   ```

2. Main database migrated:

   ```bash
   cd apps/api
   pnpm prisma:migrate:deploy:main
   ```

3. API server running:
   ```bash
   pnpm dev:api
   ```

### Test 1: Create Two Clients

Use the admin client onboarding endpoint to create two separate clients:

```bash
# Create Client A
curl -X POST http://localhost:4000/api/v1/admin/clients \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "email": "admin@acme.com",
    "adminName": "John Doe",
    "adminPassword": "SecurePass123!"
  }'

# Response will include:
# - client.id
# - client.databaseName
# - adminUser (credentials)
# - accessToken

# Create Client B
curl -X POST http://localhost:4000/api/v1/admin/clients \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Beta Inc",
    "email": "admin@beta.com",
    "adminName": "Jane Smith",
    "adminPassword": "SecurePass456!"
  }'
```

### Test 2: Verify Separate Databases

Connect to PostgreSQL and verify both databases exist:

```bash
docker-compose exec postgres psql -U freetimechat -d postgres -c "\l"
```

You should see:

- `freetimechat_main`
- `freetimechat_client_<uuid_a>`
- `freetimechat_client_<uuid_b>`

### Test 3: Create Data in Each Tenant

#### Create Project for Client A

```bash
curl -X POST http://localhost:4000/api/v1/projects \
  -H "Authorization: Bearer CLIENT_A_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Project Alpha",
    "description": "Acme Corp project"
  }'
```

#### Create Project for Client B

```bash
curl -X POST http://localhost:4000/api/v1/projects \
  -H "Authorization: Bearer CLIENT_B_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Project Beta",
    "description": "Beta Inc project"
  }'
```

### Test 4: Verify Data Isolation

#### List Projects for Client A

```bash
curl http://localhost:4000/api/v1/projects \
  -H "Authorization: Bearer CLIENT_A_ACCESS_TOKEN"
```

**Expected**: Only "Project Alpha" is returned

#### List Projects for Client B

```bash
curl http://localhost:4000/api/v1/projects \
  -H "Authorization: Bearer CLIENT_B_ACCESS_TOKEN"
```

**Expected**: Only "Project Beta" is returned

### Test 5: Database-Level Verification

Connect directly to each client database and verify data:

```bash
# Client A database
docker-compose exec postgres psql -U freetimechat \
  -d freetimechat_client_<uuid_a> \
  -c "SELECT id, name FROM projects;"

# Should only show "Project Alpha"

# Client B database
docker-compose exec postgres psql -U freetimechat \
  -d freetimechat_client_<uuid_b> \
  -c "SELECT id, name FROM projects;"

# Should only show "Project Beta"
```

### Test 6: Connection Pooling

Check connection statistics:

```bash
curl http://localhost:4000/api/v1/admin/database/stats \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

**Expected**:

```json
{
  "status": "success",
  "data": {
    "activeConnections": 2,
    "clients": [
      {
        "clientId": "uuid-a",
        "lastAccessed": "2024-01-15T10:30:00Z"
      },
      {
        "clientId": "uuid-b",
        "lastAccessed": "2024-01-15T10:31:00Z"
      }
    ]
  }
}
```

### Test 7: Unauthorized Access Attempt

Try to access Client B's data with Client A's token:

```bash
# This should fail because the JWT contains Client A's clientId
# Even if you know Client B's project ID, you can't access it
curl http://localhost:4000/api/v1/projects/<client_b_project_id> \
  -H "Authorization: Bearer CLIENT_A_ACCESS_TOKEN"
```

**Expected**: 404 Not Found (project doesn't exist in Client A's database)

## Isolation Guarantees

### What IS Isolated

- **All client-specific data**: Projects, time entries, tasks, conversations,
  messages
- **Database connections**: Each client has separate connection credentials
- **Queries**: All queries are scoped to the client's database
- **Data breaches**: A breach of one client's database does NOT affect other
  clients

### What IS NOT Isolated

- **Authentication data**: Users, roles, capabilities are in the main database
  (shared)
- **Client metadata**: Client names and settings are in the main database
- **API endpoints**: All clients use the same API (isolation happens at
  middleware level)

## Common Issues and Solutions

### Issue: "Client database not found"

**Cause**: Client onboarding didn't complete successfully

**Solution**:

```bash
# Check if client has databaseUrl
curl http://localhost:4000/api/v1/admin/clients/<client_id> \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"

# If databaseUrl is null, re-provision the database
# (Endpoint to be created in future)
```

### Issue: "Failed to connect to client database"

**Cause**: Database might not exist or credentials are wrong

**Solution**:

1. Verify database exists:

   ```bash
   docker-compose exec postgres psql -U freetimechat -d postgres -c "\l"
   ```

2. Check client record has correct databaseUrl:
   ```bash
   docker-compose exec postgres psql -U freetimechat \
     -d freetimechat_main \
     -c "SELECT id, name, database_name, database_url FROM clients;"
   ```

### Issue: Connection pool exhausted

**Cause**: Too many clients or too many concurrent requests

**Solution**:

- Increase `maxPoolSize` in DatabaseService
- Reduce `connectionTTL` to close idle connections faster
- Scale horizontally (multiple API instances)

## Security Best Practices

1. **Never hard-code clientId**: Always get it from JWT payload
2. **Always use middleware**: Never manually construct database URLs
3. **Validate all inputs**: Prevent SQL injection even with Prisma
4. **Monitor connections**: Set up alerts for connection pool exhaustion
5. **Regular audits**: Check that no cross-tenant data leaks exist

## Performance Considerations

### Connection Pooling Benefits

- **Faster queries**: Reuse existing connections
- **Lower latency**: No connection setup overhead
- **Resource efficiency**: Limited concurrent connections per client

### Connection Pooling Limits

- **Max pool size**: Default 10 connections (configurable)
- **TTL**: 30 minutes idle timeout (configurable)
- **Cleanup**: Automatic every 5 minutes

### Scaling Strategy

For high traffic:

1. Increase connection pool size
2. Use read replicas for client databases
3. Implement caching (Redis)
4. Scale API horizontally

## Monitoring and Alerts

Set up monitoring for:

- Active connection count (should be < maxPoolSize)
- Failed connection attempts (could indicate database issues)
- Query performance per client (identify slow queries)
- Cross-tenant access attempts (security issue)

## Conclusion

The database-per-tenant architecture provides:

- ✅ Maximum data isolation
- ✅ Enhanced security
- ✅ Easy compliance (data residency)
- ✅ Better performance (no cross-tenant queries)
- ✅ Simple client data management

Follow this testing guide regularly to ensure isolation is maintained as the
system evolves.
