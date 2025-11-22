/**
 * Test Configuration Helper
 *
 * Provides centralized configuration for tests that adapts to environment variables.
 * This makes tests port-agnostic and environment-flexible.
 */

/**
 * Get the API port from environment or use default
 */
export function getApiPort(): number {
  return parseInt(process.env.PORT || '3001', 10);
}

/**
 * Get the API base URL
 */
export function getApiUrl(): string {
  return process.env.API_URL || `http://localhost:${getApiPort()}`;
}

/**
 * Get PostgreSQL connection details
 */
export function getPostgresConfig() {
  const url = new URL(
    process.env.DATABASE_URL ||
      'postgresql://freetimechat:freetimechat_dev_password@localhost:5432/freetimechat_main'
  );

  return {
    host: url.hostname,
    port: parseInt(url.port || '5432', 10),
    username: url.username,
    password: url.password,
    database: url.pathname.slice(1), // Remove leading slash
    mainUrl: process.env.DATABASE_URL,
    clientUrl: process.env.CLIENT_DATABASE_URL,
  };
}

/**
 * Get Redis connection details
 */
export function getRedisConfig() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '1', 10),
  };
}

/**
 * Check if running in CI environment
 */
export function isCI(): boolean {
  return process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
}

/**
 * Check if running in test environment
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

/**
 * Get test timeout based on environment
 * CI environments typically need longer timeouts
 */
export function getTestTimeout(): number {
  if (isCI()) {
    return 30000; // 30 seconds for CI
  }
  return 10000; // 10 seconds for local
}
