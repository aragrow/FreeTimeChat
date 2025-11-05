#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * Environment Setup Script
 *
 * This script helps developers set up their environment files by:
 * 1. Copying .env.example files to .env (or .env.local for Next.js)
 * 2. Generating secure random values for secrets
 * 3. Providing guidance on manual configuration
 *
 * Usage: node scripts/setup-env.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logBold(message, color = 'reset') {
  console.log(`${colors.bold}${colors[color]}${message}${colors.reset}`);
}

function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function copyEnvFile(source, dest, replacements = {}) {
  if (fs.existsSync(dest)) {
    log(`  ⚠️  ${path.basename(dest)} already exists, skipping...`, 'yellow');
    return false;
  }

  if (!fs.existsSync(source)) {
    log(`  ✗ ${path.basename(source)} not found`, 'red');
    return false;
  }

  let content = fs.readFileSync(source, 'utf8');

  // Apply replacements
  for (const [key, value] of Object.entries(replacements)) {
    content = content.replace(new RegExp(key, 'g'), value);
  }

  fs.writeFileSync(dest, content, 'utf8');
  log(`  ✓ Created ${path.basename(dest)}`, 'green');
  return true;
}

async function main() {
  console.log();
  logBold('========================================', 'blue');
  logBold('   FreeTimeChat Environment Setup', 'blue');
  logBold('========================================', 'blue');
  console.log();

  // Generate secrets
  log('Step 1: Generating Secrets...', 'cyan');
  console.log();

  const sessionSecret = generateSecret(32);
  log(`  Generated SESSION_SECRET: ${sessionSecret.substring(0, 16)}...`, 'green');
  console.log();

  // Set up API environment
  logBold('Step 2: Setting up API Environment...', 'cyan');
  console.log();

  const apiEnvSource = path.join(__dirname, '..', 'apps', 'api', '.env.example');
  const apiEnvDest = path.join(__dirname, '..', 'apps', 'api', '.env');

  copyEnvFile(apiEnvSource, apiEnvDest, {
    'your-session-secret-here-change-in-production-min-32-chars': sessionSecret,
  });
  console.log();

  // Set up Web environment
  logBold('Step 3: Setting up Web Environment...', 'cyan');
  console.log();

  const webEnvSource = path.join(__dirname, '..', 'apps', 'web', '.env.example');
  const webEnvDest = path.join(__dirname, '..', 'apps', 'web', '.env.local');

  copyEnvFile(webEnvSource, webEnvDest);
  console.log();

  // Next steps
  logBold('========================================', 'blue');
  logBold('   ✓ Setup Complete!', 'green');
  logBold('========================================', 'blue');
  console.log();

  log('Environment files created:', 'cyan');
  console.log('  - apps/api/.env');
  console.log('  - apps/web/.env.local');
  console.log();

  logBold('Next Steps:', 'yellow');
  console.log();

  log('1. Start Docker services:', 'cyan');
  console.log('   docker-compose up -d');
  console.log();

  log('2. Generate Prisma clients:', 'cyan');
  console.log('   cd apps/api && pnpm prisma:generate');
  console.log();

  log('3. Run database migrations:', 'cyan');
  console.log('   pnpm prisma:migrate:main');
  console.log('   pnpm prisma:migrate:client');
  console.log();

  log('4. Generate RSA keys for JWT (if not already generated):', 'cyan');
  console.log('   cd apps/api');
  console.log('   mkdir -p keys');
  console.log('   openssl genrsa -out keys/private.pem 2048');
  console.log('   openssl rsa -in keys/private.pem -pubout -out keys/public.pem');
  console.log();

  log('5. Configure Google OAuth (optional):', 'cyan');
  console.log('   - Visit: https://console.cloud.google.com');
  console.log('   - Create OAuth 2.0 credentials');
  console.log('   - Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in both .env files');
  console.log();

  log('6. Start development servers:', 'cyan');
  console.log('   pnpm dev');
  console.log();

  logBold('Documentation:', 'cyan');
  console.log('  - Docker: docker/README.md');
  console.log('  - Prisma: apps/api/prisma/README.md');
  console.log('  - Database: .claude/database.md');
  console.log();
}

// Run main function
main().catch((error) => {
  console.log();
  log(`✗ Error: ${error.message}`, 'red');
  console.log();
  process.exit(1);
});
