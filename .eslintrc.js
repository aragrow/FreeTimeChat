/**
 * Root ESLint Configuration
 *
 * Uses shared base ESLint config from @freetimechat/config
 * Applied to root-level files and scripts
 */

module.exports = {
  root: true,
  extends: ['./packages/config/eslint-base.js'],
  parserOptions: {
    project: './tsconfig.json',
  },
  // Override for scripts directory to allow console
  overrides: [
    {
      files: ['scripts/**/*.js', 'scripts/**/*.ts'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
