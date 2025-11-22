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

// Database configuration for tests (Docker PostgreSQL)
process.env.DATABASE_URL =
  'postgresql://freetimechat:freetimechat_dev_password@localhost:5432/freetimechat_main';
process.env.CLIENT_DATABASE_URL =
  'postgresql://freetimechat:freetimechat_dev_password@localhost:5432/freetimechat_client_dev';

// Redis configuration for tests (Docker Redis)
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = 'freetimechat_redis_password';
process.env.REDIS_DB = '1'; // Use DB 1 for tests to avoid conflicts
process.env.REDIS_TTL = '3600';

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
