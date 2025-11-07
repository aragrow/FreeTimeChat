/**
 * Database Service
 *
 * Manages database connections for multi-tenant architecture
 * - Main database: Authentication, users, customers, roles
 * - Customer databases: One database per tenant for data isolation
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import { PrismaClient as MainPrismaClient } from '../generated/prisma-main';

interface CustomerDatabaseConnection {
  prisma: ClientPrismaClient;
  lastAccessed: Date;
}

/**
 * Find the psql executable path
 * Checks environment variable first, then common Homebrew locations, then PATH
 */
function findPsqlPath(): string {
  // Check environment variable
  if (process.env.PSQL_PATH && existsSync(process.env.PSQL_PATH)) {
    return process.env.PSQL_PATH;
  }

  // Check common Homebrew locations
  const homebrewPaths = [
    '/opt/homebrew/bin/psql',
    '/usr/local/bin/psql',
    '/opt/homebrew/Cellar/postgresql@16/16.10/bin/psql',
    '/opt/homebrew/opt/postgresql@16/bin/psql',
    '/opt/homebrew/Cellar/libpq/17.2/bin/psql',
    '/opt/homebrew/opt/libpq/bin/psql',
  ];

  for (const path of homebrewPaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // Fallback to psql in PATH
  return 'psql';
}

export class DatabaseService {
  private mainPrisma: MainPrismaClient;
  private customerConnections: Map<string, CustomerDatabaseConnection>;
  private readonly maxPoolSize: number = 10;
  private readonly connectionTTL: number = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Initialize main database connection
    this.mainPrisma = new MainPrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    // Initialize customer connection pool
    this.customerConnections = new Map();

    // Start cleanup interval for idle connections
    this.startConnectionCleanup();
  }

  /**
   * Get main database client
   */
  getMainDatabase(): MainPrismaClient {
    return this.mainPrisma;
  }

  /**
   * Get tenant database connection
   * Uses connection pooling to reuse existing connections
   */
  async getTenantDatabase(tenantId: string): Promise<ClientPrismaClient> {
    // Check if we already have a connection for this tenant
    const existing = this.customerConnections.get(tenantId);

    if (existing) {
      // Update last accessed time
      existing.lastAccessed = new Date();
      return existing.prisma;
    }

    // Get tenant information from main database
    const tenant = await this.mainPrisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    if (!tenant.databaseName) {
      throw new Error(`Tenant ${tenantId} does not have a database name configured`);
    }

    // Construct database URL from tenant configuration
    const username = process.env.POSTGRES_USER || 'postgres';
    const password = process.env.POSTGRES_PASSWORD || '';
    const host = tenant.databaseHost;
    const port = process.env.POSTGRES_PORT || '5432';

    const databaseUrl = password
      ? `postgresql://${username}:${password}@${host}:${port}/${tenant.databaseName}`
      : `postgresql://${username}@${host}:${port}/${tenant.databaseName}`;

    // Create new Prisma client for this customer database
    const prisma = new ClientPrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    // Test connection
    try {
      await prisma.$connect();
    } catch (error) {
      throw new Error(
        `Failed to connect to customer database for ${tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Store in connection pool
    this.customerConnections.set(tenantId, {
      prisma,
      lastAccessed: new Date(),
    });

    // Enforce max pool size
    this.enforcePoolSize();

    return prisma;
  }

  /**
   * Provision a new customer database
   * Creates database and runs migrations
   */
  async provisionCustomerDatabase(tenantId: string): Promise<string> {
    // Generate unique database name
    const dbName = `freetimechat_customer_${tenantId.replace(/-/g, '_')}`;

    // Get database connection details from main database URL
    const mainDbUrl = process.env.DATABASE_URL;
    if (!mainDbUrl) {
      throw new Error('DATABASE_URL not configured');
    }

    // Parse database URL to get connection details
    // Supports both formats: postgresql://user:pass@host:port/db and postgresql://user@host:port/db
    let urlMatch = mainDbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    let username: string;
    let password: string;
    let host: string;
    let port: string;

    if (urlMatch) {
      // Format with password: postgresql://user:pass@host:port/db
      [, username, password, host, port] = urlMatch;
    } else {
      // Try format without password: postgresql://user@host:port/db
      urlMatch = mainDbUrl.match(/postgresql:\/\/([^@]+)@([^:]+):(\d+)\/(.+)/);
      if (!urlMatch) {
        throw new Error('Invalid DATABASE_URL format');
      }
      [, username, host, port] = urlMatch;
      password = ''; // No password
    }

    // Get psql path
    const psqlPath = findPsqlPath();

    // Create database using psql command
    const createDbCommand = password
      ? `PGPASSWORD="${password}" ${psqlPath} -h ${host} -p ${port} -U ${username} -d postgres -c "CREATE DATABASE ${dbName};"`
      : `${psqlPath} -h ${host} -p ${port} -U ${username} -d postgres -c "CREATE DATABASE ${dbName};"`;

    try {
      execSync(createDbCommand, { stdio: 'pipe' });
    } catch (error) {
      // Check if error is because database already exists
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('already exists')) {
        // Database already exists, continue with migrations
        console.log(`Database ${dbName} already exists, skipping creation`);
      } else {
        throw new Error(`Failed to create database: ${errorMessage}`);
      }
    }

    // Install extensions
    const extensions = [
      'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
      'CREATE EXTENSION IF NOT EXISTS "pg_trgm";',
    ];

    for (const ext of extensions) {
      const extCommand = password
        ? `PGPASSWORD="${password}" ${psqlPath} -h ${host} -p ${port} -U ${username} -d ${dbName} -c "${ext}"`
        : `${psqlPath} -h ${host} -p ${port} -U ${username} -d ${dbName} -c "${ext}"`;
      try {
        execSync(extCommand, { stdio: 'pipe' });
      } catch (error) {
        console.warn(`Warning: Failed to install extension: ${ext}`);
      }
    }

    // Construct database URL for this customer
    const customerDatabaseUrl = password
      ? `postgresql://${username}:${password}@${host}:${port}/${dbName}`
      : `postgresql://${username}@${host}:${port}/${dbName}`;

    // Get the apps/api directory (where prisma schema files are located)
    const apiDir = process.cwd().includes('/apps/api')
      ? process.cwd()
      : `${process.cwd()}/apps/api`;

    // Use db push for development (syncs schema directly without migrations)
    // For production, you should create proper migrations with `prisma migrate dev`
    try {
      const pushCommand = `DATABASE_URL="${customerDatabaseUrl}" pnpm prisma db push --schema=./prisma/schema-client.prisma --accept-data-loss --skip-generate`;
      execSync(pushCommand, { cwd: apiDir, stdio: 'inherit' });
    } catch (error) {
      throw new Error(
        `Failed to sync schema for ${dbName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Update customer record with database name
    await this.mainPrisma.tenant.update({
      where: { id: tenantId },
      data: {
        databaseName: dbName,
      },
    });

    return customerDatabaseUrl;
  }

  /**
   * Delete a customer database
   * WARNING: This permanently deletes all customer data
   */
  async deleteCustomerDatabase(tenantId: string): Promise<void> {
    const customer = await this.mainPrisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!customer) {
      throw new Error(`Customer not found: ${tenantId}`);
    }

    if (!customer.databaseName) {
      throw new Error(`Customer ${tenantId} does not have a database`);
    }

    // Close connection if exists
    const connection = this.customerConnections.get(tenantId);
    if (connection) {
      await connection.prisma.$disconnect();
      this.customerConnections.delete(tenantId);
    }

    // Get database connection details
    const mainDbUrl = process.env.DATABASE_URL;
    if (!mainDbUrl) {
      throw new Error('DATABASE_URL not configured');
    }

    // Parse database URL to get connection details
    // Supports both formats: postgresql://user:pass@host:port/db and postgresql://user@host:port/db
    let urlMatch = mainDbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    let username: string;
    let password: string;
    let host: string;
    let port: string;

    if (urlMatch) {
      // Format with password: postgresql://user:pass@host:port/db
      [, username, password, host, port] = urlMatch;
    } else {
      // Try format without password: postgresql://user@host:port/db
      urlMatch = mainDbUrl.match(/postgresql:\/\/([^@]+)@([^:]+):(\d+)\/(.+)/);
      if (!urlMatch) {
        throw new Error('Invalid DATABASE_URL format');
      }
      [, username, host, port] = urlMatch;
      password = ''; // No password
    }

    // Get psql path
    const psqlPath = findPsqlPath();

    // Terminate all connections to the database
    const terminateCommand = password
      ? `PGPASSWORD="${password}" ${psqlPath} -h ${host} -p ${port} -U ${username} -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${customer.databaseName}';"`
      : `${psqlPath} -h ${host} -p ${port} -U ${username} -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${customer.databaseName}';"`;

    try {
      execSync(terminateCommand, { stdio: 'pipe' });
    } catch (error) {
      console.warn('Warning: Failed to terminate connections');
    }

    // Drop database
    const dropDbCommand = password
      ? `PGPASSWORD="${password}" ${psqlPath} -h ${host} -p ${port} -U ${username} -d postgres -c "DROP DATABASE IF EXISTS ${customer.databaseName};"`
      : `${psqlPath} -h ${host} -p ${port} -U ${username} -d postgres -c "DROP DATABASE IF EXISTS ${customer.databaseName};"`;

    try {
      execSync(dropDbCommand, { stdio: 'pipe' });
    } catch (error) {
      throw new Error(
        `Failed to delete database: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Clear database name from customer record
    await this.mainPrisma.tenant.update({
      where: { id: tenantId },
      data: {
        databaseName: undefined,
      },
    });
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    activeConnections: number;
    customers: Array<{ tenantId: string; lastAccessed: Date }>;
  } {
    return {
      activeConnections: this.customerConnections.size,
      customers: Array.from(this.customerConnections.entries()).map(([tenantId, conn]) => ({
        tenantId,
        lastAccessed: conn.lastAccessed,
      })),
    };
  }

  /**
   * Enforce maximum pool size by removing oldest connections
   */
  private enforcePoolSize(): void {
    if (this.customerConnections.size <= this.maxPoolSize) {
      return;
    }

    // Sort connections by last accessed time
    const connections = Array.from(this.customerConnections.entries()).sort(
      (a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime()
    );

    // Remove oldest connections until we're at max pool size
    const toRemove = connections.slice(0, this.customerConnections.size - this.maxPoolSize);

    for (const [tenantId, conn] of toRemove) {
      conn.prisma.$disconnect().catch(console.error);
      this.customerConnections.delete(tenantId);
    }
  }

  /**
   * Start periodic cleanup of idle connections
   */
  private startConnectionCleanup(): void {
    setInterval(
      () => {
        const now = new Date().getTime();

        for (const [tenantId, conn] of this.customerConnections.entries()) {
          const idleTime = now - conn.lastAccessed.getTime();

          if (idleTime > this.connectionTTL) {
            conn.prisma.$disconnect().catch(console.error);
            this.customerConnections.delete(tenantId);
          }
        }
      },
      5 * 60 * 1000
    ); // Check every 5 minutes
  }

  /**
   * Disconnect all connections
   * Call this on application shutdown
   */
  async disconnectAll(): Promise<void> {
    // Disconnect main database
    await this.mainPrisma.$disconnect();

    // Disconnect all customer databases
    const disconnectPromises = Array.from(this.customerConnections.values()).map((conn) =>
      conn.prisma.$disconnect()
    );

    await Promise.all(disconnectPromises);

    this.customerConnections.clear();
  }
}

// Singleton instance
let databaseServiceInstance: DatabaseService | null = null;

/**
 * Get DatabaseService singleton instance
 */
export function getDatabaseService(): DatabaseService {
  if (!databaseServiceInstance) {
    databaseServiceInstance = new DatabaseService();
  }
  return databaseServiceInstance;
}
