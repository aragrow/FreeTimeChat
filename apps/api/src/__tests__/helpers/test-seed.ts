/**
 * Test Database Seeding Helper
 *
 * Seeds the database with required data for integration tests
 * Mirrors the structure of the main seed.ts but optimized for tests
 */

import bcrypt from 'bcrypt';
import { PrismaClient as ClientPrismaClient } from '../../generated/prisma-client';
import { PrismaClient as MainPrismaClient } from '../../generated/prisma-main';

let seeded = false;

/**
 * Seed database with required test data
 */
export async function seedTestDatabase(): Promise<void> {
  // Only seed once per test run
  if (seeded) {
    return;
  }

  const prisma = new MainPrismaClient({
    datasources: {
      db: {
        url:
          process.env.DATABASE_URL ||
          'postgresql://freetimechat:freetimechat_dev_password@localhost:5432/freetimechat_main',
      },
    },
  });

  try {
    console.log('🌱 Seeding test database...');

    // ============================================================================
    // Step 1: Create Capabilities
    // ============================================================================
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
      // Tenant Management
      { name: 'tenants:read', description: 'View tenants' },
      { name: 'tenants:create', description: 'Create tenants' },
      { name: 'tenants:update', description: 'Update tenants' },
      { name: 'tenants:delete', description: 'Delete tenants' },
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
      // Account Request Management
      { name: 'account-requests:read', description: 'View account requests' },
      { name: 'account-requests:approve', description: 'Approve account requests' },
      { name: 'account-requests:reject', description: 'Reject account requests' },
      // Security Settings
      { name: 'security.settings.read', description: 'View security settings' },
      { name: 'security.settings.write', description: 'Update security settings' },
      { name: 'security.settings.read.all', description: 'View all customer security settings' },
    ];

    // Create capabilities if they don't exist
    for (const cap of capabilities) {
      await prisma.capability.upsert({
        where: { name: cap.name },
        update: {},
        create: { ...cap, isSeeded: true },
      });
    }
    console.log(`✅ Ensured ${capabilities.length} capabilities exist`);

    // ============================================================================
    // Step 2: Create Roles
    // ============================================================================
    const userRole = await prisma.role.upsert({
      where: { name: 'user' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000010',
        name: 'user',
        description: 'Standard user with chat-only permissions',
        isSeeded: true,
      },
    });

    const tenantAdminRole = await prisma.role.upsert({
      where: { name: 'tenantadmin' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000012',
        name: 'tenantadmin',
        description: 'Tenant administrator with user management permissions',
        isSeeded: true,
      },
    });

    const adminRole = await prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000011',
        name: 'admin',
        description: 'Full system administrator with all permissions',
        isSeeded: true,
      },
    });

    console.log('✅ Ensured roles exist (user, tenantadmin, admin)');

    // ============================================================================
    // Step 3: Assign Capabilities to Roles
    // ============================================================================
    const allCapabilities = await prisma.capability.findMany();

    // User role capabilities (chat-only)
    const userCapabilities = ['conversations:read', 'conversations:create', 'conversations:delete'];
    for (const capName of userCapabilities) {
      const cap = allCapabilities.find((c) => c.name === capName);
      if (cap) {
        await prisma.roleCapability.upsert({
          where: {
            roleId_capabilityId: {
              roleId: userRole.id,
              capabilityId: cap.id,
            },
          },
          update: {},
          create: {
            roleId: userRole.id,
            capabilityId: cap.id,
            isAllowed: true,
            isSeeded: true,
          },
        });
      }
    }

    // Tenant admin capabilities
    const tenantAdminCapabilities = [
      'users:read',
      'users:create',
      'users:update',
      'users:delete',
      'admin:impersonate',
      'tenants:read',
      'projects:read',
      'projects:create',
      'projects:update',
      'projects:delete',
      'conversations:read',
      'conversations:create',
      'conversations:delete',
      'reports:read',
      'reports:export',
    ];
    for (const capName of tenantAdminCapabilities) {
      const cap = allCapabilities.find((c) => c.name === capName);
      if (cap) {
        await prisma.roleCapability.upsert({
          where: {
            roleId_capabilityId: {
              roleId: tenantAdminRole.id,
              capabilityId: cap.id,
            },
          },
          update: {},
          create: {
            roleId: tenantAdminRole.id,
            capabilityId: cap.id,
            isAllowed: true,
            isSeeded: true,
          },
        });
      }
    }

    // Admin gets all capabilities
    for (const cap of allCapabilities) {
      await prisma.roleCapability.upsert({
        where: {
          roleId_capabilityId: {
            roleId: adminRole.id,
            capabilityId: cap.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          capabilityId: cap.id,
          isAllowed: true,
          isSeeded: true,
        },
      });
    }

    console.log('✅ Assigned capabilities to roles');

    // ============================================================================
    // Step 4: Create ARAGROW-LLC Tenant
    // ============================================================================
    const aragrowTenant = await prisma.tenant.upsert({
      where: { slug: 'aragrow-llc' },
      update: { isActive: true },
      create: {
        id: '00000000-0000-0000-0000-000000000101',
        name: 'ARAGROW LLC',
        slug: 'aragrow-llc',
        tenantKey: 'ARAGROW-LLC',
        databaseName: 'freetimechat_aragrow_llc',
        databaseHost: '127.0.0.1',
        isActive: true,
        isSeeded: true,
      },
    });
    console.log(`✅ Ensured ARAGROW-LLC tenant exists`);

    // ============================================================================
    // Step 5: Create ARAGROW Tenant Admin User
    // ============================================================================
    const aragrowPassword = await bcrypt.hash('Open@2025', 10);
    const aragrowUser = await prisma.user.upsert({
      where: { email: '000002@aragrow-llc.local' },
      update: {
        passwordHash: aragrowPassword,
        tenantId: aragrowTenant.id,
        isActive: true,
      },
      create: {
        email: '000002@aragrow-llc.local',
        passwordHash: aragrowPassword,
        name: 'ARAGROW Admin',
        tenantId: aragrowTenant.id,
        isActive: true,
        isSeeded: true,
        twoFactorEnabled: false,
      },
    });
    console.log(`✅ Ensured ARAGROW user exists (${aragrowUser.email})`);

    // ============================================================================
    // Step 6: Assign Tenant Admin Role to ARAGROW User
    // ============================================================================
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: aragrowUser.id,
          roleId: tenantAdminRole.id,
        },
      },
      update: {},
      create: {
        userId: aragrowUser.id,
        roleId: tenantAdminRole.id,
        isSeeded: true,
      },
    });
    console.log('✅ Assigned tenantadmin role to ARAGROW user');

    seeded = true;
    console.log('✅ Test database seeded successfully\n');
  } catch (error) {
    console.error('❌ Failed to seed test database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Clean up test data from database
 */
export async function cleanupTestDatabase(): Promise<void> {
  const prisma = new MainPrismaClient({
    datasources: {
      db: {
        url:
          process.env.DATABASE_URL ||
          'postgresql://freetimechat:freetimechat_dev_password@localhost:5432/freetimechat_main',
      },
    },
  });

  const clientPrisma = new ClientPrismaClient({
    datasources: {
      db: {
        url:
          process.env.CLIENT_DATABASE_URL ||
          'postgresql://freetimechat:freetimechat_dev_password@localhost:5432/freetimechat_aragrow_llc',
      },
    },
  });

  try {
    // ============================================================================
    // Clean up Main Database (test users)
    // ============================================================================
    // Delete test users with 'test-' prefix or 'invalid-email'
    // Keep seeded users (admin, ARAGROW user) as they're needed for tests
    await prisma.refreshToken.deleteMany({
      where: {
        user: {
          OR: [{ email: { contains: 'test-' } }, { email: 'invalid-email' }],
        },
      },
    });

    await prisma.userRole.deleteMany({
      where: {
        user: {
          OR: [{ email: { contains: 'test-' } }, { email: 'invalid-email' }],
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        OR: [{ email: { contains: 'test-' } }, { email: 'invalid-email' }],
      },
    });

    console.log('✅ Cleaned up main database test data (kept seeded users for tests)');

    // ============================================================================
    // Clean up Client Database (test business clients and related data)
    // ============================================================================
    // Delete business clients created during tests (with test patterns in names or slugs)
    // Keep any seeded business clients (if any) that don't match test patterns
    const testClientNamePatterns = [
      'Test Client',
      'Acme Corporation',
      'Invalid Client',
      'Unauthorized Client',
      'Updated Test Client',
    ];

    const testClientSlugPatterns = [
      'test-client',
      'acme-corporation',
      'invalid-client',
      'unauthorized-client',
      'updated-test-client',
    ];

    // Build OR conditions for all test patterns (both name and slug)
    const clientWhereConditions = [
      // Name patterns
      ...testClientNamePatterns.map((pattern) => ({
        name: { contains: pattern, mode: 'insensitive' as const },
      })),
      // Slug patterns
      ...testClientSlugPatterns.map((pattern) => ({
        slug: { contains: pattern, mode: 'insensitive' as const },
      })),
    ];

    // First, get all test clients to cascade delete related data
    const testClients = await clientPrisma.client.findMany({
      where: {
        OR: clientWhereConditions,
      },
      select: { id: true, name: true, slug: true },
    });

    const testClientIds = testClients.map((c) => c.id);

    if (testClients.length > 0) {
      console.log(
        `🧹 Found ${testClients.length} test client(s) to clean:`,
        testClients.map((c) => `${c.name} (${c.slug})`).join(', ')
      );
    }

    if (testClientIds.length > 0) {
      // Delete related data first (due to foreign key constraints)
      await clientPrisma.timeEntry.deleteMany({
        where: { project: { clientId: { in: testClientIds } } },
      });

      await clientPrisma.task.deleteMany({
        where: { project: { clientId: { in: testClientIds } } },
      });

      await clientPrisma.project.deleteMany({
        where: { clientId: { in: testClientIds } },
      });

      // Now delete the test clients
      await clientPrisma.client.deleteMany({
        where: { id: { in: testClientIds } },
      });

      console.log(`✅ Cleaned up ${testClientIds.length} test business clients and related data`);
    } else {
      console.log('✅ No test business clients to clean up');
    }
  } catch (error) {
    console.error('Failed to cleanup test database:', error);
  } finally {
    await prisma.$disconnect();
    await clientPrisma.$disconnect();
  }
}

/**
 * Reset seeded flag (useful for testing)
 */
export function resetSeededFlag(): void {
  seeded = false;
}

/**
 * Check if database is available for testing
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  if (process.env.SKIP_INTEGRATION_TESTS === 'true') {
    return false;
  }

  const prisma = new MainPrismaClient({
    datasources: {
      db: {
        url:
          process.env.DATABASE_URL ||
          'postgresql://freetimechat:freetimechat_dev_password@localhost:5432/freetimechat_main',
      },
    },
  });

  try {
    await prisma.$connect();
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.log('⚠️  Database not available for integration tests');
    return false;
  }
}
