# Docker Development Environment

This directory contains Docker configuration for AfricAI Digital Books local development.

## Services

### PostgreSQL (Port 5432)

Main database server for both authentication and client data.

**Credentials:**

- Host: `localhost`
- Port: `5432`
- User: `freetimechat`
- Password: `freetimechat_dev_password`

**Databases:**

- `freetimechat_main` - Authentication and client registry
- `freetimechat_client_dev` - Development client database

### Redis (Port 6379)

Cache server for sessions and temporary data.

**Credentials:**

- Host: `localhost`
- Port: `6379`
- Password: `freetimechat_redis_password`

### pgAdmin (Port 5050) - Optional

Web-based PostgreSQL management tool.

**Credentials:**

- URL: `http://localhost:5050`
- Email: `admin@freetimechat.local`
- Password: `admin`

**Note:** pgAdmin is in the `tools` profile and won't start by default. See
usage below.

## Quick Start

### Start All Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Start with pgAdmin too
docker-compose --profile tools up -d
```

### Stop All Services

```bash
docker-compose down
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Check Service Status

```bash
docker-compose ps
```

## Database Setup

After starting the services for the first time:

1. **Generate Prisma Clients:**

   ```bash
   cd apps/api
   pnpm prisma:generate
   ```

2. **Run Migrations:**

   ```bash
   pnpm prisma:migrate:main
   pnpm prisma:migrate:client
   ```

3. **Verify Setup:**
   ```bash
   # Open Prisma Studio for main database
   pnpm prisma:studio:main
   ```

## Connecting to Databases

### Using Prisma

Environment variables in `apps/api/.env`:

```env
DATABASE_URL="postgresql://freetimechat:freetimechat_dev_password@localhost:5432/freetimechat_main"
CLIENT_DATABASE_URL="postgresql://freetimechat:freetimechat_dev_password@localhost:5432/freetimechat_client_dev"
```

### Using psql

```bash
# Connect to main database
docker-compose exec postgres psql -U freetimechat -d freetimechat_main

# Connect to client database
docker-compose exec postgres psql -U freetimechat -d freetimechat_client_dev
```

### Using pgAdmin

1. Start pgAdmin: `docker-compose --profile tools up -d`
2. Open http://localhost:5050
3. Login with credentials above
4. Add server:
   - Name: `AfricAI Local`
   - Host: `postgres` (use service name, not localhost)
   - Port: `5432`
   - Database: `freetimechat_main`
   - Username: `freetimechat`
   - Password: `freetimechat_dev_password`

## Data Persistence

Data is persisted in Docker volumes:

- `postgres_data` - PostgreSQL data
- `redis_data` - Redis data
- `pgadmin_data` - pgAdmin configuration (if using)

### Reset Databases

**Warning:** This deletes all data!

```bash
# Stop services
docker-compose down

# Remove volumes
docker volume rm freetimechat_postgres_data
docker volume rm freetimechat_redis_data

# Start fresh
docker-compose up -d
```

## Troubleshooting

### Port Already in Use

If ports 5432, 6379, or 5050 are already in use:

1. Stop the conflicting service, or
2. Edit `docker-compose.yml` to use different ports:
   ```yaml
   ports:
     - '5433:5432' # Changed from 5432:5432
   ```

### Can't Connect to Database

1. Check services are running:

   ```bash
   docker-compose ps
   ```

2. Check logs for errors:

   ```bash
   docker-compose logs postgres
   ```

3. Verify health:
   ```bash
   docker-compose exec postgres pg_isready -U freetimechat
   ```

### Permission Errors

On Linux, if you encounter permission errors with volumes:

```bash
sudo chown -R $USER:$USER volumes/
```

## Production vs Development

**These Docker services are for local development only.**

For production:

- Use managed database services (AWS RDS, Supabase, etc.)
- Use managed Redis (AWS ElastiCache, Redis Cloud, etc.)
- Configure proper backups
- Use strong passwords
- Enable SSL/TLS connections

## Additional Commands

### Backup Database

```bash
# Backup main database
docker-compose exec -T postgres pg_dump -U freetimechat freetimechat_main > backup_main.sql

# Backup client database
docker-compose exec -T postgres pg_dump -U freetimechat freetimechat_client_dev > backup_client.sql
```

### Restore Database

```bash
# Restore main database
docker-compose exec -T postgres psql -U freetimechat freetimechat_main < backup_main.sql
```

### Access Redis CLI

```bash
docker-compose exec redis redis-cli -a freetimechat_redis_password
```

## Related Documentation

- [Database Configuration](../.claude/database.md)
- [Prisma Setup](../apps/api/prisma/README.md)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
