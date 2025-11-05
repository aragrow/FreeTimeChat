/**
 * Prettier Configuration
 *
 * Shared Prettier config for all projects in the monorepo
 */

module.exports = {
  // Basic formatting
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,

  // Arrow functions
  arrowParens: 'always',

  // Line endings
  endOfLine: 'lf',

  // Spacing
  bracketSpacing: true,
  bracketSameLine: false,

  // Quotes
  quoteProps: 'as-needed',
  jsxSingleQuote: false,

  // Prose
  proseWrap: 'preserve',

  // Plugins
  plugins: [],

  // Overrides for specific file types
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
      },
    },
    {
      files: '*.md',
      options: {
        proseWrap: 'always',
        printWidth: 80,
      },
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2,
      },
    },
  ],
};
