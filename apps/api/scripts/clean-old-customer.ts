/**
 * Clean old customer tenant
 */

import { PrismaClient as MainPrismaClient } from '../src/generated/prisma-main';

async function cleanOldCustomer() {
  const prisma = new MainPrismaClient();

  try {
    console.log('🧹 Cleaning old customer tenant...');

    // Delete tenant with old database_name
    const deleted = await prisma.tenant.deleteMany({
      where: {
        OR: [
          { databaseName: 'freetimechat_customer_dev' },
          { slug: 'test-customer-1' },
          { tenantKey: 'TEST-CUST-001' },
        ],
      },
    });

    console.log(`✅ Deleted ${deleted.count} old tenant(s)`);
  } catch (error) {
    console.error('❌ Failed to clean:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanOldCustomer();
