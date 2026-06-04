---
name: groq-proxy
type: skill
version: 1.0.0
description: Groq API expert - ultra-low latency LLM inference with optimized models for speed and cost efficiency.
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
  - performance
tags:
  - ai
  - api
  - groq
  - low-latency
  - llm
  - performance
  - proxy
  - high-speed
---

# Groq Proxy Expert

Master the Groq API for ultra-low latency LLM inference. Groq's LPUs (Language Processing Units) deliver lightning-fast responses at a fraction of the cost of traditional GPUs.

## Quick Start

### Basic Request

```typescript
import fetch from 'node-fetch';

const response = await fetch('https://api.groq.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.GROQ_KEY}`
  },
  body: JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: 'Hello!' }]
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

### cURL Request

```bash
curl https://api.groq.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GROQ_KEY" \
  -d '{
    "model": "llama-3.1-8b-instant",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Models Overview

### Available Models (2024)

| Model | Context Window | Speed | Use Case | Price (Input) | Price (Output) |
|-------|----------------|-------|----------|---------------|----------------|
| llama-3.3-70b-versatile | Model-dependent | ⚡⚡⚡⚡ | General-purpose production chat | Check Groq pricing | Check Groq pricing |
| llama-3.1-8b-instant | Model-dependent | ⚡⚡⚡⚡⚡ | Low-latency routine tasks | Check Groq pricing | Check Groq pricing |
| openai/gpt-oss-120b | Model-dependent | ⚡⚡⚡ | Open-weight reasoning/chat where available | Check Groq pricing | Check Groq pricing |
| gemma-7b-it | 8,192 | ⚡⚡⚡⚡⚡ | Lightweight | $0.0000001/tok | $0.0000001/tok |

### Model Families

#### Llama 3 (Meta)
- `llama-3.3-70b-versatile` - General-purpose production default
- `llama-3.1-8b-instant` - Lower-latency routine tasks

#### Current Groq
- Use `/models` and Groq model pages for current context windows and pricing; do not hardcode retired Mixtral/Llama 3.0-era limits.

#### Gemma (Google)
- `gemma-7b-it` - Very cheap, fast
- `gemma2-9b-it` - Improved version

#### Other
- `llama2-70b-4096` - Legacy Llama 2
- `llama-guanaco-65b` - Guanaco fine-tune

## API Endpoints

### Chat Completions
- **URL**: `https://api.groq.com/v1/chat/completions`
- **Method**: POST
- **OpenAI-Compatible**: ✅ Yes

### Models List
- **URL**: `https://api.groq.com/v1/models`
- **Method**: GET

### Model Info
- **URL**: `https://api.groq.com/v1/models/{model_id}`
- **Method**: GET

## Request Parameters

### Standard OpenAI Format

```json
{
  "model": "llama-3.3-70b-versatile",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "max_tokens": 1024,
  "temperature": 0.7,
  "top_p": 0.9,
  "stream": false,
  "stop": null
}
```

### All Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| model | string | required | Model ID |
| messages | array | required | Message history |
| max_tokens | number | inf | Max output tokens (max: 8192 or 32768 depending on model) |
| temperature | number | 1.0 | Randomness (0-2) |
| top_p | number | 1.0 | Nucleus sampling |
| top_k | number | null | Top-k sampling |
| stream | boolean | false | Enable streaming |
| stop | string/array | null | Stop sequences |
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
  "model": "llama-3.3-70b-versatile",
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
  "model": "llama-3.3-70b-versatile",
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
- `content_filter` - Blocked by content filter

## Unique Features

### 1. Ultra-Low Latency

Groq's LPUs provide:
- **~50-200ms** response times (vs 1-3s for GPU-based models)
- **Consistent performance** - No cold starts
- **Real-time interaction** - Ideal for chat applications

### 2. Reasoning Tokens

Some models support reasoning tokens for better accuracy:

```json
{
  "model": "llama-3.3-70b-versatile",
  "messages": [...],
  "reasoning_tokens": 2048
}
```

### 3. JSON Mode

Force JSON output for structured responses:

```json
{
  "model": "llama-3.3-70b-versatile",
  "messages": [...],
  "response_format": { "type": "json_object" }
}
```

### 4. Large Context Windows

Current Groq models support up to **123,072 tokens** of context:

```json
{
  "model": "llama-3.3-70b-versatile",
  "messages": [...],
  "max_tokens": 1024
}
```

## Proxy Implementation

### Basic Proxy

```typescript
import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

const GROQ_KEY = process.env.GROQ_KEY;
const GROQ_URL = 'https://api.groq.com/v1';

app.post('/v1/chat/completions', async (req, res) => {
  try {
    const response = await fetch(`${GROQ_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify(req.body)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Groq error');
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

app.listen(3000);
```

### Multi-Model Proxy

```typescript
const MODEL_ALIASES: Record<string, string> = {
  'llama3': 'llama-3.3-70b-versatile',
  'llama3-70b': 'llama-3.3-70b-versatile',
  'fast': 'llama-3.1-8b-instant',
  'balanced': 'llama-3.3-70b-versatile',
  'gemma': 'gemma-7b-it'
};

app.post('/groq/:model/chat', async (req, res) => {
  const { model } = req.params;
  const actualModel = MODEL_ALIASES[model] || model;
  
  const response = await fetch(`${GROQ_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
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

### Streaming Proxy

```typescript
app.post('/stream', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  const response = await fetch(`${GROQ_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
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
// Latency-based load balancing
const MODELS_BY_LATENCY = [
  'gemma-7b-it',      // ~50ms
  'llama-3.3-70b-versatile',  // ~80ms
  'llama-3.1-8b-instant', // ~100ms
  'llama-3.3-70b-versatile'  // ~150ms
];

app.post('/fast/chat', async (req, res) => {
  // Use fastest available model
  const model = MODELS_BY_LATENCY[0];
  
  const response = await fetch(`${GROQ_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: req.body.messages,
      max_tokens: req.body.max_tokens || 2048
    })
  });
  
  const data = await response.json();
  res.json(data);
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

## Best Practices

### 1. Always Use Fastest Model for Task

```typescript
function selectModelBySpeed(task: string): string {
  const modelMap: Record<string, string> = {
    'quick-answer': 'gemma-7b-it',
    'general-chat': 'llama-3.3-70b-versatile',
    'complex-task': 'llama-3.3-70b-versatile',
    'long-context': 'llama-3.3-70b-versatile'
  };
  return modelMap[task] || 'llama-3.3-70b-versatile';
}
```

### 2. Implement Retry with Backoff

```typescript
async function withRetry(request: any, maxRetries = 3) {
  let attempt = 0;
  
  while (true) {
    try {
      const response = await fetch(`${GROQ_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`
        },
        body: JSON.stringify(request)
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      if (response.status !== 429 || attempt >= maxRetries) {
        throw new Error(`Groq error: ${response.status}`);
      }
      
      const retryAfter = Math.pow(2, attempt) * 100;
      await new Promise(resolve => setTimeout(resolve, retryAfter));
      attempt++;
    } catch (error) {
      if (attempt >= maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 100 * attempt));
      attempt++;
    }
  }
}
```

### 3. Use JSON Mode for Structured Output

```typescript
async function getStructuredData(prompt: string, schema: any) {
  const response = await fetch(`${GROQ_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Always respond in JSON format matching this schema: ${JSON.stringify(schema)}`
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })
  });
  
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}
```

### 4. Optimize for Low Latency

```typescript
// Pre-warm connections
import { Agent } from 'https';

const httpsAgent = new Agent({
  keepAlive: true,
  keepAliveMsecs: 60000,
  maxSockets: 100,
  maxFreeSockets: 50
});

// Use persistent connections
const response = await fetch(`${GROQ_URL}/chat/completions`, {
  agent: httpsAgent,
  method: 'POST',
  // ...
});
```

### 5. Use Large Context When Needed

```typescript
async function processLongDocument(document: string, prompt: string) {
  // Use Current Groq with 123K context for long documents
  const response = await fetch(`${GROQ_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Analyze the following document.' },
        { role: 'user', content: document + '\n\n' + prompt }
      ],
      max_tokens: 4096
    })
  });
  
  return response.json();
}
```

## Performance Optimization

### 1. Connection Pooling

```typescript
import { Agent } from 'https';

const httpsAgent = new Agent({
  keepAlive: true,
  keepAliveMsecs: 60000,
  maxSockets: 200,
  maxFreeSockets: 100
});

const response = await fetch(`${GROQ_URL}/chat/completions`, {
  agent: httpsAgent,
  method: 'POST',
  // ...
});
```

### 2. Caching

```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 10 }); // 10 second cache for fast responses

async function cachedGenerate(request: any) {
  const cacheKey = JSON.stringify(request);
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  const response = await fetch(`${GROQ_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
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
class GroqBatcher {
  private queue: Array<{ request: any; resolve: Function }> = [];
  private processing = false;
  
  add(request: any) {
    return new Promise((resolve) => {
      this.queue.push({ request, resolve });
      this.process();
    });
  }
  
  async process() {
    if (this.processing || this.queue.length < 5) return;
    
    this.processing = true;
    const batch = this.queue.splice(0, 5);
    
    try {
      const responses = await Promise.all(
        batch.map(({ request }) => 
          fetch(`${GROQ_URL}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${GROQ_KEY}`
            },
            body: JSON.stringify(request)
          }).then(r => r.json())
        )
      );
      
      batch.forEach((item, i) => item.resolve(responses[i]));
    } catch (error) {
      batch.forEach(item => item.resolve({ error: error.message }));
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

describe('Groq Proxy', () => {
  it('generates content', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1717000000,
        model: 'llama-3.3-70b-versatile',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hello!' },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      })
    }));
    
    const response = await fetch(`${GROQ_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Hi' }]
      })
    });
    
    const data = await response.json();
    expect(data.choices[0].message.content).toBe('Hello!');
  });
});
```

### Benchmark Test

```typescript
describe('Groq Performance', () => {
  it('responds in under 500ms', async () => {
    const start = Date.now();
    
    const response = await fetch(`${GROQ_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Quick answer: What is 2+2?' }],
        max_tokens: 10
      })
    });
    
    const data = await response.json();
    const latency = Date.now() - start;
    
    expect(latency).toBeLessThan(500);
    expect(data.choices[0].message.content).toContain('4');
  }, 10000); // 10 second timeout
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
  groq-proxy:
    build: .
    ports:
      - "3000:3000"
    environment:
      - GROQ_KEY=${GROQ_KEY}
      - PRIMARY_MODEL=llama-3.3-70b-versatile
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
```

### Environment Variables

```bash
# Required
GROQ_KEY=gsk_...

# Optional
PRIMARY_MODEL=llama-3.3-70b-versatile
GROQ_URL=https://api.groq.com/v1
PORT=3000
LOG_LEVEL=info
MAX_TOKENS=4096
TIMEOUT=10000
```

## Monitoring

### Metrics

```typescript
import { createHistogram, createCounter, createGauge } from 'prom-client';

const requestLatency = createHistogram({
  name: 'groq_request_latency_ms',
  help: 'Request latency in milliseconds',
  labelNames: ['model'],
  buckets: [10, 50, 100, 200, 500, 1000]
});

const tokenUsage = createCounter({
  name: 'groq_tokens_total',
  help: 'Total tokens used',
  labelNames: ['model', 'type']
});

const activeRequests = createGauge({
  name: 'groq_active_requests',
  help: 'Number of active requests'
});

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  const model = req.body.model || 'unknown';
  
  activeRequests.inc();
  
  res.on('finish', () => {
    const latency = Number(process.hrtime.bigint() - start) / 1e6;
    requestLatency.labels(model).observe(latency);
    activeRequests.dec();
  });
  
  next();
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
    new winston.transports.File({ filename: 'groq-proxy.log' })
  ]
});

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    logger.info({
      timestamp: new Date().toISOString(),
      method: req.method,
      model: req.body.model,
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
   - Verify key format (starts with `gsk_`)
   - Check for typos
   - Regenerate key from Groq console

2. **Model Not Available**
   - Check model list: GET `/v1/models`
   - Verify model ID is correct
   - Model might be temporarily unavailable

3. **Rate Limit Exceeded**
   - Groq has high rate limits (100+ req/sec)
   - Implement retry with backoff
   - Distribute across multiple keys

4. **Context Window Exceeded**
   - Check model's max context (8K or 32K or 123K)
   - Truncate long prompts
   - Use summarization for long conversations

5. **Length Error**
   - `max_tokens` too high for model
   - Check model's max output tokens
   - Reduce `max_tokens` value

### Debug Mode

```bash
# Enable verbose logging
DEBUG=groq:* node index.js

# Or log full requests
import fetch from 'node-fetch';

const originalFetch = global.fetch;
global.fetch = async (url: string, options: any) => {
  if (url.includes('groq.com')) {
    console.log('Groq Request:', url, options);
  }
  const response = await originalFetch(url, options);
  const cloned = response.clone();
  const body = await cloned.json();
  if (url.includes('groq.com')) {
    console.log('Groq Response:', body);
  }
  return response;
};
```

## Resources

### Official Documentation
- [Groq API Docs](https://console.groq.com/docs)
- [API Reference](https://console.groq.com/docs/api)
- [Model Information](https://console.groq.com/docs/models)
- [Pricing](https://console.groq.com/docs/pricing)

### SDKs
- [Unofficial TypeScript SDK](https://github.com/groq/groq-sdk)
- [Python SDK](https://github.com/groq/groq-python)
- [Community SDKs](https://github.com/topics/groq)

### Tools
- [Groq Playground](https://console.groq.com/playground)
- [Speed Comparison](https://console.groq.com/speed)
- [API Status](https://status.groq.com)

## Comparison with Other Providers

| Feature | Groq | OpenAI | Anthropic | Mistral | DeepSeek |
|---------|------|--------|-----------|---------|----------|
| Latency | ⚡⚡⚡⚡⚡ (~50-200ms) | ⚡⚡ (~1-3s) | ⚡⚡⚡ (~300-800ms) | ⚡⚡ (~1-2s) | ⚡⚡⚡ (~400-1000ms) |
| Price (Input/Output) | $0.0000008/tok | $0.00001-0.00003/tok | $0.000003-0.000015/tok | $0.0000027/tok | $0.0000014-0.0000028/tok |
| Context Window | 8K-123K | 16K-128K | 200K | 32K-128K | 32K |
| OpenAI Compatible | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes |
| Multi-modal | ❌ No | ✅ Yes | ✅ Claude 3 | ❌ No | ❌ No |
| Function Calling | ❌ No | ✅ Yes | ✅ Beta | ✅ Yes | ❌ No |
| Strengths | Speed, Cost | Features, Ecosystem | Reasoning, Safety | Open-source | Cost, Coding |

## Principles

- **Speed First**: Always optimize for low latency
- **Cost Conscious**: Groq is one of the cheapest options
- **Simple API**: Use standard OpenAI format
- **Reliable**: Consistent performance with LPUs
- **Scalable**: Built for high-volume usage
- **Transparent**: Know exactly what you're paying

## Workflow

1. **Get API Key** - Sign up at console.groq.com
2. **Choose Model** - Select based on speed and capability needs
3. **Make Request** - Use standard OpenAI format
4. **Handle Response** - Process the OpenAI-compatible response
5. **Optimize** - Use batching and caching
6. **Monitor** - Track latency and usage
7. **Scale** - Deploy with confidence
8. **Iterate** - Continuously improve

## Examples

### 1. Basic Completion

```typescript
async function complete(prompt: string, model: string = 'llama-3.3-70b-versatile') {
  const response = await fetch('https://api.groq.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_KEY}`
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
class GroqConversation {
  private messages: any[] = [];
  private model: string;
  
  constructor(model: string = 'llama-3.3-70b-versatile') {
    this.model = model;
  }
  
  async send(prompt: string) {
    this.messages.push({ role: 'user', content: prompt });
    
    const response = await fetch('https://api.groq.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_KEY}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: this.messages,
        max_tokens: 2048
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

### 3. JSON Mode

```typescript
async function getJSON(prompt: string, schema: any) {
  const systemPrompt = `You are a JSON API. Always respond in JSON format. Schema: ${JSON.stringify(schema)}`;
  
  const response = await fetch('https://api.groq.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })
  });
  
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}
```

### 4. Streaming

```typescript
async function* streamComplete(prompt: string, model: string) {
  const response = await fetch('https://api.groq.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_KEY}`
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
for await (const chunk of streamComplete('Tell me a story', 'llama-3.3-70b-versatile')) {
  process.stdout.write(chunk);
}
```

### 5. Parallel Requests

```typescript
async function parallelComplete(prompts: string[], model: string) {
  const requests = prompts.map(prompt => 
    fetch('https://api.groq.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_KEY}`
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

### 6. Long Context Processing

```typescript
async function processLongDocument(document: string, question: string) {
  // Use Current Groq with 123K context
  const response = await fetch('https://api.groq.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Answer questions about the following document.' },
        { role: 'user', content: document + '\n\n' + question }
      ],
      max_tokens: 4096
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}
```

### 7. Cost Calculation

```typescript
async function calculateCost(prompt: string, model: string) {
  const response = await fetch('https://api.groq.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 0 // Only count input tokens
    })
  });
  
  const data = await response.json();
  const inputTokens = data.usage?.prompt_tokens || 0;
  
  // Groq pricing is the same for input and output
  const pricing: Record<string, number> = {
    'llama-3.3-70b-versatile': 0.0000008,
    'llama-3.1-8b-instant': 0.0000007,
    'gemma-7b-it': 0.0000001
  };
  
  const pricePerToken = pricing[model] || 0.0000008;
  
  return {
    inputTokens,
    inputCost: inputTokens * pricePerToken,
    outputCostPerToken: pricePerToken
  };
}
```

## Future Features

- More models and providers
- Fine-tuning support
- Custom model deployment
- Better tool/function calling
- Multi-modal capabilities
- Real-time streaming improvements

## Principles

- **Speed Matters**: Always prioritize low latency
- **Cost Efficient**: Groq is one of the cheapest options
- **Simple Integration**: Use standard OpenAI format
- **Reliable Performance**: Consistent results with LPUs
- **Scalable Architecture**: Built for production workloads
- **Transparent Pricing**: Know exactly what you're paying

## Workflow

1. **Sign Up** - Get your Groq API key
2. **Explore Models** - Try different models for your use case
3. **Integrate** - Use standard OpenAI format
4. **Test** - Verify performance and accuracy
5. **Optimize** - Use batching, caching, and JSON mode
6. **Monitor** - Track latency, tokens, and costs
7. **Deploy** - Scale with confidence
8. **Iterate** - Continuously improve based on metrics
