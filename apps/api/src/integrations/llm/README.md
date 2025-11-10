# LLM Integration Package

A unified interface for integrating multiple Language Model (LLM) providers into
FreeTimeChat.

## Features

- **Multi-Provider Support**: OpenAI, Anthropic Claude, Google Gemini,
  Perplexity AI, and Abacus.ai
- **Unified API**: Single interface for all providers
- **Type Safety**: Full TypeScript support with type definitions
- **Streaming Support**: Real-time response streaming (where supported)
- **Automatic Fallback**: Falls back to pattern-based responses when LLM is
  unavailable
- **Error Handling**: Comprehensive error handling and retry logic
- **Flexible Configuration**: Environment-based configuration

## Architecture

```
llm/
├── types.ts                    # Common types and interfaces
├── base-provider.ts            # Abstract base class
├── llm.factory.ts              # Provider factory
├── llm.service.ts              # Singleton service
├── index.ts                    # Package exports
└── providers/
    ├── openai.provider.ts      # OpenAI implementation
    ├── anthropic.provider.ts   # Anthropic Claude implementation
    ├── gemini.provider.ts      # Google Gemini implementation
    ├── perplexity.provider.ts  # Perplexity AI implementation
    └── abacus.provider.ts      # Abacus.ai implementation
```

## Supported Providers

### 1. OpenAI

- **Models**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Features**: Streaming, function calling, vision
- **API**: https://platform.openai.com/
- **Context Window**: Up to 128K tokens

### 2. Anthropic Claude

- **Models**: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Sonnet
- **Features**: Streaming, large context, superior reasoning
- **API**: https://console.anthropic.com/
- **Context Window**: Up to 200K tokens

### 3. Google Gemini

- **Models**: Gemini 1.5 Pro, Gemini 1.5 Flash
- **Features**: Streaming, vision, massive context
- **API**: https://ai.google.dev/
- **Context Window**: Up to 1M tokens

### 4. Perplexity AI

- **Models**: Llama 3.1 Sonar (Small/Large)
- **Features**: Real-time web search, streaming
- **API**: https://www.perplexity.ai/
- **Context Window**: Up to 127K tokens

### 5. Abacus.ai

- **Models**: Various models (check documentation)
- **Features**: Streaming, OpenAI-compatible API
- **API**: https://abacus.ai/
- **Context Window**: Up to 128K tokens

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Provider Selection (choose one)
LLM_PROVIDER=openai  # or: anthropic, google-gemini, perplexity, abacus-ai

# API Key (required)
LLM_API_KEY=your-api-key-here

# Model Selection
LLM_DEFAULT_MODEL=gpt-4-turbo

# Optional Settings
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=2000
LLM_BASE_URL=  # Custom API endpoint (optional)
LLM_ORGANIZATION=  # Organization ID (OpenAI only)
LLM_TIMEOUT=30000  # Request timeout in ms
```

### Provider-Specific Examples

#### OpenAI

```bash
LLM_PROVIDER=openai
LLM_API_KEY=sk-...
LLM_DEFAULT_MODEL=gpt-4-turbo
LLM_ORGANIZATION=org-...  # Optional
```

#### Anthropic Claude

```bash
LLM_PROVIDER=anthropic
LLM_API_KEY=sk-ant-...
LLM_DEFAULT_MODEL=claude-3-5-sonnet-20241022
LLM_MAX_TOKENS=2000  # Required for Anthropic
```

#### Google Gemini

```bash
LLM_PROVIDER=google-gemini
LLM_API_KEY=AIza...
LLM_DEFAULT_MODEL=gemini-1.5-pro
```

#### Perplexity AI

```bash
LLM_PROVIDER=perplexity
LLM_API_KEY=pplx-...
LLM_DEFAULT_MODEL=llama-3.1-sonar-small-128k-online
```

#### Abacus.ai

```bash
LLM_PROVIDER=abacus-ai
LLM_API_KEY=...
LLM_DEFAULT_MODEL=...
LLM_BASE_URL=https://api.abacus.ai/v1
```

## Usage

### Basic Usage

```typescript
import { getLLMService, LLMRole } from '@/integrations/llm';

// Get the singleton service
const llmService = getLLMService();

// Check if LLM is configured
if (!llmService.isConfigured()) {
  console.log('LLM not configured, using fallback');
  return;
}

// Create messages
const messages = [
  {
    role: LLMRole.SYSTEM,
    content: 'You are a helpful assistant.',
  },
  {
    role: LLMRole.USER,
    content: 'What is the capital of France?',
  },
];

// Get completion
const response = await llmService.complete(messages, {
  temperature: 0.7,
  maxTokens: 500,
});

console.log(response.content);
```

### Streaming Usage

```typescript
import { getLLMService, LLMRole } from '@/integrations/llm';

const llmService = getLLMService();

const messages = [{ role: LLMRole.USER, content: 'Tell me a story' }];

// Stream completion
for await (const chunk of llmService.completeStream(messages)) {
  if (!chunk.isComplete) {
    process.stdout.write(chunk.content);
  } else {
    console.log(`\nFinish reason: ${chunk.finishReason}`);
  }
}
```

### Custom Configuration

```typescript
import { createLLMProvider } from '@/integrations/llm';

// Create a custom provider instance
const provider = createLLMProvider({
  provider: 'openai',
  apiKey: 'your-api-key',
  defaultModel: 'gpt-4',
  defaultTemperature: 0.8,
  defaultMaxTokens: 1000,
});

// Use the provider
const response = await provider.complete(messages);
```

### Direct Provider Usage

```typescript
import { OpenAIProvider } from '@/integrations/llm';

const provider = new OpenAIProvider({
  apiKey: 'your-api-key',
  defaultModel: 'gpt-4-turbo',
  organization: 'org-...',
});

// Validate configuration
await provider.validateConfig();

// Get completion
const response = await provider.complete(messages);
```

## Integration with Chat Service

The LLM integration is automatically used in the chat service:

```typescript
// In chat.service.ts
import { getLLMService, LLMRole } from '@/integrations/llm';

private async handleGeneralChat(
  userId: string,
  message: string,
  conversationId: string
): Promise<string> {
  const llmService = getLLMService();

  // Automatically uses LLM if configured
  if (!llmService.isConfigured()) {
    return this.generateFallbackResponse(userId, message);
  }

  // Build context with system message and conversation history
  const llmMessages = [
    { role: LLMRole.SYSTEM, content: systemContext },
    ...conversationHistory,
    { role: LLMRole.USER, content: message },
  ];

  const response = await llmService.complete(llmMessages);
  return response.content;
}
```

## API Reference

### Types

#### LLMMessage

```typescript
interface LLMMessage {
  role: LLMRole; // SYSTEM, USER, or ASSISTANT
  content: string; // Message content
  name?: string; // Optional message name
}
```

#### LLMResponse

```typescript
interface LLMResponse {
  content: string; // Response content
  role: LLMRole; // Response role (always ASSISTANT)
  finishReason?: string; // Why generation stopped
  usage?: {
    // Token usage stats
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string; // Model used
  provider: string; // Provider name
}
```

#### LLMRequestConfig

```typescript
interface LLMRequestConfig {
  model?: string; // Override default model
  temperature?: number; // 0-1, controls randomness
  maxTokens?: number; // Max response length
  topP?: number; // Nucleus sampling
  frequencyPenalty?: number; // Penalize frequent tokens
  presencePenalty?: number; // Penalize repeated topics
  stop?: string[]; // Stop sequences
  stream?: boolean; // Enable streaming
}
```

### LLM Service Methods

#### `isConfigured(): boolean`

Check if an LLM provider is configured.

#### `getProviderName(): string | null`

Get the name of the current provider.

#### `complete(messages, config?): Promise<LLMResponse>`

Generate a completion from messages.

#### `completeStream(messages, config?): AsyncGenerator<LLMStreamChunk>`

Generate a streaming completion.

#### `getCapabilities(): LLMProviderCapabilities | null`

Get provider capabilities (streaming, vision, etc.).

#### `getDefaultModel(): string | null`

Get the configured default model.

## Error Handling

All providers use a unified error handling approach:

```typescript
import { LLMError } from '@/integrations/llm';

try {
  const response = await llmService.complete(messages);
} catch (error) {
  if (error instanceof LLMError) {
    console.error(`LLM Error from ${error.provider}:`, error.message);
    console.error('Status Code:', error.statusCode);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Fallback Behavior

When no LLM is configured, the chat service automatically falls back to
pattern-based responses:

- Greetings: "Hello! How can I help you today?"
- Thanks: "You're welcome!"
- Default: Suggests time tracking commands

This ensures the application works even without LLM configuration.

## Best Practices

1. **Always Check Configuration**

   ```typescript
   if (llmService.isConfigured()) {
     // Use LLM
   } else {
     // Use fallback
   }
   ```

2. **Handle Errors Gracefully**

   ```typescript
   try {
     return await llmService.complete(messages);
   } catch (error) {
     console.error('LLM failed:', error);
     return fallbackResponse;
   }
   ```

3. **Use Appropriate Temperature**
   - `0.0-0.3`: Deterministic, factual responses
   - `0.4-0.7`: Balanced creativity and consistency
   - `0.8-1.0`: Creative, varied responses

4. **Set Token Limits**

   ```typescript
   const response = await llmService.complete(messages, {
     maxTokens: 500, // Limit response length
   });
   ```

5. **Provide System Context**
   ```typescript
   const messages = [
     {
       role: LLMRole.SYSTEM,
       content: 'You are FreeTimeChat assistant. Be concise and helpful.',
     },
     { role: LLMRole.USER, content: userMessage },
   ];
   ```

## Adding New Providers

To add a new LLM provider:

1. **Create Provider Class**

   ```typescript
   // src/integrations/llm/providers/custom.provider.ts
   import { BaseLLMProvider } from '../base-provider';

   export class CustomProvider extends BaseLLMProvider {
     getProviderName(): string {
       return 'Custom';
     }

     async complete(messages, config?) {
       // Implementation
     }

     async *completeStream(messages, config?) {
       // Implementation
     }

     async validateConfig() {
       // Validation
     }
   }
   ```

2. **Update Factory**

   ```typescript
   // src/integrations/llm/llm.factory.ts
   case 'custom':
     return new CustomProvider(providerConfig);
   ```

3. **Update Types**

   ```typescript
   // src/integrations/llm/types.ts
   export enum LLMProvider {
     CUSTOM = 'custom',
     // ... other providers
   }
   ```

4. **Update Documentation**
   - Add provider to README
   - Add example configuration to .env.example

## Testing

Test your LLM configuration:

```bash
# Set your provider in .env
LLM_PROVIDER=openai
LLM_API_KEY=sk-...
LLM_DEFAULT_MODEL=gpt-4-turbo

# Start the API
pnpm dev

# Check logs for:
# "LLM Provider initialized: OpenAI"
# "LLM Provider validated successfully"
```

Test in chat:

1. Open the chat interface
2. Send a general message (not a time entry or query)
3. The response should come from your configured LLM

## Troubleshooting

### LLM Not Initializing

- Check `LLM_PROVIDER` is set correctly
- Verify `LLM_API_KEY` is not empty
- Check API key is valid for the provider
- Review server logs for initialization errors

### API Errors

- Verify API key has correct permissions
- Check rate limits haven't been exceeded
- Ensure model name is correct for provider
- Validate BASE_URL if using custom endpoint

### Fallback Responses

- If you're getting pattern-based responses, LLM is not configured
- Check server logs: "No LLM provider configured"
- Verify environment variables are loaded correctly

## Cost Management

Tips for managing LLM costs:

1. **Use Appropriate Models**
   - GPT-3.5 Turbo: Cheaper, faster
   - GPT-4: More capable, more expensive
   - Gemini Flash: Fast and cost-effective

2. **Limit Token Usage**

   ```typescript
   maxTokens: 500; // Keep responses concise
   ```

3. **Monitor Usage**
   - Check provider dashboards regularly
   - Set up billing alerts
   - Log token usage in responses

4. **Cache Common Responses**
   - Implement caching for frequent queries
   - Store common patterns
   - Reduce unnecessary API calls

## Security

1. **API Key Protection**
   - Never commit API keys to version control
   - Use environment variables
   - Rotate keys regularly

2. **Rate Limiting**
   - Implement rate limiting per user
   - Set maximum tokens per request
   - Monitor for abuse

3. **Content Filtering**
   - Validate user input
   - Filter sensitive information
   - Implement content moderation

## License

This LLM integration package is part of FreeTimeChat and follows the same
license.

## Support

For issues or questions:

- Check this documentation first
- Review provider-specific documentation
- Check FreeTimeChat GitHub issues
- Contact support team

---

**Note**: Always test LLM integrations thoroughly before deploying to
production. Monitor costs, performance, and user feedback carefully.
