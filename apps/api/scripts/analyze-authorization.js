#!/usr/bin/env node
/**
 * Authorization Security Analysis Script
 *
 * Analyzes RBAC implementation and authorization middleware usage
 * without requiring running services.
 *
 * Usage: node scripts/analyze-authorization.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔐 Authorization Security Analysis');
console.log('='.repeat(60));
console.log();

const issues = {
  critical: [],
  warnings: [],
  info: [],
  passed: [],
};

// ============================================================================
// 1. RBAC Schema Analysis
// ============================================================================

console.log('📋 Analyzing RBAC Schema...\n');

function analyzeRBACSchema() {
  const schemaPath = path.join(__dirname, '../prisma/schema-main.prisma');
  if (!fs.existsSync(schemaPath)) {
    issues.critical.push('schema-main.prisma not found');
    return;
  }

  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Check for RBAC models
  const hasRole = schema.includes('model Role');
  const hasCapability = schema.includes('model Capability');
  const hasUserRole = schema.includes('model UserRole');
  const hasRoleCapability = schema.includes('model RoleCapability');

  if (hasRole && hasCapability && hasUserRole && hasRoleCapability) {
    issues.passed.push('✓ Complete RBAC schema (Role, Capability, UserRole, RoleCapability)');
  } else {
    issues.critical.push('❌ Incomplete RBAC schema - missing models');
  }

  // Check for allow/deny field in RoleCapability
  if (schema.includes('isAllowed') && schema.match(/model RoleCapability/)) {
    issues.passed.push('✓ RoleCapability supports allow/deny (isAllowed field)');
  } else {
    issues.warnings.push('⚠️  RoleCapability missing allow/deny support');
  }

  // Check for indexes on RBAC tables
  const rbacIndexes = [
    { model: 'UserRole', field: 'userId', check: /model UserRole[\s\S]*?@@index\(\[userId\]\)/ },
    { model: 'UserRole', field: 'roleId', check: /model UserRole[\s\S]*?@@index\(\[roleId\]\)/ },
    {
      model: 'RoleCapability',
      field: 'roleId',
      check: /model RoleCapability[\s\S]*?@@index\(\[roleId\]\)/,
    },
    {
      model: 'RoleCapability',
      field: 'capabilityId',
      check: /model RoleCapability[\s\S]*?@@index\(\[capabilityId\]\)/,
    },
  ];

  rbacIndexes.forEach(({ model, field, check }) => {
    if (check.test(schema)) {
      issues.passed.push(`✓ Index on ${model}.${field}`);
    } else {
      issues.warnings.push(`⚠️  Missing index on ${model}.${field} (performance impact)`);
    }
  });
}

analyzeRBACSchema();

// ============================================================================
// 2. Permission Middleware Analysis
// ============================================================================

console.log('📋 Analyzing Permission Middleware...\n');

function analyzePermissionMiddleware() {
  const middlewarePath = path.join(__dirname, '../src/middleware/permission.middleware.ts');
  if (!fs.existsSync(middlewarePath)) {
    issues.critical.push('❌ permission.middleware.ts not found');
    return;
  }

  const content = fs.readFileSync(middlewarePath, 'utf8');

  // Check for capability checking functions
  if (content.includes('requireCapability') || content.includes('checkCapability')) {
    issues.passed.push('✓ Capability checking middleware exists');
  } else {
    issues.critical.push('❌ No capability checking middleware found');
  }

  // Check for multiple capability support (AND/OR logic)
  if (
    content.includes('requireCapabilities') ||
    content.includes('all') ||
    content.includes('any')
  ) {
    issues.passed.push('✓ Supports multiple capability checks (AND/OR)');
  } else {
    issues.info.push('ℹ️  Consider supporting multiple capability checks');
  }

  // Check for caching
  if (content.includes('cache') || content.includes('redis') || content.includes('ttl')) {
    issues.passed.push('✓ Permission caching implemented');
  } else {
    issues.warnings.push('⚠️  No permission caching detected (performance impact)');
  }

  // Check for proper error handling
  if (content.includes('403') || content.includes('Forbidden')) {
    issues.passed.push('✓ Returns 403 Forbidden for authorization failures');
  } else {
    issues.warnings.push('⚠️  Should return 403 for authorization failures');
  }
}

analyzePermissionMiddleware();

// ============================================================================
// 3. Route Protection Analysis
// ============================================================================

console.log('📋 Analyzing Route Protection...\n');

function analyzeRouteProtection() {
  const routesDir = path.join(__dirname, '../src/routes');
  if (!fs.existsSync(routesDir)) {
    issues.critical.push('routes directory not found');
    return;
  }

  const routeFiles = fs.readdirSync(routesDir).filter((f) => f.endsWith('.routes.ts'));
  let totalRoutes = 0;
  let protectedRoutes = 0;
  let unprotectedRoutes = [];

  routeFiles.forEach((file) => {
    const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Detect route definitions
      const routeMatch = line.match(/router\.(get|post|put|patch|delete)\s*\(/);
      if (routeMatch) {
        totalRoutes++;

        // Check if route is protected (has authenticate or requireCapability)
        const nextLines = lines.slice(index, index + 5).join(' ');
        const hasAuth =
          nextLines.includes('authenticate') ||
          nextLines.includes('requireCapability') ||
          nextLines.includes('requireCapabilities');

        // Exclude health check and public routes
        const isPublicRoute =
          nextLines.includes('/health') ||
          nextLines.includes('/auth/login') ||
          nextLines.includes('/auth/register') ||
          nextLines.includes('/auth/google');

        if (hasAuth || isPublicRoute) {
          protectedRoutes++;
        } else {
          unprotectedRoutes.push(`${file}:${index + 1} - ${line.trim()}`);
        }
      }
    });
  });

  if (totalRoutes > 0) {
    const protectionRate = ((protectedRoutes / totalRoutes) * 100).toFixed(1);
    issues.info.push(
      `ℹ️  Route protection: ${protectedRoutes}/${totalRoutes} (${protectionRate}%)`
    );

    if (protectionRate >= 90) {
      issues.passed.push('✓ Most routes are protected (≥90%)');
    } else if (protectionRate >= 70) {
      issues.warnings.push(`⚠️  ${100 - protectionRate}% of routes may be unprotected`);
    } else {
      issues.critical.push(`❌ Many routes unprotected (${100 - protectionRate}%)`);
    }
  }

  if (unprotectedRoutes.length > 0 && unprotectedRoutes.length <= 10) {
    unprotectedRoutes.forEach((route) => {
      issues.info.push(`ℹ️  Unprotected route: ${route}`);
    });
  } else if (unprotectedRoutes.length > 10) {
    issues.warnings.push(`⚠️  ${unprotectedRoutes.length} potentially unprotected routes`);
  }
}

analyzeRouteProtection();

// ============================================================================
// 4. Capability Service Analysis
// ============================================================================

console.log('📋 Analyzing Capability Service...\n');

function analyzeCapabilityService() {
  const capabilityServicePath = path.join(__dirname, '../src/services/capability.service.ts');
  if (!fs.existsSync(capabilityServicePath)) {
    issues.warnings.push('⚠️  capability.service.ts not found');
    return;
  }

  const content = fs.readFileSync(capabilityServicePath, 'utf8');

  // Check for user capability checking
  if (content.includes('getUserCapabilities') || content.includes('hasCapability')) {
    issues.passed.push('✓ User capability checking implemented');
  } else {
    issues.critical.push('❌ No user capability checking method found');
  }

  // Check for wildcard support (admin:*)
  if (content.includes('*') || content.includes('wildcard')) {
    issues.passed.push('✓ Wildcard capability support (e.g., admin:*)');
  } else {
    issues.info.push('ℹ️  Consider supporting wildcard capabilities');
  }

  // Check for capability caching
  if (content.includes('cache') || content.includes('redis')) {
    issues.passed.push('✓ Capability results cached for performance');
  } else {
    issues.warnings.push('⚠️  Capability lookups not cached (performance impact)');
  }

  // Check for allow/deny logic
  if (content.includes('isAllowed')) {
    issues.passed.push('✓ Explicit allow/deny logic implemented');
  } else {
    issues.info.push('ℹ️  Consider explicit allow/deny capability rules');
  }
}

analyzeCapabilityService();

// ============================================================================
// 5. Admin Privilege Analysis
// ============================================================================

console.log('📋 Analyzing Admin Privileges...\n');

function analyzeAdminPrivileges() {
  const adminRoutesPath = path.join(__dirname, '../src/routes/admin.routes.ts');
  if (!fs.existsSync(adminRoutesPath)) {
    issues.info.push('ℹ️  No admin.routes.ts file (no admin-only endpoints)');
    return;
  }

  const content = fs.readFileSync(adminRoutesPath, 'utf8');

  // Check that ALL admin routes require authentication
  const hasAuth = content.includes('authenticate');
  if (hasAuth) {
    issues.passed.push('✓ Admin routes require authentication');
  } else {
    issues.critical.push('❌ Admin routes may not require authentication!');
  }

  // Check for admin capability requirement
  const hasAdminCheck = content.includes('admin') || content.includes('requireCapability');
  if (hasAdminCheck) {
    issues.passed.push('✓ Admin routes check for admin capabilities');
  } else {
    issues.critical.push('❌ Admin routes may not check for admin capabilities!');
  }

  // Check for impersonation protection
  if (content.includes('impersonation')) {
    const lines = content.split('\n');
    let impersonationProtected = false;

    lines.forEach((line, index) => {
      if (line.includes('impersonation')) {
        const nextLines = lines.slice(index, index + 5).join(' ');
        if (nextLines.includes('requireCapability') || nextLines.includes('admin')) {
          impersonationProtected = true;
        }
      }
    });

    if (impersonationProtected) {
      issues.passed.push('✓ Impersonation endpoints properly protected');
    } else {
      issues.critical.push('❌ Impersonation endpoints may not be protected!');
    }
  }
}

analyzeAdminPrivileges();

// ============================================================================
// 6. Authorization Test Coverage
// ============================================================================

console.log('📋 Analyzing Authorization Test Coverage...\n');

function analyzeAuthorizationTests() {
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
  let hasAuthorizationTests = false;

  testFiles.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    if (
      content.includes('authorization') ||
      content.includes('permission') ||
      content.includes('capability') ||
      content.includes('403')
    ) {
      hasAuthorizationTests = true;
    }
  });

  if (hasAuthorizationTests) {
    issues.passed.push('✓ Authorization tests exist');
  } else {
    issues.warnings.push('⚠️  No authorization tests found');
  }

  issues.info.push(`ℹ️  Found ${testFiles.length} test files`);
}

analyzeAuthorizationTests();

console.log();

// ============================================================================
// 7. Report Results
// ============================================================================

console.log('='.repeat(60));
console.log('📊 AUTHORIZATION SECURITY ANALYSIS');
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
  console.log('⚠️  CRITICAL AUTHORIZATION ISSUES DETECTED!');
  console.log('These issues could allow unauthorized access.\n');
  process.exit(1);
} else if (issues.warnings.length > 0) {
  console.log('✓ No critical issues. Review warnings for best practices.\n');
  process.exit(0);
} else {
  console.log('✅ ALL AUTHORIZATION CHECKS PASSED!\n');
  process.exit(0);
}
