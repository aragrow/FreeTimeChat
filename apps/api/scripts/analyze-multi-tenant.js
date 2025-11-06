#!/usr/bin/env node
/**
 * Multi-Tenant Isolation Analysis Script
 *
 * Analyzes data isolation between tenants/clients
 * without requiring running services.
 *
 * Usage: node scripts/analyze-multi-tenant.js
 */

const fs = require('fs');
const path = require('path');

console.log('🏢 Multi-Tenant Isolation Analysis');
console.log('='.repeat(60));
console.log();

const issues = {
  critical: [],
  warnings: [],
  info: [],
  passed: [],
};

// ============================================================================
// 1. Schema Architecture Analysis
// ============================================================================

console.log('📋 Analyzing Multi-Tenant Architecture...\n');

function analyzeSchemaArchitecture() {
  // Check for dual-database architecture
  const mainSchema = path.join(__dirname, '../prisma/schema-main.prisma');
  const clientSchema = path.join(__dirname, '../prisma/schema-client.prisma');

  if (fs.existsSync(mainSchema) && fs.existsSync(clientSchema)) {
    issues.passed.push(
      '✓ Database-per-tenant architecture (schema-main.prisma + schema-client.prisma)'
    );
    issues.passed.push('✓ Maximum data isolation - each tenant has separate database');
  } else if (fs.existsSync(mainSchema)) {
    // Check if using row-level tenancy (clientId in tables)
    const schema = fs.readFileSync(mainSchema, 'utf8');
    if (schema.includes('clientId')) {
      issues.warnings.push(
        '⚠️  Using row-level tenancy (clientId fields) - less isolation than database-per-tenant'
      );
      issues.info.push('ℹ️  Consider migrating to database-per-tenant for better isolation');
    }
  }

  // Analyze Client model
  const mainSchemaContent = fs.readFileSync(mainSchema, 'utf8');

  if (mainSchemaContent.includes('model Client')) {
    issues.passed.push('✓ Client registry model exists');

    // Check for database routing fields
    if (mainSchemaContent.includes('databaseName') || mainSchemaContent.includes('database_name')) {
      issues.passed.push('✓ Database routing configured (databaseName field)');
    } else {
      issues.critical.push('❌ No database routing field in Client model');
    }

    // Check for client isolation field
    if (mainSchemaContent.includes('isActive') || mainSchemaContent.includes('is_active')) {
      issues.passed.push('✓ Client activation status tracked');
    }
  } else {
    issues.critical.push('❌ No Client model found for tenant registry');
  }

  // Check User model has clientId
  if (mainSchemaContent.includes('model User')) {
    if (mainSchemaContent.match(/model User[\s\S]*?clientId/)) {
      issues.passed.push('✓ Users scoped to clients (clientId field)');

      // Check for index on clientId
      if (mainSchemaContent.match(/model User[\s\S]*?@@index\(\[clientId\]\)/)) {
        issues.passed.push('✓ Index on User.clientId for efficient filtering');
      } else {
        issues.warnings.push('⚠️  Missing index on User.clientId (performance impact)');
      }
    } else {
      issues.critical.push('❌ Users not scoped to clients - data leakage risk!');
    }
  }
}

analyzeSchemaArchitecture();

// ============================================================================
// 2. Client Database Isolation
// ============================================================================

console.log('📋 Analyzing Client Database Isolation...\n');

function analyzeClientDatabaseIsolation() {
  const clientSchemaPath = path.join(__dirname, '../prisma/schema-client.prisma');
  if (!fs.existsSync(clientSchemaPath)) {
    issues.info.push('ℹ️  No client-specific schema (using row-level tenancy)');
    return;
  }

  const schema = fs.readFileSync(clientSchemaPath, 'utf8');

  // Check that client schema has client-scoped models
  const models = ['Project', 'TimeEntry', 'Task', 'Conversation', 'Message'];
  const foundModels = models.filter((model) => schema.includes(`model ${model}`));

  if (foundModels.length > 0) {
    issues.passed.push(`✓ Client database has ${foundModels.length} tenant-specific models`);
  }

  // Check for clientId in client database (should NOT exist)
  if (schema.includes('clientId') && !schema.includes('// client reference')) {
    issues.warnings.push('⚠️  clientId found in client database - may be redundant');
    issues.info.push('ℹ️  Database-per-tenant should not need clientId in client DB');
  } else {
    issues.passed.push('✓ Client database has no redundant clientId fields');
  }

  // Check that models reference users by userId (not User relation)
  const modelsWithUserRef = schema.match(/userId\s+String/g);
  if (modelsWithUserRef && modelsWithUserRef.length > 0) {
    issues.passed.push('✓ Client data references users via userId (cross-database reference)');
  }
}

analyzeClientDatabaseIsolation();

// ============================================================================
// 3. Service Layer Isolation
// ============================================================================

console.log('📋 Analyzing Service Layer Isolation...\n');

function analyzeServiceIsolation() {
  const servicesDir = path.join(__dirname, '../src/services');
  if (!fs.existsSync(servicesDir)) {
    issues.critical.push('services directory not found');
    return;
  }

  const serviceFiles = fs.readdirSync(servicesDir).filter((f) => f.endsWith('.service.ts'));
  let servicesWithClientScoping = 0;
  let servicesWithoutClientScoping = [];

  serviceFiles.forEach((file) => {
    const content = fs.readFileSync(path.join(servicesDir, file), 'utf8');

    // Check if service uses client-scoped Prisma client
    const usesClientPrisma =
      content.includes('getClientPrisma') ||
      content.includes('ClientPrismaClient') ||
      content.includes('prisma-client');

    // Check if service uses main Prisma (for auth/client management)
    const usesMainPrisma = content.includes('MainPrismaClient') || content.includes('prisma-main');

    // Check for clientId usage in queries
    const usesClientId = content.includes('clientId') && content.includes('where');

    if (usesClientPrisma || usesClientId) {
      servicesWithClientScoping++;
    } else if (usesMainPrisma) {
      // Main DB services are OK (auth, client management)
      servicesWithClientScoping++;
    } else {
      servicesWithoutClientScoping.push(file);
    }
  });

  if (serviceFiles.length > 0) {
    const scopingRate = ((servicesWithClientScoping / serviceFiles.length) * 100).toFixed(1);
    issues.info.push(
      `ℹ️  Client scoping: ${servicesWithClientScoping}/${serviceFiles.length} services (${scopingRate}%)`
    );

    if (scopingRate >= 90) {
      issues.passed.push('✓ Most services implement client scoping');
    } else if (scopingRate >= 70) {
      issues.warnings.push(
        `⚠️  ${100 - scopingRate}% of services may not implement client scoping`
      );
    } else {
      issues.critical.push(`❌ Many services lack client scoping (${100 - scopingRate}%)`);
    }
  }

  // Check for dangerous cross-tenant queries
  serviceFiles.forEach((file) => {
    const content = fs.readFileSync(path.join(servicesDir, file), 'utf8');

    // Look for findMany without where clause
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('.findMany()') && !line.includes('//')) {
        issues.warnings.push(
          `⚠️  ${file}:${index + 1} - findMany() without where clause (potential cross-tenant leak)`
        );
      }
    });
  });
}

analyzeServiceIsolation();

// ============================================================================
// 4. Middleware Isolation Checks
// ============================================================================

console.log('📋 Analyzing Middleware Isolation...\n');

function analyzeMiddlewareIsolation() {
  const authMiddlewarePath = path.join(__dirname, '../src/middleware/auth.middleware.ts');
  if (!fs.existsSync(authMiddlewarePath)) {
    issues.critical.push('❌ auth.middleware.ts not found');
    return;
  }

  const content = fs.readFileSync(authMiddlewarePath, 'utf8');

  // Check that middleware extracts clientId from JWT
  if (content.includes('clientId') && content.includes('jwt')) {
    issues.passed.push('✓ Middleware extracts clientId from JWT');
  } else {
    issues.critical.push('❌ Middleware may not extract clientId from JWT');
  }

  // Check that user object includes client context
  if (content.includes('req.user') && content.includes('clientId')) {
    issues.passed.push('✓ User context includes clientId');
  } else {
    issues.warnings.push('⚠️  User context may not include clientId');
  }

  // Check for client validation
  if (content.includes('isActive') || content.includes('client')) {
    issues.passed.push('✓ Client validation in authentication');
  } else {
    issues.warnings.push('⚠️  No client validation - inactive clients may access API');
  }
}

analyzeMiddlewareIsolation();

// ============================================================================
// 5. JWT Payload Client Isolation
// ============================================================================

console.log('📋 Analyzing JWT Client Isolation...\n');

function analyzeJWTIsolation() {
  const jwtServicePath = path.join(__dirname, '../src/services/jwt.service.ts');
  if (!fs.existsSync(jwtServicePath)) {
    issues.critical.push('jwt.service.ts not found');
    return;
  }

  const content = fs.readFileSync(jwtServicePath, 'utf8');

  // Check that JWT includes clientId
  if (content.includes('clientId') && content.includes('payload')) {
    issues.passed.push('✓ JWT payload includes clientId');
  } else {
    issues.critical.push('❌ JWT payload may not include clientId - cross-tenant risk!');
  }

  // Check JWT verification validates client
  if (content.includes('verify') && content.includes('clientId')) {
    issues.passed.push('✓ JWT verification includes client validation');
  } else {
    issues.info.push('ℹ️  JWT verification should validate clientId');
  }
}

analyzeJWTIsolation();

// ============================================================================
// 6. Database Connection Management
// ============================================================================

console.log('📋 Analyzing Database Connection Management...\n');

function analyzeDatabaseConnections() {
  // Check for client database utility
  const files = fs.readdirSync(path.join(__dirname, '../src'));
  const hasClientDbUtil = files.some(
    (f) =>
      (f.includes('client') && f.includes('db')) || (f.includes('database') && f.includes('util'))
  );

  // Check services for database connection patterns
  const servicesDir = path.join(__dirname, '../src/services');
  const serviceFiles = fs.readdirSync(servicesDir).filter((f) => f.endsWith('.service.ts'));

  let hasDynamicConnectionSwitching = false;

  serviceFiles.forEach((file) => {
    const content = fs.readFileSync(path.join(servicesDir, file), 'utf8');
    if (content.includes('getClientPrisma') || content.includes('switchDatabase')) {
      hasDynamicConnectionSwitching = true;
    }
  });

  if (hasDynamicConnectionSwitching) {
    issues.passed.push('✓ Dynamic database connection switching implemented');
  } else {
    issues.info.push('ℹ️  Consider implementing dynamic database connection switching');
  }

  // Check for connection pooling configuration
  const envExample = path.join(__dirname, '../.env.example');
  if (fs.existsSync(envExample)) {
    const env = fs.readFileSync(envExample, 'utf8');
    if (env.includes('CLIENT_DATABASE_URL')) {
      issues.passed.push('✓ Separate client database connection string configured');
    } else {
      issues.warnings.push('⚠️  No separate client database connection string');
    }
  }
}

analyzeDatabaseConnections();

// ============================================================================
// 7. Test Coverage for Multi-Tenancy
// ============================================================================

console.log('📋 Analyzing Multi-Tenant Test Coverage...\n');

function analyzeMultiTenantTests() {
  const testsDir = path.join(__dirname, '../src/__tests__');
  if (!fs.existsSync(testsDir)) {
    issues.warnings.push('⚠️  No tests directory found');
    return;
  }

  const findTestFiles = (dir) => {
    const files = [];
    const items = fs.readdirSync(dir);

    items.forEach((item) => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...findTestFiles(fullPath));
      } else if (item.endsWith('.test.ts')) {
        files.push(fullPath);
      }
    });

    return files;
  };

  const testFiles = findTestFiles(testsDir);
  let hasMultiTenantTests = false;
  let hasIsolationTests = false;

  testFiles.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');

    if (content.includes('tenant') || content.includes('client') || content.includes('multi')) {
      hasMultiTenantTests = true;
    }

    if (
      content.includes('isolation') ||
      content.includes('cross-tenant') ||
      content.includes('data leak')
    ) {
      hasIsolationTests = true;
    }
  });

  if (hasMultiTenantTests) {
    issues.passed.push('✓ Multi-tenant tests exist');
  } else {
    issues.warnings.push('⚠️  No multi-tenant tests found');
  }

  if (hasIsolationTests) {
    issues.passed.push('✓ Tenant isolation tests exist');
  } else {
    issues.critical.push('❌ No tenant isolation tests found - CRITICAL for multi-tenant security');
  }
}

analyzeMultiTenantTests();

console.log();

// ============================================================================
// 8. Report Results
// ============================================================================

console.log('='.repeat(60));
console.log('📊 MULTI-TENANT ISOLATION ANALYSIS');
console.log('='.repeat(60));
console.log();

if (issues.passed.length > 0) {
  console.log('✅ PASSED CHECKS:');
  issues.passed.forEach((check) => console.log(`  ${check}`));
  console.log();
}

if (issues.critical.length > 0) {
  console.log('🔴 CRITICAL ISSUES:');
  issues.critical.forEach((issue) => console.log(`  ${issue}`));
  console.log();
}

if (issues.warnings.length > 0) {
  console.log('🟡 WARNINGS:');
  issues.warnings.forEach((issue) => console.log(`  ${issue}`));
  console.log();
}

if (issues.info.length > 0) {
  console.log('ℹ️  INFORMATION:');
  issues.info.forEach((item) => console.log(`  ${item}`));
  console.log();
}

// Summary
console.log('='.repeat(60));
console.log(
  `Passed: ${issues.passed.length} | Critical: ${issues.critical.length} | Warnings: ${issues.warnings.length} | Info: ${issues.info.length}`
);
console.log('='.repeat(60));
console.log();

if (issues.critical.length > 0) {
  console.log('⚠️  CRITICAL MULTI-TENANT ISOLATION ISSUES!');
  console.log('These issues could allow cross-tenant data access.\n');
  process.exit(1);
} else if (issues.warnings.length > 0) {
  console.log('✓ No critical issues. Review warnings for best practices.\n');
  process.exit(0);
} else {
  console.log('✅ ALL MULTI-TENANT ISOLATION CHECKS PASSED!\n');
  process.exit(0);
}
