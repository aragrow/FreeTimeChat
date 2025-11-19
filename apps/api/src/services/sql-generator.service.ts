/**
 * SQL Generator Service
 *
 * Uses LLM to generate SQL queries from natural language
 * Phase 1: Schema analysis and SQL generation
 * Phase 2: Security validation and sanitization
 */

import { LLMRole } from '../integrations/llm/types';
import { schemaAnalyzerService } from './schema-analyzer.service';
import { sqlSecurityService, type UserRole } from './sql-security.service';
import type { PrismaClient as ClientPrismaClient } from '../generated/prisma-client';
import type { PrismaClient as MainPrismaClient } from '../generated/prisma-main';
import type { BaseLLMProvider } from '../integrations/llm/base-provider';

/**
 * Helper function to convert BigInt values to numbers for JSON serialization
 */
function convertBigIntToNumber(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return Number(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToNumber);
  }

  if (typeof obj === 'object') {
    const converted: any = {};
    for (const key in obj) {
      converted[key] = convertBigIntToNumber(obj[key]);
    }
    return converted;
  }

  return obj;
}

export interface SQLGenerationResult {
  sql: string;
  explanation: string;
  tables: string[];
  isReadOnly: boolean;
  databases?: string[]; // Which databases are involved (for cross-database queries)
}

export interface QueryExecutionResult {
  success: boolean;
  data?: any[];
  rowCount?: number;
  error?: string;
  executedSQL?: string;
  isPreview?: boolean; // Phase 3: Indicates if this is a preview
}

export class SQLGeneratorService {
  /**
   * Phase 1: Generate SQL from natural language query
   */
  async generateSQL(
    userQuery: string,
    isAdmin: boolean,
    llmProvider: BaseLLMProvider
  ): Promise<SQLGenerationResult> {
    // Get the appropriate schema
    const schemaInfo = await schemaAnalyzerService.getSchema(isAdmin);

    // Create prompt for LLM
    const systemPrompt = `You are a PostgreSQL expert. Given a database schema and a natural language question, generate a safe, read-only SQL query.

DATABASE: ${schemaInfo.databaseName}
DATABASE SCHEMA:
${schemaInfo.schema}

AVAILABLE TABLES: ${schemaInfo.tables.join(', ')}

RELATIONSHIPS:
${schemaInfo.relationships.join('\n')}

IMPORTANT RULES:
1. ONLY generate SELECT queries (no INSERT, UPDATE, DELETE, DROP, etc.)
2. Use proper PostgreSQL syntax
3. Include appropriate JOINs when relationships are needed
4. Use column aliases for clarity
5. Add LIMIT clauses to prevent excessive data return (max 100 rows)
6. Use snake_case for database column names (as shown in the schema)
7. Use fully qualified table names: ${schemaInfo.databaseName}.public.table_name
8. Return ONLY valid SQL - no markdown, no explanations in the SQL itself
9. If the question cannot be answered with the available schema, say so

Your response must be in JSON format:
{
  "sql": "SELECT ... FROM ${schemaInfo.databaseName}.public.table_name ...",
  "explanation": "This query retrieves...",
  "tables": ["table1", "table2"],
  "isReadOnly": true,
  "databases": ["${schemaInfo.databaseName}"]
}`;

    const userPrompt = `Generate a SQL query for this question: "${userQuery}"`;

    // Call LLM
    const response = await llmProvider.complete([
      { role: LLMRole.SYSTEM, content: systemPrompt },
      { role: LLMRole.USER, content: userPrompt },
    ]);

    // Parse LLM response
    try {
      // Try to extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const result: SQLGenerationResult = JSON.parse(jsonMatch[0]);

      // Validate the result
      if (!result.sql || !result.isReadOnly) {
        throw new Error('Invalid SQL generation result');
      }

      // Additional safety check: ensure it's a SELECT query
      const sqlUpper = result.sql.trim().toUpperCase();
      if (!sqlUpper.startsWith('SELECT')) {
        throw new Error('Only SELECT queries are allowed');
      }

      // Check for dangerous keywords
      const dangerousKeywords = [
        'DROP',
        'DELETE',
        'UPDATE',
        'INSERT',
        'TRUNCATE',
        'ALTER',
        'CREATE',
      ];
      for (const keyword of dangerousKeywords) {
        if (sqlUpper.includes(keyword)) {
          throw new Error(`Dangerous keyword detected: ${keyword}`);
        }
      }

      return result;
    } catch (error) {
      console.error('Failed to parse SQL generation result:', error);
      throw new Error(
        `Failed to generate valid SQL: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Execute generated SQL query with Phase 2 security validation
   */
  async executeQuery(
    sql: string,
    prisma: MainPrismaClient | ClientPrismaClient,
    userRole: UserRole,
    userId: string,
    tenantId: string | null
  ): Promise<QueryExecutionResult> {
    try {
      // PHASE 2: Security Validation
      console.log('[SQLGenerator] Starting Phase 2: Security Validation');

      const securityCheck = await sqlSecurityService.validateQuery(sql, userRole, userId, tenantId);

      // If not safe, return error immediately
      if (!securityCheck.allowedToExecute) {
        console.error('[SQLGenerator] Query BLOCKED by security check', {
          confidence: securityCheck.confidence,
          issueCount: securityCheck.issues.length,
          criticalIssues: securityCheck.issues.filter((i) => i.severity === 'critical').length,
        });

        // Log all security issues
        for (const issue of securityCheck.issues) {
          console.error(
            `[SQLSecurity] ${issue.severity.toUpperCase()}: ${issue.type} - ${issue.message}`,
            {
              pattern: issue.detectedPattern,
            }
          );
        }

        return {
          success: false,
          error: this.formatSecurityError(securityCheck),
          executedSQL: sql,
        };
      }

      console.log('[SQLGenerator] Query passed security validation - executing');

      // Execute the validated query
      const results = await prisma.$queryRawUnsafe(sql);

      // Convert BigInt values to numbers for JSON serialization
      const convertedResults = convertBigIntToNumber(results);

      return {
        success: true,
        data: Array.isArray(convertedResults) ? convertedResults : [convertedResults],
        rowCount: Array.isArray(convertedResults) ? convertedResults.length : 1,
        executedSQL: sql,
      };
    } catch (error) {
      console.error('SQL execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown database error',
        executedSQL: sql,
      };
    }
  }

  /**
   * Phase 3: Execute query preview with LIMIT 5
   * Shows a preview of results before executing the full query
   */
  async executePreview(
    sql: string,
    prisma: MainPrismaClient | ClientPrismaClient,
    userRole: UserRole,
    userId: string,
    tenantId: string | null
  ): Promise<QueryExecutionResult> {
    try {
      console.log('[SQLGenerator] Phase 3: Executing Preview (LIMIT 5)');

      // PHASE 2: Security Validation (always validate)
      const securityCheck = await sqlSecurityService.validateQuery(sql, userRole, userId, tenantId);

      if (!securityCheck.allowedToExecute) {
        console.error('[SQLGenerator] Preview BLOCKED by security check');
        return {
          success: false,
          error: this.formatSecurityError(securityCheck),
          executedSQL: sql,
          isPreview: true,
        };
      }

      // Modify SQL to add LIMIT 5 for preview
      let previewSQL = sql.trim();

      // Remove existing LIMIT clause if present
      previewSQL = previewSQL.replace(/LIMIT\s+\d+\s*;?\s*$/i, '');

      // Remove trailing semicolon
      previewSQL = previewSQL.replace(/;\s*$/, '');

      // Add LIMIT 5
      previewSQL = `${previewSQL} LIMIT 5`;

      console.log('[SQLGenerator] Preview SQL:', previewSQL);

      // Execute preview query
      const results = await prisma.$queryRawUnsafe(previewSQL);

      // Convert BigInt values to numbers for JSON serialization
      const convertedResults = convertBigIntToNumber(results);

      return {
        success: true,
        data: Array.isArray(convertedResults) ? convertedResults : [convertedResults],
        rowCount: Array.isArray(convertedResults) ? convertedResults.length : 1,
        executedSQL: previewSQL,
        isPreview: true,
      };
    } catch (error) {
      console.error('SQL preview execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown database error',
        executedSQL: sql,
        isPreview: true,
      };
    }
  }

  /**
   * Format security check errors for user display
   */
  private formatSecurityError(securityCheck: {
    confidence: number;
    issues: Array<{ severity: string; type: string; message: string }>;
  }): string {
    const criticalIssues = securityCheck.issues.filter((i) => i.severity === 'critical');
    const highIssues = securityCheck.issues.filter((i) => i.severity === 'high');

    if (criticalIssues.length > 0) {
      return `Query blocked for security reasons: ${criticalIssues[0].message}`;
    }

    if (highIssues.length > 0) {
      return `Query blocked for security reasons: ${highIssues[0].message}`;
    }

    return `Query blocked: Security confidence too low (${securityCheck.confidence}%)`;
  }

  /**
   * Format query results for LLM to generate natural language response
   */
  formatResultsForLLM(
    userQuery: string,
    sqlResult: SQLGenerationResult,
    executionResult: QueryExecutionResult
  ): string {
    if (!executionResult.success) {
      return `I tried to query the database but encountered an error: ${executionResult.error}

The SQL query I attempted was:
\`\`\`sql
${sqlResult.sql}
\`\`\`

Could you please rephrase your question or provide more details?`;
    }

    const rowCount = executionResult.rowCount || 0;
    const data = executionResult.data || [];

    let result = `I found ${rowCount} result${rowCount !== 1 ? 's' : ''} for your query: "${userQuery}"\n\n`;

    if (rowCount === 0) {
      result += 'No matching records found in the database.';
    } else {
      result += `Here's what I found:\n\n`;
      result += JSON.stringify(data, null, 2);
      result += `\n\n**SQL Query Used:**\n\`\`\`sql\n${sqlResult.sql}\n\`\`\``;
    }

    return result;
  }
}

// Export singleton
export const sqlGeneratorService = new SQLGeneratorService();
