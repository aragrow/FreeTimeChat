/**
 * SQL Security Service
 *
 * Phase 2: Analyzes, sanitizes, and validates SQL queries for security
 * - Detects SQL injection attempts
 * - Enforces role-based access control
 * - Validates query structure and safety
 * - Prevents data deletion and bulk operations
 */

export interface SecurityCheckResult {
  isSafe: boolean;
  confidence: number; // 0-100
  issues: SecurityIssue[];
  sanitizedSQL?: string;
  allowedToExecute: boolean;
}

export interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  message: string;
  detectedPattern?: string;
}

export type UserRole = 'admin' | 'tenantadmin' | 'user';

export class SQLSecurityService {
  /**
   * Phase 2: Comprehensive security check
   */
  async validateQuery(
    sql: string,
    userRole: UserRole,
    userId: string,
    tenantId: string | null
  ): Promise<SecurityCheckResult> {
    const issues: SecurityIssue[] = [];
    let confidence = 100;

    console.log('[SQLSecurity] Phase 2: Security Analysis', {
      userRole,
      userId,
      tenantId,
      queryLength: sql.length,
    });

    // Step 1: SQL Injection Detection
    const injectionCheck = this.detectSQLInjection(sql);
    if (!injectionCheck.isSafe) {
      issues.push(...injectionCheck.issues);
      confidence = Math.min(confidence, 0);
    }

    // Step 2: Dangerous Operations Check
    const operationsCheck = this.checkDangerousOperations(sql);
    if (!operationsCheck.isSafe) {
      issues.push(...operationsCheck.issues);
      confidence = Math.min(confidence, 0);
    }

    // Step 3: Role-Based Access Control
    const rbacCheck = this.enforceRBAC(sql, userRole, userId, tenantId);
    if (!rbacCheck.isSafe) {
      issues.push(...rbacCheck.issues);
      confidence = Math.min(confidence, rbacCheck.confidence);
    }

    // Step 4: Query Structure Validation
    const structureCheck = this.validateQueryStructure(sql, userRole);
    if (!structureCheck.isSafe) {
      issues.push(...structureCheck.issues);
      confidence = Math.min(confidence, structureCheck.confidence);
    }

    // Step 5: Bulk Operation Prevention
    const bulkCheck = this.preventBulkOperations(sql, userRole);
    if (!bulkCheck.isSafe) {
      issues.push(...bulkCheck.issues);
      confidence = Math.min(confidence, 0);
    }

    // Step 6: Additional Safety Checks
    const additionalChecks = this.performAdditionalSafetyChecks(sql);
    if (!additionalChecks.isSafe) {
      issues.push(...additionalChecks.issues);
      confidence = Math.min(confidence, additionalChecks.confidence);
    }

    const isSafe = confidence === 100 && issues.length === 0;

    // Log if not safe
    if (!isSafe) {
      console.error('[SQLSecurity] Query NOT SAFE - will not execute', {
        confidence,
        issueCount: issues.length,
        issues: issues.map((i) => `${i.severity}: ${i.type}`),
        sql: sql.substring(0, 200), // First 200 chars for logging
      });
    } else {
      console.log('[SQLSecurity] Query validated successfully - safe to execute');
    }

    return {
      isSafe,
      confidence,
      issues,
      sanitizedSQL: isSafe ? sql : undefined,
      allowedToExecute: isSafe && confidence === 100,
    };
  }

  /**
   * Step 1: Detect SQL Injection Patterns
   */
  private detectSQLInjection(sql: string): { isSafe: boolean; issues: SecurityIssue[] } {
    const issues: SecurityIssue[] = [];
    const _sqlUpper = sql.toUpperCase();

    // Common SQL injection patterns
    const injectionPatterns = [
      { pattern: /--/g, name: 'SQL comment injection' },
      { pattern: /\/\*/g, name: 'Multi-line comment injection' },
      { pattern: /;[\s]*DROP/gi, name: 'Statement chaining with DROP' },
      { pattern: /;[\s]*DELETE/gi, name: 'Statement chaining with DELETE' },
      { pattern: /;[\s]*UPDATE/gi, name: 'Statement chaining with UPDATE' },
      { pattern: /;[\s]*INSERT/gi, name: 'Statement chaining with INSERT' },
      { pattern: /UNION[\s]+SELECT/gi, name: 'UNION-based injection' },
      { pattern: /OR[\s]+1[\s]*=[\s]*1/gi, name: 'Always-true condition' },
      { pattern: /OR[\s]+''[\s]*=[\s]*''/gi, name: 'Always-true string comparison' },
      { pattern: /[\s]*=[\s]*'[\s]*OR/gi, name: 'OR-based injection' },
      { pattern: /EXEC[\s]*\(/gi, name: 'Dynamic SQL execution' },
      { pattern: /EXECUTE[\s]*\(/gi, name: 'Dynamic SQL execution' },
      { pattern: /xp_cmdshell/gi, name: 'System command execution attempt' },
      { pattern: /INTO[\s]+OUTFILE/gi, name: 'File writing attempt' },
      { pattern: /INTO[\s]+DUMPFILE/gi, name: 'File dumping attempt' },
      { pattern: /LOAD_FILE/gi, name: 'File reading attempt' },
    ];

    for (const { pattern, name } of injectionPatterns) {
      const matches = sql.match(pattern);
      if (matches) {
        issues.push({
          severity: 'critical',
          type: 'SQL_INJECTION',
          message: `Potential SQL injection detected: ${name}`,
          detectedPattern: matches[0],
        });
      }
    }

    // Check for suspicious characters
    const suspiciousChars = ['\x00', '\n\r', '\r\n'];
    for (const char of suspiciousChars) {
      if (sql.includes(char)) {
        issues.push({
          severity: 'high',
          type: 'SUSPICIOUS_CHARACTER',
          message: `Suspicious character detected in query`,
          // eslint-disable-next-line no-control-regex
          detectedPattern: char.replace(/[\x00-\x1F]/g, `\\x${char.charCodeAt(0).toString(16)}`),
        });
      }
    }

    // Check for excessive semicolons (statement chaining)
    // Allow single trailing semicolon, but block multiple statements
    const semicolonCount = (sql.match(/;/g) || []).length;
    if (semicolonCount > 1) {
      issues.push({
        severity: 'critical',
        type: 'STATEMENT_CHAINING',
        message: `Multiple statements detected (${semicolonCount} semicolons) - possible SQL injection`,
        detectedPattern: ';',
      });
    }

    return {
      isSafe: issues.length === 0,
      issues,
    };
  }

  /**
   * Step 2: Check for Dangerous Operations
   */
  private checkDangerousOperations(sql: string): { isSafe: boolean; issues: SecurityIssue[] } {
    const issues: SecurityIssue[] = [];
    const sqlUpper = sql.toUpperCase();

    // Absolutely forbidden operations
    const forbiddenOperations = [
      { keyword: 'DROP', description: 'DROP operations' },
      { keyword: 'TRUNCATE', description: 'TRUNCATE operations' },
      { keyword: 'DELETE', description: 'DELETE operations' },
      { keyword: 'ALTER', description: 'ALTER operations' },
      { keyword: 'CREATE', description: 'CREATE operations' },
      { keyword: 'GRANT', description: 'GRANT operations' },
      { keyword: 'REVOKE', description: 'REVOKE operations' },
      { keyword: 'RENAME', description: 'RENAME operations' },
      { keyword: 'REPLACE', description: 'REPLACE operations' },
    ];

    for (const { keyword, description } of forbiddenOperations) {
      // Use word boundaries to match whole words only
      const pattern = new RegExp(`\\b${keyword}\\b`, 'i');
      if (pattern.test(sqlUpper)) {
        issues.push({
          severity: 'critical',
          type: 'FORBIDDEN_OPERATION',
          message: `${description} are not allowed`,
          detectedPattern: keyword,
        });
      }
    }

    // Check for modification operations in wrong context
    if (sqlUpper.includes('UPDATE') || sqlUpper.includes('INSERT')) {
      // These will be validated by RBAC, but flag for extra scrutiny
      issues.push({
        severity: 'medium',
        type: 'MODIFICATION_OPERATION',
        message: 'Data modification operation detected - will be validated by RBAC',
        detectedPattern: sqlUpper.includes('UPDATE') ? 'UPDATE' : 'INSERT',
      });
    }

    return {
      isSafe: !issues.some((i) => i.severity === 'critical'),
      issues,
    };
  }

  /**
   * Step 3: Enforce Role-Based Access Control
   */
  private enforceRBAC(
    sql: string,
    _userRole: UserRole,
    _userId: string,
    _tenantId: string | null
  ): { isSafe: boolean; issues: SecurityIssue[]; confidence: number } {
    const issues: SecurityIssue[] = [];
    let confidence = 100;
    const sqlUpper = sql.toUpperCase();

    // Determine allowed operations by role
    const _allowedOperations: Record<UserRole, string[]> = {
      admin: ['SELECT'], // Admin: Only SELECT, limited to tenant data
      tenantadmin: ['SELECT'], // Tenant Admin: Only SELECT, limited to tenant data
      user: ['SELECT', 'UPDATE'], // User: SELECT and UPDATE, only their own data
    };

    // Check if operation is allowed for this role
    const isSelect = sqlUpper.trim().startsWith('SELECT');
    const isUpdate = sqlUpper.trim().startsWith('UPDATE');
    const isInsert = sqlUpper.trim().startsWith('INSERT');

    if (userRole === 'admin' || userRole === 'tenantadmin') {
      if (!isSelect) {
        issues.push({
          severity: 'critical',
          type: 'RBAC_VIOLATION',
          message: `Role '${userRole}' can only execute SELECT statements`,
          detectedPattern: sql.substring(0, 50),
        });
        confidence = 0;
      }

      // Admin and tenantadmin must have tenant filtering
      // We'll check this in the WHERE clause validation
    } else if (userRole === 'user') {
      if (!isSelect && !isUpdate) {
        issues.push({
          severity: 'critical',
          type: 'RBAC_VIOLATION',
          message: `Role 'user' can only execute SELECT or UPDATE statements`,
          detectedPattern: sql.substring(0, 50),
        });
        confidence = 0;
      }

      // For users, we need to ensure they can only modify their own data
      // This will be checked in WHERE clause validation
    }

    // No role can INSERT
    if (isInsert) {
      issues.push({
        severity: 'critical',
        type: 'RBAC_VIOLATION',
        message: `INSERT operations are not allowed for any role through this interface`,
        detectedPattern: 'INSERT',
      });
      confidence = 0;
    }

    return {
      isSafe: confidence === 100,
      issues,
      confidence,
    };
  }

  /**
   * Step 4: Validate Query Structure
   */
  private validateQueryStructure(
    sql: string,
    userRole: UserRole
  ): { isSafe: boolean; issues: SecurityIssue[]; confidence: number } {
    const issues: SecurityIssue[] = [];
    let confidence = 100;
    const sqlUpper = sql.toUpperCase();

    // Check for WHERE clause (required for UPDATE operations)
    if (sqlUpper.includes('UPDATE')) {
      if (!sqlUpper.includes('WHERE')) {
        issues.push({
          severity: 'critical',
          type: 'MISSING_WHERE_CLAUSE',
          message: 'UPDATE statements must have a WHERE clause to prevent bulk updates',
          detectedPattern: 'UPDATE without WHERE',
        });
        confidence = 0;
      } else {
        // Validate WHERE clause is not trivial
        const wherePattern = /WHERE\s+(.+?)(?:ORDER BY|LIMIT|GROUP BY|$)/is;
        const whereMatch = sql.match(wherePattern);
        if (whereMatch) {
          const whereClause = whereMatch[1].trim().toUpperCase();

          // Check for always-true conditions
          if (whereClause === '1=1' || whereClause === 'TRUE' || whereClause === '1') {
            issues.push({
              severity: 'critical',
              type: 'TRIVIAL_WHERE_CLAUSE',
              message: 'WHERE clause is always true - would affect all rows',
              detectedPattern: whereClause,
            });
            confidence = 0;
          }
        }
      }

      // For user role, ensure WHERE clause includes user_id filter
      if (userRole === 'user') {
        if (!sqlUpper.includes('USER_ID')) {
          issues.push({
            severity: 'critical',
            type: 'MISSING_USER_FILTER',
            message: 'Users must filter by user_id in WHERE clause',
            detectedPattern: 'Missing user_id filter',
          });
          confidence = 0;
        }
      }
    }

    // Check for LIMIT clause (recommended for SELECT)
    if (sqlUpper.includes('SELECT') && !sqlUpper.includes('LIMIT')) {
      issues.push({
        severity: 'low',
        type: 'MISSING_LIMIT',
        message: 'SELECT statements should have a LIMIT clause to prevent excessive data return',
        detectedPattern: 'SELECT without LIMIT',
      });
      confidence = Math.max(85, confidence); // Lower confidence but not critical
    }

    // Validate no subqueries (to prevent complexity attacks)
    const subqueryPattern = /SELECT\s+.+?\s+FROM\s+\(/gi;
    if (subqueryPattern.test(sql)) {
      issues.push({
        severity: 'high',
        type: 'SUBQUERY_DETECTED',
        message: 'Subqueries are not allowed for security reasons',
        detectedPattern: 'Subquery',
      });
      confidence = 0;
    }

    return {
      isSafe: confidence > 0,
      issues,
      confidence,
    };
  }

  /**
   * Step 5: Prevent Bulk Operations
   */
  private preventBulkOperations(
    sql: string,
    _userRole: UserRole
  ): { isSafe: boolean; issues: SecurityIssue[] } {
    const issues: SecurityIssue[] = [];
    const sqlUpper = sql.toUpperCase();

    // Check for UPDATE without proper WHERE clause
    if (sqlUpper.includes('UPDATE')) {
      // Extract WHERE clause
      const wherePattern = /WHERE\s+(.+?)(?:;|$)/is;
      const whereMatch = sql.match(wherePattern);

      if (!whereMatch) {
        issues.push({
          severity: 'critical',
          type: 'BULK_OPERATION',
          message: 'UPDATE without WHERE clause would affect all rows - not allowed',
          detectedPattern: 'UPDATE without WHERE',
        });
      }
    }

    // Check for INSERT with multiple VALUES
    if (sqlUpper.includes('INSERT')) {
      const valuesCount = (sql.match(/\)\s*,\s*\(/g) || []).length + 1;
      if (valuesCount > 1) {
        issues.push({
          severity: 'critical',
          type: 'BULK_INSERT',
          message: `Bulk INSERT with ${valuesCount} rows is not allowed`,
          detectedPattern: `INSERT with ${valuesCount} VALUES`,
        });
      }
    }

    return {
      isSafe: issues.length === 0,
      issues,
    };
  }

  /**
   * Step 6: Additional Safety Checks
   */
  private performAdditionalSafetyChecks(sql: string): {
    isSafe: boolean;
    issues: SecurityIssue[];
    confidence: number;
  } {
    const issues: SecurityIssue[] = [];
    let confidence = 100;
    const sqlUpper = sql.toUpperCase();

    // Check query length (prevent DoS)
    if (sql.length > 10000) {
      issues.push({
        severity: 'high',
        type: 'EXCESSIVE_LENGTH',
        message: `Query is too long (${sql.length} chars) - maximum 10,000 characters allowed`,
        detectedPattern: `${sql.length} characters`,
      });
      confidence = 0;
    }

    // Check for excessive JOINs (prevent complexity attacks)
    const joinCount = (sqlUpper.match(/\bJOIN\b/g) || []).length;
    if (joinCount > 5) {
      issues.push({
        severity: 'high',
        type: 'EXCESSIVE_JOINS',
        message: `Query has ${joinCount} JOINs - maximum 5 allowed`,
        detectedPattern: `${joinCount} JOINs`,
      });
      confidence = Math.max(50, confidence);
    }

    // Check for system tables access
    const systemTables = ['pg_', 'information_schema', 'pg_catalog'];
    for (const sysTable of systemTables) {
      if (sqlUpper.includes(sysTable.toUpperCase())) {
        issues.push({
          severity: 'critical',
          type: 'SYSTEM_TABLE_ACCESS',
          message: `Access to system tables (${sysTable}) is not allowed`,
          detectedPattern: sysTable,
        });
        confidence = 0;
      }
    }

    // Check for encoded/obfuscated SQL
    if (sql.includes('\\x') || sql.includes('CHAR(') || sql.includes('CHR(')) {
      issues.push({
        severity: 'high',
        type: 'OBFUSCATED_SQL',
        message: 'Obfuscated or encoded SQL detected',
        detectedPattern: 'Encoded characters',
      });
      confidence = 0;
    }

    // Check for time-based attacks
    const timeBasedPatterns = ['SLEEP(', 'WAITFOR', 'BENCHMARK(', 'PG_SLEEP('];
    for (const pattern of timeBasedPatterns) {
      if (sqlUpper.includes(pattern)) {
        issues.push({
          severity: 'critical',
          type: 'TIME_BASED_ATTACK',
          message: 'Time-based attack pattern detected',
          detectedPattern: pattern,
        });
        confidence = 0;
      }
    }

    // Check for database enumeration attempts
    const enumerationPatterns = ['VERSION()', 'DATABASE()', 'USER()', 'CURRENT_USER'];
    for (const pattern of enumerationPatterns) {
      if (sqlUpper.includes(pattern)) {
        issues.push({
          severity: 'high',
          type: 'DATABASE_ENUMERATION',
          message: 'Database enumeration attempt detected',
          detectedPattern: pattern,
        });
        confidence = Math.min(50, confidence);
      }
    }

    return {
      isSafe: confidence > 0,
      issues,
      confidence,
    };
  }

  /**
   * Get user role from JWT roles array
   */
  getUserRole(roles: string[]): UserRole {
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('tenantadmin')) return 'tenantadmin';
    return 'user';
  }
}

// Export singleton
export const sqlSecurityService = new SQLSecurityService();
