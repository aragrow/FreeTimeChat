/**
 * Clean test database
 *
 * Removes test tenants and related data before running tests
 */

import { PrismaClient as MainPrismaClient } from '../src/generated/prisma-main';

async function cleanTestDatabase() {
  const prisma = new MainPrismaClient();

  try {
    console.log('🧹 Cleaning test database...');

    // Delete test tenants (those with database_name containing 'test')
    const deletedTenants = await prisma.tenant.deleteMany({
      where: {
        OR: [
          { databaseName: { contains: 'test' } },
          {
            id: {
              in: ['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003'],
            },
          },
        ],
      },
    });

    console.log(`✅ Deleted ${deletedTenants.count} test tenant(s)`);

    // Delete test users (those associated with test tenants)
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        OR: [{ email: { contains: 'test' } }, { email: { contains: '@example.com' } }],
      },
    });

    console.log(`✅ Deleted ${deletedUsers.count} test user(s)`);

    console.log('✨ Test database cleaned successfully');
  } catch (error) {
    console.error('❌ Failed to clean test database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanTestDatabase();
