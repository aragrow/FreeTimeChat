/**
 * Verify ARAGROW user has tenantadmin role
 */

import { PrismaClient as PrismaMainClient } from '../src/generated/prisma-main';

const prismaMain = new PrismaMainClient();

async function verifyRole() {
  try {
    const user = await prismaMain.user.findUnique({
      where: { email: '000002@aragrow-llc.local' },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      console.error('User not found!');
      return;
    }

    console.log('User:', user.email);
    console.log('User ID:', user.id);
    console.log('');
    console.log('Assigned Roles:');

    if (user.roles.length === 0) {
      console.log('  ❌ NO ROLES ASSIGNED!');
    } else {
      user.roles.forEach((userRole) => {
        console.log(`  - ${userRole.role.name} (ID: ${userRole.role.id})`);
      });
    }

    console.log('');
    console.log('UserRole Records:');
    user.roles.forEach((userRole) => {
      console.log(`  UserRole ID: ${userRole.id}`);
      console.log(`  User ID: ${userRole.userId}`);
      console.log(`  Role ID: ${userRole.roleId}`);
      console.log(`  Role Name: ${userRole.role.name}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prismaMain.$disconnect();
  }
}

verifyRole();
