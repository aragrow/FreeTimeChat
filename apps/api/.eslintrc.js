/**
 * ESLint Configuration for API
 *
 * Uses shared Node.js ESLint config from @freetimechat/config
 */

module.exports = {
  root: true,
  extends: ['../../packages/config/eslint-node.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
};
