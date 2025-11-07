/**
 * Check Admin User Script
 * Verifies if the admin user has the Admin role assigned
 */

import { PrismaClient as MainPrismaClient } from '../src/generated/prisma-main';

const prisma = new MainPrismaClient();

async function checkAdminUser() {
  try {
    console.log('🔍 Checking admin user...\n');

    // Find admin user
    const user = await prisma.user.findUnique({
      where: { email: 'admin@freetimechat.local' },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      console.log('❌ Admin user not found!');
      console.log('   Please run: pnpm --filter @freetimechat/api prisma:seed\n');
      return;
    }

    console.log('✅ User found:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   2FA Enabled: ${user.twoFactorEnabled}`);
    console.log(`   Grace Period Ends: ${user.twoFactorGracePeriodEndsAt || 'Not set'}`);
    console.log();

    console.log('📋 Assigned Roles:');
    if (user.roles.length === 0) {
      console.log('   ⚠️  NO ROLES ASSIGNED!');
      console.log('   This is the problem - user needs Admin role');
      console.log('\n🔧 To fix, run:');
      console.log('   pnpm --filter @freetimechat/api prisma:seed');
    } else {
      user.roles.forEach((ur) => {
        console.log(`   • ${ur.role.name} (ID: ${ur.role.id})`);
      });
    }
    console.log();

    // Check if Admin role exists
    const adminRole = await prisma.role.findUnique({
      where: { name: 'Admin' },
      include: {
        capabilities: {
          include: {
            capability: true,
          },
        },
      },
    });

    if (!adminRole) {
      console.log('❌ Admin role not found in database!');
      console.log('   Please run: pnpm --filter @freetimechat/api prisma:seed\n');
      return;
    }

    console.log('✅ Admin role exists:');
    console.log(`   Name: ${adminRole.name}`);
    console.log(`   ID: ${adminRole.id}`);
    console.log(`   Capabilities: ${adminRole.capabilities.length}`);
    console.log();

    // Check if user should have the role
    const userRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: adminRole.id,
        },
      },
    });

    if (!userRole) {
      console.log('⚠️  MISSING: UserRole junction record!');
      console.log('   The Admin role exists but is not assigned to the user.');
      console.log('\n🔧 Creating the assignment now...\n');

      // Fix it
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
        },
      });

      console.log('✅ Admin role has been assigned to the user!');
      console.log('   Please try logging in again.');
    } else {
      console.log('✅ UserRole junction record exists - user IS assigned Admin role');
      console.log('   The database configuration is correct.');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUser();
