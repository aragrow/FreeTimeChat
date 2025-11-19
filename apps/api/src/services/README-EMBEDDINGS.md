# Embeddings Service

## Overview

The embeddings service provides vector embeddings for semantic search and memory
features in FreeTimeChat. It supports multiple embedding providers with
tenant-specific configurations, allowing different tenants to use different
providers or models.

**Supported Providers:**

- **Google Gemini**: text-embedding-004 (768 dimensions)
- **OpenAI**: text-embedding-3-small (1536 dimensions), text-embedding-3-large
  (3072 dimensions)
- **Mock**: Deterministic hash-based embeddings for development

## Features

- **Multi-Provider Support**: Google Gemini, OpenAI, and mock embeddings
- **Tenant-Specific Configs**: Each tenant can use their own embedding provider
- **Database-Driven Configuration**: Configure via LLM Config API (shares API
  key with chat)
- **Environment Fallback**: Falls back to environment variables when no config
  exists
- **Automatic Fallback**: Gracefully falls back to mock embeddings when
  unavailable
- **Batch Processing**: Generate embeddings for multiple texts in parallel
- **Task Types**: Support for different embedding task types (retrieval,
  similarity, classification)
- **Provider Caching**: 5-minute cache for performance optimization

## Configuration

There are two ways to configure embeddings: **Database Configuration**
(recommended) and **Environment Variables** (fallback).

### Option 1: Database Configuration (Recommended)

Configure embeddings via the LLM Config API. This allows tenant-specific
configurations and shares the API key with chat.

**For Admin (System-Wide)**:

```bash
POST /api/v1/admin/llm-config
Authorization: Bearer <admin-token>

{
  "provider": "GOOGLE_GEMINI",
  "apiKey": "AIza...",
  "defaultModel": "gemini-1.5-pro",
  "embeddingModel": "text-embedding-004",
  "embeddingEnabled": true,
  "temperature": 0.7,
  "maxTokens": 2000
}
```

**For Tenant Admin (Tenant-Specific)**:

```bash
POST /api/v1/admin/llm-config
Authorization: Bearer <tenantadmin-token>

{
  "provider": "OPENAI",
  "apiKey": "sk-...",
  "defaultModel": "gpt-4",
  "embeddingModel": "text-embedding-3-small",
  "embeddingEnabled": true,
  "temperature": 0.7,
  "maxTokens": 2000
}
```

**Configuration Priority**:

1. Tenant-specific database config (if tenant exists)
2. System-wide database config (if no tenant config)
3. Environment variables (if no database config)
4. Mock embeddings (if nothing configured)

### Option 2: Environment Variables (Fallback)

Set environment variables for system-wide defaults:

```bash
# .env
LLM_PROVIDER=google-gemini  # or openai
LLM_API_KEY=AIza...         # Your API key
```

**Get API Keys:**

- Google Gemini: https://makersuite.google.com/app/apikey
- OpenAI: https://platform.openai.com/api-keys

### Verify Embeddings Configuration

When the API starts, you'll see one of these messages:

**Real embeddings enabled:**

```
✓ Embeddings service initialized
```

**Mock embeddings (fallback):**

```
Using mock embeddings - configure via LLM Config API or environment variables
```

## Usage

### Basic Usage

```typescript
import { embeddingsService } from './embeddings.service';

// Generate a single embedding (system-wide config)
const embedding = await embeddingsService.generateEmbedding(
  'What projects did I work on this week?',
  null // tenantId: null = system-wide config
);

// Generate embedding for a specific tenant
const tenantEmbedding = await embeddingsService.generateEmbedding(
  'What projects did I work on this week?',
  'tenant-uuid-here' // Uses tenant-specific config
);

// Get embedding dimension for a tenant
const dimension = await embeddingsService.getDimension('tenant-uuid-here');
console.log(`Embedding dimension: ${dimension}`);
```

### Batch Embeddings

```typescript
// Generate multiple embeddings at once
const texts = [
  'I worked 2 hours on Project X',
  'I logged 3 hours on Project Y',
  'Show me my time entries for today',
];

const embeddings = await embeddingsService.generateEmbeddings(
  texts,
  'tenant-uuid-here', // tenantId
  { taskType: 'RETRIEVAL_DOCUMENT' }
);
```

### Task-Specific Embeddings

The embedding model supports different task types for better results:

```typescript
// For search queries
const queryEmbedding = await embeddingsService.generateEmbedding(
  'Find my time entries',
  'tenant-uuid-here',
  { taskType: 'RETRIEVAL_QUERY' }
);

// For documents to be searched
const docEmbedding = await embeddingsService.generateEmbedding(
  'Worked 2 hours on authentication feature',
  'tenant-uuid-here',
  { taskType: 'RETRIEVAL_DOCUMENT' }
);

// For similarity comparison
const similarityEmbedding = await embeddingsService.generateEmbedding(
  'Backend development',
  'tenant-uuid-here',
  { taskType: 'SEMANTIC_SIMILARITY' }
);

// For classification tasks
const classificationEmbedding = await embeddingsService.generateEmbedding(
  'This is a bug fix',
  'tenant-uuid-here',
  { taskType: 'CLASSIFICATION' }
);
```

### Calculate Similarity

```typescript
const embedding1 = await embeddingsService.generateEmbedding(
  'Time tracking',
  'tenant-uuid-here'
);
const embedding2 = await embeddingsService.generateEmbedding(
  'Project management',
  'tenant-uuid-here'
);

const similarity = embeddingsService.calculateSimilarity(
  embedding1,
  embedding2
);
console.log(`Similarity: ${(similarity * 100).toFixed(2)}%`);
```

## Integration with Semantic Memory

The embeddings service is automatically used by `SemanticMemoryService`:

```typescript
// In semantic-memory.service.ts
async generateEmbedding(text: string, tenantId: string | null = null): Promise<number[]> {
  return embeddingsService.generateEmbedding(text, tenantId, {
    taskType: 'RETRIEVAL_DOCUMENT',
  });
}

async getEmbeddingDimension(tenantId: string | null = null): Promise<number> {
  return embeddingsService.getDimension(tenantId);
}
```

This enables:

- **Message embeddings**: Store vector representations of chat messages
- **Semantic search**: Find similar messages based on meaning, not keywords
- **Context retrieval**: Get relevant conversation history
- **Memory consolidation**: Group related messages
- **Tenant-specific embeddings**: Each tenant can use different embedding
  providers

## Provider Caching

The embeddings service caches provider instances per tenant for performance:

- **Cache Duration**: 5 minutes (300 seconds)
- **Cache Key**: `tenant:{tenantId}` or `tenant:system` for system-wide
- **Benefits**:
  - Avoids repeated database queries for config
  - Reuses provider instances (API client connections)
  - Reduces latency for embedding generation
- **Cache Invalidation**: Automatic after 5 minutes, or restart server to clear

**Example Flow**:

1. First request for tenant → Load config from DB → Create provider → Cache for
   5 min
2. Subsequent requests within 5 min → Use cached provider (fast)
3. After 5 minutes → Cache expired → Reload config from DB

This means configuration changes take up to 5 minutes to take effect.

## Embedding Dimensions

Embedding dimensions vary by provider and model:

| Provider      | Model                  | Dimensions    |
| ------------- | ---------------------- | ------------- |
| Google Gemini | text-embedding-004     | 768           |
| OpenAI        | text-embedding-3-small | 1536          |
| OpenAI        | text-embedding-3-large | 3072          |
| Mock          | deterministic-hash     | 768 (default) |

**Important**: When switching providers or models, you must regenerate all
existing embeddings. Embeddings of different dimensions cannot be compared for
similarity.

All embeddings are normalized to unit vectors for cosine similarity
calculations.

## Error Handling

The service handles errors gracefully:

```typescript
try {
  const embedding = await embeddingsService.generateEmbedding(text);
} catch (error) {
  // Service automatically falls back to mock embeddings on API errors
  // Error is logged but doesn't throw
}
```

## Performance Considerations

### Batch vs Individual

For multiple texts, always use batch processing:

```typescript
// ❌ Slow - sequential API calls
for (const text of texts) {
  await embeddingsService.generateEmbedding(text);
}

// ✅ Fast - parallel API calls
const embeddings = await embeddingsService.generateEmbeddings(texts);
```

### Caching

Consider caching embeddings to reduce API calls:

```typescript
// Store embedding in message metadata
await prisma.message.update({
  where: { id: messageId },
  data: {
    metadata: {
      embedding: await embeddingsService.generateEmbedding(content),
    },
  },
});
```

## Cost Optimization

**Pricing (as of 2024-2025)**:

- **Google Gemini**: text-embedding-004 is free (check current pricing:
  https://ai.google.dev/pricing)
- **OpenAI**: $0.00002 per 1K tokens for text-embedding-3-small (check current
  pricing: https://openai.com/pricing)

To reduce costs:

1. **Cache embeddings**: Store in database, don't regenerate
2. **Batch processing**: Use `generateEmbeddings()` for multiple texts
3. **Lazy generation**: Only generate embeddings when needed for search
4. **Choose appropriate model**: text-embedding-3-small (1536 dim) is cheaper
   than text-embedding-3-large (3072 dim)
5. **Tenant-specific configs**: Allow tenants to bring their own API keys

## Development vs Production

### Development (Mock Embeddings)

- Fast and free
- Deterministic (same text = same embedding)
- Good for testing
- No API key required

### Production (Real Embeddings)

- Semantic understanding
- Better search quality
- Requires API key
- Minimal cost (free tier available)

## Migration Path

### From Mock to Real Embeddings

1. **Configure API key**:

   ```bash
   LLM_PROVIDER=google-gemini
   LLM_API_KEY=AIza...
   ```

2. **Restart server**: Embeddings service initializes on startup

3. **Regenerate embeddings** (optional):

   ```typescript
   // Update existing message embeddings
   const messages = await prisma.message.findMany();
   for (const message of messages) {
     const embedding = await embeddingsService.generateEmbedding(
       message.content
     );
     await prisma.message.update({
       where: { id: message.id },
       data: { metadata: { embedding } },
     });
   }
   ```

   **Note**: Old mock embeddings and new real embeddings are not compatible for
   similarity comparison. Regenerate all embeddings when switching.

## Troubleshooting

### "Using mock embeddings" warning

**Cause**: No LLM configuration found in database, and no environment variables
set

**Fix Option 1 (Recommended)**: Configure via LLM Config API:

```bash
POST /api/v1/admin/llm-config
{
  "provider": "GOOGLE_GEMINI",
  "apiKey": "AIza...",
  "defaultModel": "gemini-1.5-pro",
  "embeddingModel": "text-embedding-004",
  "embeddingEnabled": true
}
```

**Fix Option 2**: Set environment variables:

```bash
LLM_PROVIDER=google-gemini
LLM_API_KEY=AIza...
```

### API errors / Rate limits

**Cause**: API quota exceeded or authentication failed

**Fix**:

- Verify API key is valid (test via `/api/v1/admin/llm-config/:id/test`)
- Check quota at provider's console (Google Cloud Console or OpenAI Dashboard)
- Service automatically falls back to mock embeddings on errors
- Consider using different provider or increasing quota

### Dimension mismatch errors

**Cause**: Mixing embeddings from different models or providers

**Fix**: Regenerate all embeddings when switching providers:

```typescript
// Example: Regenerate embeddings after switching provider
const messages = await prisma.message.findMany();
for (const message of messages) {
  const embedding = await embeddingsService.generateEmbedding(
    message.content,
    tenantId // Use appropriate tenantId
  );
  await prisma.message.update({
    where: { id: message.id },
    data: { metadata: { embedding } },
  });
}
```

### Different tenants have different embedding dimensions

**Expected Behavior**: This is by design - each tenant can use different
providers with different dimensions.

**Impact**:

- Embeddings from different tenants cannot be compared
- Each tenant's semantic search works independently
- This is intentional for tenant isolation

## API Reference

### `embeddingsService.generateEmbedding(text, tenantId, options?)`

Generate embedding for a single text.

**Parameters:**

- `text` (string): Text to embed
- `tenantId` (string | null): Tenant ID for tenant-specific config, or null for
  system-wide
- `options` (optional):
  - `taskType`: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' | 'SEMANTIC_SIMILARITY'
    | 'CLASSIFICATION'
  - `title`: Optional title for context

**Returns:** `Promise<number[]>` - Embedding vector (dimensions vary by
provider)

### `embeddingsService.generateEmbeddings(texts, tenantId, options?)`

Generate embeddings for multiple texts in parallel.

**Parameters:**

- `texts` (string[]): Array of texts to embed
- `tenantId` (string | null): Tenant ID for tenant-specific config, or null for
  system-wide
- `options` (optional): Same as generateEmbedding

**Returns:** `Promise<number[][]>` - Array of embedding vectors

### `embeddingsService.getDimension(tenantId)`

Get embedding dimension for a tenant's configured provider.

**Parameters:**

- `tenantId` (string | null): Tenant ID, or null for system-wide

**Returns:** `Promise<number>` - Embedding dimension (768, 1536, or 3072
depending on provider)

### `embeddingsService.calculateSimilarity(embedding1, embedding2)`

Calculate cosine similarity between two embeddings.

**Parameters:**

- `embedding1` (number[]): First embedding
- `embedding2` (number[]): Second embedding

**Returns:** `number` - Similarity score (0-1, where 1 is identical)

**Note:** Both embeddings must have the same dimensions (same provider/model).

### Static Methods

### `EmbeddingsService.getDefaultEmbeddingModel(provider)`

Get the default embedding model for a provider.

**Parameters:**

- `provider` (LLMProvider): Provider enum value

**Returns:** `string` - Default model name

### `EmbeddingsService.getEmbeddingDimension(provider, model?)`

Get embedding dimension for a provider and model.

**Parameters:**

- `provider` (LLMProvider): Provider enum value
- `model` (string, optional): Specific model name

**Returns:** `number` - Embedding dimension

## Further Reading

- [Google Gemini Embeddings Documentation](https://ai.google.dev/gemini-api/docs/embeddings)
- [OpenAI Embeddings Documentation](https://platform.openai.com/docs/guides/embeddings)
- [LLM Configuration API](../routes/admin/llm-config.routes.ts)
- [Semantic Memory Service](./semantic-memory.service.ts)
- [Vector Similarity Search](https://en.wikipedia.org/wiki/Cosine_similarity)
