/**
 * Database Seed Script
 *
 * Seeds the main database with:
 * - Default admin user (freetimechat)
 * - Admin role with all capabilities
 */

import { PrismaClient as PrismaMainClient } from '../src/generated/prisma-main';
import bcrypt from 'bcrypt';

const prismaMain = new PrismaMainClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ============================================================================
  // Step 0: Clean Existing Seeded Data
  // ============================================================================
  console.log('🧹 Cleaning existing seeded data...');

  // Delete only seeded records in correct order to avoid foreign key constraint violations
  await prismaMain.impersonationSession.deleteMany({});
  console.log('  ✓ Deleted impersonation sessions (all)');

  const deletedRefreshTokens = await prismaMain.refreshToken.deleteMany({
    where: { user: { isSeeded: true } },
  });
  console.log(`  ✓ Deleted ${deletedRefreshTokens.count} refresh tokens (seeded users)`);

  const deletedUserRoles = await prismaMain.userRole.deleteMany({
    where: { isSeeded: true },
  });
  console.log(`  ✓ Deleted ${deletedUserRoles.count} user roles`);

  const deletedRoleCapabilities = await prismaMain.roleCapability.deleteMany({
    where: { isSeeded: true },
  });
  console.log(`  ✓ Deleted ${deletedRoleCapabilities.count} role capabilities`);

  const deletedUsers = await prismaMain.user.deleteMany({
    where: { isSeeded: true },
  });
  console.log(`  ✓ Deleted ${deletedUsers.count} users`);

  const deletedRoles = await prismaMain.role.deleteMany({
    where: { isSeeded: true },
  });
  console.log(`  ✓ Deleted ${deletedRoles.count} roles`);

  const deletedCapabilities = await prismaMain.capability.deleteMany({
    where: { isSeeded: true },
  });
  console.log(`  ✓ Deleted ${deletedCapabilities.count} capabilities`);

  const deletedSecuritySettings = await prismaMain.securitySettings.deleteMany({
    where: { tenant: { isSeeded: true } },
  });
  console.log(`  ✓ Deleted ${deletedSecuritySettings.count} security settings`);

  const deletedTenants = await prismaMain.tenant.deleteMany({
    where: { isSeeded: true },
  });
  console.log(`  ✓ Deleted ${deletedTenants.count} tenants\n`);

  // ============================================================================
  // Step 1: Create Admin User
  // ============================================================================
  console.log('👤 Creating admin user...');

  const hashedPassword = await bcrypt.hash('0pen@2025', 10);

  const adminUser = await prismaMain.user.create({
    data: {
      email: 'admin@freetimechat.local',
      passwordHash: hashedPassword,
      name: 'FreeTimeChat Admin',
      isActive: true,
      isSeeded: true,
      twoFactorEnabled: false,
    },
  });

  console.log(`✓ Admin user created: ${adminUser.email} (ID: ${adminUser.id})`);
  console.log(`  Username: admin@freetimechat.local`);
  console.log(`  Password: 0pen@2025\n`);

  // ============================================================================
  // Step 2: Create Capabilities
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
    { name: 'isadmin', description: 'Administrator status - grants full system access' },

    // Security Settings
    { name: 'security.settings.read', description: 'View security settings' },
    { name: 'security.settings.write', description: 'Update security settings' },
    { name: 'security.settings.read.all', description: 'View all customer security settings' },
  ];

  await prismaMain.capability.createMany({
    data: capabilities.map((cap) => ({ ...cap, isSeeded: true })),
  });

  console.log(`✓ Created ${capabilities.length} capabilities\n`);

  // ============================================================================
  // Step 3: Create Roles
  // ============================================================================
  console.log('👑 Creating roles...');

  // Create "user" role (basic user permissions)
  const userRole = await prismaMain.role.create({
    data: {
      id: '00000000-0000-0000-0000-000000000010',
      name: 'user',
      description: 'Standard user with chat-only permissions',
      isSeeded: true,
    },
  });

  console.log(`✓ User role created: ${userRole.name} (ID: ${userRole.id})`);

  // Create "customeradmin" role (customer administrator)
  const customerAdminRole = await prismaMain.role.create({
    data: {
      id: '00000000-0000-0000-0000-000000000012',
      name: 'customeradmin',
      description: 'Customer administrator with user management permissions',
      isSeeded: true,
    },
  });

  console.log(
    `✓ Customer Admin role created: ${customerAdminRole.name} (ID: ${customerAdminRole.id})`
  );

  // Create "admin" role (full system administrator)
  const adminRole = await prismaMain.role.create({
    data: {
      id: '00000000-0000-0000-0000-000000000011',
      name: 'admin',
      description: 'Full system administrator with all permissions',
      isSeeded: true,
    },
  });

  console.log(`✓ Admin role created: ${adminRole.name} (ID: ${adminRole.id})\n`);

  // ============================================================================
  // Step 4: Assign Capabilities to Roles
  // ============================================================================
  console.log('🔗 Assigning capabilities to roles...');

  const allCapabilities = await prismaMain.capability.findMany();

  // Assign chat-only capabilities to "user" role
  const userCapabilities = ['conversations:read', 'conversations:create', 'conversations:delete'];

  // Prepare user role capabilities
  const userRoleCapabilities = allCapabilities
    .filter((c) => userCapabilities.includes(c.name))
    .map((c) => ({
      roleId: userRole.id,
      capabilityId: c.id,
      isAllowed: true,
      isSeeded: true,
    }));

  await prismaMain.roleCapability.createMany({
    data: userRoleCapabilities,
  });

  console.log(`✓ Assigned ${userRoleCapabilities.length} capabilities to user role`);

  // Assign user management capabilities to "customeradmin" role
  const customerAdminCapabilities = [
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'conversations:read',
    'conversations:create',
    'conversations:delete',
    'reports:read',
    'reports:export',
  ];

  const customerAdminRoleCapabilities = allCapabilities
    .filter((c) => customerAdminCapabilities.includes(c.name))
    .map((c) => ({
      roleId: customerAdminRole.id,
      capabilityId: c.id,
      isAllowed: true,
      isSeeded: true,
    }));

  await prismaMain.roleCapability.createMany({
    data: customerAdminRoleCapabilities,
  });

  console.log(
    `✓ Assigned ${customerAdminRoleCapabilities.length} capabilities to customeradmin role`
  );

  // Assign ALL capabilities to "admin" role
  const adminRoleCapabilities = allCapabilities.map((c) => ({
    roleId: adminRole.id,
    capabilityId: c.id,
    isAllowed: true,
    isSeeded: true,
  }));

  await prismaMain.roleCapability.createMany({
    data: adminRoleCapabilities,
  });

  console.log(`✓ Assigned ${adminRoleCapabilities.length} capabilities to admin role\n`);

  // ============================================================================
  // Step 5: Assign Admin Role to User
  // ============================================================================
  console.log('👥 Assigning admin role to user...');

  await prismaMain.userRole.create({
    data: {
      userId: adminUser.id,
      roleId: adminRole.id,
      isSeeded: true,
    },
  });

  console.log(`✓ Admin role assigned to user\n`);

  // ============================================================================
  // Step 6: Create Test Tenant
  // ============================================================================
  console.log('🏢 Creating test tenant...');

  const testTenant = await prismaMain.tenant.create({
    data: {
      id: '00000000-0000-0000-0000-000000000100',
      name: 'Test Tenant',
      slug: 'test-tenant',
      tenantKey: 'TEST-TENANT-KEY',
      databaseName: 'freetimechat_test_tenant',
      databaseHost: 'localhost',
      isActive: true,
      isSeeded: true,
    },
  });

  console.log(`✓ Test tenant created: ${testTenant.name} (ID: ${testTenant.id})`);
  console.log(`  Tenant Key: ${testTenant.tenantKey}\n`);

  // ============================================================================
  // Step 7: Create Test User
  // ============================================================================
  console.log('👤 Creating test user...');

  const testPassword = await bcrypt.hash('Test@2025', 10);

  const testUser = await prismaMain.user.create({
    data: {
      email: 'testuser@freetimechat.local',
      passwordHash: testPassword,
      name: 'Test User',
      tenantId: testTenant.id,
      isActive: true,
      isSeeded: true,
      twoFactorEnabled: false,
    },
  });

  console.log(`✓ Test user created: ${testUser.email} (ID: ${testUser.id})`);
  console.log(`  Username: testuser@freetimechat.local`);
  console.log(`  Password: Test@2025`);
  console.log(`  Tenant: ${testTenant.name}\n`);

  // ============================================================================
  // Step 8: Assign User Role to Test User
  // ============================================================================
  console.log('👥 Assigning user role to test user...');

  await prismaMain.userRole.create({
    data: {
      userId: testUser.id,
      roleId: userRole.id,
      isSeeded: true,
    },
  });

  console.log(`✓ User role assigned to test user\n`);

  // ============================================================================
  // Summary
  // ============================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Database seeded successfully!\n');
  console.log('📋 Summary:');
  console.log(`   • Admin User: ${adminUser.email}`);
  console.log(`   • Password: 0pen@2025`);
  console.log(`   • Test User: ${testUser.email}`);
  console.log(`   • Password: Test@2025`);
  console.log(`   • Test Tenant: ${testTenant.name} (Key: ${testTenant.tenantKey})`);
  console.log(`   • Roles:`);
  console.log(`     - user (${userRoleCapabilities.length} capabilities)`);
  console.log(`     - customeradmin (${customerAdminRoleCapabilities.length} capabilities)`);
  console.log(`     - admin (${adminRoleCapabilities.length} capabilities)`);
  console.log(`   • Total Capabilities: ${allCapabilities.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🚀 You can now login at: http://localhost:3000/login');
  console.log('   Admin: admin@freetimechat.local / 0pen@2025');
  console.log(
    '   Test User: testuser@freetimechat.local / Test@2025 (Tenant Key: TEST-TENANT-KEY)\n'
  );
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
