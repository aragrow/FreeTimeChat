/**
 * Script to test ARAGROW-LLC login credentials
 */

import { PrismaClient as PrismaMainClient } from '../src/generated/prisma-main';
import bcrypt from 'bcrypt';

const prismaMain = new PrismaMainClient();

async function testLogin() {
  try {
    console.log('🔍 Testing ARAGROW-LLC login credentials...\n');

    const email = '000002@aragrow-llc.local';
    const password = 'Open@2025';

    // Get user
    const user = await prismaMain.user.findUnique({
      where: { email },
      include: {
        tenant: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      console.error('❌ User not found!');
      return;
    }

    console.log('📋 User Details:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Deleted: ${user.deletedAt ? 'Yes' : 'No'}`);
    console.log(`   Password Hash: ${user.passwordHash?.substring(0, 20)}...`);
    console.log(`   Tenant: ${user.tenant?.name} (Active: ${user.tenant?.isActive})`);
    console.log(`   Tenant Deleted: ${user.tenant?.deletedAt ? 'Yes' : 'No'}`);
    console.log(`   Roles: ${user.roles.map((r) => r.role.name).join(', ')}`);
    console.log('');

    // Test password
    if (!user.passwordHash) {
      console.error('❌ User has no password hash!');
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    console.log('🔑 Password Test:');
    console.log(`   Testing password: ${password}`);
    console.log(`   Valid: ${isPasswordValid ? '✅ YES' : '❌ NO'}`);
    console.log('');

    // Check login blockers
    console.log('🚫 Login Blockers:');

    if (!user.isActive) {
      console.log('   ❌ User is not active');
    } else {
      console.log('   ✅ User is active');
    }

    if (user.deletedAt) {
      console.log('   ❌ User is deleted');
    } else {
      console.log('   ✅ User is not deleted');
    }

    if (!user.tenant) {
      console.log('   ❌ User has no tenant');
    } else if (!user.tenant.isActive) {
      console.log('   ❌ Tenant is not active');
    } else if (user.tenant.deletedAt) {
      console.log('   ❌ Tenant is deleted');
    } else {
      console.log('   ✅ Tenant is valid');
    }

    if (user.roles.length === 0) {
      console.log('   ❌ User has no roles');
    } else {
      console.log('   ✅ User has roles');
    }

    // Check for account lockouts
    const lockouts = await prismaMain.accountLockout.findMany({
      where: {
        userId: user.id,
        lockedUntil: {
          gte: new Date(),
        },
      },
    });

    if (lockouts.length > 0) {
      console.log(`   ❌ User has ${lockouts.length} active lockouts`);
      lockouts.forEach((lockout) => {
        console.log(`      - Locked until: ${lockout.lockedUntil}`);
      });
    } else {
      console.log('   ✅ No active lockouts');
    }

    // Check login attempts
    const recentAttempts = await prismaMain.loginAttempt.findMany({
      where: {
        userId: user.id,
        attemptedAt: {
          gte: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
        },
      },
      orderBy: {
        attemptedAt: 'desc',
      },
      take: 5,
    });

    if (recentAttempts.length > 0) {
      console.log(`\n📊 Recent Login Attempts (last 15 minutes): ${recentAttempts.length}`);
      recentAttempts.forEach((attempt, idx) => {
        console.log(
          `   ${idx + 1}. ${attempt.attemptedAt.toISOString()} - Success: ${attempt.successful}`
        );
      });
    }

    console.log('\n');

    // Overall assessment
    const canLogin =
      user.isActive &&
      !user.deletedAt &&
      user.tenant?.isActive &&
      !user.tenant?.deletedAt &&
      user.roles.length > 0 &&
      lockouts.length === 0 &&
      isPasswordValid;

    if (canLogin) {
      console.log('✅ LOGIN SHOULD WORK!');
      console.log('\nLogin credentials:');
      console.log(`   Tenant Key: ${user.tenant?.tenantKey || 'N/A'}`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
    } else {
      console.log('❌ LOGIN WILL FAIL!');
      console.log('\nIssues to fix:');
      if (!user.isActive) console.log('   - User is not active');
      if (user.deletedAt) console.log('   - User is deleted');
      if (!user.tenant?.isActive) console.log('   - Tenant is not active');
      if (user.tenant?.deletedAt) console.log('   - Tenant is deleted');
      if (user.roles.length === 0) console.log('   - User has no roles');
      if (lockouts.length > 0) console.log('   - User has active lockouts');
      if (!isPasswordValid) console.log('   - Password is incorrect');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prismaMain.$disconnect();
  }
}

testLogin();
