/**
 * Schema Analyzer Service
 *
 * Extracts and formats database schema for LLM analysis
 * Supports both main and client databases
 */

import fs from 'fs';
import path from 'path';
import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { PrismaClient as MainPrismaClient } from '../generated/prisma-main';

export interface SchemaInfo {
  databaseType: 'main' | 'client';
  databaseName: string; // For fully qualified table names
  schema: string;
  tables: string[];
  relationships: string[];
}

export interface CrossDatabaseSchemaInfo {
  mainDatabase: SchemaInfo;
  clientDatabase: SchemaInfo;
  combinedTables: string[]; // All tables from both databases
  combinedRelationships: string[]; // All relationships
}

export class SchemaAnalyzerService {
  private mainSchemaCache: string | null = null;
  private clientSchemaCache: string | null = null;

  /**
   * Get schema for the appropriate database
   */
  async getSchema(isAdmin: boolean): Promise<SchemaInfo> {
    if (isAdmin) {
      return this.getMainSchema();
    } else {
      return this.getClientSchema();
    }
  }

  /**
   * Get main database schema
   */
  private async getMainSchema(): Promise<SchemaInfo> {
    if (this.mainSchemaCache) {
      return {
        databaseType: 'main',
        databaseName: 'freetimechat_main',
        schema: this.mainSchemaCache,
        tables: this.extractTableNames(this.mainSchemaCache),
        relationships: this.extractRelationships(this.mainSchemaCache),
      };
    }

    const schemaPath = path.join(__dirname, '../../prisma/schema-main.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

    // Cache for future use
    this.mainSchemaCache = this.formatSchemaForLLM(schemaContent);

    return {
      databaseType: 'main',
      databaseName: 'freetimechat_main',
      schema: this.mainSchemaCache,
      tables: this.extractTableNames(this.mainSchemaCache),
      relationships: this.extractRelationships(this.mainSchemaCache),
    };
  }

  /**
   * Get client database schema
   */
  private async getClientSchema(): Promise<SchemaInfo> {
    if (this.clientSchemaCache) {
      return {
        databaseType: 'client',
        databaseName: 'freetimechat_client',
        schema: this.clientSchemaCache,
        tables: this.extractTableNames(this.clientSchemaCache),
        relationships: this.extractRelationships(this.clientSchemaCache),
      };
    }

    const schemaPath = path.join(__dirname, '../../prisma/schema-client.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

    // Cache for future use
    this.clientSchemaCache = this.formatSchemaForLLM(schemaContent);

    return {
      databaseType: 'client',
      databaseName: 'freetimechat_client',
      schema: this.clientSchemaCache,
      tables: this.extractTableNames(this.clientSchemaCache),
      relationships: this.extractRelationships(this.clientSchemaCache),
    };
  }

  /**
   * Get combined schema for cross-database queries
   * Used when admin users need to query both main and client databases
   */
  async getCrossSchema(_tenantId: string | null): Promise<CrossDatabaseSchemaInfo> {
    const mainSchema = await this.getMainSchema();
    const clientSchema = await this.getClientSchema();

    return {
      mainDatabase: mainSchema,
      clientDatabase: clientSchema,
      combinedTables: [
        ...mainSchema.tables.map((t) => `${mainSchema.databaseName}.${t}`),
        ...clientSchema.tables.map((t) => `${clientSchema.databaseName}.${t}`),
      ],
      combinedRelationships: [...mainSchema.relationships, ...clientSchema.relationships],
    };
  }

  /**
   * Format Prisma schema for LLM consumption
   */
  private formatSchemaForLLM(schemaContent: string): string {
    // Remove generator and datasource blocks
    let formatted = schemaContent.replace(/generator\s+\w+\s*{[^}]*}/g, '');
    formatted = formatted.replace(/datasource\s+\w+\s*{[^}]*}/g, '');

    // Remove comments at the start
    formatted = formatted.replace(/^\/\/.*$/gm, '');

    // Clean up extra whitespace
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    return formatted.trim();
  }

  /**
   * Extract table names from schema
   */
  private extractTableNames(schema: string): string[] {
    const modelRegex = /model\s+(\w+)\s*{/g;
    const tables: string[] = [];
    let match;

    while ((match = modelRegex.exec(schema)) !== null) {
      tables.push(match[1]);
    }

    return tables;
  }

  /**
   * Extract relationship information
   */
  private extractRelationships(schema: string): string[] {
    const relationships: string[] = [];
    const modelBlocks = schema.match(/model\s+\w+\s*{[^}]*}/gs) || [];

    for (const block of modelBlocks) {
      const modelName = block.match(/model\s+(\w+)/)?.[1];
      if (!modelName) continue;

      // Find relation fields
      const relationMatches = block.matchAll(/(\w+)\s+(\w+)(\[\])?\s+@relation/g);
      for (const match of relationMatches) {
        const fieldName = match[1];
        const relatedModel = match[2];
        relationships.push(`${modelName}.${fieldName} -> ${relatedModel}`);
      }
    }

    return relationships;
  }

  /**
   * Generate SQL query using database introspection
   */
  async introspectDatabase(
    prisma: MainPrismaClient | ClientPrismaClient,
    databaseType: 'main' | 'client'
  ): Promise<string> {
    // Get all table names from information_schema
    const tables = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    );

    let schemaInfo = `Database: ${databaseType}\n\nTables:\n`;

    for (const table of tables) {
      const tableName = table.table_name;

      // Get columns for this table
      const columns = await prisma.$queryRawUnsafe<
        Array<{
          column_name: string;
          data_type: string;
          is_nullable: string;
        }>
      >(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public'
         AND table_name = $1
         ORDER BY ordinal_position`,
        tableName
      );

      schemaInfo += `\n${tableName}:\n`;
      for (const col of columns) {
        const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(required)';
        schemaInfo += `  - ${col.column_name}: ${col.data_type} ${nullable}\n`;
      }
    }

    return schemaInfo;
  }
}

// Export singleton
export const schemaAnalyzerService = new SchemaAnalyzerService();
