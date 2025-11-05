# Git Hooks with Husky

This directory contains Git hooks managed by Husky to enforce code quality and
commit message standards.

## Available Hooks

### pre-commit

Runs before each commit to ensure code quality.

**What it does:**

- Runs `lint-staged` to lint and format staged files
- Applies ESLint fixes to TypeScript/JavaScript files
- Formats code with Prettier

**Files affected:**

- `*.{ts,tsx,js,jsx}` - Linted with ESLint and formatted with Prettier
- `*.{json,md,css,scss}` - Formatted with Prettier

**How to skip (not recommended):**

```bash
git commit --no-verify -m "message"
```

### commit-msg

Validates commit messages to ensure they follow conventional commit format.

**Required format:**

```
<type>(<optional scope>): <description>

[optional body]

[optional footer]
```

**Valid types:**

- `feat` - A new feature
- `fix` - A bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks
- `build` - Build system changes
- `ci` - CI configuration changes
- `perf` - Performance improvements

**Examples:**

```bash
git commit -m "feat: add user authentication"
git commit -m "fix(api): resolve null pointer exception"
git commit -m "docs: update README with installation instructions"
```

**Exceptions:** The following commit types are allowed without validation:

- Merge commits (starting with "Merge")
- Revert commits (starting with "Revert")
- Fixup commits (starting with "fixup!")
- Squash commits (starting with "squash!")

## Configuration

### Modifying Hooks

Edit the hook files directly:

- `.husky/pre-commit` - Pre-commit hook
- `.husky/commit-msg` - Commit message hook

After editing, ensure they remain executable:

```bash
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
```

### Modifying lint-staged

Edit the `lint-staged` configuration in `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css,scss}": ["prettier --write"]
  }
}
```

## Troubleshooting

### Hooks not running

If hooks aren't running, reinstall Husky:

```bash
pnpm prepare
```

### Pre-commit hook failing

If the pre-commit hook fails:

1. Fix the linting errors shown in the output
2. Stage the fixed files: `git add .`
3. Try committing again

### Commit message validation failing

Ensure your commit message follows the conventional commit format:

```bash
# Bad
git commit -m "updated stuff"

# Good
git commit -m "feat: add new feature"
```

## Disabling Hooks

### Temporarily (single commit)

Use `--no-verify` flag:

```bash
git commit --no-verify -m "message"
```

### Permanently (not recommended)

Remove the hook files:

```bash
rm .husky/pre-commit
rm .husky/commit-msg
```

## Resources

- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/okonet/lint-staged)
- [Conventional Commits](https://www.conventionalcommits.org/)
