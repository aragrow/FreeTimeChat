/**
 * Development Data Seeder
 *
 * Creates realistic test data for development:
 * - 1 System Admin (main admin)
 * - 5 Tenants
 * - Each tenant has:
 *   - 1 Tenant Admin
 *   - 3-5 Regular Users
 *   - 8-15 Clients
 *   - 2-5 Projects per Client
 *   - 10-20 Time Entries per Project
 *
 * Data is deterministic for consistent testing
 */

import { PrismaClient as PrismaClientClient } from '../src/generated/prisma-client';
import { PrismaClient as PrismaMainClient } from '../src/generated/prisma-main';
import bcrypt from 'bcrypt';

const prismaMain = new PrismaMainClient();

// Seeded random number generator for deterministic data
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

// Sample data pools for realistic names
const FIRST_NAMES = [
  'James',
  'Mary',
  'John',
  'Patricia',
  'Robert',
  'Jennifer',
  'Michael',
  'Linda',
  'William',
  'Elizabeth',
  'David',
  'Barbara',
  'Richard',
  'Susan',
  'Joseph',
  'Jessica',
  'Thomas',
  'Sarah',
  'Charles',
  'Karen',
  'Christopher',
  'Nancy',
  'Daniel',
  'Lisa',
  'Matthew',
  'Betty',
  'Anthony',
  'Margaret',
  'Mark',
  'Sandra',
  'Donald',
  'Ashley',
];

const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
];

const COMPANY_NAMES = [
  'Acme Corporation',
  'Global Industries',
  'Tech Solutions',
  'Innovative Systems',
  'Digital Ventures',
  'Prime Services',
  'Elite Consulting',
  'Strategic Partners',
  'Advanced Technologies',
  'NextGen Solutions',
  'Pioneer Enterprises',
  'Summit Holdings',
  'Apex Industries',
  'Quantum Systems',
  'Fusion Technologies',
  'Vista Corporation',
  'Horizon Group',
  'Titan Industries',
  'Velocity Systems',
  'Zenith Solutions',
  'Phoenix Corporation',
  'Atlas Group',
  'Nexus Technologies',
  'Vanguard Industries',
  'Omega Systems',
  'Sterling Enterprises',
  'Paradigm Solutions',
  'Momentum Group',
  'Catalyst Industries',
  'Pinnacle Systems',
];

const PROJECT_NAMES = [
  'Website Redesign',
  'Mobile App Development',
  'CRM Implementation',
  'Cloud Migration',
  'Security Audit',
  'Database Optimization',
  'API Integration',
  'Analytics Dashboard',
  'Marketing Campaign',
  'Brand Refresh',
  'SEO Optimization',
  'E-commerce Platform',
  'Training Program',
  'Process Automation',
  'Data Migration',
  'Infrastructure Upgrade',
  'Customer Portal',
  'Reporting System',
  'Inventory Management',
  'Payment Gateway',
];

const TASK_DESCRIPTIONS = [
  'Initial planning and requirements gathering',
  'Design mockups and wireframes',
  'Frontend development',
  'Backend API development',
  'Database schema design',
  'User authentication setup',
  'Testing and QA',
  'Bug fixes and optimization',
  'Documentation',
  'Deployment and configuration',
  'Code review',
  'Performance tuning',
  'Security hardening',
  'User training',
  'Stakeholder presentation',
];

const CITIES = [
  'New York',
  'Los Angeles',
  'Chicago',
  'Houston',
  'Phoenix',
  'Philadelphia',
  'San Antonio',
  'San Diego',
  'Dallas',
  'San Jose',
  'Austin',
  'Jacksonville',
  'Fort Worth',
  'Columbus',
  'Charlotte',
  'San Francisco',
  'Indianapolis',
  'Seattle',
  'Denver',
  'Boston',
];

const STATES = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'FL', 'OH', 'NC', 'WA', 'CO', 'MA'];

// Tenant configurations
const TENANTS_CONFIG = [
  {
    name: 'Acme Corporation',
    slug: 'acme-corp',
    tenantKey: 'ACME-CORP',
    currency: 'USD',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeZone: 'America/New_York',
  },
  {
    name: 'Global Tech Solutions',
    slug: 'global-tech',
    tenantKey: 'GLOBAL-TECH',
    currency: 'EUR',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    timeZone: 'Europe/London',
  },
  {
    name: 'Pacific Industries',
    slug: 'pacific-ind',
    tenantKey: 'PACIFIC-IND',
    currency: 'USD',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeZone: 'America/Los_Angeles',
  },
  {
    name: 'Sunrise Enterprises',
    slug: 'sunrise-ent',
    tenantKey: 'SUNRISE-ENT',
    currency: 'GBP',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    timeZone: 'Europe/London',
  },
  {
    name: 'Meridian Group',
    slug: 'meridian-group',
    tenantKey: 'MERIDIAN-GROUP',
    currency: 'CAD',
    language: 'en',
    dateFormat: 'YYYY-MM-DD',
    timeZone: 'America/Toronto',
  },
];

async function main() {
  console.log('🌱 Starting development data seeding...\n');
  console.log('⚠️  This will create comprehensive test data for development');
  console.log('⚠️  Run this AFTER running the main seed script (pnpm prisma:seed:main)\n');

  const rng = new SeededRandom(12345); // Fixed seed for deterministic data

  // ============================================================================
  // Step 0: Verify Main Seed Data Exists
  // ============================================================================
  console.log('🔍 Verifying main seed data...');

  const adminRole = await prismaMain.role.findFirst({ where: { name: 'admin' } });
  const tenantAdminRole = await prismaMain.role.findFirst({ where: { name: 'tenantadmin' } });
  const userRole = await prismaMain.role.findFirst({ where: { name: 'user' } });

  if (!adminRole || !tenantAdminRole || !userRole) {
    throw new Error('❌ Main seed data not found. Please run: pnpm prisma:seed:main first');
  }

  console.log('✓ Main seed data verified\n');

  // ============================================================================
  // Step 1: Clean Existing Dev Data
  // ============================================================================
  console.log('🧹 Cleaning existing development data...');

  // Delete dev-seeded users and their relationships
  const deletedUserRoles = await prismaMain.userRole.deleteMany({
    where: {
      user: {
        email: {
          contains: '@dev.local',
        },
      },
    },
  });
  console.log(`  ✓ Deleted ${deletedUserRoles.count} user roles`);

  const deletedUsers = await prismaMain.user.deleteMany({
    where: {
      email: {
        contains: '@dev.local',
      },
    },
  });
  console.log(`  ✓ Deleted ${deletedUsers.count} dev users`);

  const deletedTenants = await prismaMain.tenant.deleteMany({
    where: {
      slug: {
        in: TENANTS_CONFIG.map((t) => t.slug),
      },
    },
  });
  console.log(`  ✓ Deleted ${deletedTenants.count} dev tenants\n`);

  // ============================================================================
  // Step 2: Create System Admin
  // ============================================================================
  console.log('👤 Creating system administrator...');

  const sysAdminPassword = await bcrypt.hash('SysAdmin@2025', 10);

  const sysAdmin = await prismaMain.user.create({
    data: {
      email: 'sysadmin@dev.local',
      passwordHash: sysAdminPassword,
      name: 'System Administrator',
      isActive: true,
      twoFactorEnabled: false,
    },
  });

  await prismaMain.userRole.create({
    data: {
      userId: sysAdmin.id,
      roleId: adminRole.id,
    },
  });

  console.log(`✓ System admin created: ${sysAdmin.email}`);
  console.log(`  Password: SysAdmin@2025\n`);

  // ============================================================================
  // Step 3: Create Tenants with Users
  // ============================================================================
  console.log('🏢 Creating tenants and users...\n');

  for (let tenantIndex = 0; tenantIndex < TENANTS_CONFIG.length; tenantIndex++) {
    const tenantConfig = TENANTS_CONFIG[tenantIndex];
    console.log(`📦 Creating tenant: ${tenantConfig.name}`);

    // Create tenant
    const tenant = await prismaMain.tenant.create({
      data: {
        name: tenantConfig.name,
        slug: tenantConfig.slug,
        tenantKey: tenantConfig.tenantKey,
        databaseHost: 'localhost',
        isActive: true,
        currency: tenantConfig.currency,
        language: tenantConfig.language,
        dateFormat: tenantConfig.dateFormat,
        timeZone: tenantConfig.timeZone,
        invoicePrefix: `${tenantConfig.tenantKey}-`,
        nextInvoiceNumber: 1000,
        // Contact info
        contactName: `${rng.choice(FIRST_NAMES)} ${rng.choice(LAST_NAMES)}`,
        contactEmail: `contact@${tenantConfig.slug}.dev`,
        contactPhone: `+1-555-${rng.nextInt(100, 999)}-${rng.nextInt(1000, 9999)}`,
        // Billing address
        billingStreet: `${rng.nextInt(100, 9999)} ${rng.choice(['Main', 'Oak', 'Pine', 'Maple'])} St`,
        billingCity: rng.choice(CITIES),
        billingState: rng.choice(STATES),
        billingZip: `${rng.nextInt(10000, 99999)}`,
        billingCountry: 'US',
      },
    });

    console.log(`  ✓ Tenant created: ${tenant.name} (${tenant.slug})`);

    // Create tenant admin
    const adminPassword = await bcrypt.hash('Admin@2025', 10);
    const firstName = rng.choice(FIRST_NAMES);
    const lastName = rng.choice(LAST_NAMES);

    const tenantAdmin = await prismaMain.user.create({
      data: {
        email: `admin@${tenantConfig.slug}.dev.local`,
        passwordHash: adminPassword,
        name: `${firstName} ${lastName}`,
        tenantId: tenant.id,
        isActive: true,
        twoFactorEnabled: false,
      },
    });

    await prismaMain.userRole.create({
      data: {
        userId: tenantAdmin.id,
        roleId: tenantAdminRole.id,
      },
    });

    console.log(`  ✓ Tenant admin: ${tenantAdmin.email} (Password: Admin@2025)`);

    // Create 3-5 regular users
    const numUsers = rng.nextInt(3, 5);
    const userList = [];

    for (let userIndex = 0; userIndex < numUsers; userIndex++) {
      const userPassword = await bcrypt.hash('User@2025', 10);
      const userFirstName = rng.choice(FIRST_NAMES);
      const userLastName = rng.choice(LAST_NAMES);

      const user = await prismaMain.user.create({
        data: {
          email: `user${userIndex + 1}@${tenantConfig.slug}.dev.local`,
          passwordHash: userPassword,
          name: `${userFirstName} ${userLastName}`,
          tenantId: tenant.id,
          isActive: true,
          twoFactorEnabled: false,
          hourlyRate: rng.nextInt(50, 150),
          compensationType: rng.choice(['HOURLY', 'SALARY']),
        },
      });

      await prismaMain.userRole.create({
        data: {
          userId: user.id,
          roleId: userRole.id,
        },
      });

      userList.push(user);
    }

    console.log(`  ✓ Created ${numUsers} regular users (Password: User@2025)`);

    // Store tenant info for client database seeding
    (tenant as any)._users = [tenantAdmin, ...userList];

    console.log('');
  }

  console.log('✅ All tenants and users created!\n');

  // ============================================================================
  // Step 4: Seed Client Databases
  // ============================================================================
  console.log('💾 Seeding client databases...\n');

  const allTenants = await prismaMain.tenant.findMany({
    where: {
      slug: {
        in: TENANTS_CONFIG.map((t) => t.slug),
      },
    },
    include: {
      users: true,
    },
  });

  for (const tenant of allTenants) {
    console.log(`📊 Seeding data for: ${tenant.name}`);

    // Connect to tenant's client database
    const clientDb = new PrismaClientClient({
      datasources: {
        db: {
          url: `postgresql://david@localhost:5432/freetimechat_${tenant.slug.replace(/-/g, '_')}`,
        },
      },
    });

    try {
      // Create 8-15 clients
      const numClients = rng.nextInt(8, 15);
      console.log(`  Creating ${numClients} clients...`);

      for (let clientIndex = 0; clientIndex < numClients; clientIndex++) {
        const clientFirstName = rng.choice(FIRST_NAMES);
        const clientLastName = rng.choice(LAST_NAMES);
        const companyName = rng.choice(COMPANY_NAMES);

        const client = await clientDb.client.create({
          data: {
            name: companyName,
            email: `contact@${companyName.toLowerCase().replace(/\s+/g, '')}.example.com`,
            phone: `+1-555-${rng.nextInt(100, 999)}-${rng.nextInt(1000, 9999)}`,
            address: `${rng.nextInt(100, 9999)} ${rng.choice(['Business', 'Commerce', 'Industry'])} Blvd`,
            city: rng.choice(CITIES),
            state: rng.choice(STATES),
            zipCode: `${rng.nextInt(10000, 99999)}`,
            country: 'US',
            contactName: `${clientFirstName} ${clientLastName}`,
            isActive: true,
          },
        });

        // Create 2-5 projects per client
        const numProjects = rng.nextInt(2, 5);

        for (let projIndex = 0; projIndex < numProjects; projIndex++) {
          const projectName = rng.choice(PROJECT_NAMES);
          const startDate = new Date(2024, rng.nextInt(0, 11), rng.nextInt(1, 28));
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + rng.nextInt(1, 6));

          const project = await clientDb.project.create({
            data: {
              name: `${projectName} - ${companyName}`,
              description: `${projectName} project for ${companyName}`,
              clientId: client.id,
              startDate,
              endDate,
              isActive: true,
            },
          });

          // Create 10-20 time entries per project
          const numTimeEntries = rng.nextInt(10, 20);

          for (let timeIndex = 0; timeIndex < numTimeEntries; timeIndex++) {
            // Pick random user from tenant
            const randomUser = tenant.users[rng.nextInt(0, tenant.users.length - 1)];

            // Random date within project timeline
            const entryDate = new Date(startDate);
            entryDate.setDate(
              entryDate.getDate() +
                rng.nextInt(
                  0,
                  Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                )
            );

            const hours = rng.nextInt(1, 8);
            const description = rng.choice(TASK_DESCRIPTIONS);

            await clientDb.timeEntry.create({
              data: {
                userId: randomUser.id,
                projectId: project.id,
                date: entryDate,
                hours,
                description,
                isBillable: rng.next() > 0.2, // 80% billable
              },
            });
          }
        }
      }

      console.log(`  ✓ Created ${numClients} clients with projects and time entries`);
      console.log('');

      await clientDb.$disconnect();
    } catch (error) {
      console.error(`  ❌ Error seeding ${tenant.name}:`, error);
      await clientDb.$disconnect();
    }
  }

  console.log('✅ Development data seeding complete!\n');

  // ============================================================================
  // Summary
  // ============================================================================
  console.log('📋 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n👤 System Administrator:');
  console.log('   Email: sysadmin@dev.local');
  console.log('   Password: SysAdmin@2025');
  console.log('   Access: All tenants\n');

  console.log('🏢 Tenants Created:');
  for (const config of TENANTS_CONFIG) {
    console.log(`\n   ${config.name} (${config.slug})`);
    console.log(`   ├─ Admin: admin@${config.slug}.dev.local (Password: Admin@2025)`);
    console.log(`   ├─ Users: user1-user5@${config.slug}.dev.local (Password: User@2025)`);
    console.log(`   ├─ Currency: ${config.currency}`);
    console.log(`   ├─ Language: ${config.language}`);
    console.log(`   ├─ Timezone: ${config.timeZone}`);
    console.log(`   └─ Data: 8-15 clients, 2-5 projects/client, 10-20 entries/project`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✨ Ready for development and testing!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding development data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaMain.$disconnect();
  });
