/**
 * Script to reactivate a user account and extend 2FA grace period
 */

import { PrismaClient } from './src/generated/prisma-main';

const prisma = new PrismaClient();

async function reactivateUser(email: string) {
  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return;
    }

    console.log('\n📋 Current User Status:');
    console.log('Email:', user.email);
    console.log('Is Active:', user.isActive);
    console.log('Deleted At:', user.deletedAt);
    console.log('2FA Enabled:', user.twoFactorEnabled);
    console.log('2FA Grace Period Ends At:', user.twoFactorGracePeriodEndsAt);
    console.log('Last Login At:', user.lastLoginAt);
    console.log('Roles:', user.roles.map((ur) => ur.role.name).join(', '));

    const now = new Date();
    // Development: 100 days grace period for all users
    const newGracePeriod = new Date(now.getTime() + 100 * 24 * 60 * 60 * 1000);

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        twoFactorGracePeriodEndsAt: newGracePeriod,
      },
    });

    console.log('\n✅ User reactivated successfully!');
    console.log('New 2FA Grace Period:', newGracePeriod);
    console.log('Grace Period Duration: 100 days (development)');
  } catch (error) {
    console.error('❌ Error reactivating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('Usage: npx tsx reactivate-user.ts <email>');
  console.log('Example: npx tsx reactivate-user.ts 000002@aragrow-llc.local');
  process.exit(1);
}

reactivateUser(email);
