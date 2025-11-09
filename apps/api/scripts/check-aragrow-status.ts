/**
 * Script to check and fix ARAGROW-LLC user status
 */

import { PrismaClient as PrismaMainClient } from '../src/generated/prisma-main';

const prismaMain = new PrismaMainClient();

async function checkAndFixUser() {
  try {
    console.log('🔍 Checking ARAGROW-LLC user status...\n');

    const user = await prismaMain.user.findUnique({
      where: {
        email: '000002@aragrow-llc.local',
      },
      include: {
        tenant: true,
        roles: {
          include: {
            role: true,
          },
        },
        accountLockouts: {
          where: {
            lockedUntil: {
              gte: new Date(),
            },
          },
        },
      },
    });

    if (!user) {
      console.error('❌ User not found!');
      return;
    }

    console.log('📋 Current User Status:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Deleted At: ${user.deletedAt}`);
    console.log(`   Tenant: ${user.tenant?.name} (Active: ${user.tenant?.isActive})`);
    console.log(`   Roles: ${user.roles.map((r) => r.role.name).join(', ')}`);
    console.log(`   Active Lockouts: ${user.accountLockouts.length}`);
    console.log(`   Require Password Change: ${user.requirePasswordChange}`);
    console.log('');

    // Fix issues
    let needsUpdate = false;
    const updates: any = {};

    if (!user.isActive) {
      console.log('⚠️  User is not active - fixing...');
      updates.isActive = true;
      needsUpdate = true;
    }

    if (user.deletedAt) {
      console.log('⚠️  User has deletedAt set - clearing...');
      updates.deletedAt = null;
      needsUpdate = true;
    }

    if (user.accountLockouts.length > 0) {
      console.log('⚠️  User has active lockouts - clearing...');
      await prismaMain.accountLockout.deleteMany({
        where: {
          userId: user.id,
        },
      });
    }

    if (needsUpdate) {
      const updatedUser = await prismaMain.user.update({
        where: { id: user.id },
        data: updates,
      });

      console.log('\n✅ User fixed successfully!');
      console.log(`   Active: ${updatedUser.isActive}`);
      console.log(`   Deleted At: ${updatedUser.deletedAt}`);
    } else {
      console.log('✅ User is already in good state!');
    }

    // Check tenant status
    if (!user.tenant?.isActive) {
      console.log('\n⚠️  WARNING: Tenant is not active!');
      console.log('   This may prevent login. Activating tenant...');

      await prismaMain.tenant.update({
        where: { id: user.tenantId! },
        data: { isActive: true },
      });

      console.log('✅ Tenant activated!');
    }

    console.log('\n📋 Final Status:');
    const finalUser = await prismaMain.user.findUnique({
      where: { email: '000002@aragrow-llc.local' },
      include: { tenant: true },
    });

    console.log(`   User Active: ${finalUser?.isActive}`);
    console.log(`   User Deleted: ${finalUser?.deletedAt ? 'Yes' : 'No'}`);
    console.log(`   Tenant Active: ${finalUser?.tenant?.isActive}`);
    console.log(`   Tenant Deleted: ${finalUser?.tenant?.deletedAt ? 'Yes' : 'No'}`);
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prismaMain.$disconnect();
  }
}

checkAndFixUser();
