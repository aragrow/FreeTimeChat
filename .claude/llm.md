# LLM-Powered Chat System Documentation

## Overview

FreeTimeChat implements an advanced LLM-powered chat system with natural
language to SQL capabilities. The system uses a **six-phase approach** to
understand user intent, generate SQL, validate security, preview results, format
reports, and collect feedback on database query results from user prompts while
maintaining enterprise-level security.

## Architecture

```
User Message
    ↓
[Intent Parser] → Determines if query needs database access
    ↓
[Phase 1: Intent & Field Identification] ← NEW
    ├─ Intent Detection → Determine query purpose (select, update, aggregate, etc.)
    ├─ Entity Extraction → Identify entities mentioned (users, projects, time entries)
    ├─ Field Identification → Extract specific fields requested
    ├─ Table Mapping → Map intent to required database tables
    ├─ Filter Requirements → Identify WHERE clause conditions
    └─ Query Requirements → Define complete query structure needs
    ↓
[Phase 2: SQL Generation]
    ├─ Schema Analyzer → Extracts DB schema
    ├─ LLM Provider → Generates SQL from natural language + Phase 1 context
    ├─ Fully Qualified Names → database.public.table_name
    └─ Initial Validation → Checks for SELECT-only queries
    ↓
[Phase 3: Security Validation]
    ├─ SQL Injection Detection
    ├─ Dangerous Operations Check
    ├─ Role-Based Access Control (RBAC)
    ├─ Query Structure Validation
    ├─ Bulk Operation Prevention
    └─ Additional Safety Checks
    ↓
[Phase 4: Query Preview & Confirmation]
    ├─ Execute Preview (LIMIT 5)
    ├─ Show User Sample Results
    ├─ Request Confirmation
    └─ Execute Full Query (if confirmed)
    ↓
[Phase 5: Report Formatting]
    ├─ Intent Detection → Analyze user's desired format
    ├─ Format Keywords → Match 90+ format indicators
    ├─ Priority System → Resolve format conflicts
    └─ LLM Instructions → Generate format-specific guidance
    ↓
[Result Formatting] → LLM formats results per detected intent
    ↓
[Phase 6: Response Rating]
    ├─ Collect User Feedback → BAD, OK, GOOD
    ├─ Rating Types → Preview & Report ratings
    ├─ Optional Text Feedback → Detailed comments
    ├─ Analytics Generation → Track satisfaction metrics
    └─ LLM Training Data → Store for future improvements
    ↓
User Response + Rating UI
```

## LLM Configuration

### Database-First Configuration

The system loads LLM configurations from the database with the following
priority:

1. **Tenant-Specific Configuration**: `tenant_id = UUID` (specific tenant)
2. **System-Wide Configuration**: `tenant_id IS NULL` (all tenants)
3. **Environment Variables**: Fallback if no database config exists

### Configuration Model

```typescript
interface LLMConfig {
  id: string;
  tenantId: string | null; // NULL = system-wide
  provider: 'openai' | 'google' | 'anthropic';
  apiKeyEncrypted: string;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
}
```

### Provider Caching

- LLM providers are cached for **5 minutes** per tenant
- Cache key: `tenant:${tenantId || 'system'}`
- Improves performance by reducing database lookups

### Supported Providers

1. **OpenAI** (GPT-4, GPT-3.5-turbo)
2. **Google Gemini** (gemini-2.5-flash-lite, gemini-pro)
3. **Anthropic** (Claude 3, Claude 2)

## Database Routing

### Admin Users

- **Database**: Main database (`freetimechat_main`)
- **Schema Access**: Full main database schema
- **Use Case**: System-wide queries, user management, configuration
- **Tenant ID**: `'system'` or `null`

### Regular Users

- **Database**: Tenant-specific database (`freetimechat_customer_{uuid}`)
- **Schema Access**: Tenant database schema only
- **Use Case**: Projects, time entries, conversations
- **Tenant ID**: Actual UUID from JWT token

### Database Selection Logic

```typescript
const effectiveTenantId = !tenantId || tenantId === 'system' ? null : tenantId;
const isAdmin = !effectiveTenantId || effectiveTenantId === null;
const targetDatabase = isAdmin ? mainPrisma : clientPrisma;
```

## Phase 1: Intent & Field Identification

### Overview

Phase 1 is the **foundational step** in the LLM-powered query pipeline. Before
generating SQL, the system must understand:

- **What the user wants to do** (query intent)
- **Which data they want** (fields and entities)
- **How to filter results** (conditions and constraints)

This phase transforms natural language into a structured understanding that
guides SQL generation in Phase 2.

### Intent Detection

The system identifies the type of query the user wants to perform:

- **SELECT**: Retrieve data ("Show me all users", "List active projects")
- **COUNT**: Count records ("How many users?", "Count active projects")
- **AGGREGATE**: Sum, average, min, max ("Total hours logged", "Average
  duration")
- **FILTER**: Retrieve with conditions ("Users created this month")
- **JOIN**: Combine data from multiple tables ("Users with their projects")
- **UPDATE**: Modify existing data ("Update my time entry to 8 hours")
- **GROUPBY**: Group and aggregate ("Time entries by project")
- **SEARCH**: Text search operations ("Find projects containing 'alpha'")

### Entity Extraction

Identifies which business entities are mentioned:

| Entity           | Table(s)      | Keywords                               |
| ---------------- | ------------- | -------------------------------------- |
| **User**         | users         | user, person, member, account, profile |
| **Project**      | projects      | project, work, assignment              |
| **Time Entry**   | time_entries  | time, hours, logged, tracked, entry    |
| **Task**         | tasks         | task, todo, item, work item            |
| **Conversation** | conversations | conversation, chat, discussion         |
| **Message**      | messages      | message, chat message, reply           |

**Example**: "Show me users and their projects" → Entities: User, Project

### Field Identification

Determines which fields the user wants to see:

**Explicit Fields**: "Show me user **emails** and **names**" **Implicit
Fields**: When no fields specified, use reasonable defaults:

- Users → email, full_name, created_at
- Projects → name, description, created_at
- Time entries → hours, date, description

### Table Mapping

Maps entities to database tables and relationships:

**Single Table**: "Show me all users" → `users` table **Multi-Table (JOIN)**:
"Users with their projects" → `users` + `projects` tables

Common relationships:

- users.id = projects.user_id
- time_entries.project_id = projects.id
- messages.conversation_id = conversations.id

### Filter Requirements

Identifies conditions for the WHERE clause:

**Explicit Filters**: "Users created **this month**" → WHERE created_at >=
'2025-01-01' **Implicit Filters**: Auto-added for security:

- User role → WHERE user_id = [current user]
- Tenant isolation → WHERE tenant_id = [current tenant]
- Soft deletes → WHERE deleted_at IS NULL

### Field Catalog System

**Implementation**: The system includes a comprehensive field catalog that maps
natural language synonyms to database fields.

**Catalog Structure**:

- 11 database tables covered (Client, Project, TimeEntry, Task, Invoice, etc.)
- Each field has 3-5 synonyms and natural language query examples
- Example: `Client.name` → ["client name", "customer", "company", "Show all
  clients named X"]

**How It Works**:

1. **System Prompt Injection**: Field catalog is appended to the system prompt
   before each query
2. **Minimization**: Catalog is compressed (top 3 synonyms per field) to reduce
   token usage
3. **Role-Based Filtering**: Catalog is filtered based on user role and database
   access:
   - Admins (main DB): Client management tables
   - Users (client DB): Project, TimeEntry, Task, Invoice, etc.
4. **Format**: Minimal JSON format for maximum token savings

**Example Catalog in Prompt**:

```
**FIELDS:** {"Project":{"name":["project","project name","work project"],"isActive":["ongoing","active","in progress"]},"TimeEntry":{"regularHours":["hours","regular hours","work hours"]}}
```

**Service**: `FieldCatalogService`

- `getFieldCatalog()` - Get filtered catalog based on role/database
- `minimizeCatalog()` - Compress catalog to reduce tokens
- `formatForPromptMinimal()` - Format for LLM prompt (most compact)
- `findFieldBySynonym()` - Search for field by synonym

**Benefits**:

- LLM better understands field names from natural language
- Reduced ambiguity in user queries
- Improved field recognition accuracy
- Foundation for intelligent intent parsing

**Configuration File**: `src/config/field-catalog.ts` - Contains complete
catalog

### Query Requirements Output

Phase 1 outputs a structured plan that guides Phase 2:

```json
{
  "intent": "AGGREGATE",
  "entities": ["TimeEntry", "Project"],
  "fields": ["projects.name", "time_entries.hours"],
  "tables": {
    "primary": "time_entries",
    "joins": [
      { "table": "projects", "on": "time_entries.project_id = projects.id" }
    ]
  },
  "filters": [{ "field": "time_entries.user_id", "value": "current-user-id" }],
  "aggregations": [{ "function": "SUM", "field": "hours" }],
  "groupBy": ["projects.name"]
}
```

### Benefits

1. **Structured Understanding**: Converts ambiguous natural language into clear
   requirements
2. **Better SQL Generation**: Provides detailed context for accurate SQL in
   Phase 2
3. **Security Enforcement**: Identifies required security filters early
4. **Error Prevention**: Detects missing relationships before SQL generation
5. **Debugging**: Clear visibility into system understanding

### Integration with Phase 2

```
User: "Show me total hours by project this month"
    ↓
Phase 1: Intent & Field Identification
    → Intent: AGGREGATE (SUM), GROUPBY
    → Entities: TimeEntry, Project
    → Fields: project.name, time_entries.hours
    → Filters: date >= '2025-01-01'
    ↓
Phase 2: SQL Generation (uses Phase 1 output)
    → SELECT projects.name, SUM(time_entries.hours)
       FROM time_entries
       LEFT JOIN projects ON time_entries.project_id = projects.id
       WHERE time_entries.date >= '2025-01-01'
       GROUP BY projects.name
```

## Phase 2: SQL Generation

### Schema Analysis

The **Schema Analyzer Service** extracts database schema information:

```typescript
interface SchemaInfo {
  databaseType: 'main' | 'client';
  databaseName: string; // For fully qualified table names (NEW)
  schema: string; // Formatted Prisma schema
  tables: string[]; // List of table names
  relationships: string[]; // Table relationships
}
```

**Schema Extraction Process:**

1. Reads Prisma schema files (`schema-main.prisma` or `schema-client.prisma`)
2. Removes generators, datasources, and comments
3. Extracts table names and relationships
4. Includes database name for fully qualified references
5. Formats for LLM consumption

**Cross-Database Support:**

- Main database: `freetimechat_main`
- Client database: `freetimechat_client` (or tenant-specific)
- Fully qualified names: `database_name.public.table_name`

### SQL Generation

**LLM Prompt Structure:**

```
You are a PostgreSQL expert. Given a database schema and a natural language question,
generate a safe, read-only SQL query.

DATABASE: freetimechat_main (or freetimechat_client)

DATABASE SCHEMA:
[Full schema here]

AVAILABLE TABLES: users, projects, time_entries, tasks, conversations, messages

RELATIONSHIPS:
User.projects -> Project
Project.time_entries -> TimeEntry
...

IMPORTANT RULES:
1. ONLY generate SELECT queries
2. Use proper PostgreSQL syntax
3. Include appropriate JOINs
4. Use column aliases for clarity
5. Add LIMIT clauses (max 100 rows)
6. Use snake_case for column names
7. Use fully qualified table names: database_name.public.table_name
8. Return ONLY valid SQL
```

**Response Format:**

```json
{
  "sql": "SELECT users.email, users.full_name FROM freetimechat_main.public.users WHERE users.id = '...' LIMIT 10",
  "explanation": "This query retrieves user email and full name",
  "tables": ["users"],
  "isReadOnly": true,
  "databases": ["freetimechat_main"]
}
```

### Initial Validation (Phase 2)

**Checks:**

- ✅ Must be `SELECT` query
- ✅ `isReadOnly` must be `true`
- ✅ No dangerous keywords: `DROP`, `DELETE`, `UPDATE`, `INSERT`, `TRUNCATE`,
  `ALTER`, `CREATE`

## Phase 3: Security Validation

### Step 1: SQL Injection Detection

**Patterns Detected:**

| Pattern        | Description                   | Severity |
| -------------- | ----------------------------- | -------- |
| `--`           | SQL comment injection         | Critical |
| `/* */`        | Multi-line comment injection  | Critical |
| `;`            | Statement chaining            | Critical |
| `UNION SELECT` | UNION-based injection         | Critical |
| `OR 1=1`       | Always-true condition         | Critical |
| `' OR ''='`    | Always-true string comparison | Critical |
| `EXEC(`        | Dynamic SQL execution         | Critical |
| `xp_cmdshell`  | System command execution      | Critical |
| `INTO OUTFILE` | File writing attempt          | Critical |
| `LOAD_FILE`    | File reading attempt          | Critical |

**Additional Checks:**

- Suspicious characters (`\x00`, `\n\r`)
- Excessive semicolons (statement chaining)

### Step 2: Dangerous Operations Check

**Absolutely Forbidden:**

```typescript
const forbiddenOperations = [
  'DROP', // Drop tables/databases
  'TRUNCATE', // Truncate tables
  'DELETE', // Delete data
  'ALTER', // Alter schema
  'CREATE', // Create objects
  'GRANT', // Grant permissions
  'REVOKE', // Revoke permissions
  'RENAME', // Rename objects
  'REPLACE', // Replace data
];
```

**Modification Operations:**

- `UPDATE` and `INSERT` flagged for RBAC validation
- Must pass additional security checks

### Step 3: Role-Based Access Control (RBAC)

**Role Permissions:**

| Role            | SELECT | UPDATE | INSERT | DELETE | Notes                       |
| --------------- | ------ | ------ | ------ | ------ | --------------------------- |
| **Admin**       | ✅     | ❌     | ❌     | ❌     | Read-only, main DB only     |
| **TenantAdmin** | ✅     | ❌     | ❌     | ❌     | Read-only, tenant data only |
| **User**        | ✅     | ✅\*   | ❌     | ❌     | \*Must filter by `user_id`  |

**User Role Determination:**

```typescript
function getUserRole(roles: string[]): UserRole {
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('tenantadmin')) return 'tenantadmin';
  return 'user';
}
```

**RBAC Validation:**

- Admin/TenantAdmin: Only `SELECT` statements
- User: `SELECT` and `UPDATE` (with `user_id` filter)
- All roles: No `INSERT` through this interface
- All roles: No bulk operations

### Step 4: Query Structure Validation

**UPDATE Statement Requirements:**

```sql
-- ✅ VALID: Has WHERE clause with specific condition
UPDATE time_entries SET hours = 8 WHERE id = '...' AND user_id = '...'

-- ❌ INVALID: No WHERE clause (bulk update)
UPDATE time_entries SET hours = 8

-- ❌ INVALID: Always-true WHERE clause
UPDATE time_entries SET hours = 8 WHERE 1=1

-- ❌ INVALID: User role without user_id filter
UPDATE time_entries SET hours = 8 WHERE id = '...'
```

**SELECT Statement Recommendations:**

```sql
-- ✅ RECOMMENDED: Has LIMIT clause
SELECT * FROM users WHERE tenant_id = '...' LIMIT 10

-- ⚠️ WARNING: No LIMIT clause (allowed but not recommended)
SELECT * FROM users WHERE tenant_id = '...'
```

**Subquery Prevention:**

```sql
-- ❌ BLOCKED: Subquery detected
SELECT * FROM users WHERE id IN (SELECT user_id FROM time_entries)
```

### Step 5: Bulk Operation Prevention

**Blocked Patterns:**

```sql
-- ❌ BLOCKED: UPDATE without WHERE
UPDATE users SET active = true

-- ❌ BLOCKED: Multiple VALUES in INSERT
INSERT INTO users (name, email) VALUES
  ('User 1', 'user1@example.com'),
  ('User 2', 'user2@example.com')
```

**Allowed:**

```sql
-- ✅ ALLOWED: UPDATE with specific WHERE clause
UPDATE users SET active = true WHERE id = '...' AND user_id = '...'

-- ✅ ALLOWED: Single INSERT (if role permits)
INSERT INTO users (name, email) VALUES ('User 1', 'user1@example.com')
```

### Step 6: Additional Safety Checks

**Limits:**

- **Query Length**: Maximum 10,000 characters
- **JOIN Count**: Maximum 5 JOINs per query
- **Result Limit**: LLM instructed to use `LIMIT 100`

**System Table Protection:**

```sql
-- ❌ BLOCKED: System table access
SELECT * FROM pg_catalog.pg_tables
SELECT * FROM information_schema.tables
```

**Obfuscation Detection:**

```sql
-- ❌ BLOCKED: Encoded/obfuscated SQL
SELECT * FROM users WHERE name = CHAR(65, 68, 77, 73, 78)
SELECT * FROM users WHERE id = 0x41444D494E
```

**Attack Pattern Detection:**

```sql
-- ❌ BLOCKED: Time-based attack
SELECT * FROM users WHERE id = '...' AND SLEEP(5)
SELECT * FROM users WHERE id = '...' AND pg_sleep(5)

-- ❌ BLOCKED: Database enumeration
SELECT VERSION()
SELECT DATABASE()
SELECT USER()
```

## Security Confidence Score

**Calculation:**

- Starts at 100%
- Each issue reduces confidence based on severity:
  - **Critical Issue**: Confidence = 0% (immediate block)
  - **High Issue**: Confidence = 0% (immediate block)
  - **Medium Issue**: Confidence reduced (e.g., to 85%)
  - **Low Issue**: Confidence reduced slightly (e.g., to 95%)

**Execution Rules:**

- ✅ Execute if confidence = 100% AND no critical/high issues
- ❌ Block if confidence < 100%
- ❌ Block if any critical or high severity issues exist

## Phase 4: Query Preview & Confirmation

### Overview

After passing Phase 3 security validation, queries enter the **Preview &
Confirmation** phase. This provides users with a sample of results before
executing the full query, allowing them to verify the query matches their
intent.

### Preview Execution

**Process:**

1. Original SQL passes Phase 3 security validation
2. System modifies SQL to add `LIMIT 5`
3. Executes preview query against database
4. Returns sample results to user
5. Requests user confirmation for full execution

**SQL Modification Example:**

```sql
-- Original SQL from Phase 1:
SELECT id, email, full_name FROM freetimechat_main.public.users WHERE active = true LIMIT 100

-- Modified for Preview:
SELECT id, email, full_name FROM freetimechat_main.public.users WHERE active = true LIMIT 5
```

**Implementation:**

```typescript
async executePreview(
  sql: string,
  prisma: MainPrismaClient | ClientPrismaClient,
  userRole: UserRole,
  userId: string,
  tenantId: string | null
): Promise<QueryExecutionResult> {
  // Phase 3 security validation runs first
  const securityCheck = await sqlSecurityService.validateQuery(sql, userRole, userId, tenantId);

  if (!securityCheck.allowedToExecute) {
    return { success: false, error: formatSecurityError(securityCheck), isPreview: true };
  }

  // Modify SQL for preview
  let previewSQL = sql.trim()
    .replace(/LIMIT\s+\d+\s*;?\s*$/i, '')  // Remove existing LIMIT
    .replace(/;\s*$/, '');                   // Remove semicolon

  previewSQL = `${previewSQL} LIMIT 5`;    // Add LIMIT 5

  // Execute preview
  const results = await prisma.$queryRawUnsafe(previewSQL);

  return {
    success: true,
    data: results,
    rowCount: results.length,
    executedSQL: previewSQL,
    isPreview: true
  };
}
```

### User Confirmation Flow

**First Request (No Confirmation):**

```typescript
POST /api/v1/chat
{
  "message": "Show me all active users",
  "conversationId": "uuid",
  "confirmQuery": false  // or omitted
}
```

**Response with Preview:**

```json
{
  "status": "success",
  "data": {
    "message": "Preview shows 5 results:\n1. Admin User (admin@example.com)\n2. John Doe (john@example.com)\n...\n\nWould you like to see all 45 results? Reply 'yes' or 'confirm' to execute the full query.",
    "queryPreview": {
      "sql": "SELECT id, email, full_name FROM freetimechat_main.public.users WHERE active = true LIMIT 100",
      "previewData": [
        {
          "id": "...",
          "email": "admin@example.com",
          "full_name": "Admin User"
        },
        { "id": "...", "email": "john@example.com", "full_name": "John Doe" }
        // ... 3 more results
      ],
      "totalEstimate": 5,
      "requiresConfirmation": true
    }
  }
}
```

**Second Request (With Confirmation):**

```typescript
POST /api/v1/chat
{
  "message": "yes",  // or "confirm"
  "conversationId": "uuid",
  "confirmQuery": true
}
```

**Response with Full Results:**

```json
{
  "status": "success",
  "data": {
    "message": "Found 45 active users:\n[formatted results]",
    "additionalData": {
      "rowCount": 45,
      "executedSQL": "SELECT id, email, full_name FROM freetimechat_main.public.users WHERE active = true LIMIT 100"
    }
  }
}
```

### Security Considerations

**Phase 3 Runs for Both Preview and Full Execution:**

- Preview execution: Phase 3 validation BEFORE preview
- Full execution: Phase 3 validation BEFORE full query
- No security bypass for previews
- Identical security rules apply

**Benefits:**

- User verifies query intent before full execution
- Prevents accidental large data retrieval
- Allows user to spot incorrect queries early
- Provides transparency in query operations

## Phase 5: Report Formatting

### Overview

After query execution, Phase 5 **intelligently detects the desired output
format** from the user's natural language query and provides format-specific
instructions to the LLM for generating the response.

### Format Detection

**Supported Formats:**

| Format         | Description                     | Example Keywords                                   |
| -------------- | ------------------------------- | -------------------------------------------------- |
| **table**      | Markdown table with headers     | table, grid, spreadsheet, tabular, rows, columns   |
| **list**       | Bullet or numbered list         | list, bullet, enumerate, items, show me            |
| **summary**    | High-level overview             | summary, summarize, overview, brief, quick         |
| **detailed**   | Comprehensive report            | detailed, comprehensive, full, complete, thorough  |
| **chart**      | Chart/visualization description | chart, graph, plot, visualize, bar chart           |
| **statistics** | Key metrics and aggregations    | statistics, stats, metrics, count, total, average  |
| **comparison** | Side-by-side comparison         | compare, comparison, versus, vs, difference        |
| **timeline**   | Chronological presentation      | timeline, over time, history, trend, chronological |
| **breakdown**  | Categorized grouping            | breakdown, group by, categorize, category, segment |
| **json**       | JSON export format              | json, export as json                               |
| **csv**        | CSV export format               | csv, export as csv, spreadsheet format             |
| **markdown**   | Markdown document               | markdown, formatted text, documentation            |

### Keyword Matching System

**Implementation:**

```typescript
interface FormatKeyword {
  keyword: string;
  format: ReportFormat;
  priority: number;  // 1-10, higher priority wins conflicts
}

// 90+ keywords mapped to formats
private readonly FORMAT_KEYWORDS: FormatKeyword[] = [
  { keyword: 'table', format: 'table', priority: 10 },
  { keyword: 'summarize', format: 'summary', priority: 10 },
  { keyword: 'statistics', format: 'statistics', priority: 10 },
  { keyword: 'compare', format: 'comparison', priority: 10 },
  { keyword: 'over time', format: 'timeline', priority: 9 },
  { keyword: 'breakdown', format: 'breakdown', priority: 10 },
  // ... 80+ more keywords
];
```

**Detection Algorithm:**

```typescript
detectFormat(userQuery: string): ReportFormatResult {
  const queryLower = userQuery.toLowerCase();
  const detectedFormats = new Map<ReportFormat, number>();

  // Scan for keywords
  for (const { keyword, format, priority } of this.FORMAT_KEYWORDS) {
    if (queryLower.includes(keyword)) {
      const currentPriority = detectedFormats.get(format) || 0;
      detectedFormats.set(format, Math.max(currentPriority, priority));
    }
  }

  // Sort by priority
  const sortedFormats = Array.from(detectedFormats.entries()).sort((a, b) => b[1] - a[1]);

  // Calculate confidence
  const primaryFormat = sortedFormats.length > 0 ? sortedFormats[0][0] : 'list';
  const confidence = sortedFormats.length > 0 ? Math.min(sortedFormats[0][1] / 10, 1.0) : 0.5;

  return { primaryFormat, secondaryFormats: [], detectedKeywords: [], confidence };
}
```

### Format-Specific Instructions

**Example for Table Format:**

```markdown
**Format as TABLE:**

- Use markdown table syntax with proper headers
- Align columns appropriately
- Include all relevant fields
- Keep column names clear and descriptive
- Add totals/summaries at bottom if appropriate

Example: | Name | Count | Percentage | |--------------|-------|------------| |
Item 1 | 45 | 30% | | Item 2 | 65 | 43% | | Total | 150 | 100% |
```

**Example for Summary Format:**

```markdown
**Format as SUMMARY:**

- Provide high-level overview (2-4 sentences)
- Highlight most important findings
- Include key metrics/numbers
- Mention any notable patterns or insights
- Keep it brief and actionable

Example: Found 45 active users across 3 departments. Engineering has the highest
activity (60%), followed by Sales (25%). Average session time is 2.5 hours.
Notable insight: Weekend activity increased 30% this month.
```

**Example for Comparison Format:**

```markdown
**Format as COMPARISON:**

- Present items side-by-side
- Highlight differences and similarities
- Use consistent structure for each item
- Include metrics for comparison

Example: **Item A vs Item B**

| Metric | Item A | Item B | Difference  |
| ------ | ------ | ------ | ----------- |
| Count  | 45     | 32     | +13 (40%)   |
| Value  | $500   | $380   | +$120 (31%) |

**Key Differences:**

- Item A shows 40% higher volume
- Item A has better value per unit
```

### LLM Context Generation

**Process:**

```typescript
formatResultsContext(
  userQuery: string,
  queryResults: any[],
  rowCount: number,
  formatResult: ReportFormatResult
): string {
  let context = `\n\n**Phase 5: Report Formatting**\n`;
  context += `User Query: "${userQuery}"\n`;
  context += `Results: ${rowCount} rows retrieved\n`;
  context += `Detected Format: ${formatResult.primaryFormat} (confidence: ${formatResult.confidence * 100}%)\n`;

  // Add query results as JSON
  context += `\n**Query Results:**\n`;
  context += `\`\`\`json\n${JSON.stringify(queryResults, null, 2)}\n\`\`\`\n`;

  // Add format-specific instructions
  context += `\n${formatResult.formatInstructions}\n`;

  // Add task description
  context += `\n**Your Task:**\n`;
  context += `Analyze the query results and format them according to the ${formatResult.primaryFormat} format. `;
  context += `Follow the formatting guidelines precisely and provide a clear, well-structured response.`;

  return context;
}
```

### Example Flow

**User Query:** "Show me a table of users and their project counts"

**Phase 5 Detection:**

- Detected keywords: "table", "show me"
- Primary format: `table` (priority: 10, confidence: 100%)
- Secondary formats: `list` (priority: 5)

**LLM Context:**

````
**Phase 5: Report Formatting**
User Query: "Show me a table of users and their project counts"
Results: 10 rows retrieved
Detected Format: Table/Grid (confidence: 100%)

**Query Results:**
```json
[
  { "email": "admin@example.com", "full_name": "Admin User", "project_count": 5 },
  { "email": "john@example.com", "full_name": "John Doe", "project_count": 3 },
  ...
]
````

**Format as TABLE:**

- Use markdown table syntax with proper headers
- Align columns appropriately ...

**Your Task:** Analyze the query results and format them according to the
Table/Grid format.

````

**LLM Output:**

```markdown
Here's a table of users and their project counts:

| User Email           | Full Name     | Project Count |
|---------------------|---------------|---------------|
| admin@example.com   | Admin User    | 5             |
| john@example.com    | John Doe      | 3             |
| jane@example.com    | Jane Smith    | 7             |
| ...                 | ...           | ...           |
| **Total**           | **10 users**  | **42 projects** |

The table shows 10 users with a combined total of 42 projects. Jane Smith leads with 7 projects.
````

### Benefits

- **User Intent Recognition**: Automatically detects how user wants data
  presented
- **Consistent Formatting**: Ensures LLM follows specific format guidelines
- **Flexible Output**: Supports 12 different presentation styles
- **Priority System**: Resolves conflicts when multiple formats detected
- **Extensible**: Easy to add new formats and keywords

## Query Execution Flow

### 1. User Sends Message

```typescript
POST /api/v1/chat
{
  "message": "Show me all users",
  "conversationId": "uuid",
  "debugMode": true
}
```

### 2. Intent Parsing

```typescript
const parsed = await intentParser.parseMessage(message);
// { intent: 'general', confidence: 0.95, entities: {} }
```

### 3. Phase 2: SQL Generation

```typescript
const sqlResult = await sqlGeneratorService.generateSQL(
  message,          // "Show me all users"
  isAdmin,         // true
  llmProvider      // Google Gemini
);

// Output:
{
  sql: "SELECT id, email, full_name FROM users LIMIT 10",
  explanation: "Retrieves user information",
  tables: ["users"],
  isReadOnly: true
}
```

### 4. Phase 3: Security Validation

```typescript
const securityCheck = await sqlSecurityService.validateQuery(
  sql,              // Generated SQL
  userRole,         // 'admin'
  userId,           // 'uuid'
  tenantId          // null (admin)
);

// Output:
{
  isSafe: true,
  confidence: 100,
  issues: [],
  sanitizedSQL: "SELECT id, email, full_name FROM users LIMIT 10",
  allowedToExecute: true
}
```

### 5. Query Execution

```typescript
const executionResult = await sqlGeneratorService.executeQuery(
  sql,
  targetDatabase,
  userRole,
  userId,
  tenantId
);

// Output:
{
  success: true,
  data: [
    { id: '...', email: 'admin@example.com', full_name: 'Admin User' },
    { id: '...', email: 'user@example.com', full_name: 'Regular User' }
  ],
  rowCount: 2,
  executedSQL: "SELECT id, email, full_name FROM users LIMIT 10"
}
```

### 6. Result Formatting

```typescript
// SQL results added to LLM context:
systemContext += `
**Database Query Results:**
Query: "Show me all users"

I found 2 results:
\`\`\`json
[
  { "id": "...", "email": "admin@example.com", "full_name": "Admin User" },
  { "id": "...", "email": "user@example.com", "full_name": "Regular User" }
]
\`\`\`

SQL used: \`SELECT id, email, full_name FROM users LIMIT 10\`

Please provide a natural language summary of these results.
`;
```

### 7. LLM Natural Language Response

```typescript
const response = await llmProvider.complete(llmMessages);

// LLM Output:
"I found 2 users in the database:

1. Admin User (admin@example.com)
2. Regular User (user@example.com)

Both users are currently active in the system."
```

### 8. Response to User

```json
{
  "status": "success",
  "data": {
    "message": "I found 2 users in the database:\n\n1. Admin User (admin@example.com)\n2. Regular User (user@example.com)\n\nBoth users are currently active in the system.",
    "conversationId": "uuid",
    "messageId": "uuid",
    "intent": "general",
    "confidence": 0.95
  }
}
```

## Example Queries and Results

### Example 1: Simple SELECT (User Role)

**User Input:** "Show me my projects"

**Generated SQL:**

```sql
SELECT id, name, description, created_at
FROM projects
WHERE user_id = 'current-user-id'
LIMIT 10
```

**Security Check:**

- ✅ SELECT query
- ✅ Has user_id filter (required for user role)
- ✅ Has LIMIT clause
- ✅ No dangerous operations
- **Confidence**: 100%
- **Result**: ALLOWED

**Response:** "You have 3 active projects: Project Alpha, Project Beta, and
Project Gamma."

### Example 2: JOIN Query (Admin Role)

**User Input:** "Show me users and their project count"

**Generated SQL:**

```sql
SELECT
  users.email,
  users.full_name,
  COUNT(projects.id) as project_count
FROM users
LEFT JOIN projects ON projects.user_id = users.id
GROUP BY users.id, users.email, users.full_name
LIMIT 10
```

**Security Check:**

- ✅ SELECT query
- ✅ Valid JOIN operation
- ✅ Admin role allows query
- ✅ Has LIMIT clause
- **Confidence**: 100%
- **Result**: ALLOWED

**Response:** "Here are the users and their project counts: Admin User has 5
projects, John Doe has 3 projects..."

### Example 3: UPDATE (User Role)

**User Input:** "Update my time entry to 8 hours"

**Generated SQL:**

```sql
UPDATE time_entries
SET hours = 8
WHERE id = 'entry-id' AND user_id = 'current-user-id'
```

**Security Check:**

- ✅ UPDATE query (allowed for user role)
- ✅ Has WHERE clause
- ✅ Has user_id filter (required)
- ✅ Updates only user's own data
- **Confidence**: 100%
- **Result**: ALLOWED

**Response:** "I've updated your time entry to 8 hours."

### Example 4: SQL Injection Attempt

**User Input:** "Show me users WHERE 1=1; DROP TABLE users; --"

**Generated SQL:** (LLM may refuse or generate invalid SQL)

```sql
SELECT * FROM users WHERE 1=1; DROP TABLE users; --
```

**Security Check:**

- ❌ Statement chaining detected (`;`)
- ❌ DROP operation detected
- ❌ SQL comment injection detected (`--`)
- **Confidence**: 0%
- **Result**: BLOCKED

**Logged:**

```
[SQLSecurity] CRITICAL: SQL_INJECTION - Potential SQL injection detected: Statement chaining with DROP
[SQLSecurity] CRITICAL: FORBIDDEN_OPERATION - DROP operations are not allowed
[SQLGenerator] Query BLOCKED by security check
```

**Response:** "Query blocked for security reasons: Potential SQL injection
detected: Statement chaining with DROP"

### Example 5: Bulk UPDATE Attempt

**User Input:** "Set all projects to active"

**Generated SQL:**

```sql
UPDATE projects SET is_active = true
```

**Security Check:**

- ❌ UPDATE without WHERE clause
- ❌ Bulk operation detected
- ❌ Missing user_id filter (user role)
- **Confidence**: 0%
- **Result**: BLOCKED

**Logged:**

```
[SQLSecurity] CRITICAL: MISSING_WHERE_CLAUSE - UPDATE statements must have a WHERE clause
[SQLSecurity] CRITICAL: BULK_OPERATION - UPDATE without WHERE clause would affect all rows
[SQLGenerator] Query BLOCKED by security check
```

**Response:** "Query blocked for security reasons: UPDATE statements must have a
WHERE clause to prevent bulk updates"

### Example 6: System Table Access Attempt

**User Input:** "Show me all database tables"

**Generated SQL:**

```sql
SELECT * FROM information_schema.tables
```

**Security Check:**

- ❌ System table access detected (`information_schema`)
- **Confidence**: 0%
- **Result**: BLOCKED

**Logged:**

```
[SQLSecurity] CRITICAL: SYSTEM_TABLE_ACCESS - Access to system tables (information_schema) is not allowed
[SQLGenerator] Query BLOCKED by security check
```

**Response:** "Query blocked for security reasons: Access to system tables is
not allowed"

## Error Handling

### Query Generation Failures

```typescript
try {
  const sqlResult = await sqlGeneratorService.generateSQL(...);
} catch (error) {
  // SQL generation failed - continue with normal chat flow
  // The query might not require database access
  console.log('[ChatService] SQL generation skipped or failed');
}
```

**Behavior:** If SQL generation fails, the system continues with normal
conversational chat (no database access).

### Security Check Failures

```typescript
if (!securityCheck.allowedToExecute) {
  return {
    success: false,
    error: formatSecurityError(securityCheck),
    executedSQL: sql,
  };
}
```

**Behavior:** Query is immediately blocked and error message returned to user.

### Database Execution Failures

```typescript
try {
  const results = await prisma.$queryRawUnsafe(sql);
} catch (error) {
  return {
    success: false,
    error: error.message,
    executedSQL: sql,
  };
}
```

**Behavior:** Database error returned to user with suggestion to rephrase query.

## Logging

### Phase 2 Logs

```
[ChatService] Phase 2: SQL Generation
  isAdmin: true
  tenantId: null
  databaseType: 'main'

[ChatService] SQL generated:
  tables: ['users', 'projects']
  explanation: 'Retrieves users with their projects'
```

### Phase 3 Logs

```
[SQLGenerator] Starting Phase 3: Security Validation

[SQLSecurity] Phase 3: Security Analysis
  userRole: 'admin'
  userId: 'uuid'
  tenantId: null
  queryLength: 156

[SQLSecurity] Query validated successfully - safe to execute
[SQLGenerator] Query passed security validation - executing
```

### Security Violation Logs

```
[SQLGenerator] Query BLOCKED by security check
  confidence: 0
  issueCount: 3
  criticalIssues: 2

[SQLSecurity] CRITICAL: SQL_INJECTION - Statement chaining detected
  pattern: ';'

[SQLSecurity] CRITICAL: FORBIDDEN_OPERATION - DROP operations are not allowed
  pattern: 'DROP'
```

## Performance Considerations

### Caching

- **LLM Provider**: Cached for 5 minutes per tenant
- **Schema**: Cached in memory after first load
- **Database Connections**: Connection pooling via Prisma

### Optimization

- Schema formatted once and reused
- Security checks run in parallel where possible
- Database queries use indexed columns
- LIMIT clauses prevent excessive data return

### Rate Limiting

- LLM API calls: Subject to provider rate limits
- Database queries: No additional rate limiting (handled by Prisma)
- Chat messages: Standard API rate limiting applies

## Configuration

### Environment Variables

```env
# LLM Configuration (Fallback)
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
ANTHROPIC_API_KEY=...

# Database
DATABASE_URL=postgresql://...
CLIENT_DATABASE_URL=postgresql://...

# Security
BCRYPT_ROUNDS=10
SESSION_SECRET=...
```

### Database LLM Configuration

```sql
-- System-wide configuration (all tenants)
INSERT INTO llm_configs (tenant_id, provider, default_model, is_active)
VALUES (NULL, 'google', 'gemini-2.5-flash-lite', true);

-- Tenant-specific configuration
INSERT INTO llm_configs (tenant_id, provider, default_model, is_active)
VALUES ('uuid', 'openai', 'gpt-4', true);
```

## Security Best Practices

### 1. Always Use Database Configurations

Store API keys encrypted in the database, not in environment variables for
production.

### 2. Monitor Blocked Queries

Review security logs regularly for potential attack patterns:

```bash
grep "Query BLOCKED" logs/api.log
```

### 3. Update Security Rules

Add new patterns to `sql-security.service.ts` as threats evolve.

### 4. Audit User Roles

Ensure users have minimum necessary permissions:

- Most users should have `user` role
- `tenantadmin` for tenant administrators only
- `admin` for system administrators only

### 5. Test Query Validation

Regularly test with known attack patterns to ensure security checks work.

## Future Enhancements

### Planned Features

1. **Query History**: Track all executed queries for audit
2. **Rate Limiting**: Per-user query rate limits
3. **Query Approval**: Require approval for complex queries
4. **Enhanced RBAC**: Fine-grained column-level permissions
5. **Query Optimization**: Automatic query plan analysis
6. **Multi-Database Support**: Query across multiple databases
7. **Stored Queries**: Save and reuse common queries

### Security Enhancements

1. **Machine Learning**: ML-based anomaly detection
2. **Query Fingerprinting**: Detect similar attack patterns
3. **Real-time Blocking**: IP/user blocking on repeated violations
4. **Advanced Parsing**: AST-based SQL parsing for deeper validation
5. **Compliance Logging**: GDPR/SOC2 compliant audit trails

## Troubleshooting

### Issue: "No LLM provider available"

**Cause:** No active LLM configuration found in database or environment.

**Solution:**

1. Check database for active config:
   `SELECT * FROM llm_configs WHERE is_active = true`
2. Add system-wide config if missing
3. Verify API keys are valid and not expired

### Issue: "Query blocked for security reasons"

**Cause:** Query failed Phase 2 security validation.

**Solution:**

1. Check logs for specific security issue
2. Rephrase query to avoid detected patterns
3. Ensure query follows RBAC rules for user's role

### Issue: "Failed to generate valid SQL"

**Cause:** LLM couldn't parse user query or generate valid SQL.

**Solution:**

1. Rephrase query with more specific language
2. Check if requested tables/columns exist in schema
3. Verify LLM provider is responding correctly

### Issue: "Database not available"

**Cause:** Database connection failed or middleware didn't attach database.

**Solution:**

1. Check database connection strings
2. Verify `attachChatDatabase` middleware is applied
3. Ensure user is authenticated with valid JWT

## API Reference

### Chat Endpoint

```typescript
POST /api/v1/chat
Authorization: Bearer <jwt-token>

Request:
{
  message: string;
  conversationId?: string;
  includeContext?: boolean;
  debugMode?: boolean;
  confirmQuery?: boolean;  // Phase 4: Confirm query execution
}

Response:
{
  status: 'success' | 'error';
  data: {
    message: string;
    conversationId: string;
    messageId: string;
    intent: string;
    confidence: number;
    queryPreview?: {          // Phase 4: Query preview data
      sql: string;
      previewData: any[];
      totalEstimate: number;
      requiresConfirmation: boolean;
    };
    debug?: {
      intent: {...},
      systemContext: {...},
      llmRequest: {...},
      llmResponse: {...},
      timing: {...}
    }
  }
}
```

### Debug Mode

Enable debug mode to see full LLM interaction:

```json
{
  "message": "Show me all users",
  "debugMode": true
}
```

Response includes:

- Generated SQL query
- Security check results
- LLM prompt and response
- Timing information
- System context

## Phase 6: Response Rating System

### Overview

Phase 6 collects user feedback on LLM-generated responses to continuously
improve accuracy and quality. All ratings are stored for future LLM training and
system optimization.

### Rating Types

Users can rate two types of responses:

1. **PREVIEW** - Rating for Phase 4 query preview data
   - Was the query explanation clear?
   - Did the preview accurately describe what would be queried?
   - Were the affected data estimates correct?

2. **REPORT** - Rating for Phase 5 formatted report
   - Was the report easy to read?
   - Were the insights helpful?
   - Was the formatting appropriate?

### Rating Values

Three-point scale for simplicity:

- **BAD** (1 point) - Response was inaccurate, unhelpful, or confusing
- **OK** (2 points) - Response was adequate but could be improved
- **GOOD** (3 points) - Response was accurate, helpful, and well-formatted

### Database Schema

```prisma
model ResponseRating {
  id         String      @id @default(uuid())
  messageId  String      @map("message_id")
  message    Message     @relation(fields: [messageId], references: [id])
  userId     String      @map("user_id")
  ratingType RatingType  @map("rating_type") // PREVIEW or REPORT
  rating     RatingValue // BAD, OK, or GOOD
  feedback   String?     @db.Text // Optional text feedback
  metadata   Json?       // Additional context
  createdAt  DateTime    @default(now())
}

enum RatingType {
  PREVIEW
  REPORT
}

enum RatingValue {
  BAD
  OK
  GOOD
}
```

### API Endpoints

**Rate a Response:**

```typescript
POST /api/v1/chat/:messageId/rate
{
  "ratingType": "REPORT",
  "rating": "GOOD",
  "feedback": "Very clear and helpful report!",
  "metadata": { "queryType": "time_summary" }
}
```

**Get Ratings:**

```typescript
GET /api/v1/chat/:messageId/ratings
// Returns all ratings for a message

GET /api/v1/chat/ratings/analytics
// Returns comprehensive analytics
{
  "preview": { totalRatings: 156, goodPercentage: 68, ... },
  "report": { totalRatings: 142, goodPercentage: 65, ... },
  "overall": { totalRatings: 298, goodPercentage: 66, ... }
}
```

### Use Cases for LLM Training

1. **Fine-Tuning Training Data**
   - GOOD ratings: Use as positive examples
   - BAD ratings: Identify failure patterns
   - Feedback text: Understand specific issues

2. **Prompt Engineering**
   - Analyze which prompts generate better ratings
   - Refine system prompts based on feedback
   - A/B test different approaches

3. **Quality Metrics**
   - Track improvement over time
   - Compare performance across LLM providers
   - Identify areas needing improvement

### Features

- **Duplicate Prevention**: `getOrCreateRating()` prevents duplicate ratings
  while allowing updates
- **Comprehensive Analytics**: Track satisfaction metrics across preview and
  report types
- **Contextual Metadata**: Store query type, format, and other context with
  ratings
- **Optional Feedback**: Users can provide detailed text feedback
- **Training Ready**: All data structured for LLM training pipelines

## Conclusion

The FreeTimeChat LLM-powered chat system provides a secure, scalable way to
interact with databases using natural language. The **six-phase approach**
ensures comprehensive query handling:

1. **Phase 1: Intent & Field Identification** - Determines user intent, extracts
   entities, identifies fields, and maps to database tables
2. **Phase 2: SQL Generation** - Generates valid, fully-qualified SQL from user
   intent using Phase 1 context
3. **Phase 3: Security Validation** - Validates security with 100% confidence
   requirement
4. **Phase 4: Query Preview & Confirmation** - Shows sample results (LIMIT 5)
   and requests user confirmation before full execution
5. **Phase 5: Report Formatting** - Intelligently detects desired output format
   and provides format-specific instructions to LLM
6. **Phase 6: Response Rating** - Collects user feedback (BAD/OK/GOOD) on
   previews and reports for continuous improvement

This architecture provides structured intent understanding, prevents SQL
injection, enforces RBAC, provides transparency through previews, delivers
intelligently formatted results, collects feedback for LLM training, and
maintains enterprise-level security while offering an intuitive user experience.

---

**Last Updated:** 2025-01-11 **Version:** 4.0.0 **Maintainer:** FreeTimeChat
Development Team
