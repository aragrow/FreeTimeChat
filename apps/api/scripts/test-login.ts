/**
 * Login Test Script
 *
 * Tests admin and test user login, then cleans up test data
 */

import axios from 'axios';
import { PrismaClient as MainPrismaClient } from '../src/generated/prisma-main';

const API_URL = process.env.API_URL || 'http://localhost:3001';
const prisma = new MainPrismaClient();

interface LoginResponse {
  status: string;
  data: {
    user: {
      id: string;
      email: string;
      name: string;
    };
    accessToken: string;
    refreshToken: string;
  };
}

async function testAdminLogin(): Promise<boolean> {
  console.log('\n📝 Testing Admin Login...');
  console.log('   Email: admin@freetimechat.local');
  console.log('   Password: 0pen@2025\n');

  try {
    const response = await axios.post<LoginResponse>(`${API_URL}/api/v1/auth/login`, {
      email: 'admin@freetimechat.local',
      password: '0pen@2025',
    });

    if (response.status === 200 && response.data.status === 'success') {
      console.log('✅ Admin login successful!');
      console.log(`   User ID: ${response.data.data.user.id}`);
      console.log(`   Name: ${response.data.data.user.name}`);
      console.log(`   Access Token: ${response.data.data.accessToken.substring(0, 50)}...`);
      return true;
    } else {
      console.error('❌ Admin login failed: Unexpected response');
      console.error('   Response:', response.data);
      return false;
    }
  } catch (error: any) {
    console.error('❌ Admin login failed with error:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
    return false;
  }
}

async function testUserLogin(): Promise<boolean> {
  console.log('\n📝 Testing Test User Login...');
  console.log('   Email: testuser@freetimechat.local');
  console.log('   Password: Test@2025');
  console.log('   Tenant Key: TEST-TENANT-KEY\n');

  try {
    const response = await axios.post<LoginResponse>(`${API_URL}/api/v1/auth/login`, {
      email: 'testuser@freetimechat.local',
      password: 'Test@2025',
      tenantKey: 'TEST-TENANT-KEY',
    });

    if (response.status === 200 && response.data.status === 'success') {
      console.log('✅ Test user login successful!');
      console.log(`   User ID: ${response.data.data.user.id}`);
      console.log(`   Name: ${response.data.data.user.name}`);
      console.log(`   Access Token: ${response.data.data.accessToken.substring(0, 50)}...`);
      return true;
    } else {
      console.error('❌ Test user login failed: Unexpected response');
      console.error('   Response:', response.data);
      return false;
    }
  } catch (error: any) {
    console.error('❌ Test user login failed with error:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
    return false;
  }
}

async function cleanupTestData(): Promise<void> {
  console.log('\n🧹 Cleaning up test data...');

  try {
    // Get test tenant
    const testTenant = await prisma.tenant.findUnique({
      where: { id: '00000000-0000-0000-0000-000000000100' },
      include: { users: true },
    });

    if (!testTenant) {
      console.log('   ℹ️  No test tenant found (already cleaned up)');
      return;
    }

    // Delete in correct order to avoid foreign key violations
    console.log('   Deleting impersonation sessions...');
    await prisma.impersonationSession.deleteMany({
      where: { targetUserId: { in: testTenant.users.map((u) => u.id) } },
    });

    console.log('   Deleting refresh tokens...');
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: testTenant.users.map((u) => u.id) } },
    });

    console.log('   Deleting user roles...');
    await prisma.userRole.deleteMany({
      where: { userId: { in: testTenant.users.map((u) => u.id) } },
    });

    console.log('   Deleting security settings...');
    await prisma.securitySettings.deleteMany({
      where: { tenantId: testTenant.id },
    });

    console.log('   Deleting users...');
    const deletedUsers = await prisma.user.deleteMany({
      where: { id: { in: testTenant.users.map((u) => u.id) } },
    });
    console.log(`   ✓ Deleted ${deletedUsers.count} test user(s)`);

    console.log('   Deleting tenant...');
    await prisma.tenant.delete({
      where: { id: testTenant.id },
    });
    console.log(`   ✓ Deleted test tenant: ${testTenant.name}`);

    console.log('✅ Test data cleaned up successfully!');
  } catch (error) {
    console.error('❌ Failed to cleanup test data:', error);
    throw error;
  }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 FreeTimeChat Login Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n🌐 API URL: ${API_URL}`);

  let allTestsPassed = true;

  // Test 1: Admin Login
  const adminLoginSuccess = await testAdminLogin();
  if (!adminLoginSuccess) {
    allTestsPassed = false;
  }

  // Test 2: Test User Login
  const userLoginSuccess = await testUserLogin();
  if (!userLoginSuccess) {
    allTestsPassed = false;
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Test Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Admin Login: ${adminLoginSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Test User Login: ${userLoginSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Overall: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  if (allTestsPassed) {
    // Clean up test data only if all tests passed
    await cleanupTestData();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All tests passed and test data cleaned up!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } else {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ Tests failed - keeping test data for debugging');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 To manually clean up test data, run:');
    console.log('   npx tsx scripts/cleanup-test-data.ts\n');
    process.exit(1);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('\n❌ Test script failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
