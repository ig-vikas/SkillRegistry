---
name: mistral-proxy
type: skill
version: 1.0.0
description: Mistral AI API expert - access cutting-edge open-source models with European data residency and enterprise features.
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
  - mistral
  - mistral-ai
  - open-source
  - llm
  - europe
  - proxy
---

# Mistral Proxy Expert

Master the Mistral AI API for accessing state-of-the-art open-source large language models. Mistral offers cutting-edge models with European data residency, fine-tuning capabilities, and enterprise-grade features.

## Quick Start

### Basic Request

```typescript
import fetch from 'node-fetch';

const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.MISTRAL_KEY}`
  },
  body: JSON.stringify({
    model: 'mistral-large-latest',
    messages: [{ role: 'user', content: 'Hello!' }]
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

### cURL Request

```bash
curl https://api.mistral.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MISTRAL_KEY" \
  -d '{
    "model": "mistral-large-latest",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Models Overview

### Available Models

| Model | Context Window | Use Case | Price (Input) | Price (Output) | Notes |
|-------|----------------|----------|---------------|----------------|-------|
| mistral-large-latest | 128,000+ | Most capable hosted chat model alias | Check current pricing | Check current pricing | Use the docs/pricing API for exact current rates |
| mistral-small-latest | 32,000+ | Cost-effective chat model alias | Check current pricing | Check current pricing | Good default for routine tasks |
| codestral-latest | Model-dependent | Code generation and completion | Check current pricing | Check current pricing | Use for coding-specific workloads |
| mistral-small | 32,000 | Fast, cost-effective | €0.000002/tok | €0.000006/tok | Good balance |
| mistral-tiny | 8,000 | Fastest, cheapest | €0.00000025/tok | €0.00000025/tok | Quick tasks |
| mistral-small-latest | 32,000 | Sparsely-activated | €0.00000055/tok | €0.00000055/tok | Mixture of Experts |
| mistral-small-latest | 64,000 | High capacity | €0.0000007/tok | €0.0000007/tok | Scaling MoE |
| codestral-latest | 32,000 | Code generation | €0.0000007/tok | €0.0000021/tok | Coding specialist |

### Embedding Models

- `mistral-embedding` - 1024 dimensions
- Pricing: €0.0000001/tok (input only)

## API Endpoints

### Chat Completions
- **URL**: `https://api.mistral.ai/v1/chat/completions`
- **Method**: POST
- **OpenAI-Compatible**: ✅ Yes

### Embeddings
- **URL**: `https://api.mistral.ai/v1/embeddings`
- **Method**: POST

### Models List
- **URL**: `https://api.mistral.ai/v1/models`
- **Method**: GET

### Model Info
- **URL**: `https://api.mistral.ai/v1/models/{model_id}`
- **Method**: GET

## Request Parameters

### Standard OpenAI Format

```json
{
  "model": "mistral-large-latest",
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
| model | string | required | Model ID |
| messages | array | required | Message history |
| max_tokens | number | inf | Max output tokens (max: 32768 for most models) |
| temperature | number | 1.0 | Randomness (0-2) |
| top_p | number | 1.0 | Nucleus sampling |
| top_k | number | null | Top-k sampling |
| stream | boolean | false | Enable streaming |
| stop | string/array | null | Stop sequences |
| presence_penalty | number | 0 | Repetition penalty |
| frequency_penalty | number | 0 | Frequency penalty |
| user | string | null | User identifier |
| safe_mode | boolean | false | Enable safe mode (content filtering) |
| random_seed | number | null | Random seed for reproducibility |

## Response Format

### Standard Response

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1717000000,
  "model": "mistral-large-latest",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
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
  "model": "mistral-large-latest",
  "choices": [
    {
      "index": 0,
      "delta": {"content": "Hello"},
      "finish_reason": null
    }
  ]
}
```

### Finish Reasons
- `stop` - Normal completion
- `length` - Hit max tokens
- `model_length` - Context window exceeded
- `error` - Error occurred

## Unique Features

### 1. Function Calling / Tool Use

Mistral supports function calling with tools:

```json
{
  "model": "mistral-large-latest",
  "messages": [
    {"role": "user", "content": "What's the weather in Paris?"}
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Get current weather for a location",
        "parameters": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "City name"
            }
          },
          "required": ["location"]
        }
      }
    }
  ]
}
```

**Tool Call Response:**
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "I'll check the weather for you.",
        "tool_calls": [
          {
            "id": "tool_123",
            "type": "function",
            "function": {
              "name": "get_weather",
              "arguments": '{"location": "Paris"}'
            }
          }
        ]
      }
    }
  ]
}
```

### 2. Safe Mode

Enable content filtering:

```json
{
  "model": "mistral-large-latest",
  "messages": [...],
  "safe_mode": true
}
```

### 3. Random Seed

Ensure reproducible outputs:

```json
{
  "model": "mistral-large-latest",
  "messages": [...],
  "random_seed": 42
}
```

### 4. European Data Residency

All Mistral data is processed and stored in **Europe** (France), ensuring GDPR compliance and data sovereignty.

## Embeddings

### Basic Embedding Request

```typescript
const response = await fetch('https://api.mistral.ai/v1/embeddings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.MISTRAL_KEY}`
  },
  body: JSON.stringify({
    model: 'mistral-embedding',
    input: 'Your text here'
  })
});

const data = await response.json();
console.log(data.data[0].embedding); // 1024-dimensional vector
```

### Batch Embeddings

```json
{
  "model": "mistral-embedding",
  "input": [
    "First text",
    "Second text",
    "Third text"
  ]
}
```

### Embedding Response

```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "embedding": [0.1, 0.2, ..., 0.99],
      "index": 0
    }
  ],
  "model": "mistral-embedding",
  "usage": {
    "prompt_tokens": 10,
    "total_tokens": 10
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

const MISTRAL_KEY = process.env.MISTRAL_KEY;
const MISTRAL_URL = 'https://api.mistral.ai/v1';

app.post('/v1/chat/completions', async (req, res) => {
  try {
    const response = await fetch(`${MISTRAL_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_KEY}`
      },
      body: JSON.stringify(req.body)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Mistral error');
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

app.post('/v1/embeddings', async (req, res) => {
  try {
    const response = await fetch(`${MISTRAL_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_KEY}`
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

app.listen(3000);
```

### Streaming Proxy

```typescript
app.post('/stream', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  const response = await fetch(`${MISTRAL_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MISTRAL_KEY}`
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

### Multi-Model Proxy

```typescript
const MODEL_ALIASES: Record<string, string> = {
  'large': 'mistral-large-latest',
  'small': 'mistral-small',
  'tiny': 'mistral-tiny',
  'small': 'mistral-small-latest',
  'code': 'codestral-latest',
  'codestral': 'codestral-latest',
  'embedding': 'mistral-embedding'
};

app.post('/mistral/:model/chat', async (req, res) => {
  const { model } = req.params;
  const actualModel = MODEL_ALIASES[model] || model;
  
  const response = await fetch(`${MISTRAL_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MISTRAL_KEY}`
    },
    body: JSON.stringify({
      model: actualModel,
      messages: req.body.messages,
      max_tokens: req.body.max_tokens || 4096,
      temperature: req.body.temperature || 0.7
    })
  });
  
  const data = await response.json();
  res.json({ ...data, model: actualModel });
});
```

## Error Handling

### Common Errors

#### 400 Bad Request
```json
{
  "object": "error",
  "message": "Invalid request format",
  "type": "BadRequestError",
  "param": null,
  "code": null
}
```

#### 401 Unauthorized
```json
{
  "object": "error",
  "message": "Invalid or expired API key",
  "type": "AuthenticationError"
}
```

#### 403 Forbidden
```json
{
  "object": "error",
  "message": "Access denied or quota exceeded",
  "type": "PermissionError"
}
```

#### 404 Not Found
```json
{
  "object": "error",
  "message": "Model not found",
  "type": "NotFoundError"
}
```

#### 429 Rate Limit Exceeded
```json
{
  "object": "error",
  "message": "Rate limit exceeded",
  "type": "RateLimitError"
}
```

#### 500 Internal Server Error
```json
{
  "object": "error",
  "message": "Internal server error",
  "type": "InternalServerError"
}
```

## Best Practices

### 1. Model Selection Guide

```typescript
function selectModel(task: string, budget: 'low' | 'medium' | 'high'): string {
  const modelMap: Record<string, Record<'low' | 'medium' | 'high', string>> = {
    chat: {
      low: 'mistral-tiny',
      medium: 'mistral-small',
      high: 'mistral-large-latest'
    },
    coding: {
      low: 'mistral-small',
      medium: 'codestral-latest',
      high: 'mistral-large-latest'
    },
    long_context: {
      low: 'mistral-small-latest',
      medium: 'mistral-small-latest',
      high: 'mistral-large-latest'
    },
    embedding: {
      low: 'mistral-embedding',
      medium: 'mistral-embedding',
      high: 'mistral-embedding'
    }
  };
  
  return modelMap[task]?.[budget] || 'mistral-small';
}
```

### 2. Retry Logic

```typescript
async function withRetry(request: any, maxRetries = 3) {
  let attempt = 0;
  
  while (true) {
    try {
      const response = await fetch(`${MISTRAL_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MISTRAL_KEY}`
        },
        body: JSON.stringify(request)
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      if (response.status !== 429 || attempt >= maxRetries) {
        throw new Error(`Mistral error: ${response.status}`);
      }
      
      const retryAfter = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, retryAfter));
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

### 3. Function Calling Helper

```typescript
function createToolCall(name: string, description: string, parameters: any) {
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters: {
        type: 'object',
        properties: parameters.properties,
        required: parameters.required || []
      }
    }
  };
}

function extractToolCalls(response: any) {
  return response.choices[0]?.message?.tool_calls || [];
}
```

### 4. Safe Mode Usage

```typescript
async function safeGenerate(prompt: string, model: string) {
  const response = await fetch(`${MISTRAL_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MISTRAL_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      safe_mode: true
    })
  });
  
  const data = await response.json();
  
  // Check if content was filtered
  if (data.choices[0]?.message?.content?.includes('[SAFE_MODE]')) {
    throw new Error('Content was filtered by safe mode');
  }
  
  return data.choices[0].message.content;
}
```

### 5. Embedding Best Practices

```typescript
// Batch embeddings for efficiency
async function batchEmbed(texts: string[], model: string = 'mistral-embedding') {
  const BATCH_SIZE = 100; // Mistral's batch limit
  const batches = [];
  
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    batches.push(texts.slice(i, i + BATCH_SIZE));
  }
  
  const results = [];
  for (const batch of batches) {
    const response = await fetch(`${MISTRAL_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_KEY}`
      },
      body: JSON.stringify({
        model,
        input: batch
      })
    });
    
    const data = await response.json();
    results.push(...data.data);
  }
  
  return results;
}
```

## Performance Optimization

### 1. Connection Pooling

```typescript
import { Agent } from 'https';

const httpsAgent = new Agent({
  keepAlive: true,
  keepAliveMsecs: 60000,
  maxSockets: 100,
  maxFreeSockets: 50
});

const response = await fetch(`${MISTRAL_URL}/chat/completions`, {
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
  
  const response = await fetch(`${MISTRAL_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MISTRAL_KEY}`
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
class MistralBatcher {
  private queue: Array<{ request: any; resolve: Function; reject: Function }> = [];
  private processing = false;
  
  add(request: any) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      this.process();
    });
  }
  
  async process() {
    if (this.processing || this.queue.length < 3) return;
    
    this.processing = true;
    const batch = this.queue.splice(0, 3);
    
    try {
      const responses = await Promise.all(
        batch.map(({ request }) => 
          fetch(`${MISTRAL_URL}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${MISTRAL_KEY}`
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

describe('Mistral Proxy', () => {
  it('generates content', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1717000000,
        model: 'mistral-large-latest',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hello!' },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      })
    }));
    
    const response = await fetch(`${MISTRAL_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key'
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: 'Hi' }]
      })
    });
    
    const data = await response.json();
    expect(data.choices[0].message.content).toBe('Hello!');
  });
  
  it('generates embeddings', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        object: 'list',
        data: [{
          object: 'embedding',
          embedding: [0.1, 0.2, 0.3],
          index: 0
        }],
        model: 'mistral-embedding',
        usage: { prompt_tokens: 5, total_tokens: 5 }
      })
    }));
    
    const response = await fetch(`${MISTRAL_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key'
      },
      body: JSON.stringify({
        model: 'mistral-embedding',
        input: 'Test text'
      })
    });
    
    const data = await response.json();
    expect(data.data[0].embedding).toHaveLength(1024);
  });
});
```

### Integration Tests

```typescript
import { createProxy } from './proxy';

describe('Mistral Proxy Integration', () => {
  it('proxies chat requests', async () => {
    const proxy = createProxy({ port: 3001 });
    
    const response = await fetch('http://localhost:3001/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: 'Test' }]
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.model).toBe('mistral-large-latest');
  });
  
  it('proxies embedding requests', async () => {
    const proxy = createProxy({ port: 3001 });
    
    const response = await fetch('http://localhost:3001/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral-embedding',
        input: 'Test text'
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data[0].embedding).toBeDefined();
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

### Docker Compose

```yaml
version: '3.8'

services:
  mistral-proxy:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MISTRAL_KEY=${MISTRAL_KEY}
      - PRIMARY_MODEL=mistral-large-latest
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Environment Variables

```bash
# Required
MISTRAL_KEY=...

# Optional
PRIMARY_MODEL=mistral-large-latest
MISTRAL_URL=https://api.mistral.ai/v1
PORT=3000
LOG_LEVEL=info
MAX_TOKENS=4096
TIMEOUT=30000
SAFE_MODE=false
RANDOM_SEED=null
```

## Monitoring

### Metrics

```typescript
import { createHistogram, createCounter, createGauge } from 'prom-client';

const requestLatency = createHistogram({
  name: 'mistral_request_latency_seconds',
  help: 'Request latency in seconds',
  labelNames: ['model', 'endpoint'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const tokenUsage = createCounter({
  name: 'mistral_tokens_total',
  help: 'Total tokens used',
  labelNames: ['model', 'type', 'endpoint']
});

const activeRequests = createGauge({
  name: 'mistral_active_requests',
  help: 'Number of active requests',
  labelNames: ['model']
});

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  const model = req.body.model || 'unknown';
  const endpoint = req.path.split('/')[2] || 'unknown';
  
  activeRequests.labels(model).inc();
  
  res.on('finish', () => {
    const latency = Number(process.hrtime.bigint() - start) / 1e9;
    requestLatency.labels(model, endpoint).observe(latency);
    activeRequests.labels(model).dec();
  });
  
  next();
});

app.post('/v1/chat/completions', async (req, res) => {
  const response = await fetch(`${MISTRAL_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MISTRAL_KEY}`
    },
    body: JSON.stringify(req.body)
  });
  
  const data = await response.json();
  
  if (data.usage) {
    tokenUsage.labels(req.body.model, 'input', 'chat').inc(data.usage.prompt_tokens);
    tokenUsage.labels(req.body.model, 'output', 'chat').inc(data.usage.completion_tokens);
  }
  
  res.json(data);
});

app.post('/v1/embeddings', async (req, res) => {
  const response = await fetch(`${MISTRAL_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MISTRAL_KEY}`
    },
    body: JSON.stringify(req.body)
  });
  
  const data = await response.json();
  
  if (data.usage) {
    tokenUsage.labels(req.body.model, 'input', 'embedding').inc(data.usage.prompt_tokens);
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
    new winston.transports.File({ filename: 'mistral-proxy.log' })
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
      endpoint: req.path.split('/')[2],
      status: res.statusCode,
      latencyMs: Date.now() - start,
      ip: req.ip
    });
  });
  
  next();
});
```

## Troubleshooting

### Common Issues

1. **Invalid API Key**
   - Verify key format
   - Check for typos
   - Regenerate key from Mistral console

2. **Model Not Available**
   - Check model list: GET `/v1/models`
   - Verify model ID is correct
   - Model might be temporarily unavailable

3. **Rate Limit Exceeded**
   - Default: 32 req/min for free tier
   - Paid plans: Higher limits
   - Implement retry with backoff

4. **Context Window Exceeded**
   - Check model's max context (8K-128K)
   - Truncate long prompts
   - Use summarization

5. **Safe Mode Blocked**
   - Disable safe_mode or modify prompt
   - Review content for policy violations

6. **Function Call Format Error**
   - Validate tool definitions
   - Check parameter schemas
   - Ensure proper JSON formatting

### Debug Mode

```bash
# Enable verbose logging
DEBUG=mistral:* node index.js

# Or log full requests
import fetch from 'node-fetch';

const originalFetch = global.fetch;
global.fetch = async (url: string, options: any) => {
  if (url.includes('mistral.ai')) {
    console.log('Mistral Request:', url, options);
  }
  const response = await originalFetch(url, options);
  const cloned = response.clone();
  const body = await cloned.json();
  if (url.includes('mistral.ai')) {
    console.log('Mistral Response:', body);
  }
  return response;
};
```

## Resources

### Official Documentation
- [Mistral API Docs](https://docs.mistral.ai/api)
- [API Reference](https://docs.mistral.ai/api/meet-the-api)
- [Model Information](https://mistral.ai/models)
- [Pricing](https://mistral.ai/pricing)

### SDKs
- [Official Python SDK](https://github.com/mistralai/mistral-src)
- [Community TypeScript SDK](https://github.com/mistralai/client)
- [Java SDK](https://github.com/mistralai/java-client)

### Tools
- [Mistral La Plateforme](https://console.mistral.ai)
- [Model Playground](https://console.mistral.ai/playground)
- [Fine-tuning Guide](https://docs.mistral.ai/fine-tuning)

## Comparison with Other Providers

| Feature | Mistral | OpenAI | Anthropic | Groq | DeepSeek |
|---------|---------|--------|-----------|------|----------|
| Models | Open-source & custom | Proprietary | Proprietary | Proprietary | Proprietary |
| Context Window | 8K-128K | 16K-128K | 200K | 8K-123K | 32K |
| Price (Input) | €0.00000025-0.000008 | $0.00001-0.00003 | $0.000003-0.000015 | $0.0000008 | $0.0000014-0.0000028 |
| Price (Output) | €0.00000025-0.000024 | $0.00003-0.00006 | $0.000015 | $0.0000008 | $0.0000014-0.0000028 |
| OpenAI Compatible | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes |
| Function Calling | ✅ Yes | ✅ Yes | ✅ Beta | ❌ No | ❌ No |
| Embeddings | ✅ Yes | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Multi-modal | ❌ No | ✅ Yes | ✅ Claude 3 | ❌ No | ❌ No |
| Data Residency | ✅ Europe | ❌ US/Global | ❌ US | ❌ US | ❌ US |
| Open Source | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |

## Principles

- **Open Source First**: Leverage community-driven innovation
- **European Data**: Ensure GDPR compliance and data sovereignty
- **Cost Efficient**: Competitive pricing for all models
- **Enterprise Ready**: Built for production workloads
- **Transparent**: Clear pricing and model capabilities
- **Innovative**: Access to cutting-edge research models

## Workflow

1. **Sign Up** - Get your Mistral API key
2. **Explore Models** - Try different models for your use case
3. **Choose Wisely** - Select based on task, context needs, and budget
4. **Integrate** - Use standard OpenAI format or SDKs
5. **Test** - Verify performance and accuracy
6. **Optimize** - Use batching, caching, and tool calling
7. **Monitor** - Track latency, tokens, and costs
8. **Deploy** - Scale with confidence

## Examples

### 1. Basic Completion

```typescript
async function complete(prompt: string, model: string = 'mistral-large-latest') {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MISTRAL_KEY}`
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

### 2. Multi-Turn Conversation

```typescript
class MistralConversation {
  private messages: any[] = [];
  private model: string;
  
  constructor(model: string = 'mistral-large-latest') {
    this.model = model;
  }
  
  async send(prompt: string) {
    this.messages.push({ role: 'user', content: prompt });
    
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_KEY}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: this.messages,
        max_tokens: 4096
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
```

### 3. Function Calling

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

async function callWithTools(prompt: string, tools: ToolDefinition[]) {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MISTRAL_KEY}`
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages: [{ role: 'user', content: prompt }],
      tools: tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }
      }))
    })
  });
  
  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    toolCalls: data.choices[0].message.tool_calls || []
  };
}

// Usage
const tools = [
  {
    name: 'get_weather',
    description: 'Get current weather',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name' }
      },
      required: ['location']
    }
  }
];

const result = await callWithTools('What is the weather in Paris?', tools);
console.log(result.content);
console.log(result.toolCalls);
```

### 4. Embeddings

```typescript
async function getEmbedding(text: string, model: string = 'mistral-embedding') {
  const response = await fetch('https://api.mistral.ai/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MISTRAL_KEY}`
    },
    body: JSON.stringify({
      model,
      input: text
    })
  });
  
  const data = await response.json();
  return data.data[0].embedding; // 1024-dimensional vector
}

// Batch embeddings
async function getEmbeddings(texts: string[]) {
  const response = await fetch('https://api.mistral.ai/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MISTRAL_KEY}`
    },
    body: JSON.stringify({
      model: 'mistral-embedding',
      input: texts
    })
  });
  
  const data = await response.json();
  return data.data.map((d: any) => d.embedding);
}
```

### 5. Streaming

```typescript
async function* streamComplete(prompt: string, model: string) {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MISTRAL_KEY}`
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
for await (const chunk of streamComplete('Tell me a story', 'mistral-large-latest')) {
  process.stdout.write(chunk);
}
```

### 6. Safe Mode

```typescript
async function safeComplete(prompt: string, model: string = 'mistral-large-latest') {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MISTRAL_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      safe_mode: true
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}
```

### 7. Reproducible Output

```typescript
async function deterministicComplete(prompt: string, model: string, seed: number) {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MISTRAL_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      random_seed: seed,
      temperature: 0.0 // For deterministic output
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}
```

## Future Features

- Fine-tuning API
- Custom model deployment
- Better function calling
- Multi-modal models
- Real-time streaming improvements
- Expanded context windows
- More regional deployments

## Principles

- **Open Innovation**: Leverage the best of open-source research
- **European Excellence**: High-quality models with European data residency
- **Cost Transparency**: Clear, competitive pricing
- **Enterprise Grade**: Built for production use cases
- **Developer Focus**: Excellent SDKs and documentation
- **Community Driven**: Active community and ecosystem

## Workflow

1. **Sign Up** - Create account at mistral.ai
2. **Get API Key** - Generate your key from the console
3. **Explore Models** - Test different models in the playground
4. **Choose Model** - Select based on your requirements
5. **Integrate** - Use REST API or SDKs
6. **Test** - Validate accuracy and performance
7. **Optimize** - Use batching, caching, and streaming
8. **Monitor** - Track usage and performance
9. **Deploy** - Scale your application
10. **Iterate** - Continuously improve
