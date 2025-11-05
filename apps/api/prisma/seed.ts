/**
 * Database Seed Script
 *
 * Seeds the main database with:
 * - Default admin user (freetimechat)
 * - Default client
 * - Admin role with all capabilities
 */

import { PrismaClient as PrismaMainClient } from '../src/generated/prisma-main';
import bcrypt from 'bcrypt';

const prismaMain = new PrismaMainClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ============================================================================
  // Step 1: Create Default Client
  // ============================================================================
  console.log('📦 Creating default client...');

  const client = await prismaMain.client.upsert({
    where: { slug: 'freetimechat' },
    update: {},
    create: {
      name: 'FreeTimeChat',
      slug: 'freetimechat',
      databaseName: 'freetimechat_client_dev',
      databaseHost: 'localhost',
      isActive: true,
    },
  });

  console.log(`✓ Client created: ${client.name} (ID: ${client.id})\n`);

  // ============================================================================
  // Step 2: Create Admin User
  // ============================================================================
  console.log('👤 Creating admin user...');

  const hashedPassword = await bcrypt.hash('0pen@2025', 10);

  const adminUser = await prismaMain.user.upsert({
    where: { email: 'admin@freetimechat.local' },
    update: {
      passwordHash: hashedPassword, // Update password in case it changed
    },
    create: {
      email: 'admin@freetimechat.local',
      passwordHash: hashedPassword,
      name: 'FreeTimeChat Admin',
      clientId: client.id,
      isActive: true,
      twoFactorEnabled: false,
    },
  });

  console.log(`✓ Admin user created: ${adminUser.email} (ID: ${adminUser.id})`);
  console.log(`  Username: admin@freetimechat.local`);
  console.log(`  Password: 0pen@2025\n`);

  // ============================================================================
  // Step 3: Create Capabilities
  // ============================================================================
  console.log('🔐 Creating capabilities...');

  const capabilities = [
    // User Management
    { name: 'users:read', description: 'View users' },
    { name: 'users:create', description: 'Create users' },
    { name: 'users:update', description: 'Update users' },
    { name: 'users:delete', description: 'Delete users' },

    // Role Management
    { name: 'roles:read', description: 'View roles' },
    { name: 'roles:create', description: 'Create roles' },
    { name: 'roles:update', description: 'Update roles' },
    { name: 'roles:delete', description: 'Delete roles' },

    // Project Management
    { name: 'projects:read', description: 'View projects' },
    { name: 'projects:create', description: 'Create projects' },
    { name: 'projects:update', description: 'Update projects' },
    { name: 'projects:delete', description: 'Delete projects' },

    // Time Entry Management
    { name: 'time-entries:read', description: 'View time entries' },
    { name: 'time-entries:create', description: 'Create time entries' },
    { name: 'time-entries:update', description: 'Update time entries' },
    { name: 'time-entries:delete', description: 'Delete time entries' },

    // Task Management
    { name: 'tasks:read', description: 'View tasks' },
    { name: 'tasks:create', description: 'Create tasks' },
    { name: 'tasks:update', description: 'Update tasks' },
    { name: 'tasks:delete', description: 'Delete tasks' },

    // Conversation Management
    { name: 'conversations:read', description: 'View conversations' },
    { name: 'conversations:create', description: 'Create conversations' },
    { name: 'conversations:delete', description: 'Delete conversations' },

    // Reports & Analytics
    { name: 'reports:read', description: 'View reports' },
    { name: 'reports:export', description: 'Export reports' },

    // Admin Functions
    { name: 'admin:impersonate', description: 'Impersonate users' },
    { name: 'admin:audit-logs', description: 'View audit logs' },
    { name: 'admin:system-settings', description: 'Manage system settings' },
  ];

  let createdCapabilities = 0;
  for (const cap of capabilities) {
    await prismaMain.capability.upsert({
      where: { name: cap.name },
      update: { description: cap.description },
      create: cap,
    });
    createdCapabilities++;
  }

  console.log(`✓ Created/updated ${createdCapabilities} capabilities\n`);

  // ============================================================================
  // Step 4: Create Admin Role
  // ============================================================================
  console.log('👑 Creating admin role...');

  const adminRole = await prismaMain.role.upsert({
    where: { name: 'Admin' },
    update: {
      description: 'Full system administrator with all permissions',
    },
    create: {
      name: 'Admin',
      description: 'Full system administrator with all permissions',
    },
  });

  console.log(`✓ Admin role created: ${adminRole.name} (ID: ${adminRole.id})\n`);

  // ============================================================================
  // Step 5: Assign All Capabilities to Admin Role
  // ============================================================================
  console.log('🔗 Assigning capabilities to admin role...');

  const allCapabilities = await prismaMain.capability.findMany();

  let assignedCapabilities = 0;
  for (const capability of allCapabilities) {
    await prismaMain.roleCapability.upsert({
      where: {
        roleId_capabilityId: {
          roleId: adminRole.id,
          capabilityId: capability.id,
        },
      },
      update: {
        isAllowed: true,
      },
      create: {
        roleId: adminRole.id,
        capabilityId: capability.id,
        isAllowed: true,
      },
    });
    assignedCapabilities++;
  }

  console.log(`✓ Assigned ${assignedCapabilities} capabilities to admin role\n`);

  // ============================================================================
  // Step 6: Assign Admin Role to User
  // ============================================================================
  console.log('👥 Assigning admin role to user...');

  await prismaMain.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  console.log(`✓ Admin role assigned to user\n`);

  // ============================================================================
  // Summary
  // ============================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Database seeded successfully!\n');
  console.log('📋 Summary:');
  console.log(`   • Client: ${client.name}`);
  console.log(`   • Admin User: ${adminUser.email}`);
  console.log(`   • Password: 0pen@2025`);
  console.log(`   • Role: ${adminRole.name}`);
  console.log(`   • Capabilities: ${allCapabilities.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🚀 You can now login at: http://localhost:3000/login');
  console.log('   Email: admin@freetimechat.local');
  console.log('   Password: 0pen@2025\n');
}

main()
  .then(async () => {
    await prismaMain.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e);
    await prismaMain.$disconnect();
    process.exit(1);
  });
