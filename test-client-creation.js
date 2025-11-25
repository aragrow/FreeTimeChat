#!/usr/bin/env node

/**
 * Test script for client creation endpoint
 */

const API_URL = 'http://localhost:3001/api/v1';

async function login() {
  console.log('🔐 Logging in...');
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: '000001@aragrow-llc.local',
      password: 'SecurePassword123!',
      tenantKey: 'ARAGROW-LLC',
    }),
  });

  const data = await response.json();

  if (data.status !== 'success') {
    throw new Error(`Login failed: ${data.message}`);
  }

  console.log('✅ Login successful');
  console.log(`   User: ${data.data.user.email}`);
  console.log(`   Roles: ${data.data.user.roles.join(', ')}`);
  console.log(`   Tenant: ${data.data.user.tenant?.name || 'N/A'}`);

  return data.data.accessToken;
}

async function createClient(token) {
  console.log('\n📝 Creating test client...');

  const clientData = {
    name: `Test Client ${Date.now()}`,
    companyName: 'Test Company',
    contactName: 'John Doe',
    contactEmail: 'john@example.com',
    contactPhone: '(555) 123-4567',
  };

  console.log('   Request data:', JSON.stringify(clientData, null, 2));

  const response = await fetch(`${API_URL}/admin/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(clientData),
  });

  console.log(`   Response status: ${response.status} ${response.statusText}`);

  const data = await response.json();
  console.log('   Response data:', JSON.stringify(data, null, 2));

  if (data.status === 'success') {
    console.log('✅ Client created successfully!');
    console.log(`   Client ID: ${data.data.id}`);
    console.log(`   Client Name: ${data.data.name}`);
    console.log(`   Client Slug: ${data.data.slug}`);
  } else {
    console.log('❌ Client creation failed');
    console.log(`   Error: ${data.message}`);
  }

  return data;
}

async function main() {
  try {
    const token = await login();
    await createClient(token);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.cause) {
      console.error('   Cause:', error.cause);
    }
    process.exit(1);
  }
}

main();
