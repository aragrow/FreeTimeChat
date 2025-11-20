/**
 * Reset User Password Script
 *
 * Usage: npx tsx scripts/reset-user-password.ts <email> <new-password>
 * Example: npx tsx scripts/reset-user-password.ts davidarago@aragrow.me NewPassword123
 */

import bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma-main';

const prisma = new PrismaClient();

async function resetPassword() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error('Usage: npx tsx scripts/reset-user-password.ts <email> <new-password>');
    console.error(
      'Example: npx tsx scripts/reset-user-password.ts davidarago@aragrow.me Open@2025'
    );
    process.exit(1);
  }

  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await prisma.user.update({
      where: { email },
      data: { passwordHash: hashedPassword },
    });

    console.log(`✅ Password reset successfully for: ${email}`);
    console.log(`   New password: ${newPassword}`);
  } catch (error) {
    console.error('Error resetting password:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
