/**
 * Test Setup File
 *
 * Runs before all tests to set up the testing environment
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_TOKEN_EXPIRY = '15m';
process.env.JWT_REFRESH_TOKEN_EXPIRY = '7d';
process.env.JWT_ISSUER = 'freetimechat-api-test';
process.env.JWT_AUDIENCE = 'freetimechat-web-test';
process.env.BCRYPT_ROUNDS = '4'; // Lower for faster tests
process.env.SESSION_SECRET = 'test-secret';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests (but keep error and warn)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Keep warn and error for debugging
  // warn: jest.fn(),
  // error: jest.fn(),
};
