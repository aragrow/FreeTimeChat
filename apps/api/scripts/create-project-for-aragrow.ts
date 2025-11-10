/**
 * Create Project for ARAGROW-LLC Tenant
 *
 * Creates a sample project in the ARAGROW-LLC tenant database
 */

import { PrismaClient as ClientPrismaClient } from '../src/generated/prisma-client';

const CLIENT_DATABASE_URL =
  'postgresql://david@localhost:5432/freetimechat_customer_22d1fe9f_b025_4ce1_ba7c_5d53aecc3762';

async function createProject() {
  const clientDb = new ClientPrismaClient({
    datasources: {
      db: {
        url: CLIENT_DATABASE_URL,
      },
    },
  });

  try {
    console.log('Checking existing projects...');

    // Check if projects exist
    const existingProjects = await clientDb.project.findMany();
    console.log(`Found ${existingProjects.length} existing projects`);

    if (existingProjects.length > 0) {
      console.log('\nExisting projects:');
      for (const project of existingProjects) {
        console.log(`  - ${project.name} (${project.id}) - Active: ${project.isActive}`);
      }
    } else {
      console.log('\nNo projects found. Creating sample projects...');

      // Create sample projects
      const project1 = await clientDb.project.create({
        data: {
          name: 'General Work',
          description: 'General work and administrative tasks',
          isActive: true,
          isBillableProject: true,
          defaultBillable: true,
          hourlyRate: 150.0,
        },
      });

      console.log(`✓ Created project: ${project1.name} (${project1.id})`);

      const project2 = await clientDb.project.create({
        data: {
          name: 'Client Support',
          description: 'Customer support and client communications',
          isActive: true,
          isBillableProject: true,
          defaultBillable: true,
          hourlyRate: 100.0,
        },
      });

      console.log(`✓ Created project: ${project2.name} (${project2.id})`);

      const project3 = await clientDb.project.create({
        data: {
          name: 'Internal Development',
          description: 'Internal tools and process improvements',
          isActive: true,
          isBillableProject: false,
          defaultBillable: false,
        },
      });

      console.log(`✓ Created project: ${project3.name} (${project3.id})`);

      console.log('\n✓ Successfully created 3 sample projects!');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await clientDb.$disconnect();
  }
}

createProject();
