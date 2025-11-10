/**
 * Update User Tracking Mode Script
 *
 * Updates a user's tracking mode to TIME (manual entry)
 */

import { PrismaClient as MainPrismaClient } from '../src/generated/prisma-main';

const mainDb = new MainPrismaClient();

async function updateUserTrackingMode() {
  try {
    console.log('Looking for user: davidarago@aragrow.me');

    // Find the user
    const user = await mainDb.user.findUnique({
      where: { email: 'davidarago@aragrow.me' },
    });

    if (!user) {
      console.log('User not found!');
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user.email})`);
    console.log(`Current tracking mode: ${user.trackingMode}`);

    // Update to TIME mode
    const updatedUser = await mainDb.user.update({
      where: { email: 'davidarago@aragrow.me' },
      data: { trackingMode: 'TIME' },
    });

    console.log(`✓ Updated tracking mode to: ${updatedUser.trackingMode}`);
    console.log('✓ User can now use manual time entry only');
  } catch (error) {
    console.error('Error updating user:', error);
    process.exit(1);
  } finally {
    await mainDb.$disconnect();
  }
}

updateUserTrackingMode();
