/**
 * Set ARAGROW-LLC navigation configuration to disable Chat
 *
 * This script will set the enabled navigation items for ARAGROW-LLC
 * to include all standard features EXCEPT chat.
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

    console.log('\n========== Current Configuration ==========');
    console.log(`Tenant: ${tenant.name}`);
    console.log(
      `Current navigationConfig:`,
      tenant.navigationConfig || 'null (all features visible)'
    );

    // Define enabled items WITHOUT chat
    const enabledItems = [
      // Main navigation
      'time-entries',
      'reports',

      // Business
      'clients',
      'projects',

      // Account Receivables
      'invoices',
      'payments',
      'discounts',
      'coupons',
      'products',
      'payment-terms',

      // Account Payables
      'vendors',
      'bills',
      'expenses',

      // User Management
      'users',
      'account-requests',
      'tenants',

      // Access Control
      'roles',
      'capabilities',

      // Configuration
      'integration-templates',
      'llm-settings',
      'system-settings',

      // Monitoring
      'audit',

      // NOTE: 'chat' is intentionally EXCLUDED
    ];

    const navigationConfig = {
      enabledItems,
    };

    console.log('\n========== New Configuration ==========');
    console.log(JSON.stringify(navigationConfig, null, 2));
    console.log(`\nTotal features enabled: ${enabledItems.length}`);
    console.log(`Chat enabled: ❌ NO (hidden)`);

    // Update the tenant
    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        navigationConfig,
      },
    });

    console.log('\n✅ Successfully updated ARAGROW-LLC navigation configuration');
    console.log('⚠️  Users need to refresh their browser for changes to take effect');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
