/**
 * Check if a specific tenant and user exist
 */

import { PrismaClient as MainPrismaClient } from '../src/generated/prisma-main';

const prisma = new MainPrismaClient();

async function main() {
  const tenantKey = 'ARAGROW-LLC';
  const email = '000002@aragrow-llc.local';

  console.log(`\n🔍 Checking for tenant: ${tenantKey}`);
  console.log(`🔍 Checking for user: ${email}\n`);

  // Check tenant
  const tenant = await prisma.tenant.findUnique({
    where: { tenantKey },
    select: {
      id: true,
      name: true,
      slug: true,
      tenantKey: true,
      databaseName: true,
      isActive: true,
    },
  });

  if (tenant) {
    console.log('✅ Tenant found:');
    console.log(tenant);
  } else {
    console.log('❌ Tenant NOT found');
  }

  // Check user
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      tenantId: true,
      isActive: true,
      requirePasswordChange: true,
      roles: {
        include: {
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (user) {
    console.log('\n✅ User found:');
    console.log({
      ...user,
      roles: user.roles.map((ur) => ur.role.name),
    });

    // Check if tenant matches
    if (tenant && user.tenantId === tenant.id) {
      console.log('\n✅ User belongs to tenant');
    } else if (tenant) {
      console.log(
        `\n❌ User does NOT belong to tenant (user.tenantId: ${user.tenantId}, tenant.id: ${tenant.id})`
      );
    }
  } else {
    console.log('\n❌ User NOT found');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
