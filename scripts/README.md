# FreeTimeChat Development Scripts

This directory contains utility scripts for development and automation.

## Available Scripts

### `restart-all.sh`

**RECOMMENDED** - Restarts all FreeTimeChat services with a comprehensive summary.

**Purpose**: One-command restart of the entire development environment including database, cache, API, and frontend.

**Usage**:
```bash
# From project root
pnpm restart:all

# Or directly
./scripts/restart-all.sh
```

**What it does**:
1. Stops all running processes (API on port 3000, Web on port 3001)
2. Clears all caches (.ts-node, dist, .next)
3. Checks and starts PostgreSQL and Redis (via Homebrew)
4. Tests database connectivity
5. Starts API and Web servers in new terminal windows
6. Displays comprehensive service summary with all access information

**Service Summary Includes**:
- Frontend URL and information
- Backend API URLs and health check
- PostgreSQL connection details and commands
- Redis connection details and commands
- Prisma Studio commands
- Quick links to all pages
- Useful development commands

**When to use**:
- Starting development for the day
- After system restart
- When multiple services need to be restarted
- When you want a clean slate

### `restart-api.sh`

Clears TypeScript/ts-node cache and restarts the API development server only.

**Purpose**: Fixes issues where ts-node caches old compiled TypeScript files, causing persistent errors even after fixes are applied.

**Usage**:
```bash
# From project root
pnpm restart:api

# Or directly
./scripts/restart-api.sh
```

**What it does**:
1. Clears the `.ts-node` cache directory (if it exists)
2. Clears the `dist` build directory
3. Kills any existing process on port 3000
4. Starts the API development server with `pnpm dev`

**When to use**:
- When you see TypeScript compilation errors that don't match your current code
- After making significant changes to TypeScript configuration
- After updating type definitions or interfaces
- When the API server is showing stale errors

**Alternative manual approach**:
```bash
# Kill the process on port 3000
lsof -ti:3000 | xargs kill -9

# Clear cache directories
rm -rf apps/api/.ts-node
rm -rf apps/api/dist

# Restart the server
cd apps/api && pnpm dev
```

### `commit.js`

Automated commit script with comprehensive change analysis and automatic dev-branch creation.

**Usage**:
```bash
pnpm commit
```

See the [Commit Script Documentation](../docs/commit-script.md) for details.

### `setup-env.js`

Environment setup script for first-time project setup.

**Usage**:
```bash
pnpm setup:env
```

Copies `.env.example` files and generates secure secrets.

### `migrate-all-clients.js`

Runs database migrations for all client databases in production.

**Usage**:
```bash
pnpm db:migrate-clients
```

## Troubleshooting

### Restart script doesn't clear errors

If the restart script doesn't resolve compilation errors:

1. **Check for actual TypeScript errors**: The errors might be real, not cached
2. **Clear node_modules cache**: Sometimes the issue is in node_modules
   ```bash
   rm -rf node_modules
   pnpm install
   ```
3. **Check tsconfig.json**: Ensure TypeScript configuration is correct
4. **Restart your IDE**: VS Code or other IDEs might have their own TypeScript cache

### API server won't start

1. **Check if port 3000 is in use**:
   ```bash
   lsof -i:3000
   ```

2. **Check PostgreSQL is running**:
   ```bash
   # Homebrew PostgreSQL
   brew services list

   # Or Docker
   docker-compose ps
   ```

3. **Check Redis is running**:
   ```bash
   brew services list | grep redis
   ```

4. **Verify environment variables**:
   ```bash
   cat apps/api/.env
   ```

5. **Check database connectivity**:
   ```bash
   psql -U david -d freetimechat_main -c "SELECT 1"
   ```

### Permission denied when running scripts

Make sure scripts are executable:
```bash
chmod +x scripts/*.sh
```

## Contributing

When adding new scripts:

1. Make them executable: `chmod +x script-name.sh`
2. Add comprehensive comments
3. Include error handling
4. Update this README
5. Add the script to root `package.json` if it should be run via npm/pnpm
