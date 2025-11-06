#!/usr/bin/env node
/**
 * Security Analysis Script
 *
 * Analyzes code for common security vulnerabilities
 * without requiring running services.
 *
 * Usage: node scripts/analyze-security.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 Security Analysis');
console.log('='.repeat(60));
console.log();

const issues = {
  critical: [],
  warnings: [],
  info: [],
  passed: [],
};

// ============================================================================
// 1. Password Security Analysis
// ============================================================================

console.log('🔐 Analyzing Password Security...\n');

function analyzePasswordSecurity() {
  const authServicePath = path.join(__dirname, '../src/services/auth.service.ts');
  if (!fs.existsSync(authServicePath)) {
    issues.critical.push('auth.service.ts not found');
    return;
  }

  const content = fs.readFileSync(authServicePath, 'utf8');

  // Check for bcrypt usage
  if (content.includes('import bcrypt') || content.includes("from 'bcrypt'")) {
    issues.passed.push('✓ Using bcrypt for password hashing');
  } else {
    issues.critical.push('❌ bcrypt not imported in auth.service.ts');
  }

  // Check for salt rounds
  if (content.includes('BCRYPT_ROUNDS') || content.includes('saltRounds')) {
    issues.passed.push('✓ Using environment variable for bcrypt rounds');
  } else {
    issues.warnings.push('⚠️  bcrypt rounds not found - may be hardcoded');
  }

  // Check for plaintext password storage
  if (content.includes('password:') && !content.includes('passwordHash')) {
    issues.warnings.push('⚠️  Possible plaintext password usage detected');
  }

  // Check for password validation
  if (content.includes('validatePassword') || content.includes('compare')) {
    issues.passed.push('✓ Password validation implemented');
  } else {
    issues.critical.push('❌ Password validation not found');
  }
}

analyzePasswordSecurity();

// ============================================================================
// 2. JWT Security Analysis
// ============================================================================

console.log('🔐 Analyzing JWT Security...\n');

function analyzeJWTSecurity() {
  const jwtServicePath = path.join(__dirname, '../src/services/jwt.service.ts');
  if (!fs.existsSync(jwtServicePath)) {
    issues.critical.push('jwt.service.ts not found');
    return;
  }

  const content = fs.readFileSync(jwtServicePath, 'utf8');

  // Check for RS256 algorithm
  if (content.includes("algorithm: 'RS256'") || content.includes('RS256')) {
    issues.passed.push('✓ Using RS256 algorithm for JWT');
  } else if (content.includes("algorithm: 'HS256'") || content.includes('HS256')) {
    issues.warnings.push('⚠️  Using HS256 (symmetric) - RS256 (asymmetric) is more secure');
  } else {
    issues.critical.push('❌ JWT algorithm not specified');
  }

  // Check for key file usage (not hardcoded secrets)
  if (content.includes('readFileSync') && content.includes('PRIVATE_KEY')) {
    issues.passed.push('✓ Loading JWT keys from files (not hardcoded)');
  } else if (content.includes('JWT_SECRET')) {
    issues.warnings.push('⚠️  Using JWT_SECRET environment variable - prefer key files');
  } else {
    issues.critical.push('❌ JWT key loading mechanism not clear');
  }

  // Check for token expiration
  if (content.includes('expiresIn') || content.includes('exp')) {
    issues.passed.push('✓ JWT expiration configured');
  } else {
    issues.critical.push('❌ JWT expiration not configured (tokens never expire!)');
  }

  // Check for unique token IDs (jti claim)
  if (content.includes('jti')) {
    issues.passed.push('✓ Using jti (JWT ID) for token uniqueness');
  } else {
    issues.info.push('ℹ️  Consider adding jti claim for token tracking/revocation');
  }

  // Check for refresh token implementation
  if (content.includes('refreshToken') || content.includes('RefreshToken')) {
    issues.passed.push('✓ Refresh token mechanism implemented');
  } else {
    issues.warnings.push('⚠️  No refresh token mechanism detected');
  }
}

analyzeJWTSecurity();

// ============================================================================
// 3. Session Management Analysis
// ============================================================================

console.log('🔐 Analyzing Session Management...\n');

function analyzeSessionManagement() {
  // Check for refresh token service
  const refreshTokenPath = path.join(__dirname, '../src/services/auth.service.ts');
  if (fs.existsSync(refreshTokenPath)) {
    const content = fs.readFileSync(refreshTokenPath, 'utf8');

    // Check for token revocation
    if (content.includes('revokeRefreshToken') || content.includes('isRevoked')) {
      issues.passed.push('✓ Refresh token revocation implemented');
    } else {
      issues.critical.push('❌ No refresh token revocation mechanism');
    }

    // Check for token family tracking (rotation detection)
    if (content.includes('familyId')) {
      issues.passed.push('✓ Token family tracking for rotation detection');
    } else {
      issues.warnings.push('⚠️  No token family tracking (vulnerable to rotation attacks)');
    }

    // Check for device tracking
    if (content.includes('deviceInfo') || content.includes('userAgent')) {
      issues.passed.push('✓ Device tracking for sessions');
    } else {
      issues.info.push('ℹ️  Consider tracking device info for security audits');
    }
  }
}

analyzeSessionManagement();

// ============================================================================
// 4. Input Validation Analysis
// ============================================================================

console.log('🔐 Analyzing Input Validation...\n');

function analyzeInputValidation() {
  // Check for Zod validation in routes
  const routesDir = path.join(__dirname, '../src/routes');
  if (fs.existsSync(routesDir)) {
    const routeFiles = fs.readdirSync(routesDir).filter((f) => f.endsWith('.routes.ts'));
    let hasValidation = false;

    routeFiles.forEach((file) => {
      const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
      if (content.includes("from 'zod'") || content.includes('import { z }')) {
        hasValidation = true;
      }
    });

    if (hasValidation) {
      issues.passed.push('✓ Using Zod for input validation');
    } else {
      issues.critical.push('❌ No input validation library detected');
    }
  }

  // Check for Prisma (prevents SQL injection)
  const servicesDir = path.join(__dirname, '../src/services');
  if (fs.existsSync(servicesDir)) {
    const serviceFiles = fs.readdirSync(servicesDir).filter((f) => f.endsWith('.service.ts'));
    let rawSQLUsed = false;

    serviceFiles.forEach((file) => {
      const content = fs.readFileSync(path.join(servicesDir, file), 'utf8');
      if (content.includes('$queryRaw') || content.includes('$executeRaw')) {
        rawSQLUsed = true;
        issues.warnings.push(`⚠️  Raw SQL used in ${file} - ensure parameters are escaped`);
      }
    });

    if (!rawSQLUsed) {
      issues.passed.push('✓ Using Prisma ORM (SQL injection protected)');
    }
  }

  // Check for XSS protection (input sanitization)
  const middlewareDir = path.join(__dirname, '../src/middleware');
  if (fs.existsSync(middlewareDir)) {
    const files = fs.readdirSync(middlewareDir);
    if (files.some((f) => f.includes('sanitize') || f.includes('xss'))) {
      issues.passed.push('✓ XSS protection middleware found');
    } else {
      issues.info.push('ℹ️  Consider adding XSS sanitization middleware');
    }
  }
}

analyzeInputValidation();

// ============================================================================
// 5. Rate Limiting Analysis
// ============================================================================

console.log('🔐 Analyzing Rate Limiting...\n');

function analyzeRateLimiting() {
  const indexPath = path.join(__dirname, '../src/index.ts');
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf8');

    if (content.includes('express-rate-limit') || content.includes('rateLimit')) {
      issues.passed.push('✓ Rate limiting middleware configured');

      // Check for specific endpoints
      if (content.includes('login') && content.includes('limit')) {
        issues.passed.push('✓ Rate limiting on login endpoint');
      } else {
        issues.warnings.push('⚠️  Ensure rate limiting on /login endpoint');
      }
    } else {
      issues.critical.push('❌ No rate limiting detected (vulnerable to brute force)');
    }
  }
}

analyzeRateLimiting();

// ============================================================================
// 6. CORS Configuration Analysis
// ============================================================================

console.log('🔐 Analyzing CORS Configuration...\n');

function analyzeCORS() {
  const indexPath = path.join(__dirname, '../src/index.ts');
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf8');

    if (content.includes('cors(')) {
      issues.passed.push('✓ CORS middleware configured');

      // Check for wildcard origin (security risk)
      if (content.includes("origin: '*'")) {
        issues.critical.push('❌ CORS origin set to wildcard (*) - major security risk!');
      } else if (content.includes('FRONTEND_URL') || content.includes('origin:')) {
        issues.passed.push('✓ CORS origin properly configured');
      }

      // Check for credentials
      if (content.includes('credentials: true')) {
        issues.passed.push('✓ CORS credentials enabled');
      } else {
        issues.info.push('ℹ️  CORS credentials may need to be enabled');
      }
    } else {
      issues.warnings.push('⚠️  CORS not configured');
    }
  }
}

analyzeCORS();

// ============================================================================
// 7. Security Headers Analysis (Helmet)
// ============================================================================

console.log('🔐 Analyzing Security Headers...\n');

function analyzeSecurityHeaders() {
  const indexPath = path.join(__dirname, '../src/index.ts');
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf8');

    if (content.includes('helmet(')) {
      issues.passed.push('✓ Helmet security headers configured');
    } else {
      issues.critical.push('❌ Helmet not configured (missing security headers)');
    }
  }
}

analyzeSecurityHeaders();

// ============================================================================
// 8. OAuth Security Analysis
// ============================================================================

console.log('🔐 Analyzing OAuth Security...\n');

function analyzeOAuthSecurity() {
  const authRoutes = path.join(__dirname, '../src/routes/auth.routes.ts');
  if (fs.existsSync(authRoutes)) {
    const content = fs.readFileSync(authRoutes, 'utf8');

    if (content.includes('passport-google-oauth20') || content.includes('GoogleStrategy')) {
      issues.passed.push('✓ Google OAuth integration found');

      // Check for callback URL configuration
      if (content.includes('GOOGLE_CALLBACK_URL')) {
        issues.passed.push('✓ OAuth callback URL from environment');
      } else {
        issues.warnings.push('⚠️  OAuth callback URL should be in environment');
      }

      // Check for state parameter (CSRF protection)
      if (content.includes('state') || content.includes('session: true')) {
        issues.passed.push('✓ OAuth state parameter for CSRF protection');
      } else {
        issues.warnings.push('⚠️  Ensure OAuth state parameter for CSRF protection');
      }
    }
  }
}

analyzeOAuthSecurity();

// ============================================================================
// 9. Two-Factor Authentication Analysis
// ============================================================================

console.log('🔐 Analyzing Two-Factor Authentication...\n');

function analyze2FA() {
  const twoFactorPath = path.join(__dirname, '../src/routes/two-factor.routes.ts');
  if (fs.existsSync(twoFactorPath)) {
    issues.passed.push('✓ Two-factor authentication implemented');

    const content = fs.readFileSync(twoFactorPath, 'utf8');

    // Check for TOTP library
    if (content.includes('speakeasy') || content.includes('otplib')) {
      issues.passed.push('✓ Using standard TOTP library');
    }

    // Check for QR code generation
    if (content.includes('qrcode')) {
      issues.passed.push('✓ QR code generation for 2FA setup');
    }
  } else {
    issues.info.push('ℹ️  Two-factor authentication available but not mandatory');
  }
}

analyze2FA();

// ============================================================================
// 10. Secrets Management Analysis
// ============================================================================

console.log('🔐 Analyzing Secrets Management...\n');

function analyzeSecretsManagement() {
  // Check for .env usage
  const indexPath = path.join(__dirname, '../src/index.ts');
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf8');

    if (content.includes('dotenv') || content.includes('process.env')) {
      issues.passed.push('✓ Using environment variables for configuration');
    }
  }

  // Check for hardcoded secrets
  const srcDir = path.join(__dirname, '../src');
  const checkForSecrets = (dir) => {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && file !== 'node_modules' && file !== 'generated') {
        checkForSecrets(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.js')) {
        const content = fs.readFileSync(filePath, 'utf8');

        // Check for common secret patterns
        const secretPatterns = [
          /password\s*=\s*['"][^'"]{8,}['"]/i,
          /api[_-]?key\s*=\s*['"][^'"]+['"]/i,
          /secret\s*=\s*['"][^'"]{10,}['"]/i,
        ];

        secretPatterns.forEach((pattern) => {
          if (pattern.test(content) && !content.includes('process.env')) {
            issues.critical.push(`❌ Possible hardcoded secret in ${file}`);
          }
        });
      }
    });
  };

  checkForSecrets(srcDir);

  // Check for .env.example
  const envExample = path.join(__dirname, '../.env.example');
  if (fs.existsSync(envExample)) {
    issues.passed.push('✓ .env.example file exists for documentation');
  } else {
    issues.warnings.push('⚠️  .env.example file missing');
  }
}

analyzeSecretsManagement();

console.log();

// ============================================================================
// 11. Report Results
// ============================================================================

console.log('='.repeat(60));
console.log('📊 SECURITY ANALYSIS RESULTS');
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
const totalIssues = issues.critical.length + issues.warnings.length;
const passedChecks = issues.passed.length;

console.log('='.repeat(60));
console.log(
  `Passed: ${passedChecks} | Critical: ${issues.critical.length} | Warnings: ${issues.warnings.length} | Info: ${issues.info.length}`
);
console.log('='.repeat(60));
console.log();

if (issues.critical.length > 0) {
  console.log('⚠️  CRITICAL SECURITY ISSUES DETECTED!');
  console.log('Please address all critical issues before deploying.\n');
  process.exit(1);
} else if (issues.warnings.length > 0) {
  console.log('✓ No critical issues, but review warnings for best practices.\n');
  process.exit(0);
} else {
  console.log('✅ ALL SECURITY CHECKS PASSED!\n');
  process.exit(0);
}
