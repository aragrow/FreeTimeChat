/**
 * Node.js/Express ESLint Configuration
 *
 * ESLint config for Node.js/Express applications
 */

const baseConfig = require('./eslint-base');

module.exports = {
  ...baseConfig,
  env: {
    ...baseConfig.env,
    node: true,
  },
  rules: {
    ...baseConfig.rules,
    // Node.js specific rules
    'no-console': 'off', // Allow console in Node.js apps
    'no-process-exit': 'error',
    'no-path-concat': 'error',

    // Express patterns
    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        checksVoidReturn: false,
      },
    ],
  },
  ignorePatterns: [...baseConfig.ignorePatterns, 'dist/'],
};
