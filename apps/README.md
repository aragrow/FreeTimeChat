# Apps

This directory contains the FreeTimeChat applications.

## Structure

```
apps/
├── web/     # Next.js frontend (to be created)
└── api/     # Express/Fastify backend (to be created)
```

## Creating the Apps

### 1. Create Next.js Frontend

```bash
cd apps
pnpm create next-app@latest web --typescript --tailwind --app --src-dir --import-alias "@/*"
cd ..
```

**Configuration:**
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ App Router
- ✅ `src/` directory
- ✅ Import alias `@/*`

### 2. Create Express/Fastify Backend

```bash
mkdir -p apps/api
cd apps/api

# Initialize package.json
pnpm init

# Install dependencies
pnpm add express cors dotenv
pnpm add -D typescript @types/node @types/express @types/cors tsx nodemon

# Create tsconfig.json, src/, etc.
```

Or use a backend template/starter.

## Development

```bash
# From root directory

# Start both apps
pnpm dev

# Start frontend only
pnpm dev:web

# Start backend only
pnpm dev:api
```

## Port Assignments

- **web** (Next.js): `http://localhost:3000`
- **api** (Express): `http://localhost:4000`

## Next Steps

Follow [../.claude/plan.md](../.claude/plan.md) for detailed implementation steps:

- Phase 1: Project Setup
- Phase 2: Authentication & Authorization
- Phase 3: Database & Multi-Tenancy
- And so on...

## Documentation

See the [.claude/](../.claude/) directory for:
- Architecture decisions
- API documentation
- Component guidelines
- Database schemas
