import { PrismaClient } from '../apps/api/src/generated/prisma-main';

async function checkAdminUser() {
  const prisma = new PrismaClient();

  try {
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@freetimechat.local' },
      include: { client: true },
    });

    if (!admin) {
      console.log('❌ Admin user not found!');
      return;
    }

    console.log('\n✅ Admin user found:');
    console.log('  ID:', admin.id);
    console.log('  Email:', admin.email);
    console.log('  Client ID:', admin.clientId);
    console.log('  Client:', admin.client ? admin.client.name : 'NO CLIENT');

    if (!admin.clientId) {
      console.log('\n⚠️  WARNING: Admin user has no clientId! This will cause 500 errors.');
      console.log('   Run: pnpm --filter=api prisma:seed');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUser();
