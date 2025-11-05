# FreeTimeChat Services - Quick Reference

This document provides quick access information for all FreeTimeChat services.

## 🚀 Quick Start

```bash
# Start all services with one command
pnpm restart:all
```

This will:
- Stop any running services
- Clear all caches
- Start PostgreSQL and Redis
- Launch API and Web servers in new terminals
- Display a comprehensive service summary

---

## 📋 All Services

### 🌐 Frontend (Next.js Web App)

| Property | Value |
|----------|-------|
| **URL** | http://localhost:3000 |
| **Framework** | Next.js 16 (Turbopack) |
| **Location** | `apps/web` |
| **Start Command** | `pnpm dev:web` or `cd apps/web && pnpm dev` |
| **Environment** | `.env.local` |

**Key Pages:**
- Homepage: http://localhost:3000
- Login: http://localhost:3000/login
- Register: http://localhost:3000/register
- Chat: http://localhost:3000/chat (requires auth)
- Admin: http://localhost:3000/admin (requires admin role)

---

### 🔧 Backend API (Express)

| Property | Value |
|----------|-------|
| **Base URL** | http://localhost:3000/api/v1 |
| **Health Check** | http://localhost:3000/api/v1/health |
| **Framework** | Express.js + TypeScript |
| **Location** | `apps/api` |
| **Start Command** | `pnpm dev:api` or `cd apps/api && pnpm dev` |
| **Restart (Clear Cache)** | `pnpm restart:api` |
| **Environment** | `.env` |

**Key Endpoints:**
- `/api/v1/health` - Health check
- `/api/v1/auth/login` - Login
- `/api/v1/auth/register` - Register
- `/api/v1/auth/refresh` - Refresh token
- `/api/v1/oauth/google` - Google OAuth
- `/api/v1/2fa/*` - Two-factor authentication
- `/api/v1/chat/*` - Chat endpoints
- `/api/v1/projects/*` - Project management
- `/api/v1/admin/*` - Admin endpoints

---

### 🗄️ Database (PostgreSQL 16)

| Property | Value |
|----------|-------|
| **Host** | localhost |
| **Port** | 5432 |
| **User** | david |
| **Main Database** | freetimechat_main |
| **Client Database** | freetimechat_client_dev |
| **Password** | (none - local dev via Homebrew) |

**Connection Commands:**
```bash
# Connect to main database
psql -U david -d freetimechat_main

# Connect to client database
psql -U david -d freetimechat_client_dev

# List all databases
psql -U david -l

# Check service status
brew services list | grep postgresql
```

**Database Structure:**
- **Main DB**: User authentication, client registry, roles, capabilities, sessions
- **Client DB**: Projects, time entries, tasks, conversations, messages (per-client isolation)

**Prisma Studio:**
```bash
# Main database GUI
cd apps/api && pnpm prisma:studio:main
# Opens at http://localhost:5555

# Client database GUI
cd apps/api && pnpm prisma:studio:client
# Opens at http://localhost:5556
```

**Service Management:**
```bash
# Start PostgreSQL
brew services start postgresql@16

# Stop PostgreSQL
brew services stop postgresql@16

# Restart PostgreSQL
brew services restart postgresql@16
```

---

### ⚡ Cache (Redis)

| Property | Value |
|----------|-------|
| **Host** | localhost |
| **Port** | 6379 |
| **Password** | (none - local dev via Homebrew) |
| **Database** | 0 |

**Connection Commands:**
```bash
# Connect to Redis CLI
redis-cli

# Test connection
redis-cli ping
# Should return: PONG

# Check service status
brew services list | grep redis
```

**Common Redis Commands:**
```bash
# View all keys
KEYS *

# Get a value
GET key_name

# Set a value
SET key_name value

# Delete a key
DEL key_name

# Flush all data (careful!)
FLUSHALL
```

**Service Management:**
```bash
# Start Redis
brew services start redis

# Stop Redis
brew services stop redis

# Restart Redis
brew services restart redis
```

---

## 🛠️ Development Tools

### Package Manager (pnpm)

**Version**: 10.20.0

**Common Commands:**
```bash
# Install dependencies
pnpm install

# Start all services (Turbo)
pnpm dev

# Start individual services
pnpm dev:web        # Frontend only
pnpm dev:api        # Backend only

# Restart services
pnpm restart:api    # API only (clears cache)
pnpm restart:all    # All services

# Build
pnpm build          # All projects
pnpm build:web      # Frontend only
pnpm build:api      # Backend only

# Database
pnpm db:generate    # Generate Prisma clients
pnpm db:push        # Push schema to DB
pnpm db:studio      # Open Prisma Studio

# Code quality
pnpm lint           # Run ESLint
pnpm format         # Format code with Prettier
pnpm type-check     # TypeScript type checking

# Testing
pnpm test           # Run all tests
pnpm test:unit      # Unit tests only
pnpm test:e2e       # E2E tests only
```

---

## 🔗 Quick Links

### Application URLs
- **Homepage**: http://localhost:3000
- **Login**: http://localhost:3000/login
- **Register**: http://localhost:3000/register
- **Chat Interface**: http://localhost:3000/chat
- **Admin Dashboard**: http://localhost:3000/admin/dashboard

### API URLs
- **Health Check**: http://localhost:3000/api/v1/health
- **API Base**: http://localhost:3000/api/v1

### Development Tools
- **Prisma Studio (Main)**: http://localhost:5555
- **Prisma Studio (Client)**: http://localhost:5556

---

## 📝 Common Tasks

### Starting Development

```bash
# Option 1: Start all services at once (RECOMMENDED)
pnpm restart:all

# Option 2: Start services individually
brew services start postgresql@16
brew services start redis
cd apps/api && pnpm dev    # In one terminal
cd apps/web && pnpm dev    # In another terminal
```

### Stopping All Services

```bash
# Stop web servers
lsof -ti:3000,3001 | xargs kill -9

# Stop database services (optional)
brew services stop postgresql@16
brew services stop redis
```

### Database Migrations

```bash
cd apps/api

# Main database
pnpm prisma:migrate:main
pnpm prisma:generate:main

# Client database
pnpm prisma:migrate:client
pnpm prisma:generate:client
```

### Troubleshooting

**Port already in use:**
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Find and kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

**Database connection issues:**
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Test connection
psql -U david -d freetimechat_main -c "SELECT 1"
```

**TypeScript cache issues:**
```bash
# Clear cache and restart API
pnpm restart:api
```

**Complete reset:**
```bash
# Stop everything
lsof -ti:3000,3001 | xargs kill -9

# Clear all caches
rm -rf apps/api/.ts-node apps/api/dist apps/web/.next

# Restart everything
pnpm restart:all
```

---

## 📚 Additional Resources

- **Main README**: [README.md](README.md)
- **Scripts Documentation**: [scripts/README.md](scripts/README.md)
- **Prisma Documentation**: [prisma/README.md](prisma/README.md)
- **Docker Setup**: [docker/README.md](docker/README.md) (optional)
- **API Documentation**: Coming soon
- **Contributing Guide**: Coming soon

---

## 🆘 Need Help?

If you encounter issues:

1. Check the service logs in terminal windows
2. Verify environment variables in `.env` and `.env.local`
3. Ensure PostgreSQL and Redis are running: `brew services list`
4. Try a complete restart: `pnpm restart:all`
5. Check the troubleshooting section in [scripts/README.md](scripts/README.md)

---

**Last Updated**: 2025-11-05
