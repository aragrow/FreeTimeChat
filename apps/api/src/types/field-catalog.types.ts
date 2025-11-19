/**
 * Field Catalog Types
 *
 * Type definitions for the Phase 1 field catalog system that helps
 * the LLM understand available database fields and their natural language equivalents.
 */

/**
 * Field synonyms and natural language query examples
 * Array of strings including:
 * - Synonyms (e.g., "client name", "customer", "company")
 * - Natural language query examples (e.g., "Show all clients named X")
 */
export type FieldSynonyms = string[];

/**
 * Table fields mapping
 * Maps field names to their synonyms and natural language examples
 */
export type TableFields = {
  [fieldName: string]: FieldSynonyms;
};

/**
 * Complete field catalog
 * Maps table names to their field definitions
 */
export type FieldCatalog = {
  [tableName: string]: TableFields;
};

/**
 * Database type for filtering catalog
 */
export type DatabaseType = 'main' | 'client';

/**
 * Minimized field catalog for LLM prompts
 * Compressed format to reduce token usage
 */
export interface MinimizedCatalog {
  tables: string[];
  fields: {
    [table: string]: {
      [field: string]: string[]; // Top 3-5 synonyms only
    };
  };
}

/**
 * Field catalog options for filtering
 */
export interface FieldCatalogOptions {
  databaseType: DatabaseType;
  userRole: string[];
  maxSynonymsPerField?: number; // Default: 5
}
