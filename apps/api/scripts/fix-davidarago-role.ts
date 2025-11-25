/**
 * Remove tenantadmin role from davidarago - they should only be a user
 */

import { PrismaClient } from '../src/generated/prisma-main';

async function main() {
  const prisma = new PrismaClient();

  try {
    // Find davidarago
    const user = await prisma.user.findUnique({
      where: { email: 'davidarago@aragrow.me' },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      console.log('❌ User not found');
      await prisma.$disconnect();
      return;
    }

    console.log('\n========== Current Roles ==========');
    user.roles.forEach((ur) => {
      console.log(`- ${ur.role.name}`);
    });

    // Find tenantadmin role assignment
    const tenantAdminRole = user.roles.find((ur) => ur.role.name.toLowerCase() === 'tenantadmin');

    if (!tenantAdminRole) {
      console.log('\n✅ User does not have tenantadmin role');
      await prisma.$disconnect();
      return;
    }

    console.log('\n========== Removing tenantadmin Role ==========');

    // Remove the tenantadmin role
    await prisma.userRole.delete({
      where: {
        id: tenantAdminRole.id,
      },
    });

    console.log('✅ Removed tenantadmin role');

    // Verify
    const updatedUser = await prisma.user.findUnique({
      where: { email: 'davidarago@aragrow.me' },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    console.log('\n========== Updated Roles ==========');
    updatedUser?.roles.forEach((ur) => {
      console.log(`- ${ur.role.name}`);
    });

    console.log('\n✅ Done! davidarago is now a regular user only.');
    console.log('⚠️  User needs to log out and log back in for changes to take effect.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
