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
};
