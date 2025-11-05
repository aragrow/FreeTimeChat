# FreeTimeChat - Quick Start Guide

Get FreeTimeChat up and running in minutes!

## Prerequisites Checklist

- ✅ Node.js 18 or higher installed
- ✅ pnpm 8 or higher installed
- ✅ PostgreSQL 16 or higher running
- ✅ Redis running (optional, recommended)
- ✅ Git installed

## Step-by-Step Setup

### 1. Install Dependencies

```bash
pnpm install
```

This will install all dependencies for the monorepo.

### 2. Generate JWT Keys

```bash
mkdir -p apps/api/keys
openssl genrsa -out apps/api/keys/private.pem 2048
openssl rsa -in apps/api/keys/private.pem -outform PEM -pubout -out apps/api/keys/public.pem
```

**Why?** JWT tokens use RSA asymmetric encryption for maximum security.

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and update these critical values:

```env
# Database
MAIN_DATABASE_URL="postgresql://user:password@localhost:5432/freetimechat_main"
DATABASE_URL_TEMPLATE="postgresql://user:password@localhost:5432/{DB_NAME}"

# JWT Keys
JWT_PRIVATE_KEY_PATH="./apps/api/keys/private.pem"
JWT_PUBLIC_KEY_PATH="./apps/api/keys/public.pem"

# URLs
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:4000"

# Redis (optional)
REDIS_URL="redis://localhost:6379"
```

### 4. Create Main Database

```bash
# Using PostgreSQL command line
createdb freetimechat_main

# Or using psql
psql -U postgres
CREATE DATABASE freetimechat_main;
\q
```

### 5. Run Database Migrations

```bash
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Run migrations
pnpm db:seed        # Seed initial data (optional)
```

### 6. Start Development Servers

```bash
# Start all services
pnpm dev

# Or start individually:
pnpm dev:web    # Frontend only (port 3000)
pnpm dev:api    # Backend only (port 4000)
```

### 7. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **API Docs**: http://localhost:4000/api/docs (if implemented)
- **Prisma Studio**: Run `pnpm db:studio` (port 5555)

## Default Accounts (After Seeding)

If you ran `pnpm db:seed`, these accounts are available:

**Super Admin:**
- Email: `admin@freetimechat.com`
- Password: `Admin123!`

**Regular User:**
- Email: `user@freetimechat.com`
- Password: `User123!`

⚠️ **Change these passwords immediately in production!**

## Common Commands

### Development

```bash
pnpm dev              # Start all apps in dev mode
pnpm dev:web          # Start frontend only
pnpm dev:api          # Start backend only
pnpm build            # Build all apps
pnpm start            # Start production build
```

### Database

```bash
pnpm db:studio        # Open Prisma Studio GUI
pnpm db:migrate       # Create and run migration
pnpm db:push          # Push schema without migration
pnpm db:seed          # Seed database
pnpm db:generate      # Generate Prisma client
```

### Testing

```bash
pnpm test             # Run all tests
pnpm test:unit        # Run unit tests
pnpm test:e2e         # Run E2E tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Generate coverage report
```

### Code Quality

```bash
pnpm lint             # Run linter
pnpm lint:fix         # Fix linting issues
pnpm format           # Format code with Prettier
pnpm type-check       # Run TypeScript checks
```

### Git

```bash
pnpm commit           # Automated commit with branch creation
```

## Project Structure

```
FreeTimeChat/
├── .claude/                    # Documentation
│   ├── instructions.md         # Main architecture doc
│   ├── plan.md                 # Development roadmap
│   ├── userstories.md          # User stories
│   ├── test.md                 # Testing plan
│   ├── authentication.md       # Auth architecture
│   ├── authorization.md        # RBAC system
│   ├── database.md             # Database setup
│   └── memory.md               # Memory system
├── apps/
│   ├── web/                    # Next.js frontend (create next)
│   └── api/                    # Express/Fastify backend (create next)
├── packages/
│   ├── types/                  # Shared TypeScript types (create next)
│   └── config/                 # Shared configuration (create next)
├── scripts/
│   ├── commit.js               # Automated commit script
│   └── migrate-all-clients.js # Multi-tenant migration (create later)
├── .env.example                # Environment template
├── .gitignore                  # Git ignore rules
├── package.json                # Root package config
├── turbo.json                  # Turbo configuration
├── tsconfig.json               # TypeScript config
├── .prettierrc                 # Prettier config
└── .eslintrc.js                # ESLint config
```

## Next Steps

### Phase 1: Project Setup (Current)

Follow [.claude/plan.md](.claude/plan.md) Task 1.1-1.6:

1. ✅ Create monorepo structure
2. ✅ Configure build tools
3. ⏳ Create Next.js app (`apps/web`)
4. ⏳ Create API app (`apps/api`)
5. ⏳ Create shared packages (`packages/types`, `packages/config`)
6. ⏳ Verify build pipeline

### Phase 2: Authentication & Authorization

See [.claude/plan.md](.claude/plan.md) Phase 2 for detailed tasks.

### Development Workflow

1. **Check the plan**: See [.claude/plan.md](.claude/plan.md)
2. **Reference user stories**: See [.claude/userstories.md](.claude/userstories.md)
3. **Write tests**: See [.claude/test.md](.claude/test.md)
4. **Follow coding standards**: See [.claude/code.md](.claude/code.md)
5. **Commit your work**: Use `pnpm commit`

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 4000
lsof -ti:4000 | xargs kill -9
```

### Database Connection Errors

1. Verify PostgreSQL is running: `pg_isready`
2. Check connection string in `.env`
3. Ensure database exists: `psql -l | grep freetimechat`
4. Test connection: `psql $MAIN_DATABASE_URL`

### Prisma Issues

```bash
# Reset Prisma client
rm -rf node_modules/.prisma
pnpm db:generate

# Reset database (CAUTION: Deletes all data)
pnpm db:migrate:reset
```

### Build Errors

```bash
# Clean all build artifacts
pnpm clean

# Reinstall dependencies
rm -rf node_modules
pnpm install

# Rebuild
pnpm build
```

### TypeScript Errors

```bash
# Rebuild TypeScript
pnpm type-check

# Clean TypeScript cache
rm -rf **/*.tsbuildinfo
```

## Resources

- **Documentation**: [.claude/](.claude/) directory
- **Architecture**: [.claude/instructions.md](.claude/instructions.md)
- **Plan**: [.claude/plan.md](.claude/plan.md)
- **User Stories**: [.claude/userstories.md](.claude/userstories.md)
- **Testing**: [.claude/test.md](.claude/test.md)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)

## Getting Help

1. Check documentation in `.claude/` directory
2. Search for similar issues
3. Review the plan and user stories
4. Ask for help in discussions

---

**Ready to code?** Start with Phase 1: Create your Next.js app!

```bash
# Follow these guides:
# - Next.js: https://nextjs.org/docs/getting-started/installation
# - Turbo: https://turbo.build/repo/docs
# - Prisma: https://www.prisma.io/docs/getting-started
```

Happy coding! 🚀
