---
name: deepseek-proxy
type: skill
version: 1.0.0
description: DeepSeek API expert - specialized AI models for coding, reasoning, and chat with competitive pricing.
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
  - deepseek
  - coding
  - reasoning
  - llm
  - proxy
---

# DeepSeek Proxy Expert

Master the DeepSeek API for specialized AI models focused on coding, reasoning, and chat applications. DeepSeek offers competitive pricing with high-quality outputs, particularly for code generation tasks.

## Quick Start

### Basic Request

```typescript
import fetch from 'node-fetch';

const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.DEEPSEEK_KEY}`
  },
  body: JSON.stringify({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: 'Hello!' }]
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

### cURL Request

```bash
curl https://api.deepseek.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEEPSEEK_KEY" \
  -d '{
    "model": "deepseek-coder",
    "messages": [{"role": "user", "content": "Write a Python function to sort a list"}]
  }'
```

## Models Overview

### Available Models

| Model | Context Window | Use Case | Price (Input) | Price (Output) | Notes |
|-------|----------------|----------|---------------|----------------|-------|
| deepseek-chat | 32,768 | General chat | $0.0000014/tok | $0.0000028/tok | Latest chat model |
| deepseek-coder | 32,768 | Code generation | $0.0000014/tok | $0.0000028/tok | Specialized for coding |

### Model Comparison

- **deepseek-chat**: Optimized for conversational AI, general knowledge, and reasoning
- **deepseek-coder**: Fine-tuned for code generation, understanding, and debugging

## API Endpoints

### Chat Completions
- **URL**: `https://api.deepseek.com/v1/chat/completions`
- **Method**: POST
- **OpenAI-Compatible**: ✅ Yes

### Models List
- **URL**: `https://api.deepseek.com/v1/models`
- **Method**: GET

### Model Info
- **URL**: `https://api.deepseek.com/v1/models/{model_id}`
- **Method**: GET

## Request Parameters

### Standard OpenAI Format

```json
{
  "model": "deepseek-chat",
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
| max_tokens | number | inf | Max output tokens (max: 32768) |
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
  "model": "deepseek-chat",
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
  "model": "deepseek-chat",
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

### 1. Coding Optimization

DeepSeek Coder is specifically fine-tuned for:
- **Code Generation**: Write complete functions, classes, and modules
- **Code Understanding**: Explain and document code
- **Code Debugging**: Find and fix bugs
- **Code Completion**: Autocomplete code snippets
- **Multi-language Support**: Python, JavaScript, TypeScript, Java, C++, Go, Rust, etc.

### 2. Reasoning Capabilities

DeepSeek Chat excels at:
- **Logical Reasoning**: Step-by-step problem solving
- **Mathematical Reasoning**: Math problems and calculations
- **Scientific Reasoning**: Technical and scientific questions
- **Multi-hop Reasoning**: Complex queries requiring multiple steps

### 3. Cost Efficiency

DeepSeek offers some of the most competitive pricing:
- **~70-80% cheaper** than OpenAI for comparable quality
- **~50-60% cheaper** than Anthropic
- **~30-50% cheaper** than Mistral
- No minimum commitments or complex pricing tiers

## Proxy Implementation

### Basic Proxy

```typescript
import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY;
const DEEPSEEK_URL = 'https://api.deepseek.com/v1';

app.post('/v1/chat/completions', async (req, res) => {
  try {
    const response = await fetch(`${DEEPSEEK_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_KEY}`
      },
      body: JSON.stringify(req.body)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'DeepSeek error');
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
  'chat': 'deepseek-chat',
  'coder': 'deepseek-coder',
  'code': 'deepseek-coder',
  'default': 'deepseek-chat'
};

app.post('/deepseek/:model/chat', async (req, res) => {
  const { model } = req.params;
  const actualModel = MODEL_ALIASES[model] || model;
  
  const response = await fetch(`${DEEPSEEK_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_KEY}`
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
  
  const response = await fetch(`${DEEPSEEK_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_KEY}`
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

### Task-Specific Proxy

```typescript
// Route to appropriate model based on task
app.post('/task/chat', async (req, res) => {
  const { task, messages, ...rest } = req.body;
  
  // Select model based on task
  const modelMap: Record<string, string> = {
    'code': 'deepseek-coder',
    'coding': 'deepseek-coder',
    'debug': 'deepseek-coder',
    'chat': 'deepseek-chat',
    'general': 'deepseek-chat',
    'reasoning': 'deepseek-chat',
    'math': 'deepseek-chat'
  };
  
  const model = modelMap[task?.toLowerCase()] || 'deepseek-chat';
  
  const response = await fetch(`${DEEPSEEK_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_KEY}`
    },
    body: JSON.stringify({
      model,
      messages,
      ...rest
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

## Best Practices

### 1. Model Selection Guide

```typescript
function selectModel(task: string, quality: 'high' | 'standard' = 'standard'): string {
  const modelMap: Record<string, Record<'high' | 'standard', string>> = {
    code: {
      high: 'deepseek-coder',
      standard: 'deepseek-coder'
    },
    chat: {
      high: 'deepseek-chat',
      standard: 'deepseek-chat'
    },
    reasoning: {
      high: 'deepseek-chat',
      standard: 'deepseek-chat'
    },
    math: {
      high: 'deepseek-chat',
      standard: 'deepseek-chat'
    }
  };
  
  return modelMap[task?.toLowerCase()]?.[quality] || 'deepseek-chat';
}
```

### 2. Coding Best Practices

```typescript
async function generateCode(prompt: string, language: string = 'python') {
  const systemPrompt = `You are an expert ${language} developer. Write clean, well-commented, and efficient code.`;
  
  const response = await fetch(`${DEEPSEEK_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-coder',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Write ${language} code for: ${prompt}` }
      ],
      temperature: 0.3 // Lower temperature for more deterministic code
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}
```

### 3. Code Review

```typescript
async function reviewCode(code: string, language: string = 'python') {
  const prompt = `Review the following ${language} code for:
1. Bugs and potential issues
2. Performance optimizations
3. Security vulnerabilities
4. Code quality improvements
5. Best practice violations

Code:
\`\`\`${language}
${code}
\`\`\``;
  
  const response = await fetch(`${DEEPSEEK_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-coder',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}
```

### 4. Code Debugging

```typescript
async function debugCode(code: string, error: string, language: string = 'python') {
  const prompt = `The following ${language} code is producing an error:

Error:
${error}

Code:
\`\`\`${language}
${code}
\`\`\`

Please:
1. Identify the cause of the error
2. Explain why it's happening
3. Provide the fixed code
4. Suggest how to prevent this error in the future`;
  
  const response = await fetch(`${DEEPSEEK_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-coder',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}
```

### 5. Retry Logic

```typescript
async function withRetry(request: any, maxRetries = 3) {
  let attempt = 0;
  
  while (true) {
    try {
      const response = await fetch(`${DEEPSEEK_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_KEY}`
        },
        body: JSON.stringify(request)
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      if (response.status !== 429 || attempt >= maxRetries) {
        throw new Error(`DeepSeek error: ${response.status}`);
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

const response = await fetch(`${DEEPSEEK_URL}/chat/completions`, {
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
  
  const response = await fetch(`${DEEPSEEK_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_KEY}`
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
class DeepSeekBatcher {
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
          fetch(`${DEEPSEEK_URL}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${DEEPSEEK_KEY}`
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

describe('DeepSeek Proxy', () => {
  it('generates content', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1717000000,
        model: 'deepseek-chat',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hello!' },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      })
    }));
    
    const response = await fetch(`${DEEPSEEK_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'Hi' }]
      })
    });
    
    const data = await response.json();
    expect(data.choices[0].message.content).toBe('Hello!');
  });
});
```

### Code Generation Test

```typescript
describe('Code Generation', () => {
  it('generates valid Python code', async () => {
    const response = await fetch(`${DEEPSEEK_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-coder',
        messages: [
          {
            role: 'user',
            content: 'Write a Python function to reverse a string'
          }
        ],
        temperature: 0.3
      })
    });
    
    const data = await response.json();
    const code = data.choices[0].message.content;
    
    // Basic validation that it looks like code
    expect(code).toContain('def');
    expect(code).toContain('reverse');
    expect(code).toContain(':');
    expect(code).toContain('return');
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
  deepseek-proxy:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DEEPSEEK_KEY=${DEEPSEEK_KEY}
      - PRIMARY_MODEL=deepseek-chat
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
DEEPSEEK_KEY=...

# Optional
PRIMARY_MODEL=deepseek-chat
DEEPSEEK_URL=https://api.deepseek.com/v1
PORT=3000
LOG_LEVEL=info
MAX_TOKENS=4096
TIMEOUT=30000
```

## Monitoring

### Metrics

```typescript
import { createHistogram, createCounter, createGauge } from 'prom-client';

const requestLatency = createHistogram({
  name: 'deepseek_request_latency_seconds',
  help: 'Request latency in seconds',
  labelNames: ['model'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const tokenUsage = createCounter({
  name: 'deepseek_tokens_total',
  help: 'Total tokens used',
  labelNames: ['model', 'type']
});

const activeRequests = createGauge({
  name: 'deepseek_active_requests',
  help: 'Number of active requests',
  labelNames: ['model']
});

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  const model = req.body.model || 'unknown';
  
  activeRequests.labels(model).inc();
  
  res.on('finish', () => {
    const latency = Number(process.hrtime.bigint() - start) / 1e9;
    requestLatency.labels(model).observe(latency);
    activeRequests.labels(model).dec();
  });
  
  next();
});

app.post('/v1/chat/completions', async (req, res) => {
  const response = await fetch(`${DEEPSEEK_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_KEY}`
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
    new winston.transports.File({ filename: 'deepseek-proxy.log' })
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
   - Verify key format
   - Check for typos
   - Regenerate key from DeepSeek console

2. **Model Not Available**
   - Check model list: GET `/v1/models`
   - Verify model ID is correct
   - Model might be temporarily unavailable

3. **Rate Limit Exceeded**
   - Implement retry with backoff
   - Check your rate limits
   - Consider upgrading plan

4. **Context Window Exceeded**
   - Check model's max context (32K tokens)
   - Truncate long prompts
   - Use summarization

5. **Code Generation Issues**
   - Be specific in your prompts
   - Include examples of desired output
   - Specify language and requirements

### Debug Mode

```bash
# Enable verbose logging
DEBUG=deepseek:* node index.js

# Or log full requests
import fetch from 'node-fetch';

const originalFetch = global.fetch;
global.fetch = async (url: string, options: any) => {
  if (url.includes('deepseek.com')) {
    console.log('DeepSeek Request:', url, options);
  }
  const response = await originalFetch(url, options);
  const cloned = response.clone();
  const body = await cloned.json();
  if (url.includes('deepseek.com')) {
    console.log('DeepSeek Response:', body);
  }
  return response;
};
```

## Resources

### Official Documentation
- [DeepSeek API Docs](https://docs.deepseek.com/api)
- [API Reference](https://docs.deepseek.com/docs/api-reference)
- [Model Information](https://deepseek.com/models)
- [Pricing](https://deepseek.com/pricing)

### SDKs
- [Unofficial Python SDK](https://github.com/deepseek-ai/deepseek-sdk)
- [Community TypeScript SDK](https://github.com/deepseek-ai/typescript-sdk)
- [Java SDK](https://github.com/deepseek-ai/java-sdk)

### Tools
- [DeepSeek Chat](https://chat.deepseek.com)
- [Model Playground](https://platform.deepseek.com/playground)
- [API Status](https://status.deepseek.com)

## Comparison with Other Providers

| Feature | DeepSeek | OpenAI | Anthropic | Groq | Mistral |
|---------|----------|--------|-----------|------|---------|
| Context Window | 32K | 16K-128K | 200K | 8K-123K | 8K-128K |
| Price (Input) | $0.0000014/tok | $0.00001-0.00003 | $0.000003-0.000015 | $0.0000008 | €0.00000025-0.000008 |
| Price (Output) | $0.0000028/tok | $0.00003-0.00006 | $0.000015 | $0.0000008 | €0.00000025-0.000024 |
| OpenAI Compatible | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes |
| Function Calling | ❌ No | ✅ Yes | ✅ Beta | ❌ No | ✅ Yes |
| Embeddings | ❌ No | ✅ Yes | ❌ No | ❌ No | ✅ Yes |
| Multi-modal | ❌ No | ✅ Yes | ✅ Claude 3 | ❌ No | ❌ No |
| Coding Specialist | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| Reasoning | ✅ Good | ✅ Good | ✅ Excellent | ❌ Basic | ✅ Good |
| Strengths | Coding, Cost | Features, Ecosystem | Reasoning, Safety | Speed, Cost | Open-source |

## Principles

- **Cost First**: DeepSeek offers some of the best prices
- **Quality Matters**: High-quality outputs despite low cost
- **Specialized**: Excellent for coding and technical tasks
- **Simple API**: Use standard OpenAI format
- **Reliable**: Consistent performance and uptime
- **Developer Focus**: Built for developer use cases

## Workflow

1. **Sign Up** - Create account at deepseek.com
2. **Get API Key** - Generate your key from the platform
3. **Choose Model** - Select based on task (chat vs coder)
4. **Make Request** - Use standard OpenAI format
5. **Handle Response** - Process the OpenAI-compatible response
6. **Optimize** - Use batching, caching, and appropriate models
7. **Monitor** - Track usage, latency, and costs
8. **Deploy** - Scale your application

## Examples

### 1. Basic Completion

```typescript
async function complete(prompt: string, model: string = 'deepseek-chat') {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_KEY}`
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

### 2. Code Generation

```typescript
class DeepSeekCoder {
  private model: string;
  
  constructor(model: string = 'deepseek-coder') {
    this.model = model;
  }
  
  async generateCode(prompt: string, language: string = 'python') {
    const systemPrompt = `You are an expert ${language} developer. Write clean, efficient, and well-documented code.`;
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_KEY}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 4096
      })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
  
  async explainCode(code: string, language: string = 'python') {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_KEY}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: `You are an expert ${language} developer. Explain code clearly.` },
          { role: 'user', content: `Explain the following ${language} code:\n\`\`\`${language}\n${code}\n\`\`\`` }
        ],
        temperature: 0.2
      })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
  
  async optimizeCode(code: string, prompt: string, language: string = 'python') {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_KEY}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: `You are an expert ${language} developer. Optimize code for performance and readability.` },
          { role: 'user', content: `Optimize this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nPrompt: ${prompt}` }
        ],
        temperature: 0.3
      })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
}

// Usage
const coder = new DeepSeekCoder();
const code = await coder.generateCode('Write a Python function to sort a list by length');
const explanation = await coder.explainCode(code);
const optimized = await coder.optimizeCode(code, 'Make it faster');
```

### 3. Multi-Turn Conversation

```typescript
class DeepSeekConversation {
  private messages: any[] = [];
  private model: string;
  
  constructor(model: string = 'deepseek-chat') {
    this.model = model;
  }
  
  async send(prompt: string) {
    this.messages.push({ role: 'user', content: prompt });
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_KEY}`
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

### 4. Streaming

```typescript
async function* streamComplete(prompt: string, model: string) {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_KEY}`
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
for await (const chunk of streamComplete('Tell me a story', 'deepseek-chat')) {
  process.stdout.write(chunk);
}
```

### 5. Parallel Requests

```typescript
async function parallelComplete(prompts: string[], model: string) {
  const requests = prompts.map(prompt => 
    fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_KEY}`
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

### 6. Cost Calculation

```typescript
async function calculateCost(prompt: string, model: string) {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 0 // Only count input tokens
    })
  });
  
  const data = await response.json();
  const inputTokens = data.usage?.prompt_tokens || 0;
  
  const pricing: Record<string, { input: number; output: number }> = {
    'deepseek-chat': { input: 0.0000014, output: 0.0000028 },
    'deepseek-coder': { input: 0.0000014, output: 0.0000028 }
  };
  
  const rates = pricing[model] || { input: 0.0000014, output: 0.0000028 };
  
  return {
    inputTokens,
    inputCost: inputTokens * rates.input,
    outputCostPerToken: rates.output
  };
}
```

## Future Features

- More models and capabilities
- Fine-tuning API
- Custom model deployment
- Function calling support
- Multi-modal capabilities
- Real-time streaming improvements
- Expanded context windows

## Principles

- **Cost Efficiency**: Always optimize for cost-effective solutions
- **Quality First**: Never compromise on output quality
- **Specialization**: Use the right model for the task
- **Simplicity**: Keep the API simple and intuitive
- **Reliability**: Ensure consistent performance and uptime
- **Developer Focus**: Build for developer needs

## Workflow

1. **Sign Up** - Create DeepSeek account
2. **Get API Key** - Generate your key from the platform
3. **Explore Models** - Test chat and coder models
4. **Choose Wisely** - Select based on your specific use case
5. **Integrate** - Use REST API or SDKs
6. **Test** - Validate accuracy and performance
7. **Optimize** - Use batching, caching, and streaming
8. **Monitor** - Track usage, latency, and costs
9. **Deploy** - Scale your application
10. **Iterate** - Continuously improve based on feedback
