/**
 * Check capabilities assigned to tenantadmin role
 */

import { PrismaClient as PrismaMainClient } from '../src/generated/prisma-main';

const prismaMain = new PrismaMainClient();

async function checkCapabilities() {
  try {
    // Get the tenantadmin role with all capabilities
    const tenantAdminRole = await prismaMain.role.findUnique({
      where: { name: 'tenantadmin' },
      include: {
        capabilities: {
          include: {
            capability: true,
          },
        },
      },
    });

    if (!tenantAdminRole) {
      console.error('❌ Tenantadmin role not found!');
      return;
    }

    console.log('Tenantadmin Role Info:');
    console.log(`  ID: ${tenantAdminRole.id}`);
    console.log(`  Name: ${tenantAdminRole.name}`);
    console.log('');

    console.log('Assigned Capabilities:');
    if (tenantAdminRole.capabilities.length === 0) {
      console.log('  ❌ NO CAPABILITIES ASSIGNED!');
    } else {
      tenantAdminRole.capabilities.forEach((rc) => {
        const status = rc.isAllowed ? '✅' : '❌';
        console.log(`  ${status} ${rc.capability.name} (allowed: ${rc.isAllowed})`);
      });
    }

    console.log('');
    console.log('Checking for users:read capability:');
    const usersReadCapability = tenantAdminRole.capabilities.find(
      (rc) => rc.capability.name === 'users:read'
    );

    if (!usersReadCapability) {
      console.log('  ❌ users:read capability NOT ASSIGNED!');
    } else if (!usersReadCapability.isAllowed) {
      console.log('  ❌ users:read capability is DENIED!');
    } else {
      console.log('  ✅ users:read capability is ALLOWED');
    }

    // Also check the user's roles to confirm
    console.log('');
    console.log('Checking ARAGROW user roles:');
    const user = await prismaMain.user.findUnique({
      where: { email: '000002@aragrow-llc.local' },
      include: {
        roles: {
          include: {
            role: {
              include: {
                capabilities: {
                  include: {
                    capability: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      console.error('  ❌ User not found!');
      return;
    }

    console.log(`  User: ${user.email}`);
    console.log('  Roles:');
    user.roles.forEach((userRole) => {
      console.log(`    - ${userRole.role.name}`);
      console.log('      Capabilities:');
      userRole.role.capabilities.forEach((rc) => {
        const status = rc.isAllowed ? '✅' : '❌';
        console.log(`        ${status} ${rc.capability.name}`);
      });
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prismaMain.$disconnect();
  }
}

checkCapabilities();
