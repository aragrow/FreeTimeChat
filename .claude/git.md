# Git Best Practices and Workflow

This document outlines git workflows, commit standards, and automated processes for FreeTimeChat development.

## Table of Contents

1. [Automated Commit Workflow](#automated-commit-workflow)
2. [Commit Message Standards](#commit-message-standards)
3. [Branching Strategy](#branching-strategy)
4. [Git Best Practices](#git-best-practices)
5. [Common Git Operations](#common-git-operations)
6. [Troubleshooting](#troubleshooting)

---

## Automated Commit Workflow

### Overview

Every commit in FreeTimeChat follows this automated workflow:

1. **Analyze Changes**: Review all staged and unstaged changes
2. **Generate Summary**: Create comprehensive commit message with detailed description
3. **Create Commit**: Commit changes with generated message
4. **Create Branch**: Automatically create new branch (dev-1, dev-2, dev-3, etc.)

### Implementation

#### Automated Commit Script

Create this script at `scripts/commit.sh`:

```bash
#!/bin/bash

# FreeTimeChat Automated Commit Script
# This script analyzes changes, generates a commit message, and creates a new dev branch

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}FreeTimeChat Automated Commit${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Check if there are changes to commit
if git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}No changes to commit.${NC}"
    exit 0
fi

# Step 2: Show current status
echo -e "${GREEN}Step 1: Analyzing changes...${NC}"
echo ""
git status --short
echo ""

# Step 3: Generate change summary
echo -e "${GREEN}Step 2: Generating commit summary...${NC}"
echo ""

# Get list of changed files
CHANGED_FILES=$(git diff --name-only HEAD)
STAGED_FILES=$(git diff --cached --name-only)
UNSTAGED_FILES=$(git diff --name-only)

# Count changes
NUM_FILES_CHANGED=$(echo "$CHANGED_FILES" | grep -c '^' || echo "0")
NUM_STAGED=$(echo "$STAGED_FILES" | grep -c '^' || echo "0")
NUM_UNSTAGED=$(echo "$UNSTAGED_FILES" | grep -c '^' || echo "0")

# Get file statistics
FILE_STATS=$(git diff --stat HEAD)

# Analyze the types of changes
FRONTEND_CHANGES=$(echo "$CHANGED_FILES" | grep -E 'apps/web|components' | wc -l || echo "0")
BACKEND_CHANGES=$(echo "$CHANGED_FILES" | grep -E 'apps/api|services' | wc -l || echo "0")
CONFIG_CHANGES=$(echo "$CHANGED_FILES" | grep -E 'package.json|tsconfig|docker|.env' | wc -l || echo "0")
DOCS_CHANGES=$(echo "$CHANGED_FILES" | grep -E '.md$|docs/' | wc -l || echo "0")

# Determine commit type based on changes
COMMIT_TYPE="chore"
if [ "$FRONTEND_CHANGES" -gt 0 ] || [ "$BACKEND_CHANGES" -gt 0 ]; then
    COMMIT_TYPE="feat"
fi
if echo "$CHANGED_FILES" | grep -q "test\|spec"; then
    COMMIT_TYPE="test"
fi
if [ "$DOCS_CHANGES" -gt 0 ] && [ "$FRONTEND_CHANGES" -eq 0 ] && [ "$BACKEND_CHANGES" -eq 0 ]; then
    COMMIT_TYPE="docs"
fi
if [ "$CONFIG_CHANGES" -gt 0 ] && [ "$FRONTEND_CHANGES" -eq 0 ] && [ "$BACKEND_CHANGES" -eq 0 ]; then
    COMMIT_TYPE="chore"
fi

# Generate detailed diff for description
DETAILED_CHANGES=$(git diff HEAD --stat)
SHORT_DIFF=$(git diff HEAD | head -50)

# Generate commit message
COMMIT_TITLE="$COMMIT_TYPE: "

# Generate smart title based on changed files
if [ "$DOCS_CHANGES" -gt 0 ]; then
    COMMIT_TITLE="${COMMIT_TITLE}Update documentation"
elif [ "$CONFIG_CHANGES" -gt 0 ]; then
    COMMIT_TITLE="${COMMIT_TITLE}Update configuration"
elif [ "$FRONTEND_CHANGES" -gt 0 ] && [ "$BACKEND_CHANGES" -gt 0 ]; then
    COMMIT_TITLE="${COMMIT_TITLE}Update frontend and backend"
elif [ "$FRONTEND_CHANGES" -gt 0 ]; then
    COMMIT_TITLE="${COMMIT_TITLE}Update frontend components"
elif [ "$BACKEND_CHANGES" -gt 0 ]; then
    COMMIT_TITLE="${COMMIT_TITLE}Update backend services"
else
    COMMIT_TITLE="${COMMIT_TITLE}General updates"
fi

# Generate commit description
COMMIT_DESCRIPTION="## Summary of Changes

This commit includes $NUM_FILES_CHANGED file(s) with modifications across the project.

### Changed Areas:
- Frontend changes: $FRONTEND_CHANGES file(s)
- Backend changes: $BACKEND_CHANGES file(s)
- Configuration: $CONFIG_CHANGES file(s)
- Documentation: $DOCS_CHANGES file(s)

### Files Changed:
$CHANGED_FILES

### Statistics:
$DETAILED_CHANGES

### Key Changes:
$(git diff HEAD --unified=0 | grep -E '^\+|^\-' | grep -v '^\+\+\+|^\-\-\-' | head -20)

---
Generated automatically by FreeTimeChat commit workflow
"

# Step 4: Show generated commit message
echo -e "${YELLOW}Generated commit message:${NC}"
echo ""
echo -e "${BLUE}$COMMIT_TITLE${NC}"
echo ""
echo "$COMMIT_DESCRIPTION"
echo ""

# Step 5: Ask for confirmation
read -p "Proceed with this commit? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Commit cancelled.${NC}"
    exit 1
fi

# Step 6: Stage all changes if not already staged
if [ "$NUM_UNSTAGED" -gt 0 ]; then
    echo -e "${GREEN}Step 3: Staging all changes...${NC}"
    git add -A
fi

# Step 7: Create commit
echo -e "${GREEN}Step 4: Creating commit...${NC}"

# Create temporary file for commit message
TEMP_MSG_FILE=$(mktemp)
echo "$COMMIT_TITLE" > "$TEMP_MSG_FILE"
echo "" >> "$TEMP_MSG_FILE"
echo "$COMMIT_DESCRIPTION" >> "$TEMP_MSG_FILE"

# Commit with generated message
git commit -F "$TEMP_MSG_FILE"

# Clean up temp file
rm "$TEMP_MSG_FILE"

echo -e "${GREEN}✓ Commit created successfully${NC}"
echo ""

# Step 8: Create new dev branch
echo -e "${GREEN}Step 5: Creating new dev branch...${NC}"

# Get current branch name
CURRENT_BRANCH=$(git branch --show-current)

# Find next available dev branch number
DEV_NUM=1
while git show-ref --verify --quiet refs/heads/dev-$DEV_NUM; do
    ((DEV_NUM++))
done

NEW_BRANCH="dev-$DEV_NUM"

# Create and checkout new branch
git checkout -b "$NEW_BRANCH"

echo -e "${GREEN}✓ Created and switched to branch: $NEW_BRANCH${NC}"
echo ""

# Step 9: Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Workflow Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Commit: $(git log -1 --oneline)"
echo "Current branch: $NEW_BRANCH"
echo "Previous branch: $CURRENT_BRANCH"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Continue working on $NEW_BRANCH"
echo "2. When ready to merge: git checkout main && git merge $NEW_BRANCH"
echo "3. Push changes: git push origin $NEW_BRANCH"
echo ""
```

Make the script executable:

```bash
chmod +x scripts/commit.sh
```

#### Usage

```bash
# Make changes to your code
# When ready to commit, run:
./scripts/commit.sh

# Or add an alias to your .bashrc or .zshrc:
alias commit="./scripts/commit.sh"

# Then just run:
commit
```

### Alternative: Git Alias Approach

Add to `.git/config` or `~/.gitconfig`:

```ini
[alias]
    # Smart commit with auto-generated message
    smart-commit = "!f() { \
        echo 'Analyzing changes...'; \
        CHANGED=$(git diff --stat HEAD); \
        FILES=$(git diff --name-only HEAD | tr '\\n' ', '); \
        SUMMARY=$(git diff HEAD | diffstat | tail -1); \
        MESSAGE=\"chore: Auto-commit with summary\\n\\n## Changes:\\n$CHANGED\\n\\n## Modified files:\\n$FILES\\n\\n## Summary:\\n$SUMMARY\"; \
        git add -A; \
        git commit -m \"$MESSAGE\"; \
        BRANCH_NUM=1; \
        while git rev-parse --verify dev-$BRANCH_NUM 2>/dev/null; do BRANCH_NUM=$((BRANCH_NUM+1)); done; \
        git checkout -b dev-$BRANCH_NUM; \
        echo \"Created branch: dev-$BRANCH_NUM\"; \
    }; f"
```

Usage:

```bash
git smart-commit
```

### Node.js Script Approach

For better integration with the project, create `scripts/commit.js`:

```javascript
#!/usr/bin/env node

/**
 * FreeTimeChat Automated Commit Script
 * Analyzes changes, generates detailed commit message, and creates new dev branch
 */

const { execSync } = require('child_process');
const readline = require('readline');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function exec(command, silent = false) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit',
    }).trim();
  } catch (error) {
    if (!silent) throw error;
    return '';
  }
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
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

async function main() {
  log('\n========================================', 'blue');
  log('FreeTimeChat Automated Commit', 'blue');
  log('========================================\n', 'blue');

  // Check for changes
  const hasChanges = exec('git diff-index --quiet HEAD --', true);
  if (hasChanges === '') {
    log('No changes to commit.', 'yellow');
    process.exit(0);
  }

  // Step 1: Analyze changes
  log('Step 1: Analyzing changes...\n', 'green');
  exec('git status --short');
  console.log();

  // Get changed files
  const changedFiles = exec('git diff --name-only HEAD', true).split('\n').filter(Boolean);
  const stagedFiles = exec('git diff --cached --name-only', true).split('\n').filter(Boolean);

  // Categorize changes
  const frontend = changedFiles.filter(f => f.match(/apps\/web|components/)).length;
  const backend = changedFiles.filter(f => f.match(/apps\/api|services/)).length;
  const config = changedFiles.filter(f => f.match(/package\.json|tsconfig|docker|\.env/)).length;
  const docs = changedFiles.filter(f => f.match(/\.md$|docs\//)).length;
  const tests = changedFiles.filter(f => f.match(/test|spec/)).length;

  // Determine commit type
  let commitType = 'chore';
  if (frontend > 0 || backend > 0) commitType = 'feat';
  if (tests > 0) commitType = 'test';
  if (docs > 0 && frontend === 0 && backend === 0) commitType = 'docs';

  // Generate commit title
  let commitTitle = `${commitType}: `;
  if (docs > 0 && frontend === 0 && backend === 0) {
    commitTitle += 'Update documentation';
  } else if (config > 0 && frontend === 0 && backend === 0) {
    commitTitle += 'Update configuration';
  } else if (frontend > 0 && backend > 0) {
    commitTitle += 'Update frontend and backend';
  } else if (frontend > 0) {
    commitTitle += 'Update frontend components';
  } else if (backend > 0) {
    commitTitle += 'Update backend services';
  } else {
    commitTitle += 'General updates';
  }

  // Get detailed stats
  const stats = exec('git diff --stat HEAD', true);
  const shortDiff = exec('git diff HEAD --unified=0', true)
    .split('\n')
    .filter(line => line.match(/^\+[^+]|^\-[^-]/))
    .slice(0, 20)
    .join('\n');

  // Generate commit description
  const commitDescription = `## Summary of Changes

This commit includes ${changedFiles.length} file(s) with modifications across the project.

### Changed Areas:
- Frontend changes: ${frontend} file(s)
- Backend changes: ${backend} file(s)
- Configuration: ${config} file(s)
- Documentation: ${docs} file(s)
- Tests: ${tests} file(s)

### Files Changed:
${changedFiles.map(f => `- ${f}`).join('\n')}

### Statistics:
${stats}

### Sample Changes:
${shortDiff}

---
Generated automatically by FreeTimeChat commit workflow
`;

  // Step 2: Show generated message
  log('Step 2: Generated commit message:\n', 'green');
  log(commitTitle, 'blue');
  console.log();
  console.log(commitDescription);
  console.log();

  // Step 3: Confirm
  const answer = await prompt('Proceed with this commit? (y/n) ');
  if (answer.toLowerCase() !== 'y') {
    log('Commit cancelled.', 'yellow');
    process.exit(0);
  }

  // Step 4: Stage all changes
  log('\nStep 3: Staging all changes...', 'green');
  exec('git add -A');

  // Step 5: Create commit
  log('Step 4: Creating commit...', 'green');
  const fullMessage = `${commitTitle}\n\n${commitDescription}`;

  // Write to temp file and commit
  const fs = require('fs');
  const tmpFile = '/tmp/commit-msg.txt';
  fs.writeFileSync(tmpFile, fullMessage);
  exec(`git commit -F ${tmpFile}`);
  fs.unlinkSync(tmpFile);

  log('✓ Commit created successfully\n', 'green');

  // Step 6: Create new dev branch
  log('Step 5: Creating new dev branch...', 'green');

  const currentBranch = exec('git branch --show-current', true);

  // Find next available dev branch number
  let devNum = 1;
  while (true) {
    const branchExists = exec(`git show-ref --verify refs/heads/dev-${devNum}`, true);
    if (!branchExists) break;
    devNum++;
  }

  const newBranch = `dev-${devNum}`;
  exec(`git checkout -b ${newBranch}`);

  log(`✓ Created and switched to branch: ${newBranch}\n`, 'green');

  // Summary
  log('========================================', 'blue');
  log('✓ Workflow Complete!', 'green');
  log('========================================\n', 'blue');

  const lastCommit = exec('git log -1 --oneline', true);
  console.log(`Commit: ${lastCommit}`);
  console.log(`Current branch: ${newBranch}`);
  console.log(`Previous branch: ${currentBranch}`);
  console.log();
  log('Next steps:', 'yellow');
  console.log(`1. Continue working on ${newBranch}`);
  console.log(`2. When ready to merge: git checkout main && git merge ${newBranch}`);
  console.log(`3. Push changes: git push origin ${newBranch}`);
  console.log();
}

main().catch((error) => {
  log(`\nError: ${error.message}`, 'red');
  process.exit(1);
});
```

Make it executable:

```bash
chmod +x scripts/commit.js
```

Add to `package.json`:

```json
{
  "scripts": {
    "commit": "node scripts/commit.js"
  }
}
```

Usage:

```bash
npm run commit
# or
pnpm commit
```

---

## Commit Message Standards

### Conventional Commits Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(auth): add 2FA authentication` |
| `fix` | Bug fix | `fix(chat): resolve message ordering issue` |
| `docs` | Documentation only | `docs: update API documentation` |
| `style` | Code style (formatting, semicolons, etc.) | `style: format code with prettier` |
| `refactor` | Code refactoring | `refactor(api): extract auth middleware` |
| `perf` | Performance improvement | `perf(db): add index to time_entries` |
| `test` | Adding or updating tests | `test(auth): add JWT service tests` |
| `chore` | Maintenance tasks | `chore: update dependencies` |
| `ci` | CI/CD changes | `ci: add GitHub Actions workflow` |
| `build` | Build system changes | `build: update webpack config` |
| `revert` | Revert previous commit | `revert: revert commit abc123` |

### Commit Message Examples

#### Good Commit Messages

```
feat(chat): implement conversation history

Add ability to view past conversations with pagination.
Includes conversation list component and API endpoint.

Resolves #123
```

```
fix(auth): prevent token reuse attack

- Add token family tracking
- Implement automatic token rotation
- Revoke entire family on reuse detection

Related to security audit findings
```

```
refactor(components): break dashboard into logical components

Extract dashboard page into smaller components:
- DashboardHeader
- StatsCards
- ActivityCharts
- RecentActivity
- TaskList

Improves maintainability and follows code.md guidelines
```

#### Bad Commit Messages

```
❌ updated stuff
❌ fix bug
❌ WIP
❌ changes
❌ asdfasdf
```

### Commit Message Template

Create `.gitmessage` in project root:

```
<type>(<scope>): <subject>

# Body: Explain WHAT and WHY (not HOW)
# - What changes were made?
# - Why were these changes necessary?
# - What issues does this address?

# Footer: Reference issues, breaking changes
# - Resolves #123
# - BREAKING CHANGE: description
# - Co-authored-by: Name <email>

# Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert
# Scope: auth, chat, api, db, ui, admin, etc.
# Subject: imperative mood, lowercase, no period
# Body: wrap at 72 characters
# Footer: reference issues and breaking changes
```

Configure git to use template:

```bash
git config commit.template .gitmessage
```

---

## Branching Strategy

### Branch Naming Convention

| Branch Type | Pattern | Example | Purpose |
|-------------|---------|---------|---------|
| Main | `main` | `main` | Production-ready code |
| Development | `dev-N` | `dev-1`, `dev-2`, `dev-3` | Auto-generated dev branches |
| Feature | `feature/<name>` | `feature/chat-history` | New features |
| Bug Fix | `fix/<name>` | `fix/token-rotation` | Bug fixes |
| Hotfix | `hotfix/<name>` | `hotfix/security-patch` | Urgent production fixes |
| Release | `release/<version>` | `release/1.0.0` | Release preparation |
| Experimental | `experiment/<name>` | `experiment/ai-integration` | Experiments |

### Development Workflow

#### Option 1: Auto-Generated Dev Branches (Recommended for Solo Development)

```bash
# Make changes
# Run automated commit (creates dev-1)
npm run commit

# Continue working, make more changes
# Run automated commit (creates dev-2)
npm run commit

# Merge back to main when ready
git checkout main
git merge dev-2
git push origin main

# Clean up old dev branches
git branch -d dev-1 dev-2
```

#### Option 2: Feature Branch Workflow (Recommended for Team Development)

```bash
# Create feature branch from main
git checkout main
git checkout -b feature/chat-history

# Make changes and commit
git add .
git commit -m "feat(chat): add conversation history"

# Push to remote
git push origin feature/chat-history

# Create pull request on GitHub/GitLab
# After review and approval, merge to main

# Clean up
git checkout main
git pull origin main
git branch -d feature/chat-history
```

#### Option 3: GitFlow Workflow (Recommended for Production Apps)

```bash
# Main branches:
# - main: production code
# - develop: integration branch

# Create feature from develop
git checkout develop
git checkout -b feature/2fa-auth

# Work on feature
git add .
git commit -m "feat(auth): implement 2FA"

# Merge back to develop
git checkout develop
git merge feature/2fa-auth

# Create release branch
git checkout -b release/1.0.0

# Final tweaks, version bumps
git commit -m "chore: bump version to 1.0.0"

# Merge to main and tag
git checkout main
git merge release/1.0.0
git tag -a v1.0.0 -m "Release version 1.0.0"

# Merge back to develop
git checkout develop
git merge release/1.0.0
```

### Branch Management

```bash
# List all branches
git branch -a

# List remote branches
git branch -r

# Delete local branch
git branch -d branch-name

# Force delete local branch
git branch -D branch-name

# Delete remote branch
git push origin --delete branch-name

# Prune deleted remote branches
git fetch --prune

# Rename current branch
git branch -m new-name

# Clean up merged branches
git branch --merged | grep -v "\*\|main\|develop" | xargs -n 1 git branch -d
```

---

## Git Best Practices

### General Rules

1. **Commit Often**: Small, focused commits are better than large ones
2. **Write Clear Messages**: Future you will thank present you
3. **Review Before Committing**: Use `git diff` to review changes
4. **Don't Commit Secrets**: Never commit API keys, passwords, or secrets
5. **Keep History Clean**: Use meaningful commits, avoid "WIP" or "temp"
6. **Branch Strategically**: Use branches for features and experiments
7. **Pull Before Push**: Always pull latest changes before pushing
8. **Test Before Committing**: Ensure code works before committing

### Do's and Don'ts

#### ✅ DO:

```bash
# Commit logical units of work
git add src/services/auth.ts
git commit -m "feat(auth): add JWT verification"

# Use staging area wisely
git add -p  # Interactive staging

# Review before committing
git diff --staged

# Write descriptive commit messages
git commit -m "fix(chat): resolve race condition in message ordering

The chat component was experiencing message ordering issues when
multiple messages arrived simultaneously. Added message queue with
sequential processing to ensure correct order.

Resolves #456"

# Use branches for experiments
git checkout -b experiment/new-feature

# Keep commits atomic
# One commit = one logical change
```

#### ❌ DON'T:

```bash
# Don't commit everything at once
git add .  # (unless you reviewed all changes)

# Don't use vague messages
git commit -m "fix"
git commit -m "updates"
git commit -m "WIP"

# Don't commit commented-out code
# Use git history instead

# Don't commit large binary files
# Use Git LFS for large files

# Don't commit directly to main
# Use feature branches instead

# Don't force push to shared branches
git push --force origin main  # ❌ NEVER!

# Don't commit secrets
# Use .env files and .gitignore
```

### Commit Frequency

**When to commit:**

- ✅ After completing a logical unit of work
- ✅ After fixing a bug
- ✅ After adding a new feature component
- ✅ Before switching tasks
- ✅ At the end of the work session
- ✅ Before risky refactoring

**Don't commit:**

- ❌ Broken code (unless using WIP branch)
- ❌ Untested code (run tests first)
- ❌ Half-finished features (use stash or WIP branch)
- ❌ Debugging console.logs and temporary code

### .gitignore Best Practices

Ensure your `.gitignore` includes:

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output/

# Production
build/
dist/
.next/
out/

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS
.DS_Store
Thumbs.db

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~

# Secrets and Keys
*.pem
*.key
.secrets/
keys/private.pem

# Database
*.sqlite
*.db

# Temporary
tmp/
temp/
*.tmp

# Cache
.cache/
.parcel-cache/
.turbo/
```

---

## Common Git Operations

### Daily Workflow

```bash
# Start of day: pull latest changes
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/my-feature

# Work and commit
git add .
git commit -m "feat: add feature"

# Push to remote
git push origin feature/my-feature

# End of day: push all changes
git push origin feature/my-feature
```

### Undoing Changes

```bash
# Undo unstaged changes to a file
git checkout -- file.txt

# Undo all unstaged changes
git checkout -- .

# Unstage a file (keep changes)
git reset HEAD file.txt

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes) ⚠️
git reset --hard HEAD~1

# Undo commit and create new one
git revert <commit-hash>

# Discard all changes and reset to remote
git fetch origin
git reset --hard origin/main
```

### Stashing Changes

```bash
# Stash current changes
git stash

# Stash with message
git stash save "WIP: working on feature"

# List stashes
git stash list

# Apply latest stash (keep in stash)
git stash apply

# Apply specific stash
git stash apply stash@{2}

# Apply and remove stash
git stash pop

# Delete stash
git stash drop stash@{0}

# Clear all stashes
git stash clear
```

### Viewing History

```bash
# View commit history
git log

# View compact history
git log --oneline

# View with graph
git log --graph --oneline --all

# View specific file history
git log --follow file.txt

# View changes in commit
git show <commit-hash>

# View who changed what
git blame file.txt

# Search commits
git log --grep="auth"

# View commits by author
git log --author="John"

# View commits in date range
git log --since="2 weeks ago"
```

### Merging and Rebasing

```bash
# Merge feature branch into main
git checkout main
git merge feature/my-feature

# Rebase feature branch onto main
git checkout feature/my-feature
git rebase main

# Interactive rebase (squash commits)
git rebase -i HEAD~3

# Abort merge/rebase
git merge --abort
git rebase --abort

# Continue after resolving conflicts
git add .
git rebase --continue
```

### Resolving Conflicts

```bash
# When conflict occurs:
# 1. View conflicted files
git status

# 2. Open files and resolve conflicts
# Look for:
# <<<<<<< HEAD
# your changes
# =======
# their changes
# >>>>>>> branch-name

# 3. Mark as resolved
git add conflicted-file.txt

# 4. Continue merge/rebase
git commit  # for merge
git rebase --continue  # for rebase

# Use merge tool
git mergetool
```

### Working with Remotes

```bash
# View remotes
git remote -v

# Add remote
git remote add origin <url>

# Change remote URL
git remote set-url origin <new-url>

# Fetch from remote
git fetch origin

# Pull from remote
git pull origin main

# Push to remote
git push origin feature/my-feature

# Set upstream branch
git push -u origin feature/my-feature

# Delete remote branch
git push origin --delete feature/my-feature

# View remote branches
git branch -r
```

---

## Troubleshooting

### Common Issues

#### Issue: Accidentally committed sensitive data

```bash
# Remove file from last commit
git rm --cached sensitive-file.txt
git commit --amend --no-edit

# Remove file from history (use BFG or git-filter-repo)
# Install BFG: brew install bfg
bfg --delete-files sensitive-file.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

#### Issue: Committed to wrong branch

```bash
# Move commit to new branch
git branch new-branch
git reset --hard HEAD~1  # Undo commit on current branch
git checkout new-branch  # Switch to new branch with commit
```

#### Issue: Need to change last commit message

```bash
# Change last commit message
git commit --amend -m "New message"

# Change last commit and add files
git add forgotten-file.txt
git commit --amend --no-edit
```

#### Issue: Merge conflicts

```bash
# View conflicted files
git status

# Use theirs for all conflicts
git checkout --theirs .
git add .
git commit

# Use ours for all conflicts
git checkout --ours .
git add .
git commit

# Abort merge
git merge --abort
```

#### Issue: Detached HEAD state

```bash
# Create branch from detached HEAD
git checkout -b new-branch

# Return to main
git checkout main
```

### Git Aliases

Add to `~/.gitconfig`:

```ini
[alias]
    # Shortcuts
    st = status
    co = checkout
    br = branch
    ci = commit
    unstage = reset HEAD --
    last = log -1 HEAD

    # Enhanced commands
    lg = log --graph --oneline --decorate --all
    ll = log --pretty=format:'%C(yellow)%h%Creset %C(blue)%ad%Creset | %s%C(green)%d%Creset %C(bold)(%an)%Creset' --date=short

    # Useful shortcuts
    undo = reset --soft HEAD~1
    amend = commit --amend --no-edit
    wip = commit -am "WIP"
    unwip = reset HEAD~1

    # Branch management
    branches = branch -a
    cleanup = "!git branch --merged | grep -v '\\*\\|main\\|develop' | xargs -n 1 git branch -d"

    # Diff
    diffc = diff --cached
    diffstat = diff --stat
```

### Pre-commit Hooks

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

# Check for console.logs
if git diff --cached | grep -E "console\.(log|error|warn)"; then
    echo "Error: Found console.log statements. Please remove them."
    echo "To bypass: git commit --no-verify"
    exit 1
fi

# Check for secrets
if git diff --cached | grep -iE "api[-_]?key|secret[-_]?key|password"; then
    echo "Warning: Possible secret detected in commit!"
    echo "To bypass: git commit --no-verify"
    exit 1
fi

# Run linter
npm run lint-staged
```

---

## Summary

### Quick Reference

```bash
# Automated commit workflow
npm run commit

# Manual commit
git add .
git commit -m "feat: add feature"

# Create branch
git checkout -b feature/name

# Merge branch
git checkout main
git merge feature/name

# Undo last commit
git reset --soft HEAD~1

# Stash changes
git stash
git stash pop

# View history
git log --oneline
```

### Commit Workflow Checklist

- [ ] Review changes with `git status` and `git diff`
- [ ] Run tests to ensure code works
- [ ] Stage relevant files with `git add`
- [ ] Write clear, descriptive commit message
- [ ] Run automated commit script (or commit manually)
- [ ] Verify commit with `git log`
- [ ] Push to remote when ready

---

For more details on project standards:
- **[Code Standards](./code.md)** - Coding best practices
- **[Instructions](./instructions.md)** - Project overview and architecture
- **[Authentication](./authentication.md)** - Auth system details
- **[Authorization](./authorization.md)** - RBAC system details
