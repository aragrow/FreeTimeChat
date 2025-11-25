/**
 * Restore tenantadmin role to davidarago
 */

import { PrismaClient } from '../src/generated/prisma-main';

async function main() {
  const prisma = new PrismaClient();

  try {
    // Find davidarago
    const user = await prisma.user.findUnique({
      where: { email: 'davidarago@aragrow.me' },
    });

    if (!user) {
      console.log('❌ User not found');
      await prisma.$disconnect();
      return;
    }

    // Find tenantadmin role
    const tenantAdminRole = await prisma.role.findFirst({
      where: { name: 'tenantadmin' },
    });

    if (!tenantAdminRole) {
      console.log('❌ Tenantadmin role not found');
      await prisma.$disconnect();
      return;
    }

    // Check if already has the role
    const existing = await prisma.userRole.findFirst({
      where: {
        userId: user.id,
        roleId: tenantAdminRole.id,
      },
    });

    if (existing) {
      console.log('✅ User already has tenantadmin role');
      await prisma.$disconnect();
      return;
    }

    // Add tenantadmin role back
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: tenantAdminRole.id,
      },
    });

    console.log('✅ Restored tenantadmin role to davidarago@aragrow.me');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
