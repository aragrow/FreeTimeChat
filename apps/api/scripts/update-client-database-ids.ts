/**
 * Update existing clients with database_id UUIDs
 */

import { PrismaClient } from '../src/generated/prisma-main';

const prisma = new PrismaClient();

async function updateClientDatabaseIds() {
  try {
    console.log('Finding clients without database_id...');

    const clients = await prisma.client.findMany({
      where: {
        databaseId: null,
      },
    });

    console.log(`Found ${clients.length} clients without database_id`);

    for (const client of clients) {
      const databaseId = crypto.randomUUID();
      await prisma.client.update({
        where: { id: client.id },
        data: { databaseId },
      });
      console.log(`Updated client ${client.name} with database_id: ${databaseId}`);
    }

    console.log('✓ All clients updated successfully!');
  } catch (error) {
    console.error('Failed to update clients:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateClientDatabaseIds();
