/**
 * Field Catalog Service
 *
 * Phase 1 (Intent & Field Identification) service that provides filtered
 * and minimized field catalog for LLM prompts.
 *
 * Key Features:
 * - Filters catalog based on database type (main/client)
 * - Filters based on user role/permissions
 * - Minimizes catalog to reduce token usage
 * - Formats for LLM prompt injection
 */

import { CLIENT_DB_TABLES, FIELD_CATALOG, MAIN_DB_TABLES } from '../config/field-catalog';
import type {
  DatabaseType,
  FieldCatalog,
  FieldCatalogOptions,
  MinimizedCatalog,
} from '../types/field-catalog.types';

export class FieldCatalogService {
  /**
   * Get filtered field catalog based on database type and user role
   */
  getFieldCatalog(options: FieldCatalogOptions): FieldCatalog {
    const { databaseType, userRole } = options;

    // Determine which tables to include based on database type
    const allowedTables = this.getAllowedTables(databaseType, userRole);

    // Filter catalog to only include allowed tables
    const filteredCatalog: FieldCatalog = {};
    for (const tableName of allowedTables) {
      if (FIELD_CATALOG[tableName]) {
        filteredCatalog[tableName] = FIELD_CATALOG[tableName];
      }
    }

    return filteredCatalog;
  }

  /**
   * Minimize catalog to reduce token usage
   * - Keep only top N synonyms per field
   * - Remove verbose natural language examples (keep only first 1-2)
   * - Compress format
   */
  minimizeCatalog(catalog: FieldCatalog, maxSynonymsPerField = 5): MinimizedCatalog {
    const tables: string[] = [];
    const fields: MinimizedCatalog['fields'] = {};

    for (const [tableName, tableFields] of Object.entries(catalog)) {
      tables.push(tableName);
      fields[tableName] = {};

      for (const [fieldName, synonyms] of Object.entries(tableFields)) {
        // Take only the first N synonyms (most important ones)
        fields[tableName][fieldName] = synonyms.slice(0, maxSynonymsPerField);
      }
    }

    return { tables, fields };
  }

  /**
   * Format catalog for LLM prompt
   * Compact, readable format that minimizes token usage
   */
  formatForPrompt(catalog: FieldCatalog, maxSynonymsPerField = 5): string {
    const minimized = this.minimizeCatalog(catalog, maxSynonymsPerField);

    let formatted = '**AVAILABLE DATABASE FIELDS:**\n\n';
    formatted += 'Use this catalog to understand which fields users might be requesting.\n';
    formatted += 'Format: table.field → [synonyms and natural language examples]\n\n';

    for (const tableName of minimized.tables) {
      const tableFields = minimized.fields[tableName];
      formatted += `**${tableName}:**\n`;

      for (const [fieldName, synonyms] of Object.entries(tableFields)) {
        // Format: field → [synonym1, synonym2, example]
        const synonymsStr = synonyms.map((s) => `"${s}"`).join(', ');
        formatted += `  • ${fieldName} → [${synonymsStr}]\n`;
      }

      formatted += '\n';
    }

    return formatted;
  }

  /**
   * Format catalog in minimal JSON format (most compact)
   * Use this for maximum token savings
   */
  formatForPromptMinimal(catalog: FieldCatalog, maxSynonymsPerField = 3): string {
    const minimized = this.minimizeCatalog(catalog, maxSynonymsPerField);

    const compact: Record<string, Record<string, string[]>> = {};
    for (const tableName of minimized.tables) {
      compact[tableName] = minimized.fields[tableName];
    }

    // Single-line JSON for maximum compression
    return `**FIELDS:** ${JSON.stringify(compact)}`;
  }

  /**
   * Determine which tables user can access based on role and database type
   */
  private getAllowedTables(databaseType: DatabaseType, userRole: string[]): string[] {
    const isAdmin = userRole.includes('admin');

    if (databaseType === 'main') {
      // Main database: Only admins can access
      // Return user management tables (not in this catalog, but Client for tenant management)
      return isAdmin ? MAIN_DB_TABLES : [];
    } else {
      // Client database: All authenticated users can access
      // Admins can see everything, regular users see business tables
      return CLIENT_DB_TABLES;
    }
  }

  /**
   * Get specific table fields (for targeted field identification)
   */
  getTableFields(tableName: string): Record<string, string[]> | null {
    return FIELD_CATALOG[tableName] || null;
  }

  /**
   * Search for field by synonym (for intelligent field mapping)
   */
  findFieldBySynonym(
    synonym: string,
    databaseType: DatabaseType,
    userRole: string[]
  ): {
    table: string;
    field: string;
    confidence: number;
  } | null {
    const catalog = this.getFieldCatalog({ databaseType, userRole });
    const lowerSynonym = synonym.toLowerCase().trim();

    for (const [tableName, tableFields] of Object.entries(catalog)) {
      for (const [fieldName, synonyms] of Object.entries(tableFields)) {
        const lowerSynonyms = synonyms.map((s) => s.toLowerCase().trim());

        // Exact match
        if (lowerSynonyms.includes(lowerSynonym)) {
          return { table: tableName, field: fieldName, confidence: 1.0 };
        }

        // Partial match (contains)
        for (const syn of lowerSynonyms) {
          if (syn.includes(lowerSynonym) || lowerSynonym.includes(syn)) {
            return { table: tableName, field: fieldName, confidence: 0.7 };
          }
        }
      }
    }

    return null;
  }

  /**
   * Get catalog statistics (for debugging/logging)
   */
  getCatalogStats(catalog: FieldCatalog): {
    tableCount: number;
    fieldCount: number;
    synonymCount: number;
    avgSynonymsPerField: number;
  } {
    let fieldCount = 0;
    let synonymCount = 0;

    for (const tableFields of Object.values(catalog)) {
      for (const synonyms of Object.values(tableFields)) {
        fieldCount++;
        synonymCount += synonyms.length;
      }
    }

    return {
      tableCount: Object.keys(catalog).length,
      fieldCount,
      synonymCount,
      avgSynonymsPerField: fieldCount > 0 ? synonymCount / fieldCount : 0,
    };
  }
}
