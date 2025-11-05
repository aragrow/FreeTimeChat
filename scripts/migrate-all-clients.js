#!/usr/bin/env node

/**
 * Migrate All Client Databases
 *
 * This script runs Prisma migrations on all active client databases.
 * Useful when you update the client schema and need to apply changes to all tenants.
 *
 * Usage:
 *   node scripts/migrate-all-clients.js
 *   pnpm migrate:clients
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const { execSync } = require('child_process');
const { PrismaClient } = require('../apps/api/src/generated/prisma-main');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}→${colors.reset} ${msg}`),
};

async function migrateAllClients() {
  const prisma = new PrismaClient();

  try {
    log.info('Starting migration of all client databases...\n');

    // Get all active clients
    const clients = await prisma.client.findMany({
      where: {
        deletedAt: null,
        databaseUrl: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        databaseUrl: true,
        databaseName: true,
      },
    });

    if (clients.length === 0) {
      log.warn('No active clients found with database URLs.');
      log.info('Create clients first using the client onboarding endpoint.');
      return;
    }

    log.info(`Found ${clients.length} active client(s) to migrate:\n`);

    let successCount = 0;
    let failureCount = 0;
    const failures = [];

    for (const client of clients) {
      log.step(`Migrating: ${colors.bright}${client.name}${colors.reset} (${client.databaseName})`);

      try {
        // Run Prisma migrate deploy for this client database
        const command = `DATABASE_URL="${client.databaseUrl}" pnpm --filter @freetimechat/api prisma:migrate:deploy:client`;

        execSync(command, {
          cwd: process.cwd(),
          stdio: 'pipe',
        });

        log.success(`Successfully migrated ${client.name}\n`);
        successCount++;
      } catch (error) {
        log.error(`Failed to migrate ${client.name}`);
        log.error(`  Error: ${error.message}\n`);
        failureCount++;
        failures.push({
          client: client.name,
          error: error.message,
        });
      }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    log.info('Migration Summary:');
    console.log('='.repeat(60));
    log.success(`Successful migrations: ${successCount}`);
    if (failureCount > 0) {
      log.error(`Failed migrations: ${failureCount}`);
      console.log('\nFailed clients:');
      failures.forEach(({ client, error }) => {
        console.log(`  - ${client}: ${error}`);
      });
    }
    console.log(`${'='.repeat(60)}\n`);

    if (failureCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    log.error(`Migration process failed: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migrations
migrateAllClients().catch((error) => {
  log.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});
