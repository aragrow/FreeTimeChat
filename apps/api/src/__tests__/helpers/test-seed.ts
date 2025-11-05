/**
 * Test Database Seeding Helper
 *
 * Seeds the database with required data for integration tests
 */

import { PrismaClient as MainPrismaClient } from '../../generated/prisma-main';

let seeded = false;

/**
 * Seed database with required test data
 */
export async function seedTestDatabase(): Promise<void> {
  // Only seed once per test run
  if (seeded) {
    return;
  }

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
    // Check if default client already exists (by slug or database name)
    const existingClient = await prisma.client.findFirst({
      where: {
        OR: [{ slug: 'default' }, { databaseName: 'freetimechat_client_dev' }],
      },
    });

    if (!existingClient) {
      // Create default client
      await prisma.client.create({
        data: {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Default Client',
          slug: 'default',
          databaseName: 'freetimechat_client_dev',
          databaseHost: 'localhost',
          isActive: true,
        },
      });
      console.log('✅ Created default client for tests');
    } else if (existingClient.slug !== 'default') {
      // Update existing client to have slug='default'
      await prisma.client.update({
        where: { id: existingClient.id },
        data: { slug: 'default' },
      });
      console.log('✅ Updated existing client to have slug="default"');
    } else {
      console.log('✅ Default client already exists');
    }

    // Check if roles exist
    const userRole = await prisma.role.findFirst({
      where: { name: 'user' },
    });

    if (!userRole) {
      // Create default roles
      await prisma.role.createMany({
        data: [
          {
            id: '00000000-0000-0000-0000-000000000010',
            name: 'user',
            description: 'Default user role',
          },
          {
            id: '00000000-0000-0000-0000-000000000011',
            name: 'admin',
            description: 'Administrator role',
          },
        ],
      });
      console.log('✅ Created default roles for tests');
    }

    seeded = true;
  } catch (error) {
    console.error('Failed to seed test database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Clean up test data from database
 */
export async function cleanupTestDatabase(): Promise<void> {
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
    // Delete test users (keep default client and roles for other tests)
    // Include users with 'test-' prefix or 'invalid-email'
    await prisma.refreshToken.deleteMany({
      where: {
        user: {
          OR: [{ email: { contains: 'test-' } }, { email: 'invalid-email' }],
        },
      },
    });

    await prisma.userRole.deleteMany({
      where: {
        user: {
          OR: [{ email: { contains: 'test-' } }, { email: 'invalid-email' }],
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        OR: [{ email: { contains: 'test-' } }, { email: 'invalid-email' }],
      },
    });

    console.log('✅ Cleaned up test data');
  } catch (error) {
    console.error('Failed to cleanup test database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Reset seeded flag (useful for testing)
 */
export function resetSeededFlag(): void {
  seeded = false;
}
