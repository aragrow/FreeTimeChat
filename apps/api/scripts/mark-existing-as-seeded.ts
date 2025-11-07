/**
 * Mark all existing records as seeded
 * Run this once to migrate existing data to have isSeeded flag
 */

import { PrismaClient as PrismaMainClient } from '../src/generated/prisma-main';

const prismaMain = new PrismaMainClient();

async function markAsSeeded() {
  console.log('Marking existing records as seeded...\n');

  // Update all existing records
  const users = await prismaMain.user.updateMany({
    data: { isSeeded: true },
  });
  console.log(`✓ Marked ${users.count} users as seeded`);

  const roles = await prismaMain.role.updateMany({
    data: { isSeeded: true },
  });
  console.log(`✓ Marked ${roles.count} roles as seeded`);

  const capabilities = await prismaMain.capability.updateMany({
    data: { isSeeded: true },
  });
  console.log(`✓ Marked ${capabilities.count} capabilities as seeded`);

  const userRoles = await prismaMain.userRole.updateMany({
    data: { isSeeded: true },
  });
  console.log(`✓ Marked ${userRoles.count} user roles as seeded`);

  const roleCapabilities = await prismaMain.roleCapability.updateMany({
    data: { isSeeded: true },
  });
  console.log(`✓ Marked ${roleCapabilities.count} role capabilities as seeded`);

  console.log('\n✅ All existing records marked as seeded');
}

markAsSeeded()
  .then(async () => {
    await prismaMain.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error:', e);
    await prismaMain.$disconnect();
    process.exit(1);
  });
