#!/usr/bin/env ts-node
/**
 * Check Tenant Capabilities
 *
 * Verifies that tenant management capabilities exist and are assigned to admin role
 */

import { PrismaClient as MainPrismaClient } from '../src/generated/prisma-main';

const prisma = new MainPrismaClient();

async function checkTenantCapabilities() {
  console.log('🔍 Checking tenant management capabilities...\n');

  try {
    // Get tenant capabilities
    const tenantCapabilities = await prisma.capability.findMany({
      where: {
        name: {
          startsWith: 'tenants:',
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    console.log('📋 Tenant Capabilities Found:');
    if (tenantCapabilities.length === 0) {
      console.log('  ❌ No tenant capabilities found!');
    } else {
      tenantCapabilities.forEach((cap) => {
        console.log(`  ✓ ${cap.name} - ${cap.description}`);
      });
    }
    console.log();

    // Get admin role
    const adminRole = await prisma.role.findFirst({
      where: { name: 'admin' },
    });

    if (!adminRole) {
      console.log('❌ Admin role not found!');
      await prisma.$disconnect();
      return;
    }

    console.log(`👑 Admin Role: ${adminRole.name} (ID: ${adminRole.id})`);

    // Get admin role capabilities
    const adminCapabilities = await prisma.roleCapability.findMany({
      where: {
        roleId: adminRole.id,
        capabilityId: {
          in: tenantCapabilities.map((c) => c.id),
        },
      },
      include: {
        capability: true,
      },
    });

    console.log(
      `\n🔗 Admin Role Tenant Capabilities (${adminCapabilities.length} of ${tenantCapabilities.length}):`
    );
    if (adminCapabilities.length === 0) {
      console.log('  ❌ Admin role has NO tenant capabilities assigned!');
    } else {
      adminCapabilities.forEach((rc) => {
        const status = rc.isAllowed ? '✓ ALLOWED' : '✗ DENIED';
        console.log(`  ${status}: ${rc.capability.name}`);
      });
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (tenantCapabilities.length === 4 && adminCapabilities.length === 4) {
      console.log('✅ All tenant capabilities are properly configured!');
    } else {
      console.log('⚠️  Warning: Tenant capabilities may not be fully configured');
      console.log(`   Expected: 4 capabilities, Found: ${tenantCapabilities.length}`);
      console.log(`   Expected: 4 admin assignments, Found: ${adminCapabilities.length}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkTenantCapabilities();
