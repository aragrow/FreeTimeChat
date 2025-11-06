/**
 * ESLint Configuration for Web
 *
 * Uses shared Next.js ESLint config from @freetimechat/config
 */

module.exports = {
  root: true,
  extends: ['../../packages/config/eslint-next.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['.eslintrc.js', 'jest.config.js', 'jest.setup.js', '.next/**/*'],
  rules: {
    // Allow non-null assertions in tests
    '@typescript-eslint/no-non-null-assertion': ['warn'],
  },
};
