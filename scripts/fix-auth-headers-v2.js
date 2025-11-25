#!/usr/bin/env node
/**
 * Bulk fix authentication headers - Version 2
 * Catches additional patterns missed by v1
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 Finding remaining files with getAuthHeaders...\n');

const grepOutput = execSync(
  'grep -rl "getAuthHeaders" apps/web/src 2>/dev/null || true',
  { encoding: 'utf-8' }
);

const files = grepOutput
  .split('\n')
  .filter((f) => f.trim() && (f.endsWith('.tsx') || f.endsWith('.ts')) && !f.includes('AuthContext.tsx'));

console.log(`Found ${files.length} files to fix:\n`);
files.forEach((f) => console.log(`  - ${f}`));
console.log('');

let totalChanges = 0;

files.forEach((filePath) => {
  console.log(`📝 Processing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf-8');
  let changes = 0;

  // Pattern: fetch(url, { method: 'ANY', headers: getAuthHeaders() })
  const pattern1 = /fetch\s*\(\s*([^,]+),\s*\{\s*method:\s*['"](\w+)['"]\s*,\s*headers:\s*getAuthHeaders\(\)\s*,?\s*\}\s*\)/g;
  content = content.replace(pattern1, (match, url, method) => {
    changes++;
    return `fetchWithAuth(${url}, { method: '${method}' })`;
  });

  // Pattern: { method: 'ANY', headers: getAuthHeaders(), }  (multiline)
  const pattern2 = /\{\s*method:\s*['"](\w+)['"]\s*,\s*headers:\s*getAuthHeaders\(\)\s*,?\s*\}/g;
  content = content.replace(pattern2, (match, method) => {
    changes++;
    return `{ method: '${method}' }`;
  });

  // Pattern: standalone headers: getAuthHeaders() in object
  const pattern3 = /headers:\s*getAuthHeaders\(\)\s*,/g;
  content = content.replace(pattern3, () => {
    changes++;
    return '';
  });

  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✅ Made ${changes} changes`);
    totalChanges += changes;
  } else {
    console.log(`  ⏭️  No changes needed`);
  }
  console.log('');
});

console.log(`\n✨ Complete! Made ${totalChanges} additional changes across ${files.length} files.\n`);
