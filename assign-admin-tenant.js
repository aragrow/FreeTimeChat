/* eslint-disable @typescript-eslint/no-var-requires, no-console */
const { PrismaClient: PrismaMainClient } = require('./apps/api/src/generated/prisma-main');

async function assignTenant() {
  const prisma = new PrismaMainClient({
    datasources: {
      db: {
        url: 'postgresql://david@localhost:5432/freetimechat_main',
      },
    },
  });

  try {
    // Get ARAGROW-LLC tenant
    const tenant = await prisma.tenant.findFirst({
      where: { tenantKey: 'ARAGROW-LLC' },
    });

    if (!tenant) {
      console.log('Tenant not found');
      return;
    }

    console.log('Found tenant:', tenant.name, tenant.id);

    // Update admin user to have this tenant
    const admin = await prisma.user.update({
      where: { email: 'admin@freetimechat.local' },
      data: { tenantId: tenant.id },
    });

    console.log('✓ Admin user updated');
    console.log('  Email:', admin.email);
    console.log('  Tenant ID:', admin.tenantId);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

assignTenant();
