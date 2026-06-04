---
name: openrouter-proxy
type: skill
version: 1.0.0
description: OpenRouter API expert - access 200+ models with unified API, routing, and advanced features like model ranking and custom endpoints.
author: skillregistry
license: MIT
agents:
  - cursor
  - claude-code
  - copilot
  - gemini-cli
  - codex
categories:
  - backend
  - ai-ml
  - architecture
tags:
  - ai
  - api
  - openrouter
  - multi-provider
  - routing
  - llm
  - proxy
---

# OpenRouter Proxy Expert

Master the OpenRouter API to access 200+ LLMs from various providers through a single, unified interface. Understand routing, model aliases, ranking, and advanced features like site URLs and app tracking.

## Quick Start

### Basic Request

```typescript
import fetch from 'node-fetch';

const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`
  },
  body: JSON.stringify({
    model: 'openai/gpt-4o',
    messages: [{ role: 'user', content: 'Hello!' }]
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

### cURL Request

```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENROUTER_KEY" \
  -d '{
    "model": "anthropic/claude-3-sonnet",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Models Overview

### Model Categories

| Category | Examples | Provider | Notes |
|----------|----------|----------|-------|
| OpenAI | gpt-4o, gpt-3.5-turbo | OpenAI | Official OpenAI models |
| Anthropic | claude-3-sonnet, claude-3-haiku | Anthropic | Claude models |
| Google | gemini-1.5-pro, gemini-1.5-flash | Google | Gemini models |
| Meta | llama-3-70b, llama-3-8b | Meta | Llama models |
| Mistral | mistral-large, mixtral-8x7b | Mistral | Mistral models |
| Cohere | command-r, command-r-plus | Cohere | Cohere models |
| Groq | llama-3-8b-groq, mixtral-8x7b-groq | Groq | Groq-optimized |
| Fireworks | llama-v3-70b, mixtral-8x7b | Fireworks | Fireworks models |
| DeepSeek | deepseek-chat, deepseek-coder | DeepSeek | DeepSeek models |
| NVIDIA | llms-3-70b, llms-2-70b | NVIDIA | NVIDIA models |

### Popular Models

#### Top-Tier Models
- `openai/gpt-4o` - Latest OpenAI
- `anthropic/claude-3-opus` - Most capable
- `google/gemini-1.5-pro` - Best Google
- `meta/llama-3-70b` - Best open-source

#### Cost-Effective Models
- `openai/gpt-4o-mini` - Cheap GPT-4
- `anthropic/claude-3-haiku` - Fast Claude
- `google/gemini-1.5-flash` - Fast Google
- `groq/llama-3-8b` - Very cheap & fast

## API Endpoints

### Chat Completions (Primary)
- **URL**: `https://openrouter.ai/api/v1/chat/completions`
- **Method**: POST
- **OpenAI-Compatible**: Yes

### Models List
- **URL**: `https://openrouter.ai/api/v1/models`
- **Method**: GET
- **Returns**: All available models with metadata

### Model Info
- **URL**: `https://openrouter.ai/api/v1/models/{model_id}`
- **Method**: GET
- **Returns**: Model details and pricing

## Request Parameters

### Standard OpenAI Format

```json
{
  "model": "anthropic/claude-3-sonnet",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "max_tokens": 1024,
  "temperature": 0.7,
  "top_p": 0.9,
  "stream": false
}
```

### All Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| model | string | required | Model ID or alias |
| messages | array | required | Message history |
| max_tokens | number | inf | Max output tokens |
| temperature | number | 1.0 | Randomness (0-2) |
| top_p | number | 1.0 | Nucleus sampling |
| top_k | number | null | Top-k sampling |
| stop | string/array | null | Stop sequences |
| stream | boolean | false | Enable streaming |
| presence_penalty | number | 0 | Repetition penalty |
| frequency_penalty | number | 0 | Frequency penalty |
| user | string | null | User identifier |

## Response Format

### Standard Response

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1717000000,
  "model": "anthropic/claude-3-sonnet",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you?"
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

### Streaming Response

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion.chunk",
  "created": 1717000000,
  "model": "anthropic/claude-3-sonnet",
  "choices": [
    {
      "index": 0,
      "delta": {"content": "Hello"},
      "finish_reason": null
    }
  ]
}
```

## Advanced Features

### 1. Model Aliases

Use provider-specific model names:

```json
{
  "model": "claude-3-sonnet", // Same as anthropic/claude-3-sonnet
  "messages": [...]
}
```

### 2. Site URL (Self-Hosted)

Route to your own deployment:

```json
{
  "model": "my-deployment/my-model",
  "site_url": "https://my-openrouter.example.com",
  "messages": [...]
}
```

### 3. App Name

Identify your application:

```json
{
  "app_name": "MyApp/1.0",
  "model": "anthropic/claude-3-sonnet",
  "messages": [...]
}
```

### 4. Model Ranking

Get ranked model recommendations:

```bash
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_KEY" \
  -H "HTTP-Referer: https://myapp.com" \
  -H "X-Title: MyApp"
```

Response includes:
- `rank` - Popularity rank
- `cost` - Price per 1M tokens
- `context_length` - Max context window
- `provider` - Model provider

### 5. Custom Endpoints

Set custom API endpoint:

```json
{
  "site_url": "https://my-custom-openrouter.example.com",
  "site_name": "My Custom Instance",
  "model": "anthropic/claude-3-sonnet",
  "messages": [...]
}
```

### 6. Provider-Specific Headers

Pass through provider headers:

```json
{
  "model": "anthropic/claude-3-sonnet",
  "messages": [...],
  "provider": {
    "anthropic": {
      "anthropic_version": "bedrock-2023-05-31"
    }
  }
}
```

## Proxy Implementation

### Basic Proxy

```typescript
import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const OPENROUTER_URL = process.env.OPENROUTER_URL || 'https://openrouter.ai/api/v1';

app.post('/v1/chat/completions', async (req, res) => {
  try {
    const response = await fetch(`${OPENROUTER_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_KEY}`
      },
      body: JSON.stringify(req.body)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenRouter error');
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

app.listen(3000);
```

### Multi-Provider Proxy

```typescript
app.post('/:provider/chat', async (req, res) => {
  const { provider } = req.params;
  
  // Map provider to OpenRouter model
  const modelMap: Record<string, string> = {
    anthropic: 'anthropic/claude-3-sonnet',
    gemini: 'google/gemini-1.5-pro',
    openai: 'openai/gpt-4o',
    mistral: 'mistral/mistral-large',
    groq: 'groq/llama-3-8b',
    deepseek: 'deepseek/deepseek-chat'
  };
  
  const model = modelMap[provider] || req.body.model;
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: req.body.messages,
      max_tokens: req.body.max_tokens || 4096,
      temperature: req.body.temperature || 0.7
    })
  });
  
  const data = await response.json();
  res.json(data);
});
```

### Streaming Proxy

```typescript
app.post('/stream', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_KEY}`
    },
    body: JSON.stringify({
      ...req.body,
      stream: true
    })
  });
  
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    if (chunk.includes('[DONE]')) break;
    
    res.write(`data: ${chunk}\n\n`);
  }
  
  res.write('data: [DONE]\n\n');
  res.end();
});
```

### Load Balancing Proxy

```typescript
// Round-robin load balancing across models
let modelIndex = 0;
const models = [
  'anthropic/claude-3-sonnet',
  'google/gemini-1.5-pro',
  'openai/gpt-4o-mini'
];

app.post('/balanced/chat', async (req, res) => {
  const model = models[modelIndex % models.length];
  modelIndex++;
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: req.body.messages,
      max_tokens: req.body.max_tokens || 4096
    })
  });
  
  const data = await response.json();
  res.json({ ...data, model_used: model });
});
```

## Error Handling

### Common Errors

#### 400 Bad Request
```json
{
  "error": {
    "message": "Invalid request format",
    "type": "BadRequestError",
    "param": null,
    "code": null
  }
}
```

#### 401 Unauthorized
```json
{
  "error": {
    "message": "Invalid or expired API key",
    "type": "AuthenticationError"
  }
}
```

#### 403 Forbidden
```json
{
  "error": {
    "message": "Access denied",
    "type": "PermissionError"
  }
}
```

#### 404 Not Found
```json
{
  "error": {
    "message": "Model not found",
    "type": "NotFoundError"
  }
}
```

#### 429 Rate Limit Exceeded
```json
{
  "error": {
    "message": "Rate limit exceeded",
    "type": "RateLimitError"
  }
}
```

#### 500 Internal Server Error
```json
{
  "error": {
    "message": "Internal server error",
    "type": "InternalServerError"
  }
}
```

### Provider-Specific Errors

```json
{
  "error": {
    "message": "Anthropic error: Rate limit exceeded",
    "type": "ProviderError",
    "provider": "anthropic",
    "status_code": 429
  }
}
```

## Best Practices

### 1. Model Selection

```typescript
// Choose model based on task complexity and budget
function selectModel(task: string, budget: 'low' | 'medium' | 'high'): string {
  const modelMap: Record<string, Record<'low' | 'medium' | 'high', string>> = {
    chat: {
      low: 'groq/llama-3-8b',
      medium: 'anthropic/claude-3-haiku',
      high: 'openai/gpt-4o'
    },
    coding: {
      low: 'groq/mixtral-8x7b',
      medium: 'anthropic/claude-3-sonnet',
      high: 'openai/gpt-4o'
    },
    reasoning: {
      low: 'meta/llama-3-8b',
      medium: 'google/gemini-1.5-pro',
      high: 'anthropic/claude-3-opus'
    }
  };
  
  return modelMap[task]?.[budget] || 'anthropic/claude-3-sonnet';
}
```

### 2. Fallback Strategy

```typescript
async function generateWithFallback(
  messages: any[],
  primaryModel: string,
  fallbackModels: string[]
) {
  const models = [primaryModel, ...fallbackModels];
  
  for (const model of models) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_KEY}`
        },
        body: JSON.stringify({ model, messages })
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.log(`Failed with ${model}, trying next...`);
    }
  }
  
  throw new Error('All fallback models failed');
}
```

### 3. Retry Logic

```typescript
async function withRetry(
  request: any,
  maxRetries = 3,
  backoffFactor = 2
) {
  let attempt = 0;
  
  while (true) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_KEY}`
        },
        body: JSON.stringify(request)
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      if (response.status !== 429 || attempt >= maxRetries) {
        throw new Error(`OpenRouter error: ${response.status}`);
      }
      
      const retryAfter = response.headers.get('retry-after') ||
        (backoffFactor ** attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, Number(retryAfter)));
      attempt++;
    } catch (error) {
      if (attempt >= maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      attempt++;
    }
  }
}
```

### 4. Model Discovery

```typescript
// Cache available models
let modelsCache: any[] | null = null;

async function getAvailableModels(forceRefresh = false): Promise<any[]> {
  if (modelsCache && !forceRefresh) {
    return modelsCache;
  }
  
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`
    }
  });
  
  const data = await response.json();
  modelsCache = data.data;
  
  return modelsCache;
}

// Filter models by provider
async function getModelsByProvider(provider: string) {
  const models = await getAvailableModels();
  return models.filter(m => m.id.startsWith(`${provider}/`));
}
```

### 5. Cost Tracking

```typescript
// Track token usage by model
const tokenUsage: Record<string, { input: number; output: number }> = {};

function trackTokens(model: string, usage: any) {
  if (!tokenUsage[model]) {
    tokenUsage[model] = { input: 0, output: 0 };
  }
  
  tokenUsage[model].input += usage.prompt_tokens;
  tokenUsage[model].output += usage.completion_tokens;
  
  return tokenUsage[model];
}

// Calculate cost
function calculateCost(model: string, tokens: { input: number; output: number }) {
  const pricing: Record<string, { input: number; output: number }> = {
    'openai/gpt-4o': { input: 0.00005, output: 0.00015 },
    'anthropic/claude-3-sonnet': { input: 0.00003, output: 0.00015 },
    'google/gemini-1.5-pro': { input: 0.000025, output: 0.0001 },
    'groq/llama-3-8b': { input: 0.0000005, output: 0.0000008 }
  };
  
  const rates = pricing[model] || { input: 0, output: 0 };
  return {
    inputCost: tokens.input * rates.input,
    outputCost: tokens.output * rates.output,
    totalCost: tokens.input * rates.input + tokens.output * rates.output
  };
}
```

## Performance Optimization

### 1. Connection Pooling

```typescript
import { Agent } from 'https';
import fetch from 'node-fetch';

const httpsAgent = new Agent({
  keepAlive: true,
  keepAliveMsecs: 60000,
  maxSockets: 50,
  maxFreeSockets: 10
});

// Use the agent in fetch
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  agent: httpsAgent,
  method: 'POST',
  // ...
});
```

### 2. Caching

```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // 5 minute cache

async function cachedGenerate(request: any) {
  const cacheKey = JSON.stringify(request);
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_KEY}`
    },
    body: JSON.stringify(request)
  });
  
  const data = await response.json();
  cache.set(cacheKey, data);
  return data;
}
```

### 3. Request Batching

```typescript
class RequestBatcher {
  private queue: Array<{ request: any; resolve: Function; reject: Function }> = [];
  private processing = false;
  
  add(request: any) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      this.process();
    });
  }
  
  async process() {
    if (this.processing) return;
    this.processing = true;
    
    const batch = this.queue.splice(0, Math.min(this.queue.length, 10));
    
    try {
      const responses = await Promise.all(
        batch.map(({ request }) => 
          fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENROUTER_KEY}`
            },
            body: JSON.stringify(request)
          }).then(r => r.json())
        )
      );
      
      batch.forEach((item, i) => item.resolve(responses[i]));
    } catch (error) {
      batch.forEach(item => item.reject(error));
    } finally {
      this.processing = false;
    }
  }
}
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('OpenRouter Proxy', () => {
  it('generates content', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1717000000,
        model: 'anthropic/claude-3-sonnet',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hello!' },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      })
    }));
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-sonnet',
        messages: [{ role: 'user', content: 'Hi' }]
      })
    });
    
    const data = await response.json();
    expect(data.choices[0].message.content).toBe('Hello!');
  });
});
```

### Integration Tests

```typescript
import { createProxy } from './proxy';

describe('OpenRouter Proxy Integration', () => {
  it('proxies to OpenRouter', async () => {
    const proxy = createProxy({ port: 3001 });
    
    const response = await fetch('http://localhost:3001/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'anthropic/claude-3-sonnet',
        messages: [{ role: 'user', content: 'Test' }]
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.model).toBe('anthropic/claude-3-sonnet');
  });
});
```

## Deployment

### Docker

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

### Docker Compose with Load Balancing

```yaml
version: '3.8'

services:
  openrouter-proxy:
    build: .
    ports:
      - "3000:3000"
    environment:
      - OPENROUTER_KEY=${OPENROUTER_KEY}
      - PRIMARY_MODEL=anthropic/claude-3-sonnet
      - FALLBACK_MODELS=google/gemini-1.5-pro,openai/gpt-4o-mini
    restart: unless-stopped

  rate-limiter:
    image: redis:alpine
    ports:
      - "6379:6379"
```

### Environment Variables

```bash
# Required
OPENROUTER_KEY=sk-or-v1-...

# Optional
OPENROUTER_URL=https://openrouter.ai/api/v1
PRIMARY_MODEL=anthropic/claude-3-sonnet
FALLBACK_MODELS=google/gemini-1.5-pro,openai/gpt-4o-mini
SITE_URL=
SITE_NAME=
APP_NAME=MyApp/1.0
PORT=3000
LOG_LEVEL=info
MAX_TOKENS=4096
TIMEOUT=30000
```

## Monitoring

### Metrics

```typescript
import { createHistogram, createCounter, createGauge } from 'prom-client';

const requestDuration = createHistogram({
  name: 'openrouter_request_duration_seconds',
  help: 'Duration of OpenRouter requests',
  labelNames: ['model', 'provider'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const tokenUsage = createCounter({
  name: 'openrouter_tokens_total',
  help: 'Total tokens used',
  labelNames: ['model', 'type']
});

const activeRequests = createGauge({
  name: 'openrouter_active_requests',
  help: 'Number of active requests',
  labelNames: ['model']
});

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  const model = req.body.model || 'unknown';
  const provider = model.split('/')[0];
  
  activeRequests.labels(model).inc();
  
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    requestDuration.labels(model, provider).observe(duration);
    activeRequests.labels(model).dec();
  });
  
  next();
});

app.post('/v1/chat/completions', async (req, res) => {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_KEY}`
    },
    body: JSON.stringify(req.body)
  });
  
  const data = await response.json();
  
  if (data.usage) {
    tokenUsage.labels(req.body.model, 'input').inc(data.usage.prompt_tokens);
    tokenUsage.labels(req.body.model, 'output').inc(data.usage.completion_tokens);
  }
  
  res.json(data);
});
```

### Logging

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'openrouter-proxy.log' })
  ]
});

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    logger.info({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      model: req.body.model,
      status: res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip
    });
  });
  
  next();
});
```

## Troubleshooting

### Common Issues

1. **Invalid API Key**
   - Verify key format (starts with `sk-or-v1-`)
   - Check for typos
   - Regenerate key from OpenRouter dashboard

2. **Insufficient Credits**
   - Check your balance at openrouter.ai
   - Add more credits
   - Set up auto-recharge

3. **Model Not Available**
   - Check if model exists: GET `/v1/models`
   - Verify model ID is correct
   - Try with provider prefix (e.g., `anthropic/claude-3-sonnet`)

4. **Rate Limit Exceeded**
   - Implement retry with backoff
   - Check your rate limits
   - Distribute requests across keys

5. **Provider Errors**
   - Check if the underlying provider is down
   - Try a different model from another provider
   - Use fallback models

6. **Site URL Not Configured**
   - Ensure `SITE_URL` and `SITE_NAME` are set if using custom endpoint
   - Verify the custom endpoint is running

### Debug Mode

```bash
# Enable verbose logging
DEBUG=openrouter:* node index.js

# Or log full requests/responses
import fetch from 'node-fetch';

const originalFetch = global.fetch;
global.fetch = async (url: string, options: any) => {
  console.log('Request:', url, options);
  const response = await originalFetch(url, options);
  const cloned = response.clone();
  const body = await cloned.json();
  console.log('Response:', body);
  return response;
};
```

## Resources

### Official Documentation
- [OpenRouter API Docs](https://openrouter.ai/docs)
- [API Reference](https://openrouter.ai/api)
- [Model List](https://openrouter.ai/models)
- [Pricing](https://openrouter.ai/pricing)

### SDKs
- [Official TypeScript SDK](https://github.com/OpenRouterTeam/openrouter-sdk)
- [Official Python SDK](https://github.com/OpenRouterTeam/openrouter-python)
- [Community SDKs](https://github.com/topics/openrouter)

### Tools
- [Model Playground](https://openrouter.ai/playground)
- [Token Calculator](https://openrouter.ai/tokens)
- [API Status](https://status.openrouter.ai)

## Comparison with Other Aggregators

| Feature | OpenRouter | Bedrock | Vertex AI | Azure ML |
|---------|------------|---------|-----------|----------|
| Multi-provider | ✅ 200+ models | ✅ AWS only | ✅ Google only | ✅ Various |
| Unified API | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Model Ranking | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Custom Endpoints | ✅ Yes | ❌ No | ❌ No | ❌ No |
| OpenAI Compatible | ✅ Yes | ❌ No | ❌ No | ✅ Partially |
| Free Tier | ✅ $0.00015 free | ❌ No | ❌ No | ✅ Yes |
| Pricing | ✅ Pay-as-you-go | ✅ Pay-as-you-go | ✅ Pay-as-you-go | ✅ Pay-as-you-go |

## Principles

- **Flexibility**: Access any model from any provider
- **Simplicity**: Use a single API for everything
- **Cost-Effectiveness**: Choose the best model for the task
- **Reliability**: Automatic fallbacks and retries
- **Transparency**: Track usage by model and provider
- **Security**: Never expose API keys

## Workflow

1. **Get API Key** - Sign up at openrouter.ai and get your key
2. **Choose Model** - Select from 200+ available models
3. **Make Request** - Use standard OpenAI format
4. **Handle Response** - Process the OpenAI-compatible response
5. **Fallback** - Implement fallback to other models
6. **Monitor** - Track usage, costs, and performance
7. **Optimize** - Use ranking to find best models
8. **Scale** - Deploy with load balancing and caching

## Examples

### 1. Basic Completion

```typescript
async function complete(prompt: string, model: string = 'anthropic/claude-3-sonnet') {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}
```

### 2. Multi-Provider Fallback

```typescript
const PROVIDER_MODELS: Record<string, string> = {
  anthropic: 'anthropic/claude-3-sonnet',
  google: 'google/gemini-1.5-pro',
  openai: 'openai/gpt-4o-mini',
  mistral: 'mistral/mistral-large'
};

async function completeWithFallback(prompt: string, providers: string[] = ['anthropic', 'google', 'openai']) {
  for (const provider of providers) {
    const model = PROVIDER_MODELS[provider];
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return { ...data, provider, model };
      }
    } catch (error) {
      console.log(`Failed with ${provider}, trying next...`);
    }
  }
  
  throw new Error('All providers failed');
}
```

### 3. Streaming

```typescript
async function* streamComplete(prompt: string, model: string) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: true
    })
  });
  
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    if (chunk.includes('[DONE]')) break;
    
    try {
      const data = JSON.parse(chunk.replace(/^data: /, ''));
      if (data.choices?.[0]?.delta?.content) {
        yield data.choices[0].delta.content;
      }
    } catch (error) {
      // Ignore parse errors
    }
  }
}

// Usage
for await (const chunk of streamComplete('Tell me a story', 'anthropic/claude-3-sonnet')) {
  process.stdout.write(chunk);
}
```

### 4. Cost Calculation

```typescript
async function calculateCost(prompt: string, model: string) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 0 // Only count input tokens
    })
  });
  
  const data = await response.json();
  const inputTokens = data.usage?.prompt_tokens || 0;
  
  // Get model pricing
  const modelsResponse = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`
    }
  });
  
  const modelsData = await modelsResponse.json();
  const modelInfo = modelsData.data.find((m: any) => m.id === model);
  
  const inputPrice = modelInfo?.pricing?.prompt || 0;
  const outputPrice = modelInfo?.pricing?.completion || 0;
  
  return {
    inputTokens,
    inputCost: inputTokens * inputPrice,
    outputPricePerToken: outputPrice
  };
}
```

### 5. Model Discovery

```typescript
async function findBestModel(task: string, maxPrice?: number) {
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`
    }
  });
  
  const data = await response.json();
  
  // Filter by task and price
  const candidates = data.data.filter((model: any) => {
    const matchesTask = model.name.toLowerCase().includes(task.toLowerCase());
    const matchesPrice = !maxPrice || (model.pricing?.prompt || 0) <= maxPrice;
    return matchesTask && matchesPrice;
  });
  
  // Sort by ranking
  candidates.sort((a: any, b: any) => (a.rank || 999) - (b.rank || 999));
  
  return candidates[0];
}
```

### 6. Parallel Requests

```typescript
async function parallelComplete(prompts: string[], model: string) {
  const requests = prompts.map(prompt => 
    fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }]
      })
    }).then(r => r.json())
  );
  
  const responses = await Promise.all(requests);
  return responses.map(r => r.choices[0].message.content);
}
```

### 7. Conversation Manager

```typescript
class OpenRouterConversation {
  private messages: any[] = [];
  private model: string;
  
  constructor(model: string = 'anthropic/claude-3-sonnet') {
    this.model = model;
  }
  
  async send(prompt: string) {
    this.messages.push({ role: 'user', content: prompt });
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: this.messages
      })
    });
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    this.messages.push({ role: 'assistant', content });
    
    return content;
  }
  
  getHistory() {
    return [...this.messages];
  }
  
  clear() {
    this.messages = [];
  }
  
  setModel(model: string) {
    this.model = model;
  }
}

// Usage
const conv = new OpenRouterConversation();
const reply = await conv.send('Hello!');
```

## Future Features

- More providers and models
- Fine-tuning support
- Custom model deployment
- Better ranking algorithm
- Real-time analytics
- Team collaboration features
- Enterprise SSO

## Principles

- **Flexibility**: Access any model from any provider
- **Simplicity**: One API to rule them all
- **Cost-awareness**: Track and optimize spending
- **Reliability**: Automatic fallbacks and retries
- **Transparency**: Know exactly which model you're using
- **Scalability**: Built for high-volume usage

## Workflow

1. **Sign up** - Get your OpenRouter API key
2. **Explore models** - Browse 200+ available models
3. **Choose wisely** - Select based on task, cost, and latency
4. **Implement** - Use standard OpenAI format
5. **Fallback** - Add fallback models for reliability
6. **Monitor** - Track usage and costs
7. **Optimize** - Use ranking and analytics to improve
8. **Scale** - Deploy with confidence
