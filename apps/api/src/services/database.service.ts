/**
 * Database Service
 *
 * Manages database connections for multi-tenant architecture
 * - Main database: Authentication, users, clients, roles
 * - Client databases: One database per tenant for data isolation
 */

import { execSync } from 'child_process';
import { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import { PrismaClient as MainPrismaClient } from '../generated/prisma-main';

interface ClientDatabaseConnection {
  prisma: ClientPrismaClient;
  lastAccessed: Date;
}

export class DatabaseService {
  private mainPrisma: MainPrismaClient;
  private clientConnections: Map<string, ClientDatabaseConnection>;
  private readonly maxPoolSize: number = 10;
  private readonly connectionTTL: number = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Initialize main database connection
    this.mainPrisma = new MainPrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    // Initialize client connection pool
    this.clientConnections = new Map();

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
   * Get client database connection
   * Uses connection pooling to reuse existing connections
   */
  async getClientDatabase(clientId: string): Promise<ClientPrismaClient> {
    // Check if we already have a connection for this client
    const existing = this.clientConnections.get(clientId);

    if (existing) {
      // Update last accessed time
      existing.lastAccessed = new Date();
      return existing.prisma;
    }

    // Get client information from main database
    const client = await this.mainPrisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new Error(`Client not found: ${clientId}`);
    }

    if (!client.databaseName) {
      throw new Error(`Client ${clientId} does not have a database name configured`);
    }

    // Construct database URL from client configuration
    const databaseUrl = `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${client.databaseHost}:${process.env.POSTGRES_PORT || '5432'}/${client.databaseName}`;

    // Create new Prisma client for this client database
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
        `Failed to connect to client database for ${clientId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Store in connection pool
    this.clientConnections.set(clientId, {
      prisma,
      lastAccessed: new Date(),
    });

    // Enforce max pool size
    this.enforcePoolSize();

    return prisma;
  }

  /**
   * Provision a new client database
   * Creates database and runs migrations
   */
  async provisionClientDatabase(clientId: string): Promise<string> {
    // Generate unique database name
    const dbName = `freetimechat_client_${clientId.replace(/-/g, '_')}`;

    // Get database connection details from main database URL
    const mainDbUrl = process.env.DATABASE_URL;
    if (!mainDbUrl) {
      throw new Error('DATABASE_URL not configured');
    }

    // Parse database URL to get connection details
    const urlMatch = mainDbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

    if (!urlMatch) {
      throw new Error('Invalid DATABASE_URL format');
    }

    const [, username, password, host, port] = urlMatch;

    // Create database using psql command
    const createDbCommand = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d postgres -c "CREATE DATABASE ${dbName};"`;

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
      const extCommand = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d ${dbName} -c "${ext}"`;
      try {
        execSync(extCommand, { stdio: 'pipe' });
      } catch (error) {
        console.warn(`Warning: Failed to install extension: ${ext}`);
      }
    }

    // Construct database URL for this client
    const clientDatabaseUrl = `postgresql://${username}:${password}@${host}:${port}/${dbName}`;

    // Run Prisma migrations
    try {
      const migrateCommand = `DATABASE_URL="${clientDatabaseUrl}" pnpm prisma:migrate:deploy:client`;
      execSync(migrateCommand, { cwd: process.cwd(), stdio: 'inherit' });
    } catch (error) {
      throw new Error(
        `Failed to run migrations for ${dbName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Update client record with database name
    await this.mainPrisma.client.update({
      where: { id: clientId },
      data: {
        databaseName: dbName,
      },
    });

    return clientDatabaseUrl;
  }

  /**
   * Delete a client database
   * WARNING: This permanently deletes all client data
   */
  async deleteClientDatabase(clientId: string): Promise<void> {
    const client = await this.mainPrisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new Error(`Client not found: ${clientId}`);
    }

    if (!client.databaseName) {
      throw new Error(`Client ${clientId} does not have a database`);
    }

    // Close connection if exists
    const connection = this.clientConnections.get(clientId);
    if (connection) {
      await connection.prisma.$disconnect();
      this.clientConnections.delete(clientId);
    }

    // Get database connection details
    const mainDbUrl = process.env.DATABASE_URL;
    if (!mainDbUrl) {
      throw new Error('DATABASE_URL not configured');
    }

    const urlMatch = mainDbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

    if (!urlMatch) {
      throw new Error('Invalid DATABASE_URL format');
    }

    const [, username, password, host, port] = urlMatch;

    // Terminate all connections to the database
    const terminateCommand = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${client.databaseName}';"`;

    try {
      execSync(terminateCommand, { stdio: 'pipe' });
    } catch (error) {
      console.warn('Warning: Failed to terminate connections');
    }

    // Drop database
    const dropDbCommand = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d postgres -c "DROP DATABASE IF EXISTS ${client.databaseName};"`;

    try {
      execSync(dropDbCommand, { stdio: 'pipe' });
    } catch (error) {
      throw new Error(
        `Failed to delete database: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Clear database name from client record
    await this.mainPrisma.client.update({
      where: { id: clientId },
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
    clients: Array<{ clientId: string; lastAccessed: Date }>;
  } {
    return {
      activeConnections: this.clientConnections.size,
      clients: Array.from(this.clientConnections.entries()).map(([clientId, conn]) => ({
        clientId,
        lastAccessed: conn.lastAccessed,
      })),
    };
  }

  /**
   * Enforce maximum pool size by removing oldest connections
   */
  private enforcePoolSize(): void {
    if (this.clientConnections.size <= this.maxPoolSize) {
      return;
    }

    // Sort connections by last accessed time
    const connections = Array.from(this.clientConnections.entries()).sort(
      (a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime()
    );

    // Remove oldest connections until we're at max pool size
    const toRemove = connections.slice(0, this.clientConnections.size - this.maxPoolSize);

    for (const [clientId, conn] of toRemove) {
      conn.prisma.$disconnect().catch(console.error);
      this.clientConnections.delete(clientId);
    }
  }

  /**
   * Start periodic cleanup of idle connections
   */
  private startConnectionCleanup(): void {
    setInterval(
      () => {
        const now = new Date().getTime();

        for (const [clientId, conn] of this.clientConnections.entries()) {
          const idleTime = now - conn.lastAccessed.getTime();

          if (idleTime > this.connectionTTL) {
            conn.prisma.$disconnect().catch(console.error);
            this.clientConnections.delete(clientId);
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

    // Disconnect all client databases
    const disconnectPromises = Array.from(this.clientConnections.values()).map((conn) =>
      conn.prisma.$disconnect()
    );

    await Promise.all(disconnectPromises);

    this.clientConnections.clear();
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
