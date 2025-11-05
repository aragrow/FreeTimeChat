# @freetimechat/config

Shared ESLint and Prettier configurations for the FreeTimeChat monorepo.

## Overview

This package provides centralized configuration for code quality and formatting tools across all applications and packages in the FreeTimeChat monorepo.

## Available Configurations

### ESLint Configurations

#### Base Configuration (`eslint-base.js`)

Base ESLint configuration for all TypeScript projects. Includes:

- TypeScript ESLint plugin
- Import ordering
- Consistent type imports
- Standard code quality rules

**Usage:**

```js
// .eslintrc.js
module.exports = {
  extends: ['@freetimechat/config/eslint-base'],
};
```

#### Next.js Configuration (`eslint-next.js`)

ESLint configuration for Next.js applications. Extends base config with:

- Next.js core web vitals rules
- React-specific rules
- Browser environment support

**Usage:**

```js
// apps/web/.eslintrc.js
module.exports = {
  extends: ['@freetimechat/config/eslint-next'],
};
```

#### Node.js Configuration (`eslint-node.js`)

ESLint configuration for Node.js/Express applications. Extends base config with:

- Node.js specific rules
- Express patterns support
- Console statements allowed

**Usage:**

```js
// apps/api/.eslintrc.js
module.exports = {
  extends: ['@freetimechat/config/eslint-node'],
};
```

### Prettier Configuration

Shared Prettier configuration with:

- Single quotes
- Semicolons
- 100 character line width
- 2-space indentation
- File-specific overrides (JSON, Markdown, YAML)

**Usage:**

```js
// .prettierrc.js
module.exports = require('@freetimechat/config/prettier');
```

Or in `package.json`:

```json
{
  "prettier": "@freetimechat/config/prettier"
}
```

## Installation

This package is automatically available in the monorepo via pnpm workspaces. No installation needed.

## Configuration Rules

### TypeScript Rules

- `@typescript-eslint/no-unused-vars`: Error (with underscore prefix ignore pattern)
- `@typescript-eslint/no-explicit-any`: Warning
- `@typescript-eslint/consistent-type-imports`: Warning (prefer type imports)

### General Rules

- `no-console`: Warning (error/warn allowed)
- `prefer-const`: Error
- `no-var`: Error
- `object-shorthand`: Warning
- `prefer-template`: Warning

### Import Rules

- Automatic import ordering (alphabetically)
- Grouped by type (builtin, external, internal, etc.)

## Formatting Standards

- **Quotes**: Single quotes for JS/TS, double for JSX
- **Semicolons**: Required
- **Line Width**: 100 characters (80 for JSON/Markdown)
- **Indentation**: 2 spaces
- **Trailing Commas**: ES5 style
- **Arrow Functions**: Always use parentheses

## Overriding Rules

To override specific rules in your application:

```js
// apps/web/.eslintrc.js
module.exports = {
  extends: ['@freetimechat/config/eslint-next'],
  rules: {
    // Override or add custom rules
    '@typescript-eslint/no-explicit-any': 'error',
  },
};
```

## Editor Integration

### VSCode

Install the following extensions:

- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)

Add to `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.workingDirectories": [
    { "mode": "auto" }
  ]
}
```

## Scripts

Add these scripts to your application's `package.json`:

```json
{
  "scripts": {
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx,json,md}\""
  }
}
```

## Maintenance

When updating configurations:

1. Update the appropriate config file in this package
2. Test changes in at least one app
3. Document any breaking changes
4. Communicate changes to the team

## Related Documentation

- [ESLint Documentation](https://eslint.org/docs/latest/)
- [Prettier Documentation](https://prettier.io/docs/en/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [Next.js ESLint](https://nextjs.org/docs/app/building-your-application/configuring/eslint)
