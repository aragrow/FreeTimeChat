/**
 * Check ARAGROW-LLC tenant's navigation configuration for Chat
 */

import { PrismaClient } from '../src/generated/prisma-main';

async function main() {
  const prisma = new PrismaClient();

  try {
    // Find ARAGROW-LLC tenant
    const tenant = await prisma.tenant.findFirst({
      where: {
        tenantKey: 'ARAGROW-LLC',
      },
    });

    if (!tenant) {
      console.log('❌ ARAGROW-LLC tenant not found');
      await prisma.$disconnect();
      return;
    }

    console.log('\n========== ARAGROW-LLC Tenant ==========');
    console.log(`ID: ${tenant.id}`);
    console.log(`Name: ${tenant.name}`);
    console.log(`Tenant Key: ${tenant.tenantKey}`);
    console.log(`\n========== Current Navigation Config ==========`);

    if (!tenant.navigationConfig || tenant.navigationConfig === null) {
      console.log('⚠️  No navigation config set');
      console.log('Default behavior: ALL features are visible');
      console.log('\n❌ ISSUE: Chat is visible but should be hidden');
    } else {
      console.log(JSON.stringify(tenant.navigationConfig, null, 2));

      const navConfig = tenant.navigationConfig as { enabledItems?: string[] };
      if (!navConfig.enabledItems) {
        console.log('\n⚠️  No enabledItems array in config');
        console.log('Default behavior: ALL features are visible');
        console.log('\n❌ ISSUE: Chat is visible but should be hidden');
      } else {
        const isChatEnabled = navConfig.enabledItems.includes('chat');
        console.log(`\n========== Chat Status ==========`);
        console.log(
          `Chat in enabledItems: ${isChatEnabled ? '✅ YES (visible)' : '❌ NO (hidden)'}`
        );

        if (isChatEnabled) {
          console.log('\n❌ ISSUE: Chat is enabled but should be disabled');
        } else {
          console.log('\n✅ CORRECT: Chat is properly disabled');
        }

        console.log(`\nEnabled features: ${navConfig.enabledItems.join(', ')}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
