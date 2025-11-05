#!/usr/bin/env node

/**
 * FreeTimeChat Automated Commit Script
 *
 * This script:
 * 1. Analyzes all changes in the working directory
 * 2. Generates a detailed commit message with summary
 * 3. Creates the commit
 * 4. Pushes the commit to origin
 * 5. Automatically creates a new dev branch (dev-1, dev-2, etc.)
 *
 * Usage: node scripts/commit.js
 * Or add to package.json scripts: "commit": "node scripts/commit.js"
 */

const { execSync } = require('child_process');
const readline = require('readline');
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

function exec(command, silent = false) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: silent ? 'pipe' : undefined,
    }).trim();
  } catch (error) {
    if (!silent) throw error;
    return '';
  }
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logBold(message, color = 'reset') {
  console.log(`${colors.bold}${colors[color]}${message}${colors.reset}`);
}

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function checkForChanges() {
  try {
    exec('git diff-index --quiet HEAD --', true);
    return false; // No changes
  } catch {
    return true; // Has changes
  }
}

function getChangedFiles() {
  const all = exec('git diff --name-only HEAD', true).split('\n').filter(Boolean);
  const staged = exec('git diff --cached --name-only', true).split('\n').filter(Boolean);
  const unstaged = exec('git diff --name-only', true).split('\n').filter(Boolean);

  return { all, staged, unstaged };
}

function categorizeChanges(files) {
  return {
    frontend: files.filter(f => f.match(/apps\/web|components\/|app\//)).length,
    backend: files.filter(f => f.match(/apps\/api|services\/|routes\//)).length,
    config: files.filter(f => f.match(/package\.json|tsconfig|docker|\.env|pnpm-workspace/)).length,
    docs: files.filter(f => f.match(/\.md$|docs\/|\.claude\//)).length,
    tests: files.filter(f => f.match(/test|spec|__tests__/)).length,
    database: files.filter(f => f.match(/prisma\/|migrations\//)).length,
    scripts: files.filter(f => f.match(/scripts\//)).length,
  };
}

function determineCommitType(categories) {
  const { frontend, backend, docs, tests, config, database } = categories;

  if (tests > 0 && frontend === 0 && backend === 0) return 'test';
  if (docs > 0 && frontend === 0 && backend === 0 && config === 0) return 'docs';
  if (config > 0 && frontend === 0 && backend === 0 && docs === 0) return 'chore';
  if (database > 0) return 'feat';
  if (frontend > 0 || backend > 0) return 'feat';

  return 'chore';
}

function generateCommitTitle(type, categories, files) {
  const { frontend, backend, docs, config, database, scripts } = categories;

  let title = `${type}: `;

  if (docs > 0 && frontend === 0 && backend === 0 && config === 0) {
    const docFiles = files.filter(f => f.match(/\.md$/));
    if (docFiles.length === 1) {
      const docName = path.basename(docFiles[0], '.md');
      title += `update ${docName} documentation`;
    } else {
      title += 'update documentation';
    }
  } else if (config > 0 && frontend === 0 && backend === 0 && docs === 0) {
    title += 'update project configuration';
  } else if (database > 0) {
    title += 'update database schema';
  } else if (scripts > 0 && frontend === 0 && backend === 0) {
    title += 'update scripts';
  } else if (frontend > 0 && backend > 0) {
    title += 'update frontend and backend';
  } else if (frontend > 0) {
    title += 'update frontend components';
  } else if (backend > 0) {
    title += 'update backend services';
  } else {
    title += 'general updates';
  }

  return title;
}

function generateCommitDescription(files, categories, stats) {
  const total = files.length;
  const { frontend, backend, config, docs, tests, database, scripts } = categories;

  const description = `## Summary of Changes

This commit includes ${total} file(s) modified across the project.

### Changed Areas:
- Frontend: ${frontend} file(s)
- Backend: ${backend} file(s)
- Database: ${database} file(s)
- Configuration: ${config} file(s)
- Documentation: ${docs} file(s)
- Tests: ${tests} file(s)
- Scripts: ${scripts} file(s)

### Modified Files:
${files.map(f => `- ${f}`).join('\n')}

### Statistics:
\`\`\`
${stats}
\`\`\`

---
Generated automatically by FreeTimeChat commit workflow
`;

  return description;
}

function getNextDevBranch() {
  let num = 1;
  while (true) {
    try {
      exec(`git show-ref --verify refs/heads/dev-${num}`, true);
      num++;
    } catch {
      return `dev-${num}`;
    }
  }
}

async function main() {
  console.log();
  logBold('========================================', 'blue');
  logBold('   FreeTimeChat Automated Commit', 'blue');
  logBold('========================================', 'blue');
  console.log();

  // Check for changes
  if (!checkForChanges()) {
    log('✓ No changes to commit', 'yellow');
    console.log();
    process.exit(0);
  }

  // Step 1: Show current status
  logBold('Step 1: Current Status', 'cyan');
  console.log();
  exec('git status --short');
  console.log();

  // Step 2: Analyze changes
  logBold('Step 2: Analyzing Changes...', 'cyan');
  console.log();

  const { all: changedFiles } = getChangedFiles();
  const categories = categorizeChanges(changedFiles);
  const stats = exec('git diff --stat HEAD', true);

  log(`Found ${changedFiles.length} modified file(s)`, 'green');
  console.log();

  // Step 3: Generate commit message
  logBold('Step 3: Generating Commit Message...', 'cyan');
  console.log();

  const commitType = determineCommitType(categories);
  const commitTitle = generateCommitTitle(commitType, categories, changedFiles);
  const commitDescription = generateCommitDescription(changedFiles, categories, stats);

  // Display generated message
  log('─'.repeat(60), 'blue');
  logBold(commitTitle, 'green');
  log('─'.repeat(60), 'blue');
  console.log(commitDescription);
  log('─'.repeat(60), 'blue');
  console.log();

  // Step 4: Confirm
  const answer = await prompt(colors.yellow + 'Proceed with this commit? (y/n): ' + colors.reset);

  if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    log('\n✗ Commit cancelled', 'yellow');
    console.log();
    process.exit(0);
  }

  console.log();

  // Step 5: Stage all changes
  logBold('Step 4: Staging Changes...', 'cyan');
  exec('git add -A');
  log('✓ All changes staged', 'green');
  console.log();

  // Step 6: Create commit
  logBold('Step 5: Creating Commit...', 'cyan');

  const fullMessage = `${commitTitle}\n\n${commitDescription}`;
  const tmpFile = path.join(__dirname, '.commit-msg-tmp');

  fs.writeFileSync(tmpFile, fullMessage, 'utf8');

  try {
    exec(`git commit -F "${tmpFile}"`);
    log('✓ Commit created successfully', 'green');
  } catch (error) {
    log('✗ Failed to create commit', 'red');
    fs.unlinkSync(tmpFile);
    throw error;
  }

  fs.unlinkSync(tmpFile);
  console.log();

  // Step 7: Get commit info and push to origin
  const lastCommit = exec('git log -1 --oneline', true);
  const currentBranch = exec('git branch --show-current', true);

  // Step 8: Push to origin
  logBold('Step 6: Pushing to Origin...', 'cyan');

  try {
    exec(`git push origin ${currentBranch}`, true);
    log(`✓ Pushed to origin/${currentBranch}`, 'green');
  } catch (error) {
    // Try setting upstream if regular push fails
    log('⚠ Could not push to origin (may need to set upstream)', 'yellow');
    log('  Attempting to set upstream and push...', 'yellow');
    try {
      exec(`git push -u origin ${currentBranch}`, true);
      log(`✓ Pushed to origin/${currentBranch}`, 'green');
    } catch (pushError) {
      log('⚠ Push failed. You may need to push manually later.', 'yellow');
    }
  }
  console.log();

  // Step 9: Create new dev branch
  logBold('Step 7: Creating New Dev Branch...', 'cyan');

  const newBranch = getNextDevBranch();
  exec(`git checkout -b ${newBranch}`);

  log(`✓ Created and switched to branch: ${newBranch}`, 'green');
  console.log();

  // Summary
  logBold('========================================', 'blue');
  logBold('   ✓ Workflow Complete!', 'green');
  logBold('========================================', 'blue');
  console.log();

  log('Commit:', 'cyan');
  console.log(`  ${lastCommit}`);
  console.log();

  log('Remote:', 'cyan');
  console.log(`  Pushed to: origin/${currentBranch}`);
  console.log();

  log('Branches:', 'cyan');
  console.log(`  Previous: ${currentBranch}`);
  console.log(`  Current:  ${newBranch}`);
  console.log();

  logBold('Next Steps:', 'yellow');
  console.log(`  1. Continue working on ${newBranch}`);
  console.log(`  2. Merge when ready: git checkout ${currentBranch} && git merge ${newBranch}`);
  console.log(`  3. Push new branch: git push origin ${newBranch}`);
  console.log();
}

// Run main function
main().catch((error) => {
  console.log();
  log(`✗ Error: ${error.message}`, 'red');
  console.log();
  process.exit(1);
});
