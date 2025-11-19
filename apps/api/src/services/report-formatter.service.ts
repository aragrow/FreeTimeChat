/**
 * Report Formatter Service
 *
 * Phase 4: Analyzes user intent and formats query results accordingly
 * Detects desired output format from natural language and generates appropriate formatting instructions
 */

export type ReportFormat =
  | 'table'
  | 'list'
  | 'summary'
  | 'detailed'
  | 'chart'
  | 'statistics'
  | 'comparison'
  | 'timeline'
  | 'breakdown'
  | 'json'
  | 'csv'
  | 'markdown';

export interface FormatKeyword {
  keyword: string;
  format: ReportFormat;
  priority: number; // Higher priority wins in case of conflicts
}

export interface ReportFormatResult {
  primaryFormat: ReportFormat;
  secondaryFormats: ReportFormat[];
  detectedKeywords: string[];
  confidence: number; // 0-1
  formatInstructions: string;
}

export class ReportFormatterService {
  /**
   * Comprehensive list of format keywords and their associated report formats
   */
  private readonly FORMAT_KEYWORDS: FormatKeyword[] = [
    // Table formats (highest priority for data display)
    { keyword: 'table', format: 'table', priority: 10 },
    { keyword: 'grid', format: 'table', priority: 9 },
    { keyword: 'spreadsheet', format: 'table', priority: 9 },
    { keyword: 'tabular', format: 'table', priority: 9 },
    { keyword: 'rows', format: 'table', priority: 7 },
    { keyword: 'columns', format: 'table', priority: 7 },

    // List formats
    { keyword: 'list', format: 'list', priority: 10 },
    { keyword: 'bullet', format: 'list', priority: 9 },
    { keyword: 'enumerate', format: 'list', priority: 9 },
    { keyword: 'items', format: 'list', priority: 7 },
    { keyword: 'show me', format: 'list', priority: 5 },

    // Summary formats
    { keyword: 'summary', format: 'summary', priority: 10 },
    { keyword: 'summarize', format: 'summary', priority: 10 },
    { keyword: 'overview', format: 'summary', priority: 9 },
    { keyword: 'brief', format: 'summary', priority: 8 },
    { keyword: 'quick', format: 'summary', priority: 7 },
    { keyword: 'highlights', format: 'summary', priority: 8 },

    // Detailed formats
    { keyword: 'detailed', format: 'detailed', priority: 10 },
    { keyword: 'detail', format: 'detailed', priority: 9 },
    { keyword: 'comprehensive', format: 'detailed', priority: 9 },
    { keyword: 'full', format: 'detailed', priority: 8 },
    { keyword: 'complete', format: 'detailed', priority: 8 },
    { keyword: 'thorough', format: 'detailed', priority: 8 },
    { keyword: 'in-depth', format: 'detailed', priority: 9 },

    // Chart/Graph formats
    { keyword: 'chart', format: 'chart', priority: 10 },
    { keyword: 'graph', format: 'chart', priority: 10 },
    { keyword: 'plot', format: 'chart', priority: 9 },
    { keyword: 'visualize', format: 'chart', priority: 9 },
    { keyword: 'visualization', format: 'chart', priority: 9 },
    { keyword: 'bar chart', format: 'chart', priority: 10 },
    { keyword: 'pie chart', format: 'chart', priority: 10 },
    { keyword: 'line chart', format: 'chart', priority: 10 },

    // Statistics formats
    { keyword: 'statistics', format: 'statistics', priority: 10 },
    { keyword: 'stats', format: 'statistics', priority: 10 },
    { keyword: 'metrics', format: 'statistics', priority: 9 },
    { keyword: 'numbers', format: 'statistics', priority: 7 },
    { keyword: 'count', format: 'statistics', priority: 8 },
    { keyword: 'total', format: 'statistics', priority: 8 },
    { keyword: 'average', format: 'statistics', priority: 9 },
    { keyword: 'sum', format: 'statistics', priority: 8 },
    { keyword: 'aggregate', format: 'statistics', priority: 9 },

    // Comparison formats
    { keyword: 'compare', format: 'comparison', priority: 10 },
    { keyword: 'comparison', format: 'comparison', priority: 10 },
    { keyword: 'versus', format: 'comparison', priority: 9 },
    { keyword: 'vs', format: 'comparison', priority: 9 },
    { keyword: 'difference', format: 'comparison', priority: 8 },
    { keyword: 'contrast', format: 'comparison', priority: 8 },
    { keyword: 'side-by-side', format: 'comparison', priority: 9 },

    // Timeline formats
    { keyword: 'timeline', format: 'timeline', priority: 10 },
    { keyword: 'over time', format: 'timeline', priority: 9 },
    { keyword: 'history', format: 'timeline', priority: 8 },
    { keyword: 'trend', format: 'timeline', priority: 9 },
    { keyword: 'chronological', format: 'timeline', priority: 9 },
    { keyword: 'time series', format: 'timeline', priority: 10 },
    { keyword: 'progression', format: 'timeline', priority: 8 },

    // Breakdown formats
    { keyword: 'breakdown', format: 'breakdown', priority: 10 },
    { keyword: 'break down', format: 'breakdown', priority: 10 },
    { keyword: 'group by', format: 'breakdown', priority: 9 },
    { keyword: 'categorize', format: 'breakdown', priority: 9 },
    { keyword: 'category', format: 'breakdown', priority: 8 },
    { keyword: 'by category', format: 'breakdown', priority: 9 },
    { keyword: 'segment', format: 'breakdown', priority: 8 },

    // Export formats
    { keyword: 'json', format: 'json', priority: 10 },
    { keyword: 'csv', format: 'csv', priority: 10 },
    { keyword: 'markdown', format: 'markdown', priority: 10 },
    { keyword: 'export', format: 'csv', priority: 8 },
  ];

  /**
   * Phase 4: Analyze user query and detect desired report format
   */
  detectFormat(userQuery: string): ReportFormatResult {
    const queryLower = userQuery.toLowerCase();
    const detectedFormats = new Map<ReportFormat, number>();
    const detectedKeywords: string[] = [];

    // Scan for format keywords
    for (const { keyword, format, priority } of this.FORMAT_KEYWORDS) {
      if (queryLower.includes(keyword)) {
        detectedKeywords.push(keyword);
        const currentPriority = detectedFormats.get(format) || 0;
        detectedFormats.set(format, Math.max(currentPriority, priority));
      }
    }

    // Sort formats by priority
    const sortedFormats = Array.from(detectedFormats.entries()).sort((a, b) => b[1] - a[1]);

    // Default to list format if no specific format detected
    const primaryFormat: ReportFormat = sortedFormats.length > 0 ? sortedFormats[0][0] : 'list';
    const secondaryFormats: ReportFormat[] = sortedFormats.slice(1, 3).map((f) => f[0]);

    // Calculate confidence based on number of matches and priority
    const confidence = sortedFormats.length > 0 ? Math.min(sortedFormats[0][1] / 10, 1.0) : 0.5;

    // Generate format instructions for LLM
    const formatInstructions = this.generateFormatInstructions(
      primaryFormat,
      secondaryFormats,
      userQuery
    );

    return {
      primaryFormat,
      secondaryFormats,
      detectedKeywords,
      confidence,
      formatInstructions,
    };
  }

  /**
   * Generate detailed formatting instructions for the LLM based on detected format
   */
  private generateFormatInstructions(
    primaryFormat: ReportFormat,
    secondaryFormats: ReportFormat[],
    _userQuery: string
  ): string {
    const instructions: string[] = [];

    // Add primary format instructions
    instructions.push(this.getFormatInstructions(primaryFormat));

    // Add secondary format considerations
    if (secondaryFormats.length > 0) {
      instructions.push(
        `\nAdditional considerations: ${secondaryFormats.map((f) => this.getFormatName(f)).join(', ')}`
      );
    }

    // Add general guidelines
    instructions.push(`\n**General Guidelines:**
- Be clear and concise
- Use proper formatting (markdown tables, lists, code blocks)
- Highlight key insights
- Include relevant context from the data
- Make the output easy to scan and understand`);

    return instructions.join('\n');
  }

  /**
   * Get specific formatting instructions for each format type
   */
  private getFormatInstructions(format: ReportFormat): string {
    const instructions: Record<ReportFormat, string> = {
      table: `**Format as TABLE:**
- Use markdown table syntax with proper headers
- Align columns appropriately
- Include all relevant fields
- Keep column names clear and descriptive
- Limit to most important columns if too many
- Add totals/summaries at bottom if appropriate

Example:
| Name | Count | Percentage |
|------|-------|------------|
| Item 1 | 45 | 30% |
| Item 2 | 65 | 43% |
| Total | 150 | 100% |`,

      list: `**Format as LIST:**
- Use bullet points or numbered lists
- Group related items together
- Include key details for each item
- Use sub-bullets for additional context
- Keep items concise but informative

Example:
1. **Item 1** - Description with key details
   - Additional context
   - Relevant metrics
2. **Item 2** - Description
   - Context`,

      summary: `**Format as SUMMARY:**
- Provide high-level overview (2-4 sentences)
- Highlight most important findings
- Include key metrics/numbers
- Mention any notable patterns or insights
- Keep it brief and actionable

Example:
Found 45 active users across 3 departments. Engineering has the highest activity (60%), followed by Sales (25%). Average session time is 2.5 hours. Notable insight: Weekend activity increased 30% this month.`,

      detailed: `**Format as DETAILED REPORT:**
- Start with executive summary
- Break down into sections with headers
- Include all relevant data points
- Provide context and explanations
- Add insights and analysis
- Use tables, lists, and formatting for clarity

Structure:
## Summary
[Brief overview]

## Key Findings
- [Finding 1]
- [Finding 2]

## Detailed Analysis
[In-depth breakdown]

## Recommendations
[If applicable]`,

      chart: `**Format as CHART DESCRIPTION:**
- Describe the chart type that would best represent the data
- Provide data in a format suitable for charting
- Highlight trends and patterns
- Suggest axis labels and title
- Include data values for plotting

Example:
**Recommended Chart:** Bar Chart
**Title:** User Activity by Department
**X-Axis:** Department Name
**Y-Axis:** Number of Active Users

Data points:
- Engineering: 27 users
- Sales: 11 users
- Marketing: 7 users

Insight: Engineering shows 2.5x more activity than Sales.`,

      statistics: `**Format as STATISTICS:**
- Present key metrics with clear labels
- Include calculations (totals, averages, percentages)
- Show comparisons where relevant
- Use proper formatting for numbers
- Highlight significant statistics

Example:
**Key Statistics:**
- Total Records: 150
- Average Value: $45.50
- Median: $42.00
- Range: $10 - $200
- Standard Deviation: $15.30
- Top Quartile: $65+`,

      comparison: `**Format as COMPARISON:**
- Present items side-by-side
- Highlight differences and similarities
- Use consistent structure for each item
- Include metrics for comparison
- Summarize key differences

Example:
**Item A vs Item B**

| Metric | Item A | Item B | Difference |
|--------|--------|--------|------------|
| Count | 45 | 32 | +13 (40%) |
| Value | $500 | $380 | +$120 (31%) |

**Key Differences:**
- Item A shows 40% higher volume
- Item A has better value per unit`,

      timeline: `**Format as TIMELINE:**
- Present data chronologically
- Use dates/times as structure
- Show progression or changes over time
- Highlight trends and patterns
- Include time-based insights

Example:
**Timeline View:**

**January 2024**
- 45 events
- 15% increase from December

**February 2024**
- 52 events
- 16% increase (trend continuing)

**Trend:** Consistent month-over-month growth of ~15%`,

      breakdown: `**Format as BREAKDOWN:**
- Group data by categories
- Show distribution across groups
- Include percentages/proportions
- Highlight largest/smallest segments
- Provide subtotals for each group

Example:
**Breakdown by Category:**

**Category A** (45% of total)
- Subcategory A1: 25 items
- Subcategory A2: 20 items
- Subtotal: 45 items

**Category B** (35% of total)
- Subcategory B1: 35 items
- Subtotal: 35 items

**Total:** 100 items across 2 categories`,

      json: `**Format as JSON:**
- Provide well-structured JSON output
- Use proper indentation
- Include all data fields
- Use consistent naming conventions
- Add top-level metadata if helpful

\`\`\`json
{
  "summary": {
    "total": 150,
    "categories": 3
  },
  "data": [
    { "id": 1, "name": "Item 1", "value": 45 },
    { "id": 2, "name": "Item 2", "value": 65 }
  ]
}
\`\`\``,

      csv: `**Format as CSV:**
- Provide comma-separated values
- Include header row
- Quote fields with commas
- Keep structure flat and simple
- Suitable for Excel import

\`\`\`csv
ID,Name,Count,Value,Date
1,"Item One",45,125.50,2024-01-15
2,"Item Two",65,200.00,2024-01-16
\`\`\``,

      markdown: `**Format as MARKDOWN:**
- Use proper markdown syntax
- Include headers (##, ###)
- Use lists, tables, code blocks
- Add emphasis where needed
- Make it readable in plain text

Example:
## Report Title

### Key Findings
- **Finding 1:** Description
- **Finding 2:** Description

### Data
| Column 1 | Column 2 |
|----------|----------|
| Value 1  | Value 2  |`,
    };

    return instructions[format] || instructions.list;
  }

  /**
   * Get human-readable format name
   */
  private getFormatName(format: ReportFormat): string {
    const names: Record<ReportFormat, string> = {
      table: 'Table/Grid',
      list: 'List',
      summary: 'Summary',
      detailed: 'Detailed Report',
      chart: 'Chart/Visualization',
      statistics: 'Statistics',
      comparison: 'Comparison',
      timeline: 'Timeline',
      breakdown: 'Breakdown',
      json: 'JSON',
      csv: 'CSV',
      markdown: 'Markdown',
    };
    return names[format] || format;
  }

  /**
   * Format query results according to detected format
   * This provides structured data + instructions to the LLM
   */
  formatResultsContext(
    userQuery: __userQuery,
    string,
    queryResults: any[],
    rowCount: number,
    formatResult: ReportFormatResult
  ): string {
    let context = `\n\n**Phase 4: Report Formatting**\n`;
    context += `User Query: "${userQuery}"\n`;
    context += `Results: ${rowCount} row${rowCount !== 1 ? 's' : ''} retrieved\n`;
    context += `Detected Format: ${this.getFormatName(formatResult.primaryFormat)} (confidence: ${(formatResult.confidence * 100).toFixed(0)}%)\n`;

    if (formatResult.detectedKeywords.length > 0) {
      context += `Format Keywords: ${formatResult.detectedKeywords.join(', ')}\n`;
    }

    context += `\n**Query Results:**\n`;
    context += `\`\`\`json\n${JSON.stringify(queryResults, null, 2)}\n\`\`\`\n`;

    context += `\n${formatResult.formatInstructions}\n`;

    context += `\n**Your Task:**\n`;
    context += `Analyze the query results and format them according to the ${this.getFormatName(formatResult.primaryFormat)} format specified above. `;
    context += `Make sure to follow the formatting guidelines precisely and provide a clear, well-structured response that matches the user's intent.`;

    return context;
  }
}

// Export singleton
export const reportFormatterService = new ReportFormatterService();
