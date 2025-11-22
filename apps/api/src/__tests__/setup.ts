/**
 * Test Setup File
 *
 * Runs before all tests to set up the testing environment
 *
 * NOTE: Tests use supertest's `request(app)` pattern which doesn't require
 * a running server. The app instance is invoked directly, making tests
 * port-agnostic. PORT and API_URL are set for completeness but not used
 * by the integration tests themselves.
 */

import { getTestTimeout } from './helpers/test-config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '3001'; // Use PORT env var or default to 3001
process.env.API_URL = process.env.API_URL || `http://localhost:${process.env.PORT}`;
process.env.JWT_ACCESS_TOKEN_EXPIRY = '15m';
process.env.JWT_REFRESH_TOKEN_EXPIRY = '7d';
process.env.JWT_ISSUER = 'freetimechat-api-test';
process.env.JWT_AUDIENCE = 'freetimechat-web-test';
process.env.BCRYPT_ROUNDS = '4'; // Lower for faster tests
process.env.SESSION_SECRET = 'test-secret';

// Database configuration for tests (Docker PostgreSQL)
// Uses environment variables if set, otherwise falls back to defaults
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://freetimechat:freetimechat_dev_password@localhost:5432/freetimechat_main';
process.env.CLIENT_DATABASE_URL =
  process.env.CLIENT_DATABASE_URL ||
  'postgresql://freetimechat:freetimechat_dev_password@localhost:5432/freetimechat_client_dev';

// Redis configuration for tests (Docker Redis)
// Uses environment variables if set, otherwise falls back to defaults
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.REDIS_PASSWORD = process.env.REDIS_PASSWORD || 'freetimechat_redis_password';
process.env.REDIS_DB = process.env.REDIS_DB || '1'; // Use DB 1 for tests to avoid conflicts
process.env.REDIS_TTL = process.env.REDIS_TTL || '3600';

// Global test timeout (adapts to environment - longer for CI)
jest.setTimeout(getTestTimeout());

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
