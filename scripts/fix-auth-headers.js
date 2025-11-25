#!/usr/bin/env node
/**
 * Bulk fix authentication headers across all web app files
 *
 * This script:
 * 1. Finds all files using getAuthHeaders
 * 2. Replaces getAuthHeaders with fetchWithAuth
 * 3. Updates fetch() calls to use fetchWithAuth() instead
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Finding files with getAuthHeaders...\n');

// Get list of files with getAuthHeaders
const grepOutput = execSync(
  'grep -rl "getAuthHeaders" apps/web/src/app apps/web/src/contexts apps/web/src/hooks 2>/dev/null || true',
  { encoding: 'utf-8' }
);

const files = grepOutput
  .split('\n')
  .filter((f) => f.trim() && f.endsWith('.tsx') || f.endsWith('.ts'));

console.log(`Found ${files.length} files to fix:\n`);
files.forEach((f) => console.log(`  - ${f}`));
console.log('');

let totalChanges = 0;

files.forEach((filePath) => {
  console.log(`📝 Processing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf-8');
  let changes = 0;

  // 1. Replace import/destructuring of getAuthHeaders with fetchWithAuth
  const getAuthHeadersPattern = /const\s*\{\s*([^}]*?)getAuthHeaders([^}]*?)\}\s*=\s*useAuth\(\)/g;
  const newContent = content.replace(getAuthHeadersPattern, (match, before, after) => {
    changes++;
    // Remove getAuthHeaders and any comma/whitespace around it
    let newBefore = before.replace(/,\s*$/, '').trim();
    let newAfter = after.replace(/^\s*,/, '').trim();

    // Build the new destructuring
    let parts = [];
    if (newBefore) parts.push(newBefore);
    parts.push('fetchWithAuth');
    if (newAfter) parts.push(newAfter);

    return `const { ${parts.join(', ')} } = useAuth()`;
  });

  content = newContent;

  // 2. Replace fetch calls with getAuthHeaders()
  // Pattern: fetch(url, { ...headers: getAuthHeaders(), ... })
  const fetchPattern1 = /fetch\s*\(\s*([^,]+),\s*\{\s*method:\s*['"]GET['"]\s*,\s*headers:\s*getAuthHeaders\(\)\s*,?\s*\}\s*\)/g;
  content = content.replace(fetchPattern1, (match, url) => {
    changes++;
    return `fetchWithAuth(${url})`;
  });

  // Pattern: fetch(url, { headers: getAuthHeaders() })
  const fetchPattern2 = /fetch\s*\(\s*([^,]+),\s*\{\s*headers:\s*getAuthHeaders\(\)\s*,?\s*\}\s*\)/g;
  content = content.replace(fetchPattern2, (match, url) => {
    changes++;
    return `fetchWithAuth(${url})`;
  });

  // Pattern: fetch(url, { method: 'POST', headers: getAuthHeaders(), body })
  const fetchPattern3 = /fetch\s*\(\s*([^,]+),\s*\{\s*method:\s*['"](\w+)['"]\s*,\s*headers:\s*getAuthHeaders\(\)\s*,\s*body:/g;
  content = content.replace(fetchPattern3, (match, url, method) => {
    changes++;
    return `fetchWithAuth(${url}, { method: '${method}', body:`;
  });

  // Pattern: fetch(url, { method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': ... }, body })
  const fetchPattern4 = /fetch\s*\(\s*([^,]+),\s*\{\s*method:\s*['"](\w+)['"]\s*,\s*headers:\s*\{\s*\.\.\.getAuthHeaders\(\)\s*,\s*(['"]Content-Type['"]:\s*['"][^'"]+['"])\s*\}\s*,\s*body:/g;
  content = content.replace(fetchPattern4, (match, url, method, contentType) => {
    changes++;
    return `fetchWithAuth(${url}, { method: '${method}', headers: { ${contentType} }, body:`;
  });

  // Pattern: headers: { ...getAuthHeaders(), ... }
  const fetchPattern5 = /headers:\s*\{\s*\.\.\.getAuthHeaders\(\)\s*,\s*/g;
  content = content.replace(fetchPattern5, () => {
    changes++;
    return 'headers: { ';
  });

  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✅ Made ${changes} changes`);
    totalChanges += changes;
  } else {
    console.log(`  ⚠️  No changes made (manual review needed)`);
  }
  console.log('');
});

console.log(`\n✨ Complete! Made ${totalChanges} changes across ${files.length} files.\n`);
console.log('⚠️  Please review changes and test thoroughly before committing.\n');
