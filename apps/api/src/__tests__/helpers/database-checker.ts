/**
 * Database Connection Checker for Integration Tests
 *
 * Checks if a database is available for integration tests.
 * Allows tests to skip gracefully if database is not running.
 */

import { PrismaClient as MainPrismaClient } from '../../generated/prisma-main';

let databaseAvailable: boolean | null = null;

/**
 * Check if database is available for testing
 * Caches result to avoid multiple connection attempts
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  // Return cached result if available
  if (databaseAvailable !== null) {
    return databaseAvailable;
  }

  // Skip database tests if explicitly disabled
  if (process.env.SKIP_INTEGRATION_TESTS === 'true') {
    console.log('⏭️  Skipping integration tests (SKIP_INTEGRATION_TESTS=true)');
    databaseAvailable = false;
    return false;
  }

  // Try to connect to database
  const prisma = new MainPrismaClient({
    datasources: {
      db: {
        url:
          process.env.DATABASE_URL ||
          'postgresql://freetimechat:freetimechat_dev_password@localhost:5432/freetimechat_main',
      },
    },
  });

  try {
    await prisma.$connect();
    await prisma.$disconnect();
    databaseAvailable = true;
    console.log('✅ Database connection successful - integration tests will run');
    return true;
  } catch (error) {
    databaseAvailable = false;
    console.log('⏭️  Database not available - integration tests will be skipped');
    console.log('💡 To run integration tests, start the database with: docker-compose up -d');
    return false;
  }
}

/**
 * Get a conditional test function that skips if database is unavailable
 * Usage: const itWithDb = getConditionalIt(); itWithDb('test name', async () => {...})
 */
export function getConditionalDescribe() {
  return async function conditionalDescribe(name: string, fn: () => void): Promise<void> {
    const dbAvailable = await isDatabaseAvailable();
    if (dbAvailable) {
      describe(name, fn);
    } else {
      describe.skip(name, fn);
    }
  };
}

/**
 * Reset cached database availability status (useful for testing)
 */
export function resetDatabaseAvailabilityCache(): void {
  databaseAvailable = null;
}
