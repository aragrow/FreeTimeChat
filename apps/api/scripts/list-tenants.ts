/**
 * List all tenants in the database
 */

import { PrismaClient as MainPrismaClient } from '../src/generated/prisma-main';

async function listTenants() {
  const prisma = new MainPrismaClient();

  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        tenantKey: true,
        databaseName: true,
      },
    });

    console.log('📋 Tenants in database:');
    console.table(tenants);
  } catch (error) {
    console.error('❌ Failed to list tenants:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listTenants();
