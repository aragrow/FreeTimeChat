/**
 * Manual Test Data Cleanup Script
 *
 * Removes test tenant and test user created by the seed script
 */

import { PrismaClient as MainPrismaClient } from '../src/generated/prisma-main';

const prisma = new MainPrismaClient();

async function cleanupTestData(): Promise<void> {
  console.log('🧹 Cleaning up test data...\n');

  try {
    // Get test tenant
    const testTenant = await prisma.tenant.findUnique({
      where: { id: '00000000-0000-0000-0000-000000000100' },
      include: { users: true },
    });

    if (!testTenant) {
      console.log('ℹ️  No test tenant found (already cleaned up)');
      return;
    }

    console.log(`📋 Found test tenant: ${testTenant.name}`);
    console.log(`   ID: ${testTenant.id}`);
    console.log(`   Tenant Key: ${testTenant.tenantKey}`);
    console.log(`   Users: ${testTenant.users.length}\n`);

    // Delete in correct order to avoid foreign key violations
    console.log('Deleting related data...');

    const impersonationSessions = await prisma.impersonationSession.deleteMany({
      where: {
        OR: [
          { targetUserId: { in: testTenant.users.map((u) => u.id) } },
          { adminUserId: { in: testTenant.users.map((u) => u.id) } },
        ],
      },
    });
    console.log(`  ✓ Deleted ${impersonationSessions.count} impersonation session(s)`);

    const loginAttempts = await prisma.loginAttempt.deleteMany({
      where: { userId: { in: testTenant.users.map((u) => u.id) } },
    });
    console.log(`  ✓ Deleted ${loginAttempts.count} login attempt(s)`);

    const accountLockouts = await prisma.accountLockout.deleteMany({
      where: { userId: { in: testTenant.users.map((u) => u.id) } },
    });
    console.log(`  ✓ Deleted ${accountLockouts.count} account lockout(s)`);

    const refreshTokens = await prisma.refreshToken.deleteMany({
      where: { userId: { in: testTenant.users.map((u) => u.id) } },
    });
    console.log(`  ✓ Deleted ${refreshTokens.count} refresh token(s)`);

    const userRoles = await prisma.userRole.deleteMany({
      where: { userId: { in: testTenant.users.map((u) => u.id) } },
    });
    console.log(`  ✓ Deleted ${userRoles.count} user role(s)`);

    const securitySettings = await prisma.securitySettings.deleteMany({
      where: { tenantId: testTenant.id },
    });
    console.log(`  ✓ Deleted ${securitySettings.count} security setting(s)`);

    const users = await prisma.user.deleteMany({
      where: { id: { in: testTenant.users.map((u) => u.id) } },
    });
    console.log(`  ✓ Deleted ${users.count} user(s)`);

    const tenant = await prisma.tenant.delete({
      where: { id: testTenant.id },
    });
    console.log(`  ✓ Deleted tenant: ${tenant.name}\n`);

    console.log('✅ Test data cleaned up successfully!');
  } catch (error) {
    console.error('\n❌ Failed to cleanup test data:', error);
    throw error;
  }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧹 Manual Test Data Cleanup');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await cleanupTestData();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('❌ Cleanup script failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
