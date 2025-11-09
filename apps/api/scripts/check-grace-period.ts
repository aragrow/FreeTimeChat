/**
 * Check 2FA grace period for ARAGROW-LLC user
 */

import { PrismaClient as PrismaMainClient } from '../src/generated/prisma-main';

const prismaMain = new PrismaMainClient();

async function checkGracePeriod() {
  try {
    const user = await prismaMain.user.findUnique({
      where: { email: '000002@aragrow-llc.local' },
    });

    if (!user) {
      console.error('User not found!');
      return;
    }

    console.log('User Info:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Active: ${user.isActive}`);
    console.log(`  2FA Enabled: ${user.twoFactorEnabled}`);
    console.log(`  2FA Grace Period Ends At: ${user.twoFactorGracePeriodEndsAt}`);
    console.log(`  Last Login At: ${user.lastLoginAt}`);
    console.log('');

    if (user.twoFactorGracePeriodEndsAt) {
      const now = new Date();
      const isExpired = now > user.twoFactorGracePeriodEndsAt;
      console.log(`Grace Period Status: ${isExpired ? '❌ EXPIRED' : '✅ ACTIVE'}`);

      if (isExpired) {
        console.log(
          '\n⚠️  Grace period has expired. This will cause the account to be deactivated on next login attempt!'
        );
        console.log('   Clearing grace period...');

        await prismaMain.user.update({
          where: { id: user.id },
          data: {
            twoFactorGracePeriodEndsAt: null,
            isActive: true,
          },
        });

        console.log('✅ Grace period cleared and account activated!');
      }
    } else {
      console.log('Grace Period: Not set (will be set on first login)');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prismaMain.$disconnect();
  }
}

checkGracePeriod();
