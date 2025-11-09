/**
 * Script to activate the ARAGROW-LLC user
 */

import { PrismaClient as PrismaMainClient } from '../src/generated/prisma-main';

const prismaMain = new PrismaMainClient();

async function activateUser() {
  try {
    console.log('🔓 Activating ARAGROW-LLC user...\n');

    const user = await prismaMain.user.update({
      where: {
        email: '000002@aragrow-llc.local',
      },
      data: {
        isActive: true,
      },
    });

    console.log('✅ User activated successfully!');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Active: ${user.isActive}\n`);
  } catch (error) {
    console.error('❌ Error activating user:', error);
    throw error;
  } finally {
    await prismaMain.$disconnect();
  }
}

activateUser();
