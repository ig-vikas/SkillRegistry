---
name: api-proxy-converter
type: skill
version: 1.0.0
description: Expert in converting between AI provider APIs - Anthropic, Gemini, OpenRouter, Groq, Mistral, DeepSeek, and NVIDIA NIM.
author: skillregistry
license: MIT
agents:
  - cursor
  - claude-code
  - copilot
  - gemini-cli
categories:
  - backend
  - ai-ml
  - architecture
tags:
  - ai
  - api
  - proxy
  - conversion
  - llm
  - anthropic
  - gemini
  - openrouter
  - groq
  - mistral
  - deepseek
  - nvidia
  - nim
---

# API Proxy Converter Expert

Convert requests and responses between different AI provider APIs seamlessly. Understand the message formats, authentication patterns, and response structures of each provider to enable cross-platform compatibility.

## Supported Providers

### 1. Anthropic
- **API Base**: `https://api.anthropic.com`
- **Auth**: API Key in `x-api-key` header
- **Message Format**: Messages array with `role` (user/assistant) and `content`
- **Models**: claude-sonnet-4-20250514, claude-opus-4-1-20250805, claude-3-5-haiku-20241022
- **Streaming**: Server-Sent Events (SSE)

### 2. Google Gemini
- **API Base**: `https://generativelanguage.googleapis.com/v1beta`
- **Auth**: Bearer token or API key in URL
- **Message Format**: `contents` array with `role` and `parts` (text)
- **Models**: gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash
- **Streaming**: Streaming response with chunks

### 3. OpenRouter
- **API Base**: `https://openrouter.ai/api/v1`
- **Auth**: API Key in `Authorization` header (Bearer)
- **Message Format**: OpenAI-compatible messages array
- **Models**: Access to 200+ models from various providers
- **Streaming**: SSE format

### 4. Groq
- **API Base**: `https://api.groq.com/v1`
- **Auth**: API Key in `Authorization` header (Bearer)
- **Message Format**: OpenAI-compatible messages array
- **Models**: llama-3.3-70b-versatile, llama-3.1-8b-instant, provider-specific current model IDs
- **Streaming**: SSE format

### 5. Mistral AI
- **API Base**: `https://api.mistral.ai/v1`
- **Auth**: API Key in `Authorization` header (Bearer)
- **Message Format**: OpenAI-compatible messages array
- **Models**: mistral-large-latest, mistral-small-latest, codestral-latest
- **Streaming**: SSE format

### 6. DeepSeek
- **API Base**: `https://api.deepseek.com/v1`
- **Auth**: API Key in `Authorization` header (Bearer)
- **Message Format**: OpenAI-compatible messages array
- **Models**: deepseek-v4-flash, deepseek-v4-pro; legacy aliases must be migrated before provider deprecation dates
- **Streaming**: SSE format

### 7. NVIDIA NIM
- **API Base**: Custom deployment URL
- **Auth**: API Key or custom authentication
- **Message Format**: OpenAI-compatible or custom
- **Models**: Deployed NIM models (Llama, Mistral, etc.)
- **Streaming**: Configurable

## Conversion Patterns

### Message Format Conversions

#### Anthropic to OpenAI-Compatible (Groq, Mistral, DeepSeek, OpenRouter)

**Anthropic Input:**
```json
{
  "anthropic_version": "bedrock-2023-05-31",
  "max_tokens": 1024,
  "messages": [
    {"role": "user", "content": "Hello, how are you?"}
  ]
}
```

**OpenAI-Compatible Output:**
```json
{
  "model": "llama3-8b-8192",
  "messages": [
    {"role": "user", "content": "Hello, how are you?"}
  ],
  "max_tokens": 1024,
  "stream": false
}
```

#### OpenAI-Compatible to Anthropic

**OpenAI Input:**
```json
{
  "model": "gpt-5.2",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ]
}
```

**Anthropic Output:**
```json
{
  "anthropic_version": "bedrock-2023-05-31",
  "max_tokens": 4096,
  "system": "You are a helpful assistant.",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ]
}
```

#### OpenAI-Compatible to Gemini

**OpenAI Input:**
```json
{
  "model": "gpt-5.2",
  "messages": [
    {"role": "user", "content": "What is 2+2?"}
  ]
}
```

**Gemini Output:**
```json
{
  "model": "models/gemini-2.5-pro",
  "contents": [
    {
      "role": "user",
      "parts": [
        {"text": "What is 2+2?"}
      ]
    }
  ],
  "generationConfig": {
    "maxOutputTokens": 4096
  }
}
```

#### Gemini to OpenAI-Compatible

**Gemini Input:**
```json
{
  "model": "models/gemini-2.5-pro",
  "contents": [
    {
      "role": "user",
      "parts": [
        {"text": "Explain quantum computing"}
      ]
    }
  ]
}
```

**OpenAI-Compatible Output:**
```json
{
  "model": "gemini-2.5-pro",
  "messages": [
    {"role": "user", "content": "Explain quantum computing"}
  ]
}
```

### Response Format Conversions

#### Anthropic Response to OpenAI-Compatible

**Anthropic Response:**
```json
{
  "id": "msg_123",
  "type": "message",
  "role": "assistant",
  "content": [
    {"type": "text", "text": "I'm doing well, thank you!"}
  ],
  "model": "claude-sonnet-4-20250514",
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": {"input_tokens": 25, "output_tokens": 10}
}
```

**OpenAI-Compatible Output:**
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1717000000,
  "model": "claude-sonnet-4-20250514",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "I'm doing well, thank you!"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 10,
    "total_tokens": 35
  }
}
```

#### OpenAI-Compatible Response to Anthropic

**OpenAI Response:**
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1717000000,
  "model": "gpt-5.2",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The answer is 42."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 10,
    "total_tokens": 35
  }
}
```

**Anthropic Output:**
```json
{
  "id": "msg_123",
  "type": "message",
  "role": "assistant",
  "content": [
    {"type": "text", "text": "The answer is 42."}
  ],
  "model": "gpt-5.2",
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": {"input_tokens": 25, "output_tokens": 10}
}
```

## Provider-Specific Features

### Anthropic Features
- **Tools**: Native function calling with `tools` parameter
- **Beta Features**: `web_search`, `image_understanding`
- **Extended thinking**: budgeted reasoning controls where supported

### Gemini Features
- **Multi-modal**: Text, images, audio, video
- **Function Calling**: Native tool support
- **Caching**: Automatic content caching
- **Grounding**: Web search integration

### OpenRouter Features
- **Model Aliases**: Use provider-specific model names
- **Ranking**: Model ranking and discovery
- **Site URL**: Customize API endpoint for self-hosted
- **App Name**: Identify your application in requests

### Groq Features
- **Low Latency**: Optimized for speed
- **Reasoning**: Supports reasoning tokens
- **JSON Mode**: Structured output

### Mistral Features
- **Function Calling**: Tool support
- **Responsive**: Optimized for chat
- **Embeddings**: Vector embeddings API

### DeepSeek Features
- **Code Generation**: Specialized coding models
- **Reasoning**: Advanced reasoning capabilities
- **Chat**: Conversational AI

### NVIDIA NIM Features
- **Custom Models**: Deploy any open-source model
- **GPU Acceleration**: Optimized for NVIDIA GPUs
- **Enterprise**: Security and compliance features
- **Microservices**: Deploy as microservices

## Proxy Implementation Patterns

### Basic Proxy Server (Express.js)

```typescript
import express from 'express';
import { convertAnthropicToOpenAI, convertOpenAIToAnthropic } from './converters';

const app = express();
app.use(express.json());

// Anthropic to OpenAI endpoint
app.post('/v1/chat/completions', async (req, res) => {
  const anthropicRequest = req.body;
  const openAIRequest = convertAnthropicToOpenAI(anthropicRequest);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_KEY}`
    },
    body: JSON.stringify(openAIRequest)
  });
  
  const data = await response.json();
  res.json(data);
});

// OpenAI to Anthropic endpoint
app.post('/anthropic/messages', async (req, res) => {
  const openAIRequest = req.body;
  const anthropicRequest = convertOpenAIToAnthropic(openAIRequest);
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_KEY
    },
    body: JSON.stringify(anthropicRequest)
  });
  
  const data = await response.json();
  const openAIResponse = convertAnthropicResponseToOpenAI(data);
  res.json(openAIResponse);
});

app.listen(3000, () => console.log('Proxy server running on port 3000'));
```

### Streaming Proxy

```typescript
import { createServer } from 'http';
import { PassThrough } from 'stream';

const server = createServer((req, res) => {
  if (req.url?.startsWith('/stream')) {
    const targetUrl = getTargetUrl(req);
    const targetRequest = convertRequest(req);
    
    const proxyReq = https.request(targetUrl, {
      method: req.method,
      headers: targetRequest.headers
    });
    
    // Pipe request body
    req.pipe(proxyReq);
    
    // Pipe response
    const passthrough = new PassThrough();
    proxyReq.pipe(passthrough);
    
    // Transform stream chunks
    passthrough.on('data', (chunk) => {
      const transformed = convertStreamChunk(chunk, req, res);
      res.write(transformed);
    });
    
    passthrough.on('end', () => res.end());
  }
});

server.listen(3000);
```

## Rate Limiting and Caching

### Rate Limiting by Provider

```typescript
const rateLimiters = {
  anthropic: new RateLimiter({ tokensPerInterval: 100, interval: 'minute' }),
  gemini: new RateLimiter({ tokensPerInterval: 60, interval: 'minute' }),
  openrouter: new RateLimiter({ tokensPerInterval: 200, interval: 'minute' }),
  groq: new RateLimiter({ tokensPerInterval: 300, interval: 'minute' }),
  mistral: new RateLimiter({ tokensPerInterval: 120, interval: 'minute' }),
  deepseek: new RateLimiter({ tokensPerInterval: 150, interval: 'minute' }),
  nvidia: new RateLimiter({ tokensPerInterval: 100, interval: 'minute' })
};

app.use((req, res, next) => {
  const provider = getProviderFromRequest(req);
  const limiter = rateLimiters[provider];
  
  if (!limiter) return next();
  
  limiter.consume(req.ip)
    .then(() => next())
    .catch(() => res.status(429).json({ error: 'Rate limit exceeded' }));
});
```

### Response Caching

```typescript
import { createHash } from 'crypto';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

function getCacheKey(req: Request): string {
  const body = JSON.stringify(req.body);
  const headers = JSON.stringify(req.headers);
  const hash = createHash('sha256');
  hash.update(`${req.method}:${req.url}:${body}:${headers}`);
  return hash.digest('hex');
}

app.use(async (req, res, next) => {
  if (req.method === 'POST') {
    const cacheKey = getCacheKey(req);
    const cached = cache.get(cacheKey);
    
    if (cached) {
      res.json(cached);
      return;
    }
    
    // Store response in cache
    const originalSend = res.send;
    const chunks: any[] = [];
    
    res.send = function(body: any) {
      cache.set(cacheKey, body);
      originalSend.call(this, body);
    };
  }
  
  next();
});
```

## Error Handling

### Provider-Specific Errors

```typescript
const PROVIDER_ERRORS = {
  anthropic: {
    400: 'Bad Request - Check your message format',
    401: 'Invalid API Key - Verify your Anthropic key',
    403: 'Permission Denied - Check your plan limits',
    404: 'Model Not Found - Verify the model name',
    429: 'Rate Limit Exceeded - Wait before retrying',
    500: 'Server Error - Anthropic is experiencing issues'
  },
  gemini: {
    400: 'Invalid Request - Check your request format',
    403: 'Quota Exceeded or Invalid Key',
    404: 'Model Not Found',
    429: 'Too Many Requests',
    500: 'Internal Server Error'
  },
  // ... other providers
};

function handleProviderError(error: any, provider: string) {
  const statusCode = error.statusCode || 500;
  const providerErrors = PROVIDER_ERRORS[provider as keyof typeof PROVIDER_ERRORS];
  const message = providerErrors?.[statusCode] || 'Unknown error';
  
  return {
    error: {
      message,
      type: 'provider_error',
      provider,
      status: statusCode
    }
  };
}
```

### Retry Logic

```typescript
async function callProviderWithRetry(
  provider: string,
  request: any,
  maxRetries: number = 3
): Promise<any> {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    attempt++;
    
    try {
      const response = await makeProviderRequest(provider, request);
      
      // Check for rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers?.['retry-after'] || 
          (Math.pow(2, attempt) * 1000);
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`Provider error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

## Best Practices

### 1. Always Handle Provider-Specific Quirks
- Anthropic requires `anthropic_version` header
- Gemini uses `contents` instead of `messages`
- OpenRouter supports model aliases
- Groq is optimized for low latency
- Mistral has European data residency options
- DeepSeek has specialized coding models
- NVIDIA NIM can be self-hosted

### 2. Validate Input Before Conversion
- Check for required fields
- Validate message formats
- Ensure proper authentication headers

### 3. Preserve Context
- Maintain conversation history
- Preserve system messages
- Handle tool/function calls appropriately

### 4. Monitor Usage
- Track tokens used per provider
- Monitor rate limits
- Alert on abnormal patterns

### 5. Security
- Never expose API keys in logs
- Use environment variables for credentials
- Validate all incoming requests
- Implement CORS properly

## Testing

### Unit Tests for Converters

```typescript
import { convertAnthropicToOpenAI } from './converters';

describe('Anthropic to OpenAI Converter', () => {
  it('converts basic message', () => {
    const anthropic = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Hello' }]
    };
    
    const openai = convertAnthropicToOpenAI(anthropic);
    
    expect(openai.messages).toEqual([{ role: 'user', content: 'Hello' }]);
    expect(openai.max_tokens).toBe(100);
  });
  
  it('handles system messages', () => {
    const anthropic = {
      anthropic_version: 'bedrock-2023-05-31',
      system: 'You are helpful',
      messages: [{ role: 'user', content: 'Hello' }]
    };
    
    const openai = convertAnthropicToOpenAI(anthropic);
    
    expect(openai.messages[0].role).toBe('system');
    expect(openai.messages[0].content).toBe('You are helpful');
  });
});
```

### Integration Tests

```typescript
import { createProxyServer } from './proxy';

describe('Proxy Server', () => {
  let server: any;
  
  beforeAll(() => {
    server = createProxyServer({ port: 3001 });
  });
  
  afterAll(() => server.close());
  
  it('proxies Anthropic to OpenAI', async () => {
    const response = await fetch('http://localhost:3001/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Test' }]
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.choices[0].message.content).toBeDefined();
  });
});
```

## Common Conversion Scenarios

### 1. Claude to Mistral
```typescript
function claudeToMistral(request: ClaudeRequest): MistralRequest {
  return {
    model: mapClaudeToMistralModel(request.model),
    messages: request.messages,
    max_tokens: request.max_tokens,
    temperature: request.temperature || 0.7,
    stream: request.stream || false
  };
}

function mapClaudeToMistralModel(claudeModel: string): string {
  const mapping = {
    'claude-sonnet-4-20250514': 'mistral-large',
    'claude-3-haiku-20240307': 'mistral-medium',
    'claude-3-5-haiku-20241022': 'mistral-small'
  };
  return mapping[claudeModel] || 'mistral-tiny';
}
```

### 2. Gemini to Groq
```typescript
function geminiToGroq(request: GeminiRequest): GroqRequest {
  return {
    model: mapGeminiToGroqModel(request.model),
    messages: request.contents.map(content => ({
      role: content.role,
      content: content.parts[0]?.text || ''
    })),
    max_tokens: request.generationConfig?.maxOutputTokens,
    temperature: request.generationConfig?.temperature
  };
}

function mapGeminiToGroqModel(geminiModel: string): string {
  const mapping = {
    'gemini-2.5-pro': 'llama-3.3-70b-versatile',
    'gemini-2.5-flash': 'llama3-8b-8192',
    'gemini-2.5-flash': 'llama3-70b-8192'
  };
  return mapping[geminiModel] || 'llama3-8b-8192';
}
```

### 3. OpenRouter to Anthropic
```typescript
function openRouterToAnthropic(request: OpenRouterRequest): AnthropicRequest {
  return {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: request.max_tokens,
    messages: request.messages,
    model: request.model
  };
}
```

### 4. DeepSeek to NVIDIA NIM
```typescript
function deepSeekToNim(request: DeepSeekRequest): NimRequest {
  return {
    model: request.model,
    messages: request.messages,
    max_tokens: request.max_tokens,
    temperature: request.temperature,
    // NVIDIA NIM may have additional deployment-specific config
    deployment: process.env.NIM_DEPLOYMENT_NAME
  };
}
```

## Tools and Libraries

### Recommended Libraries

1. **Express.js** - Web framework for proxy server
2. **Axios** - HTTP client for provider requests
3. **Zod** - Request/response validation
4. **Winston** - Logging
5. **ioredis** - Rate limiting and caching
6. **SSE** - Server-Sent Events for streaming
7. **JSONStream** - Stream JSON parsing

### NPM Packages

```bash
# Core
npm install express axios zod winston ioredis

# For TypeScript
npm install -D @types/express @types/node typescript tsx

# Optional
npm install cors helmet rate-limiter-flexible
```

## Deployment

### Docker Deployment

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY .env ./

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Docker Compose with Multiple Proxies

```yaml
version: '3.8'

services:
  api-proxy:
    build: .
    ports:
      - "3000:3000"
    environment:
      - ANTHROPIC_KEY=${ANTHROPIC_KEY}
      - GEMINI_KEY=${GEMINI_KEY}
      - OPENROUTER_KEY=${OPENROUTER_KEY}
      - GROQ_KEY=${GROQ_KEY}
      - MISTRAL_KEY=${MISTRAL_KEY}
      - DEEPSEEK_KEY=${DEEPSEEK_KEY}
    restart: unless-stopped

  rate-limiter:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### Environment Variables

```bash
# Required
ANTHROPIC_KEY=sk_...
GEMINI_KEY=...
OPENROUTER_KEY=sk-or-v1-...
GROQ_KEY=gsk_...
MISTRAL_KEY=...
DEEPSEEK_KEY=...
NVIDIA_NIM_KEY=...

# Optional
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
RATE_LIMIT_TOKENS=100
RATE_LIMIT_INTERVAL=60
CACHE_TTL=300
```

## Performance Optimization

### Connection Pooling

```typescript
import { createPool } from './connection-pool';

const providerPools = {
  anthropic: createPool('anthropic', { maxConnections: 10 }),
  gemini: createPool('gemini', { maxConnections: 15 }),
  openrouter: createPool('openrouter', { maxConnections: 20 }),
  groq: createPool('groq', { maxConnections: 25 }),
  mistral: createPool('mistral', { maxConnections: 15 }),
  deepseek: createPool('deepseek', { maxConnections: 20 }),
  nvidia: createPool('nvidia', { maxConnections: 10 })
};

async function makeRequest(provider: string, request: any) {
  const pool = providerPools[provider as keyof typeof providerPools];
  const connection = await pool.acquire();
  
  try {
    return await connection.request(request);
  } finally {
    pool.release(connection);
  }
}
```

### Request Batching

```typescript
class RequestBatcher {
  private batches: Map<string, Array<{ req: Request; res: Response }>> = new Map();
  private timeout = 50; // ms
  
  addRequest(provider: string, req: Request, res: Response) {
    if (!this.batches.has(provider)) {
      this.batches.set(provider, []);
      setTimeout(() => this.flush(provider), this.timeout);
    }
    this.batches.get(provider)!.push({ req, res });
  }
  
  async flush(provider: string) {
    const batch = this.batches.get(provider);
    if (!batch || batch.length === 0) return;
    
    this.batches.delete(provider);
    
    const converted = batch.map(({ req }) => convertRequest(req, provider));
    const response = await makeBatchRequest(provider, converted);
    
    for (let i = 0; i < batch.length; i++) {
      batch[i].res.json(convertResponse(response[i], provider));
    }
  }
}
```

## Monitoring

### Metrics to Track

1. **Request Volume** - Requests per provider per minute
2. **Token Usage** - Input and output tokens per provider
3. **Latency** - Average response time per provider
4. **Error Rates** - Errors per provider
5. **Conversion Time** - Time spent in format conversion
6. **Cache Hit Rate** - Percentage of cached responses
7. **Cost** - Estimated cost per provider

### Logging Format

```json
{
  "timestamp": "2024-06-03T10:00:00Z",
  "level": "info",
  "service": "api-proxy",
  "provider": "anthropic",
  "method": "POST",
  "path": "/v1/messages",
  "status": 200,
  "durationMs": 450,
  "inputTokens": 25,
  "outputTokens": 100,
  "userId": "anon",
  "ip": "192.168.1.1"
}
```

### Health Check Endpoint

```typescript
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    providers: {
      anthropic: checkProviderHealth('anthropic'),
      gemini: checkProviderHealth('gemini'),
      openrouter: checkProviderHealth('openrouter'),
      groq: checkProviderHealth('groq'),
      mistral: checkProviderHealth('mistral'),
      deepseek: checkProviderHealth('deepseek'),
      nvidia: checkProviderHealth('nvidia')
    },
    cache: {
      hitRate: cache.stats.getHitRate(),
      entries: cache.stats.getItemCount()
    },
    rateLimits: getCurrentRateLimits()
  };
  
  res.json(health);
});

async function checkProviderHealth(provider: string) {
  try {
    const start = Date.now();
    await makeProviderRequest(provider, { model: 'test', messages: [] });
    return {
      status: 'healthy',
      latencyMs: Date.now() - start
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}
```

## Security Considerations

### API Key Management

```typescript
// Never store keys in code
// Use environment variables or secret management

const API_KEYS = {
  anthropic: process.env.ANTHROPIC_KEY,
  gemini: process.env.GEMINI_KEY,
  openrouter: process.env.OPENROUTER_KEY,
  groq: process.env.GROQ_KEY,
  mistral: process.env.MISTRAL_KEY,
  deepseek: process.env.DEEPSEEK_KEY,
  nvidia: process.env.NVIDIA_NIM_KEY
};

// Validate keys on startup
for (const [provider, key] of Object.entries(API_KEYS)) {
  if (!key) {
    console.warn(`⚠️  No API key for ${provider}`);
  } else if (key.length < 20) {
    console.warn(`⚠️  Invalid API key format for ${provider}`);
  }
}
```

### Input Validation

```typescript
import { z } from 'zod';

const ProviderRequestSchema = z.object({
  model: z.string().min(1),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1)
  })).min(1),
  max_tokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  stream: z.boolean().optional()
});

app.use((req, res, next) => {
  try {
    const validated = ProviderRequestSchema.parse(req.body);
    req.validatedBody = validated;
    next();
  } catch (error) {
    res.status(400).json({
      error: 'Invalid request format',
      details: error.errors
    });
  }
});
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
```

### CORS Configuration

```typescript
import cors from 'cors';

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
};

app.use(cors(corsOptions));
```

## Complete Example: Full Proxy Implementation

```typescript
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 60000, max: 100 }));

// API Keys
const API_KEYS = {
  anthropic: process.env.ANTHROPIC_KEY!,
  gemini: process.env.GEMINI_KEY!,
  openrouter: process.env.OPENROUTER_KEY!,
  groq: process.env.GROQ_KEY!,
  mistral: process.env.MISTRAL_KEY!,
  deepseek: process.env.DEEPSEEK_KEY!,
  nvidia: process.env.NVIDIA_NIM_KEY!
};

// Provider endpoints
const PROVIDER_ENDPOINTS = {
  anthropic: 'https://api.anthropic.com/v1/messages',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  groq: 'https://api.groq.com/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  nvidia: process.env.NVIDIA_NIM_ENDPOINT!
};

// Conversion functions
function convertToProvider(provider: string, request: any) {
  switch (provider) {
    case 'anthropic':
      return {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: request.max_tokens || 4096,
        messages: request.messages,
        ...(request.model && { model: request.model })
      };
    case 'gemini':
      return {
        contents: request.messages.map((m: any) => ({
          role: m.role,
          parts: [{ text: m.content }]
        })),
        generationConfig: {
          maxOutputTokens: request.max_tokens || 4096,
          temperature: request.temperature || 0.7
        }
      };
    default:
      return request; // OpenAI-compatible
  }
}

function convertFromProvider(provider: string, response: any) {
  switch (provider) {
    case 'anthropic':
      return {
        id: response.id,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: response.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: response.content[0]?.text || ''
          },
          finish_reason: response.stop_reason || 'stop'
        }],
        usage: {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens: response.usage.input_tokens + response.usage.output_tokens
        }
      };
    case 'gemini':
      return {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: response.model || 'gemini-2.5-pro',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: response.candidates?.[0]?.content?.parts?.[0]?.text || ''
          },
          finish_reason: response.candidates?.[0]?.finishReason || 'stop'
        }],
        usage: {
          prompt_tokens: response.usageMetadata?.promptTokenCount || 0,
          completion_tokens: response.usageMetadata?.candidatesTokenCount || 0,
          total_tokens: (response.usageMetadata?.promptTokenCount || 0) + 
                       (response.usageMetadata?.candidatesTokenCount || 0)
        }
      };
    default:
      return response; // Already OpenAI-compatible
  }
}

// Route handler
app.post('/:provider/chat/completions', async (req, res) => {
  try {
    const { provider } = req.params;
    const request = req.body;
    
    if (!PROVIDER_ENDPOINTS[provider as keyof typeof PROVIDER_ENDPOINTS]) {
      return res.status(404).json({ error: 'Provider not supported' });
    }
    
    const convertedRequest = convertToProvider(provider, request);
    const endpoint = PROVIDER_ENDPOINTS[provider as keyof typeof PROVIDER_ENDPOINTS];
    
    const headers = {
      'Content-Type': 'application/json',
      ...(provider === 'anthropic' ? { 'x-api-key': API_KEYS.anthropic } : {}),
      ...(provider !== 'anthropic' ? { 'Authorization': `Bearer ${API_KEYS[provider as keyof typeof API_KEYS]}` } : {})
    };
    
    const response = await axios.post(endpoint, convertedRequest, { headers });
    const convertedResponse = convertFromProvider(provider, response.data);
    
    res.json(convertedResponse);
  } catch (error: any) {
    console.error(`Error with ${req.params.provider}:`, error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      provider: req.params.provider
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Proxy running on port ${PORT}`);
  console.log('Available endpoints:');
  Object.keys(PROVIDER_ENDPOINTS).forEach(provider => {
    console.log(`  POST /${provider}/chat/completions`);
  });
});
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Verify API keys are correct
   - Check if keys have expired
   - Ensure proper authentication headers

2. **404 Model Not Found**
   - Verify model name is correct for the provider
   - Check if model is available in your region
   - Ensure you have access to the model

3. **429 Rate Limit Exceeded**
   - Implement retry logic with exponential backoff
   - Check your rate limits for each provider
   - Consider distributing requests across multiple keys

4. **Invalid Request Format**
   - Validate input before conversion
   - Check provider-specific requirements
   - Log the exact request being sent

5. **Streaming Issues**
   - Ensure proper SSE headers
   - Check for connection timeouts
   - Verify client can handle streaming responses

### Debug Mode

```bash
# Enable debug logging
DEBUG=api-proxy:* npm start

# Or in code
if (process.env.DEBUG) {
  app.use((req, res, next) => {
    console.log('Request:', req.method, req.url, req.body);
    next();
  });
}
```

## Resources

### Provider Documentation

- [Anthropic API](https://docs.anthropic.com/en/api)
- [Gemini API](https://ai.google.dev/gemini-api/docs)
- [OpenRouter API](https://openrouter.ai/docs)
- [Groq API](https://console.groq.com/docs)
- [Mistral API](https://docs.mistral.ai/api)
- [DeepSeek API](https://docs.deepseek.com/api)
- [NVIDIA NIM](https://docs.nvidia.com/nim)

### Community Resources

- [OpenRouter Model List](https://openrouter.ai/models)
- [Groq Model Comparison](https://groq.com/models)
- [Mistral Model Cards](https://mistral.ai/models)
- [DeepSeek Model Information](https://deepseek.com/models)

## Principles

- **Consistency**: Maintain the same interface across all providers
- **Transparency**: Clearly document conversion behavior
- **Performance**: Optimize for low latency and high throughput
- **Reliability**: Implement proper error handling and retries
- **Security**: Protect API keys and validate all inputs
- **Observability**: Provide comprehensive logging and monitoring

## Workflow

1. **Understand the provider APIs** - Read documentation for each provider
2. **Identify conversion patterns** - Map fields between formats
3. **Implement conversion functions** - Write clean, tested converters
4. **Handle edge cases** - System messages, tool calls, streaming
5. **Test thoroughly** - Unit tests, integration tests, manual testing
6. **Monitor in production** - Track errors, latency, and usage
7. **Optimize** - Cache, batch, and parallelize where possible
