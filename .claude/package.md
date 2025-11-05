# Package.json Documentation

Complete guide to FreeTimeChat's package.json configuration, scripts, and dependencies.

---

## Table of Contents

- [Package Metadata](#package-metadata)
- [Scripts Reference](#scripts-reference)
  - [Development Scripts](#development-scripts)
  - [Build Scripts](#build-scripts)
  - [Testing Scripts](#testing-scripts)
  - [Code Quality Scripts](#code-quality-scripts)
  - [Database Scripts](#database-scripts)
  - [Utility Scripts](#utility-scripts)
  - [Lifecycle Scripts](#lifecycle-scripts)
- [Dependencies](#dependencies)
- [Configuration Sections](#configuration-sections)

---

## Package Metadata

```json
{
  "name": "freetimechat",
  "version": "0.1.0",
  "private": true,
  "description": "Time tracking application with chat interface...",
  "keywords": [...],
  "author": "FreeTimeChat Team",
  "license": "MIT"
}
```

### Fields Explained

| Field | Purpose | Notes |
|-------|---------|-------|
| `name` | Package identifier | Used internally and in workspace references |
| `version` | Semantic version | Following semver: MAJOR.MINOR.PATCH |
| `private` | Prevents publishing | Set to `true` - this is not meant for npm registry |
| `description` | Project summary | Appears in package listings and search |
| `keywords` | Search terms | Helps with discovery in package registries |
| `author` | Package owner | For attribution and contact |
| `license` | License type | MIT - permissive open source license |

### Repository Configuration

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/freetimechat.git"
  }
}
```

**Purpose**: Links package to source code repository for transparency and contributions.

---

## Scripts Reference

All scripts are run with `pnpm <script-name>`. For example: `pnpm dev`

### Development Scripts

#### `pnpm dev`
```json
"dev": "turbo run dev"
```

**What it does:**
- Starts all applications in development mode simultaneously
- Runs the `dev` script in all workspace packages
- Enables hot reload for both frontend and backend
- Uses Turbo for parallel execution and caching

**When to use:**
- Primary command for local development
- Starts both web (port 3000) and API (port 4000)

**Example:**
```bash
pnpm dev
# Output:
# • Packages in scope: web, api
# • Running dev in 2 packages
# web:dev: ready - started server on 0.0.0.0:3000
# api:dev: Server running on port 4000
```

---

#### `pnpm dev:web`
```json
"dev:web": "turbo run dev --filter=web"
```

**What it does:**
- Starts only the Next.js frontend in development mode
- Filters execution to the `web` workspace only
- Useful for frontend-only development

**When to use:**
- Working exclusively on frontend features
- Backend is already running separately
- Testing frontend without backend

**Example:**
```bash
pnpm dev:web
# Starts only Next.js on port 3000
```

---

#### `pnpm dev:api`
```json
"dev:api": "turbo run dev --filter=api"
```

**What it does:**
- Starts only the Express/Fastify backend in development mode
- Filters execution to the `api` workspace only
- Useful for backend-only development

**When to use:**
- Working on API endpoints or services
- Testing API with external tools (Postman, curl)
- Frontend is not needed

**Example:**
```bash
pnpm dev:api
# Starts only API on port 4000
```

---

### Build Scripts

#### `pnpm build`
```json
"build": "turbo run build"
```

**What it does:**
- Builds all applications for production
- Compiles TypeScript to JavaScript
- Optimizes frontend assets
- Creates production-ready bundles
- Executes builds in dependency order (packages → apps)

**When to use:**
- Before deploying to production
- Testing production builds locally
- CI/CD pipeline

**Output:**
- `apps/web/.next/` - Next.js production build
- `apps/api/dist/` - Compiled API code
- `packages/*/dist/` - Compiled shared packages

**Example:**
```bash
pnpm build
# • Packages in scope: types, config, web, api
# types:build: Successfully compiled
# config:build: Successfully compiled
# web:build: Creating an optimized production build
# api:build: Build completed
```

---

#### `pnpm build:web`
```json
"build:web": "turbo run build --filter=web"
```

**What it does:**
- Builds only the Next.js frontend for production
- Includes all dependencies (types, config packages)

**When to use:**
- Deploying only frontend changes
- Testing frontend production build

**Example:**
```bash
pnpm build:web
# Builds web app and its dependencies
```

---

#### `pnpm build:api`
```json
"build:api": "turbo run build --filter=api"
```

**What it does:**
- Builds only the backend API for production
- Compiles TypeScript to JavaScript
- Includes all dependencies

**When to use:**
- Deploying only backend changes
- Testing API production build

---

### Start Scripts (Production)

#### `pnpm start`
```json
"start": "turbo run start"
```

**What it does:**
- Starts all applications in production mode
- Runs pre-built code (requires `pnpm build` first)
- No hot reload or development features

**When to use:**
- Running production builds locally
- Testing production environment
- Production deployment (with process manager like PM2)

**Prerequisites:**
```bash
pnpm build  # Must run first
pnpm start  # Then start
```

---

#### `pnpm start:web`
```json
"start:web": "turbo run start --filter=web"
```

**What it does:**
- Starts only the Next.js frontend in production mode
- Serves optimized, pre-built assets

**Example:**
```bash
pnpm build:web
pnpm start:web
```

---

#### `pnpm start:api`
```json
"start:api": "turbo run start --filter=api"
```

**What it does:**
- Starts only the API in production mode
- Runs compiled JavaScript (not TypeScript)

---

### Testing Scripts

#### `pnpm test`
```json
"test": "turbo run test"
```

**What it does:**
- Runs all tests across all packages
- Executes unit, integration, and E2E tests
- Runs in parallel across workspaces

**When to use:**
- Before committing code
- In CI/CD pipeline
- Before merging PRs

**Example:**
```bash
pnpm test
# web:test: PASS src/components/LoginForm.test.tsx
# api:test: PASS src/services/AuthService.test.ts
# ✓ All tests passed
```

---

#### `pnpm test:unit`
```json
"test:unit": "turbo run test:unit"
```

**What it does:**
- Runs only unit tests
- Fast execution (no external dependencies)
- Tests individual functions/components in isolation

**When to use:**
- Quick feedback during development
- Testing specific functions/components
- TDD workflow

**Example:**
```bash
pnpm test:unit
# Runs tests matching *.test.ts, *.spec.ts
```

---

#### `pnpm test:integration`
```json
"test:integration": "turbo run test:integration"
```

**What it does:**
- Runs integration tests
- Tests multiple components working together
- May require database/Redis connection

**When to use:**
- Testing API endpoints
- Testing database interactions
- Testing authentication flows

**Example:**
```bash
pnpm test:integration
# Requires database to be running
# Tests API routes, services, database operations
```

---

#### `pnpm test:e2e`
```json
"test:e2e": "turbo run test:e2e"
```

**What it does:**
- Runs end-to-end tests
- Uses real browser (Playwright/Cypress)
- Tests complete user workflows

**When to use:**
- Testing critical user journeys
- Before releases
- Smoke testing after deployment

**Example:**
```bash
pnpm test:e2e
# Launches browser, runs user scenarios
# Tests: login → create time entry → logout
```

---

#### `pnpm test:coverage`
```json
"test:coverage": "turbo run test:coverage"
```

**What it does:**
- Runs all tests with coverage reporting
- Generates coverage reports (HTML, LCOV)
- Shows percentage of code covered by tests

**Output:**
- `coverage/` directory with HTML report
- Console summary of coverage percentages

**Example:**
```bash
pnpm test:coverage
# ----------------------|---------|----------|---------|---------|
# File                  | % Stmts | % Branch | % Funcs | % Lines |
# ----------------------|---------|----------|---------|---------|
# All files             |   85.23 |    78.45 |   82.11 |   85.67 |
# ----------------------|---------|----------|---------|---------|
```

---

#### `pnpm test:watch`
```json
"test:watch": "turbo run test:watch"
```

**What it does:**
- Runs tests in watch mode
- Re-runs tests when files change
- Interactive test runner

**When to use:**
- Active development with TDD
- Continuous feedback while coding

**Example:**
```bash
pnpm test:watch
# Watch Usage
# › Press a to run all tests.
# › Press f to run only failed tests.
# › Press q to quit watch mode.
```

---

### Code Quality Scripts

#### `pnpm lint`
```json
"lint": "turbo run lint"
```

**What it does:**
- Runs ESLint across all packages
- Checks code style and potential errors
- Reports issues but doesn't fix them

**When to use:**
- Before committing
- In CI/CD pipeline
- Code review

**Example:**
```bash
pnpm lint
# web:lint: ✓ No ESLint warnings or errors
# api:lint: ✓ No ESLint warnings or errors
```

---

#### `pnpm lint:fix`
```json
"lint:fix": "turbo run lint -- --fix"
```

**What it does:**
- Runs ESLint with auto-fix enabled
- Automatically fixes fixable issues
- Reports remaining issues

**When to use:**
- After writing code
- Before committing
- Cleaning up code style

**Example:**
```bash
pnpm lint:fix
# ✓ Fixed 15 issues automatically
# ⚠ 2 issues require manual fix
```

---

#### `pnpm format`
```json
"format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md,css,scss}\""
```

**What it does:**
- Runs Prettier on all supported files
- Formats code according to `.prettierrc` rules
- Modifies files in place

**File types formatted:**
- TypeScript: `.ts`, `.tsx`
- JavaScript: `.js`, `.jsx`
- Config: `.json`
- Documentation: `.md`
- Styles: `.css`, `.scss`

**When to use:**
- Before committing
- After large refactors
- Cleaning up code style

**Example:**
```bash
pnpm format
# src/components/LoginForm.tsx 50ms
# src/pages/index.tsx 35ms
# ✓ Formatted 47 files
```

---

#### `pnpm format:check`
```json
"format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md,css,scss}\""
```

**What it does:**
- Checks if files are formatted correctly
- Does NOT modify files
- Exits with error if formatting issues found

**When to use:**
- In CI/CD pipeline
- Pre-commit hooks
- Verifying formatting compliance

**Example:**
```bash
pnpm format:check
# Checking formatting...
# ✓ All files formatted correctly
```

---

#### `pnpm type-check`
```json
"type-check": "turbo run type-check"
```

**What it does:**
- Runs TypeScript compiler in check mode
- Verifies type correctness without building
- Reports type errors

**When to use:**
- Before committing
- In CI/CD pipeline
- Debugging type issues

**Example:**
```bash
pnpm type-check
# web:type-check: ✓ No type errors
# api:type-check: ✗ Found 2 type errors
#   src/services/auth.ts:45:12 - error TS2322
```

---

### Database Scripts

#### `pnpm db:generate`
```json
"db:generate": "cd apps/api && pnpm prisma generate"
```

**What it does:**
- Generates Prisma Client from schema
- Creates TypeScript types for database models
- Must run after schema changes

**When to use:**
- After modifying `schema.prisma`
- After `git pull` if schema changed
- Initial setup

**Output:**
- `node_modules/.prisma/client/` - Generated Prisma Client

**Example:**
```bash
pnpm db:generate
# ✔ Generated Prisma Client (3.1.1)
```

---

#### `pnpm db:push`
```json
"db:push": "cd apps/api && pnpm prisma db push"
```

**What it does:**
- Pushes schema changes to database
- Does NOT create migration files
- Useful for rapid prototyping

**When to use:**
- Local development experiments
- Prototyping schema changes
- NOT for production

**⚠️ Warning:** Does not create migration history. Use `db:migrate` for production.

**Example:**
```bash
pnpm db:push
# The following migration was applied:
# ✔ Applied changes to database
```

---

#### `pnpm db:migrate`
```json
"db:migrate": "cd apps/api && pnpm prisma migrate dev"
```

**What it does:**
- Creates migration file from schema changes
- Applies migration to database
- Updates Prisma Client
- Prompts for migration name

**When to use:**
- Making schema changes for production
- Creating migration history
- Team development

**Output:**
- `prisma/migrations/YYYYMMDDHHMMSS_migration_name/` - Migration SQL

**Example:**
```bash
pnpm db:migrate
# ? Enter a name for the new migration: › add_user_2fa_fields
# ✔ Created migration: 20250104120000_add_user_2fa_fields
# ✔ Applied migration
```

---

#### `pnpm db:migrate:deploy`
```json
"db:migrate:deploy": "cd apps/api && pnpm prisma migrate deploy"
```

**What it does:**
- Applies pending migrations to database
- Does NOT create new migrations
- Non-interactive (safe for CI/CD)

**When to use:**
- Production deployments
- Staging environments
- CI/CD pipelines

**Example:**
```bash
pnpm db:migrate:deploy
# Applying migration `20250104120000_add_user_2fa_fields`
# ✔ Applied 1 migration
```

---

#### `pnpm db:migrate:reset`
```json
"db:migrate:reset": "cd apps/api && pnpm prisma migrate reset"
```

**What it does:**
- Drops database
- Re-creates database
- Applies all migrations
- Runs seed script

**⚠️ DANGER:** Deletes all data!

**When to use:**
- Resetting local development database
- Starting fresh
- **NEVER** in production

**Example:**
```bash
pnpm db:migrate:reset
# ⚠ All data will be lost. Continue? (y/N) › y
# ✔ Database reset complete
```

---

#### `pnpm db:seed`
```json
"db:seed": "cd apps/api && pnpm prisma db seed"
```

**What it does:**
- Runs seed script defined in `package.json`
- Populates database with initial/test data
- Idempotent (safe to run multiple times)

**When to use:**
- Initial setup
- After database reset
- Creating test data

**Example:**
```bash
pnpm db:seed
# 🌱 Seeding database...
# ✔ Created 3 roles
# ✔ Created 10 capabilities
# ✔ Created 2 users
# ✔ Seeding complete
```

---

#### `pnpm db:studio`
```json
"db:studio": "cd apps/api && pnpm prisma studio"
```

**What it does:**
- Opens Prisma Studio GUI
- Visual database browser and editor
- Runs on http://localhost:5555

**When to use:**
- Browsing database records
- Manually editing data
- Debugging database issues

**Example:**
```bash
pnpm db:studio
# Prisma Studio is up on http://localhost:5555
```

---

#### `pnpm db:migrate-clients`
```json
"db:migrate-clients": "node scripts/migrate-all-clients.js"
```

**What it does:**
- Migrates all client databases (multi-tenant)
- Iterates through all active clients
- Applies pending migrations to each client DB

**When to use:**
- After creating new migration
- Deploying schema changes to all tenants
- Initial setup for existing clients

**Example:**
```bash
pnpm db:migrate-clients
# Found 5 active clients
# Migrating: Acme Corp (freetimechat_abc123...)
# ✔ Successfully migrated Acme Corp
# Migrating: TechStart (freetimechat_def456...)
# ✔ Successfully migrated TechStart
# ...
```

---

### Utility Scripts

#### `pnpm clean`
```json
"clean": "turbo run clean && rm -rf node_modules .turbo"
```

**What it does:**
- Runs `clean` script in all workspaces
- Removes all `node_modules`
- Removes Turbo cache
- Nuclear option for fresh start

**When to use:**
- Dependency issues
- Cache corruption
- Before fresh install

**⚠️ Warning:** Requires reinstalling dependencies after.

**Example:**
```bash
pnpm clean
# Cleaning web...
# Cleaning api...
# Removing node_modules...
# ✔ Clean complete

# Then reinstall:
pnpm install
```

---

#### `pnpm clean:build`
```json
"clean:build": "turbo run clean"
```

**What it does:**
- Removes build artifacts only
- Keeps `node_modules` intact
- Cleans `.next/`, `dist/`, `*.tsbuildinfo`

**When to use:**
- Before rebuilding
- Clearing stale build cache
- Troubleshooting build issues

**Example:**
```bash
pnpm clean:build
pnpm build  # Fresh build
```

---

#### `pnpm commit`
```json
"commit": "node scripts/commit.js"
```

**What it does:**
- Runs automated commit script
- Analyzes changes
- Generates detailed commit message
- Creates commit
- Auto-creates dev branch (dev-1, dev-2, etc.)

**When to use:**
- Alternative to manual `git commit`
- Want detailed commit messages
- Solo development with auto-branching

**Example:**
```bash
pnpm commit
# ========================================
#    FreeTimeChat Automated Commit
# ========================================
#
# Step 1: Current Status
# M  apps/web/src/components/LoginForm.tsx
# A  apps/api/src/services/AuthService.ts
# ...
#
# Proceed with this commit? (y/n): y
# ✔ Commit created successfully
# ✔ Created and switched to branch: dev-3
```

---

### Lifecycle Scripts

#### `pnpm prepare`
```json
"prepare": "husky install || true"
```

**What it does:**
- Automatically runs after `pnpm install`
- Installs Husky git hooks
- Sets up pre-commit hooks

**When to use:**
- Automatically (no manual invocation needed)
- Runs during initial setup
- Configures git hooks for team

**Git hooks installed:**
- Pre-commit: Runs linting and formatting
- Commit-msg: Validates commit message format

**Example:**
```bash
pnpm install
# ... installing dependencies ...
# prepare: husky install
# ✔ Git hooks installed
```

---

#### `pnpm preinstall`
```json
"preinstall": "npx only-allow pnpm"
```

**What it does:**
- Runs before `install`
- Enforces pnpm usage
- Prevents accidental `npm install` or `yarn install`

**When to use:**
- Automatically (no manual invocation)
- Ensures team uses correct package manager

**Example:**
```bash
npm install
# ✖ This project requires pnpm. Please use 'pnpm install'

yarn install
# ✖ This project requires pnpm. Please use 'pnpm install'

pnpm install
# ✔ Proceeding with installation
```

---

#### `pnpm postinstall`
```json
"postinstall": "turbo run build --filter=@freetimechat/types"
```

**What it does:**
- Runs after all dependencies installed
- Auto-builds shared types package
- Ensures types are available for other packages

**When to use:**
- Automatically after `pnpm install`
- Ensures fresh type definitions

**Example:**
```bash
pnpm install
# ... installing dependencies ...
# postinstall: turbo run build --filter=@freetimechat/types
# types:build: ✔ Built successfully
```

---

### Security & Maintenance Scripts

#### `pnpm security:audit`
```json
"security:audit": "pnpm audit --audit-level=moderate"
```

**What it does:**
- Scans dependencies for vulnerabilities
- Reports moderate, high, and critical issues
- Exits with error if vulnerabilities found

**When to use:**
- Regularly (weekly/monthly)
- Before production deployments
- In CI/CD pipeline

**Example:**
```bash
pnpm security:audit
# ╭────────────────────────────────────────╮
# │                                        │
# │  1 moderate severity vulnerability    │
# │  0 high severity vulnerabilities      │
# │  0 critical severity vulnerabilities  │
# │                                        │
# ╰────────────────────────────────────────╯
```

---

#### `pnpm security:fix`
```json
"security:fix": "pnpm audit --fix"
```

**What it does:**
- Scans for vulnerabilities
- Automatically updates vulnerable packages
- May cause breaking changes

**When to use:**
- Fixing security vulnerabilities
- After audit reveals issues
- **Caution:** Test thoroughly after

**Example:**
```bash
pnpm security:fix
# ✔ Fixed 3 vulnerabilities by updating dependencies
```

---

#### `pnpm outdated`
```json
"outdated": "pnpm outdated --recursive"
```

**What it does:**
- Lists outdated dependencies
- Shows current vs latest versions
- Checks all workspace packages

**When to use:**
- Regularly checking for updates
- Planning dependency updates
- Maintenance

**Example:**
```bash
pnpm outdated
# Package        Current  Latest
# typescript     5.3.3    5.4.2
# next           14.0.4   14.1.0
# react          18.2.0   18.2.0 (up to date)
```

---

#### `pnpm update`
```json
"update": "pnpm update --interactive --recursive --latest"
```

**What it does:**
- Interactive dependency updater
- Shows available updates
- Allows selecting which to update
- Updates across all workspaces

**When to use:**
- Updating dependencies safely
- Reviewing changes before updating
- Maintenance windows

**Example:**
```bash
pnpm update
# ? Select packages to update:
#   ◯ typescript 5.3.3 → 5.4.2
#   ◉ next 14.0.4 → 14.1.0
#   ◯ react 18.2.0 → 18.3.0
```

---

## Dependencies

### Dev Dependencies Explained

```json
{
  "devDependencies": {
    "@types/node": "^20.10.6",
    "eslint": "^8.56.0",
    "husky": "^8.0.3",
    "lint-staged": "^15.2.0",
    "prettier": "^3.1.1",
    "turbo": "^1.11.2",
    "typescript": "^5.3.3"
  }
}
```

#### `@types/node` (^20.10.6)
**Purpose:** TypeScript type definitions for Node.js

**What it does:**
- Provides types for Node.js built-in modules
- Enables IntelliSense for `fs`, `path`, `http`, etc.
- Matches Node.js version (20.x)

**Example usage:**
```typescript
import { readFileSync } from 'fs'; // Types provided by @types/node
import * as path from 'path';      // TypeScript knows about path module
```

---

#### `eslint` (^8.56.0)
**Purpose:** JavaScript/TypeScript linter

**What it does:**
- Finds code quality issues
- Enforces coding standards
- Catches potential bugs
- Configured via `.eslintrc.js`

**Rules enforced:**
- Unused variables
- Missing return types
- Code style violations
- Best practices

**Example output:**
```
src/auth.ts
  12:5  error  'userId' is assigned a value but never used  no-unused-vars
  34:1  error  Missing return type on function              @typescript-eslint/explicit-function-return-type
```

---

#### `husky` (^8.0.3)
**Purpose:** Git hooks manager

**What it does:**
- Runs scripts before git commands
- Enables pre-commit hooks
- Enforces code quality before commits

**Configured hooks:**
- **pre-commit**: Runs `lint-staged`
- **commit-msg**: Validates commit message format (if configured)

**Example workflow:**
```bash
git commit -m "fix: auth bug"
# → Triggers pre-commit hook
# → Runs ESLint on staged files
# → Runs Prettier on staged files
# → If all pass, commit proceeds
```

---

#### `lint-staged` (^15.2.0)
**Purpose:** Runs linters on git staged files only

**What it does:**
- Runs linting/formatting only on files about to be committed
- Much faster than linting entire codebase
- Configured in `package.json`

**Configuration:**
```json
"lint-staged": {
  "*.{ts,tsx,js,jsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md,css,scss}": [
    "prettier --write"
  ]
}
```

**Workflow:**
1. You stage files: `git add src/auth.ts`
2. You commit: `git commit -m "fix: auth"`
3. `lint-staged` runs:
   - ESLint on `src/auth.ts`
   - Prettier on `src/auth.ts`
4. Fixed files are re-staged
5. Commit proceeds

---

#### `prettier` (^3.1.1)
**Purpose:** Opinionated code formatter

**What it does:**
- Automatically formats code
- Ensures consistent style
- Formats JS, TS, JSON, Markdown, CSS
- Configured via `.prettierrc`

**Settings** (from `.prettierrc`):
- Single quotes: `'string'`
- Semicolons: Required
- 2 spaces indentation
- 100 character line width
- Trailing commas in objects

**Example:**
```typescript
// Before
const user={name:"John",age:30,}

// After Prettier
const user = {
  name: 'John',
  age: 30,
};
```

---

#### `turbo` (^1.11.2)
**Purpose:** Monorepo build system

**What it does:**
- Orchestrates tasks across workspaces
- Parallel execution
- Smart caching
- Dependency-aware task scheduling

**Features:**
- **Caching**: Skips unchanged builds
- **Parallelization**: Runs independent tasks simultaneously
- **Pipeline**: Defines task dependencies
- **Filtering**: Run tasks in specific workspaces

**Example pipeline** (from `turbo.json`):
```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"], // Wait for dependencies to build first
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Benefits:**
```bash
# First run: Builds everything
pnpm build
# types:build (30s)
# config:build (20s)
# web:build (90s)
# api:build (45s)
# Total: ~90s (parallel)

# Second run: Uses cache
pnpm build
# Total: ~1s (everything cached!)
```

---

#### `typescript` (^5.3.3)
**Purpose:** TypeScript compiler and language

**What it does:**
- Compiles TypeScript to JavaScript
- Type checking
- Modern JavaScript features
- IntelliSense and IDE support

**Configuration** (`tsconfig.json`):
- Target: ES2022
- Strict mode: Enabled
- Source maps: Yes
- Declaration files: Yes

**Benefits:**
- Catch errors at compile time
- Better IDE autocomplete
- Refactoring safety
- Self-documenting code

**Example:**
```typescript
// TypeScript catches error at compile time
function greet(name: string): string {
  return name.toUpperCase();
}

greet(123); // ✗ Error: Argument of type 'number' not assignable to 'string'
```

---

## Configuration Sections

### Package Manager

```json
{
  "packageManager": "pnpm@8.15.0"
}
```

**Purpose:** Specifies exact package manager version

**What it does:**
- Ensures team uses same pnpm version
- Corepack uses this for automatic installation
- Prevents version mismatches

---

### Workspaces

```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

**Purpose:** Defines monorepo structure

**What it does:**
- Tells pnpm which directories contain packages
- Enables workspace protocol
- Allows cross-package dependencies

**Workspace packages:**
- `apps/web` - Next.js frontend
- `apps/api` - Express backend
- `packages/types` - Shared TypeScript types
- `packages/config` - Shared configuration

**Usage in package.json:**
```json
{
  "dependencies": {
    "@freetimechat/types": "workspace:*"
  }
}
```

---

### Engines

```json
{
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

**Purpose:** Specifies required runtime versions

**What it does:**
- Documents minimum Node.js version
- Documents minimum pnpm version
- Can enforce with `.npmrc` (optional)

**Why Node 18+:**
- Native fetch API
- Improved performance
- Better ESM support
- LTS (Long Term Support)

**Why pnpm 8+:**
- Workspace improvements
- Faster installation
- Better dependency resolution

---

### PNPM Configuration

```json
{
  "pnpm": {
    "overrides": {
      "axios": "^1.6.0"
    },
    "patchedDependencies": {},
    "updateConfig": {
      "ignoreDependencies": []
    }
  }
}
```

#### `overrides`
**Purpose:** Force specific dependency versions

**Example:**
```json
"overrides": {
  "axios": "^1.6.0"
}
```

**When to use:**
- Security vulnerability in nested dependency
- Incompatibility issues
- Bug in transitive dependency

**Effect:** All packages in the monorepo use axios ^1.6.0, even if their dependencies specify older versions.

---

#### `patchedDependencies`
**Purpose:** Apply patches to dependencies

**Example:**
```json
"patchedDependencies": {
  "some-package@1.0.0": "patches/some-package@1.0.0.patch"
}
```

**When to use:**
- Bug in dependency that hasn't been fixed upstream
- Temporary workaround
- Customization needed

**Workflow:**
1. `pnpm patch some-package`
2. Edit files in temp directory
3. `pnpm patch-commit /path/to/temp`
4. Patch is applied on every install

---

#### `updateConfig`
**Purpose:** Configure update behavior

**Example:**
```json
"updateConfig": {
  "ignoreDependencies": ["react", "react-dom"]
}
```

**When to use:**
- Pinning specific packages
- Preventing automatic updates
- Stability requirements

---

### Lint-Staged Configuration

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,css,scss}": [
      "prettier --write"
    ]
  }
}
```

**Purpose:** Define what to run on staged files

**Configuration breakdown:**

#### For TypeScript/JavaScript files:
```json
"*.{ts,tsx,js,jsx}": [
  "eslint --fix",     // 1. Lint and auto-fix
  "prettier --write"  // 2. Format
]
```

**Process:**
1. Run ESLint, fix auto-fixable issues
2. Run Prettier to format
3. Re-stage fixed files
4. Continue with commit

---

#### For other files:
```json
"*.{json,md,css,scss}": [
  "prettier --write"  // Format only
]
```

**Process:**
1. Format with Prettier
2. Re-stage formatted files
3. Continue with commit

---

## Summary

### Most Used Commands

**Daily Development:**
```bash
pnpm dev              # Start development
pnpm test:watch       # Run tests in watch mode
pnpm lint:fix         # Fix linting issues
pnpm format           # Format code
```

**Before Committing:**
```bash
pnpm test             # Run all tests
pnpm lint             # Check linting
pnpm type-check       # Check types
pnpm commit           # Automated commit
```

**Database Work:**
```bash
pnpm db:studio        # Browse database
pnpm db:migrate       # Create migration
pnpm db:seed          # Seed data
```

**Production:**
```bash
pnpm build            # Build for production
pnpm start            # Start production server
pnpm db:migrate:deploy  # Deploy migrations
```

**Maintenance:**
```bash
pnpm outdated         # Check for updates
pnpm security:audit   # Security scan
pnpm clean            # Fresh start
```

---

## Quick Reference Table

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `dev` | Start development | Daily development |
| `build` | Production build | Before deployment |
| `test` | Run all tests | Before commit/PR |
| `lint` | Check code quality | Before commit |
| `format` | Format code | Before commit |
| `db:migrate` | Create migration | Schema changes |
| `db:studio` | Visual DB browser | Browse/edit data |
| `commit` | Automated commit | Alternative to git commit |
| `clean` | Nuclear clean | Dependency issues |
| `security:audit` | Security scan | Regularly/before deploy |

---

**Document Version:** 1.0
**Last Updated:** 2025-01-04
**Related Documentation:**
- [QUICKSTART.md](../QUICKSTART.md) - Getting started guide
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [plan.md](./plan.md) - Development roadmap
