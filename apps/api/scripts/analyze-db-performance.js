#!/usr/bin/env node
/**
 * Database Performance Analysis Script
 *
 * Analyzes Prisma schemas and service code for performance issues
 * without requiring running database services.
 *
 * Usage: node scripts/analyze-db-performance.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Database Performance Analysis');
console.log('='.repeat(60));
console.log();

const issues = {
  critical: [],
  warnings: [],
  suggestions: [],
};

// ============================================================================
// 1. Analyze Prisma Schemas
// ============================================================================

console.log('📋 Analyzing Prisma Schemas...\n');

function analyzeSchema(schemaPath, schemaName) {
  if (!fs.existsSync(schemaPath)) {
    issues.warnings.push(`Schema file not found: ${schemaPath}`);
    return;
  }

  const schema = fs.readFileSync(schemaPath, 'utf8');
  const lines = schema.split('\n');

  console.log(`  ${schemaName}:`);

  // Find all models
  const models = [];
  let currentModel = null;
  let braceDepth = 0;

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Detect model start
    if (trimmed.startsWith('model ')) {
      currentModel = {
        name: trimmed.split(' ')[1],
        startLine: index + 1,
        fields: [],
        indexes: [],
        relations: [],
      };
      models.push(currentModel);
      braceDepth = 0;
    }

    if (currentModel) {
      // Track braces
      if (line.includes('{')) braceDepth++;
      if (line.includes('}')) braceDepth--;

      // Model ended
      if (braceDepth === 0 && line.includes('}')) {
        currentModel = null;
        return;
      }

      // Parse fields
      if (
        trimmed &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('model') &&
        !trimmed.startsWith('@@')
      ) {
        const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)/);
        if (fieldMatch) {
          const [, fieldName, fieldType] = fieldMatch;
          currentModel.fields.push({
            name: fieldName,
            type: fieldType,
            line: index + 1,
            isRelation:
              fieldType[0] === fieldType[0].toUpperCase() &&
              !['String', 'Int', 'Boolean', 'DateTime', 'Float'].includes(fieldType),
            isArray: trimmed.includes('[]'),
            hasInlineIndex: trimmed.includes('@index') || trimmed.includes('@unique'),
          });

          // Track relations (foreign keys)
          if (fieldName.endsWith('Id')) {
            currentModel.relations.push({
              field: fieldName,
              line: index + 1,
              hasInlineIndex: trimmed.includes('@index') || trimmed.includes('@unique'),
            });
          }
        }
      }

      // Parse model-level indexes
      if (trimmed.startsWith('@@index') || trimmed.startsWith('@@unique')) {
        const indexMatch = trimmed.match(/@@(?:index|unique)\(\[(\w+)\]\)/);
        if (indexMatch) {
          currentModel.indexes.push({
            field: indexMatch[1],
            definition: trimmed,
            line: index + 1,
          });
        }
      }
    }
  });

  // Analyze each model
  models.forEach((model) => {
    // Check for missing indexes on foreign keys
    model.relations.forEach((rel) => {
      // Check if field has inline index or is covered by model-level index
      const hasModelLevelIndex = model.indexes.some((idx) => idx.field === rel.field);
      const hasIndex = rel.hasInlineIndex || hasModelLevelIndex;

      if (!hasIndex) {
        issues.critical.push(
          `${schemaName}:${rel.line} - Missing index on foreign key: ${model.name}.${rel.field}`
        );
      }
    });

    // Check for models without soft delete support
    const hasSoftDelete = model.fields.some((f) => f.name === 'deletedAt');
    if (!hasSoftDelete && !['RefreshToken', 'ImpersonationSession'].includes(model.name)) {
      issues.suggestions.push(
        `${schemaName} - Consider adding soft delete to model: ${model.name}`
      );
    }

    // Check for timestamp fields
    const hasCreatedAt = model.fields.some((f) => f.name === 'createdAt');
    const hasUpdatedAt = model.fields.some((f) => f.name === 'updatedAt');
    if (!hasCreatedAt || !hasUpdatedAt) {
      issues.warnings.push(`${schemaName} - Missing timestamp fields in model: ${model.name}`);
    }

    // Check for array fields (potential N+1 issues)
    const arrayFields = model.fields.filter((f) => f.isArray && f.isRelation);
    if (arrayFields.length > 0) {
      arrayFields.forEach((field) => {
        issues.suggestions.push(
          `${schemaName}:${field.line} - Array relation ${model.name}.${field.name} - ensure using 'include' efficiently`
        );
      });
    }
  });

  console.log(`    ✓ Analyzed ${models.length} models`);
}

// Analyze both schemas
analyzeSchema(path.join(__dirname, '../prisma/schema-main.prisma'), 'schema-main.prisma');
analyzeSchema(path.join(__dirname, '../prisma/schema-client.prisma'), 'schema-client.prisma');

console.log();

// ============================================================================
// 2. Analyze Service Code for N+1 Queries
// ============================================================================

console.log('📋 Analyzing Services for N+1 Query Patterns...\n');

function analyzeServiceFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const fileName = path.basename(filePath);

  // Check for potential N+1 patterns
  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Pattern 1: forEach with database query inside
    if (
      line.includes('forEach') &&
      content.slice(0, content.indexOf(line)).lastIndexOf('.findMany') > -1
    ) {
      const nextLines = lines.slice(index, index + 10).join(' ');
      if (nextLines.includes('prisma') || nextLines.includes('await')) {
        issues.warnings.push(
          `${fileName}:${lineNum} - Potential N+1: forEach loop with database query`
        );
      }
    }

    // Pattern 2: findMany without include for related data
    if (line.includes('findMany') && !line.includes('include')) {
      const nextLines = lines.slice(index, index + 5).join(' ');
      if (!nextLines.includes('include:') && !nextLines.includes('select:')) {
        issues.suggestions.push(
          `${fileName}:${lineNum} - Consider using 'include' or 'select' with findMany`
        );
      }
    }

    // Pattern 3: Multiple sequential queries
    const awaitCount = lines
      .slice(Math.max(0, index - 5), index + 5)
      .filter((l) => l.includes('await prisma')).length;
    if (awaitCount >= 3 && line.includes('await prisma')) {
      issues.warnings.push(
        `${fileName}:${lineNum} - Multiple sequential queries detected - consider using Promise.all()`
      );
    }
  });
}

// Analyze all service files
const servicesDir = path.join(__dirname, '../src/services');
if (fs.existsSync(servicesDir)) {
  const serviceFiles = fs.readdirSync(servicesDir).filter((f) => f.endsWith('.service.ts'));

  serviceFiles.forEach((file) => {
    analyzeServiceFile(path.join(servicesDir, file));
  });

  console.log(`  ✓ Analyzed ${serviceFiles.length} service files`);
}

console.log();

// ============================================================================
// 3. Check for Connection Pooling Configuration
// ============================================================================

console.log('📋 Checking Database Configuration...\n');

const envExample = path.join(__dirname, '../.env.example');
if (fs.existsSync(envExample)) {
  const envContent = fs.readFileSync(envExample, 'utf8');

  // Check for connection pool configuration
  if (!envContent.includes('connection_limit')) {
    issues.suggestions.push(
      '.env.example - Consider adding connection pool size to DATABASE_URL (e.g., ?connection_limit=10)'
    );
  }

  // Check for statement cache size
  if (!envContent.includes('statement_cache_size')) {
    issues.suggestions.push(
      '.env.example - Consider adding statement_cache_size to DATABASE_URL for better performance'
    );
  }

  console.log('  ✓ Environment configuration checked');
}

console.log();

// ============================================================================
// 4. Report Results
// ============================================================================

console.log('='.repeat(60));
console.log('📊 ANALYSIS RESULTS');
console.log('='.repeat(60));
console.log();

if (issues.critical.length > 0) {
  console.log('🔴 CRITICAL ISSUES:');
  issues.critical.forEach((issue) => console.log(`  - ${issue}`));
  console.log();
}

if (issues.warnings.length > 0) {
  console.log('🟡 WARNINGS:');
  issues.warnings.forEach((issue) => console.log(`  - ${issue}`));
  console.log();
}

if (issues.suggestions.length > 0) {
  console.log('💡 SUGGESTIONS:');
  issues.suggestions.forEach((issue) => console.log(`  - ${issue}`));
  console.log();
}

// Summary
const totalIssues = issues.critical.length + issues.warnings.length + issues.suggestions.length;

if (totalIssues === 0) {
  console.log('✅ No performance issues detected!\n');
  process.exit(0);
} else {
  console.log('='.repeat(60));
  console.log(
    `Found ${issues.critical.length} critical, ${issues.warnings.length} warnings, ${issues.suggestions.length} suggestions`
  );
  console.log('='.repeat(60));
  console.log();

  if (issues.critical.length > 0) {
    console.log('⚠️  Please address critical issues before deploying to production.\n');
    process.exit(1);
  } else {
    console.log('✓ No critical issues. Review warnings and suggestions for optimization.\n');
    process.exit(0);
  }
}
