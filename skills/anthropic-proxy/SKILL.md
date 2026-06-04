---
name: anthropic-proxy
type: skill
version: 1.0.0
description: Anthropic Claude API expert - master Messages API requests, responses, streaming, tool use, prompt caching, and current Claude 4-family model practices.
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
  - anthropic
  - claude
  - claude-4
  - messages-api
  - llm
  - proxy
---

# Anthropic Proxy Expert

Master the Anthropic API for Claude models, including request formatting, response handling, streaming, tool use, prompt caching, extended thinking where supported, and safe proxy behavior.

## Quick Start

### Basic Request

```typescript
import { MessageParam, TextBlockParam } from '@anthropic-ai/sdk';

const messages: MessageParam[] = [
  {
    role: 'user',
    content: 'Hello, Claude! How are you today?'
  }
];

// Using official SDK
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages
});

console.log(response.content[0].text);
```

### REST API Request

```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "Hello, Claude!"}
    ]
  }'
```

## Models Overview

### Current Claude Models

| Model | Max Tokens | Context Window | Use Case | Price (Input) | Price (Output) |
|-------|------------|----------------|----------|---------------|----------------|
| claude-opus-4-1-20250805 | 200,000 | 200K | Highest-capability reasoning and coding | $15/1M | $75/1M |
| claude-opus-4-20250514 | 200,000 | 200K | High-capability reasoning and coding | $15/1M | $75/1M |
| claude-sonnet-4-20250514 | 200,000 | 200K | Balanced production default | $3/1M | $15/1M |
| claude-3-7-sonnet-20250219 | 200,000 | 200K | Prior Sonnet generation with strong reasoning | $3/1M | $15/1M |
| claude-3-5-haiku-20241022 | 200,000 | 200K | Low-latency, lower-cost tasks | $0.80/1M | $4/1M |

Older Claude 2 and Claude 3 Opus/Sonnet variants should be treated as migration targets only. Check Anthropic's model and pricing pages before pinning a model in production because deprecations and regional availability change.

## API Endpoints

### Messages API (Recommended)
- **URL**: `https://api.anthropic.com/v1/messages`
- **Method**: POST
- **Version**: 2023-06-01 (required in header)
- **Rate Limit**: 100 requests per minute (varies by model)

### Legacy Text Completions API
- **Status**: Avoid for new work. Use the Messages API unless maintaining a legacy integration.
- **Status**: Deprecated, use Messages API

## Request Parameters

### Required Parameters

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "messages": [
    {
      "role": "user",
      "content": "Your message here"
    }
  ]
}
```

### All Parameters

```typescript
interface MessageCreateParams {
  // Required
  model: string;
  max_tokens: number;
  messages: MessageParam[];
  
  // Optional
  anthropic_version?: string; // Header is preferred
  metadata?: object; // Custom metadata
  stop_sequences?: string[]; // Custom stop sequences
  stream?: boolean; // Enable streaming
  temperature?: number; // 0.0 to 1.0, default 1.0
  top_p?: number; // 0.0 to 1.0, default 1.0
  top_k?: number; // 1 to 5, default null
}
```

### Message Types

#### Text Messages

```json
{
  "role": "user",
  "content": "Hello, Claude!"
}
```

#### Multi-modal Messages (Claude 3)

```json
{
  "role": "user",
  "content": [
    {
      "type": "text",
      "text": "What is in this image?"
    },
    {
      "type": "image",
      "source": {
        "type": "base64",
        "media_type": "image/jpeg",
        "data": "base64_encoded_image_data"
      }
    }
  ]
}
```

#### Image Source Types

1. **Base64**
```json
{
  "type": "base64",
  "media_type": "image/jpeg",
  "data": "..."
}
```

2. **URL**
```json
{
  "type": "url",
  "url": "https://example.com/image.jpg"
}
```

#### Supported Image Formats
- JPEG
- PNG
- WEBP
- GIF (first frame only)

## Response Format

### Basic Response

```json
{
  "id": "msg_1234567890",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Hello! I'm Claude, and I'm here to help you."
    }
  ],
  "model": "claude-sonnet-4-20250514",
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": {
    "input_tokens": 25,
    "output_tokens": 10
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique message ID |
| type | string | Always "message" |
| role | string | Always "assistant" |
| content | array | Message content blocks |
| model | string | Model used for response |
| stop_reason | string | Why the response stopped |
| stop_sequence | string\|null | If stopped by sequence |
| usage | object | Token usage statistics |

### Stop Reasons

- `end_turn` - Model naturally ended
- `stop_sequence` - Hit a stop sequence
- `max_tokens` - Reached max tokens

### Content Block Types

- `text` - Text content
- `tool_use` - Tool/function call (Beta feature)

## Advanced Features

### 1. System Messages

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "system": "You are a helpful assistant that always responds in JSON format.",
  "messages": [
    {"role": "user", "content": "List all users"}
  ]
}
```

**Note**: System message is separate from messages array in Anthropic API.

### 2. Tools / Function Calling (Beta)

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "tools": [
    {
      "name": "get_weather",
      "description": "Get the current weather for a location",
      "input_schema": {
        "type": "object",
        "properties": {
          "location": {
            "type": "string",
            "description": "The city and state, e.g., 'San Francisco, CA'"
          }
        },
        "required": ["location"]
      }
    }
  ],
  "messages": [
    {"role": "user", "content": "What's the weather in San Francisco?"}
  ]
}
```

**Tool Response:**
```json
{
  "id": "msg_tool_123",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "I'll check the weather for you."
    },
    {
      "type": "tool_use",
      "id": "tool_456",
      "name": "get_weather",
      "input": {"location": "San Francisco, CA"}
    }
  ],
  "model": "claude-sonnet-4-20250514",
  "stop_reason": "tool_use",
  "stop_sequence": null,
  "usage": {"input_tokens": 25, "output_tokens": 15}
}
```

### 3. Extended Thinking

Claude 4-family and Sonnet 3.7 models support extended thinking controls for difficult reasoning tasks. Budget thinking tokens deliberately and include them in cost and latency planning:

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 4096,
  "thinking": {
    "type": "enabled",
    "budget_tokens": 16000
  },
  "messages": [
    {
      "role": "user",
      "content": "Solve this complex problem step by step..."
    }
  ]
}
```

Extended thinking changes token accounting and cache behavior. When using prompt caching, track `cache_creation_input_tokens`, `cache_read_input_tokens`, `input_tokens`, and `output_tokens` separately.

### 4. Web Search (Beta)

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "web_search": {
    "enabled": true
  },
  "messages": [
    {"role": "user", "content": "What's the latest news about AI?"}
  ]
}
```

### 5. Image Understanding

Claude 3 supports vision:

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "What is shown in this image?"},
        {
          "type": "image",
          "source": {
            "type": "base64",
            "media_type": "image/png",
            "data": "iVBORw0KGgoAAAANSUhEUgAA..."
          }
        }
      ]
    }
  ]
}
```

## Streaming

### SSE (Server-Sent Events)

```typescript
import { Anthropic } from '@anthropic-ai/sdk';

const stream = await anthropic.messages.createStream({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Tell me a story' }]
});

for await (const message of stream) {
  if (message.type === 'message_start') {
    console.log('Message ID:', message.message.id);
  }
  if (message.type === 'message_delta') {
    process.stdout.write(message.delta.text);
  }
  if (message.type === 'message_stop') {
    console.log('\nStop reason:', message.stop_reason);
  }
}
```

### Streaming Events

1. **message_start** - First event, contains message ID
2. **message_delta** - Text chunks as they're generated
3. **message_stop** - Final event, contains stop reason and usage

## Error Handling

### Common Errors

#### 400 Bad Request
```json
{
  "type": "bad_request_error",
  "message": "Invalid message format",
  "param": null,
  "code": null
}
```

**Solutions:**
- Validate your request JSON
- Check for required fields
- Ensure proper message format

#### 401 Unauthorized
```json
{
  "type": "authentication_error",
  "message": "Invalid API key"
}
```

**Solutions:**
- Verify your API key
- Check if key has expired
- Regenerate key if needed

#### 403 Forbidden
```json
{
  "type": "permission_error",
  "message": "You don't have permission to use this model"
}
```

**Solutions:**
- Check your plan limits
- Verify model access
- Upgrade plan if needed

#### 429 Rate Limit Exceeded
```json
{
  "type": "rate_limit_error",
  "message": "Rate limit exceeded"
}
```

**Solutions:**
- Implement retry with backoff
- Check your rate limits
- Distribute requests

#### 500 Server Error
```json
{
  "type": "server_error",
  "message": "Internal server error"
}
```

**Solutions:**
- Wait and retry
- Check Anthropic status page
- Contact support

## Proxy Implementation

### Basic Proxy Server

```typescript
import express from 'express';
import { Anthropic } from '@anthropic-ai/sdk';

const app = express();
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

app.post('/anthropic/messages', async (req, res) => {
  try {
    const { model, max_tokens, messages, system } = req.body;
    
    const response = await anthropic.messages.create({
      model,
      max_tokens,
      messages,
      ...(system && { system })
    });
    
    res.json(response);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      error: error.message
    });
  }
});

app.listen(3000, () => console.log('Anthropic proxy running on port 3000'));
```

### Streaming Proxy

```typescript
import { createServer } from 'http';
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const server = createServer(async (req, res) => {
  if (req.url?.startsWith('/anthropic/stream')) {
    const { model, max_tokens, messages } = await parseBody(req);
    
    const stream = await anthropic.messages.createStream({
      model,
      max_tokens,
      messages
    });
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    for await (const event of stream) {
      if (event.type === 'message_delta') {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    }
    
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

server.listen(3000);
```

### OpenAI-Compatible Proxy

Convert OpenAI format to Anthropic:

```typescript
function openAIToAnthropic(openAIRequest: any): any {
  return {
    anthropic_version: '2023-06-01',
    model: openAIRequest.model || 'claude-sonnet-4-20250514',
    max_tokens: openAIRequest.max_tokens || 4096,
    ...(openAIRequest.system && { system: openAIRequest.system }),
    messages: openAIRequest.messages.map((m: any) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : m.content[0]?.text || ''
    }))
  };
}

function anthropicToOpenAI(anthropicResponse: any): any {
  return {
    id: anthropicResponse.id,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: anthropicResponse.model,
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: anthropicResponse.content[0]?.text || ''
      },
      finish_reason: anthropicResponse.stop_reason || 'stop'
    }],
    usage: {
      prompt_tokens: anthropicResponse.usage.input_tokens,
      completion_tokens: anthropicResponse.usage.output_tokens,
      total_tokens: anthropicResponse.usage.input_tokens + anthropicResponse.usage.output_tokens
    }
  };
}

app.post('/v1/chat/completions', async (req, res) => {
  const anthropicRequest = openAIToAnthropic(req.body);
  const response = await anthropic.messages.create(anthropicRequest);
  res.json(anthropicToOpenAI(response));
});
```

## Best Practices

### 1. Always Set anthropic-version Header

```bash
curl -H "anthropic-version: 2023-06-01" ...
```

### 2. Use Exponential Backoff for Rate Limits

```typescript
async function withRetry(fn: () => Promise<any>, maxRetries = 3) {
  let attempt = 0;
  
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.statusCode !== 429 || attempt >= maxRetries) {
        throw error;
      }
      
      const retryAfter = error.headers?.['retry-after'] || 
        Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, retryAfter));
      attempt++;
    }
  }
}
```

### 3. Validate Message Content

```typescript
function validateContent(content: any): boolean {
  if (typeof content === 'string') return true;
  if (Array.isArray(content)) {
    return content.every(block => 
      block.type === 'text' || 
      (block.type === 'image' && validateImageSource(block.source))
    );
  }
  return false;
}

function validateImageSource(source: any): boolean {
  if (source.type === 'base64') {
    return typeof source.data === 'string' && 
           ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(source.media_type);
  }
  if (source.type === 'url') {
    return typeof source.url === 'string' && /^https?:\/\/.+/.test(source.url);
  }
  return false;
}
```

### 4. Handle Token Limits

```typescript
function estimateTokens(text: string): number {
  // Approximate: 4 characters = 1 token
  return Math.ceil(text.length / 4);
}

function validateTokenLimit(messages: any[], maxTokens: number) {
  const totalTokens = messages.reduce((sum, msg) => {
    if (typeof msg.content === 'string') {
      return sum + estimateTokens(msg.content);
    }
    if (Array.isArray(msg.content)) {
      return sum + msg.content.reduce((s, block) => 
        s + (block.type === 'text' ? estimateTokens(block.text) : 0), 0);
    }
    return sum;
  }, 0);
  
  if (totalTokens + maxTokens > 200000) {
    throw new Error('Total tokens would exceed context window');
  }
}
```

### 5. Use TypeScript for Type Safety

```typescript
import { MessageParam, TextBlockParam, ImageBlockParam } from '@anthropic-ai/sdk';

type ContentBlock = TextBlockParam | ImageBlockParam;
type Message = Omit<MessageParam, 'content'> & { content: string | ContentBlock[] };

function createMessage(role: 'user' | 'assistant', content: string | ContentBlock[]): Message {
  return { role, content };
}
```

## Performance Optimization

### 1. Connection Reuse

```typescript
import { Anthropic } from '@anthropic-ai/sdk';
import { Agent } from 'https';

const httpsAgent = new Agent({
  keepAlive: true,
  keepAliveMsecs: 60000,
  maxSockets: 10,
  maxFreeSockets: 10
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  fetchOptions: {
    agent: httpsAgent
  }
});
```

### 2. Request Batching

```typescript
class RequestBatcher {
  private queue: Array<{ request: any; resolve: Function; reject: Function }> = [];
  private processing = false;
  
  async addRequest(request: any) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      this.process();
    });
  }
  
  async process() {
    if (this.processing) return;
    this.processing = true;
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, Math.min(this.queue.length, 5));
      
      try {
        const responses = await Promise.all(
          batch.map(({ request }) => anthropic.messages.create(request))
        );
        batch.forEach((item, i) => item.resolve(responses[i]));
      } catch (error) {
        batch.forEach(item => item.reject(error));
      }
    }
    
    this.processing = false;
  }
}
```

### 3. Caching

```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // 5 minute cache

async function cachedRequest(request: any) {
  const cacheKey = JSON.stringify(request);
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  const response = await anthropic.messages.create(request);
  cache.set(cacheKey, response);
  return response;
}
```

## Testing

### Unit Tests

```typescript
import { Anthropic } from '@anthropic-ai/sdk';
import { describe, it, expect, vi } from 'vitest';

describe('Anthropic Proxy', () => {
  it('creates valid message', async () => {
    const anthropic = new Anthropic({ apiKey: 'test-key' });
    
    // Mock the fetch
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello!' }],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 }
      })
    }));
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Hi' }]
    });
    
    expect(response.content[0].text).toBe('Hello!');
  });
});
```

### Integration Tests

```typescript
import { createServer } from './server';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Anthropic Proxy Integration', () => {
  let server: any;
  
  beforeAll(() => {
    server = createServer();
    server.listen(4000);
  });
  
  afterAll(() => server.close());
  
  it('responds to messages endpoint', async () => {
    const response = await fetch('http://localhost:4000/anthropic/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Test' }]
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.role).toBe('assistant');
  });
});
```

## Monitoring and Observability

### Metrics

```typescript
import { createHistogram, createCounter } from 'prom-client';

const requestDuration = createHistogram({
  name: 'anthropic_request_duration_seconds',
  help: 'Duration of Anthropic requests',
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const tokenUsage = createCounter({
  name: 'anthropic_tokens_total',
  help: 'Total tokens used',
  labelNames: ['type'] // input or output
});

const errorCount = createCounter({
  name: 'anthropic_errors_total',
  help: 'Total errors',
  labelNames: ['status_code', 'model']
});

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    requestDuration.observe(duration);
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
    new winston.transports.File({ filename: 'anthropic-proxy.log' })
  ]
});

app.use((req, res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    body: req.body,
    ip: req.ip
  });
  
  const originalSend = res.send;
  res.send = function(body: any) {
    logger.info({
      status: res.statusCode,
      response: body
    });
    originalSend.call(this, body);
  };
  
  next();
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
  anthropic-proxy:
    build: .
    ports:
      - "3000:3000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - PORT=3000
      - NODE_ENV=production
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
ANTHROPIC_API_KEY=sk_...

# Optional
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
RATE_LIMIT=100
MAX_TOKENS=4096
TIMEOUT=30000
```

## Troubleshooting

### Common Issues

1. **Invalid API Key**
   - Verify key format (should start with `sk_`)
   - Check for typos
   - Regenerate key from Anthropic console

2. **Model Not Available**
   - Check your plan allows the model
   - Verify model name is correct
   - Check regional availability

3. **Rate Limit Exceeded**
   - Implement retry logic
   - Check your plan limits
   - Consider upgrading

4. **Context Window Exceeded**
   - Reduce message history
   - Use summarization for long conversations
   - Check token count before sending

5. **Invalid Message Format**
   - Validate JSON structure
   - Check content types
   - Ensure proper base64 encoding for images

### Debugging

```bash
# Enable SDK debug logging
DEBUG=anthropic:* node index.js

# Or in code
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  debug: true
});
```

## Resources

### Official Documentation
- [Anthropic API Docs](https://docs.anthropic.com/en/api)
- [Messages API](https://docs.anthropic.com/en/api/messages)
- [Claude Models](https://docs.anthropic.com/en/docs/model-details)
- [Beta Features](https://docs.anthropic.com/en/docs/beta-features)

### SDKs
- [Official TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript)
- [Official Python SDK](https://github.com/anthropics/anthropic-sdk-python)
- [Community SDKs](https://github.com/topics/anthropic)

### Tools
- [Token Calculator](https://www.anthropic.com/token-calculator)
- [API Status](https://status.anthropic.com)
- [Model Playground](https://console.anthropic.com)

## Comparison with Other Providers

| Feature | Anthropic | OpenAI | Mistral | Groq |
|---------|-----------|--------|---------|------|
| Messages API | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Multi-modal | ✅ Claude 3 | ✅ GPT-4V | ❌ No | ❌ No |
| Function Calling | ✅ Beta | ✅ Yes | ✅ Yes | ❌ No |
| Context Window | ✅ 200K | ✅ 128K | ✅ 128K | ✅ 32K |
| Streaming | ✅ SSE | ✅ SSE | ✅ SSE | ✅ SSE |
| Web Search | ✅ Beta | ❌ No | ❌ No | ❌ No |
| Extended Thinking | Claude 4 / Sonnet 3.7 where enabled | Model-dependent | Model-dependent | No |

## Principles

- **Clarity**: Always set clear system messages
- **Validation**: Validate all inputs before sending
- **Error Handling**: Gracefully handle all error cases
- **Performance**: Optimize for low latency
- **Security**: Never expose API keys
- **Observability**: Log and monitor everything

## Workflow

1. **Understand the task** - What does the user want to achieve?
2. **Choose the right model** - Sonnet for general, Opus for complex, Haiku for fast
3. **Format the request** - Proper message structure and parameters
4. **Handle the response** - Process and validate the response
5. **Stream if needed** - Use streaming for better UX
6. **Error handling** - Catch and handle all errors gracefully
7. **Monitor** - Track usage, latency, and errors
8. **Optimize** - Cache, batch, and improve performance

## Examples

### 1. Basic Chat Completion

```typescript
async function chat(model: string, prompt: string) {
  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    messages: [
      { role: 'user', content: prompt }
    ]
  });
  
  return response.content[0].text;
}

// Usage
const reply = await chat('claude-sonnet-4-20250514', 'Tell me a joke');
console.log(reply);
```

### 2. Multi-turn Conversation

```typescript
class Conversation {
  private messages: MessageParam[] = [];
  
  async send(prompt: string, model: string = 'claude-sonnet-4-20250514') {
    this.messages.push({ role: 'user', content: prompt });
    
    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      messages: this.messages
    });
    
    const text = response.content[0].text;
    this.messages.push({ role: 'assistant', content: text });
    
    return text;
  }
  
  getHistory() {
    return [...this.messages];
  }
  
  clear() {
    this.messages = [];
  }
}

// Usage
const conv = new Conversation();
const reply1 = await conv.send('Hello!');
const reply2 = await conv.send('What did I just say?');
console.log(reply2); // Claude will remember the previous message
```

### 3. System Message

```typescript
async function chatWithSystem(prompt: string, system: string) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system,
    messages: [
      { role: 'user', content: prompt }
    ]
  });
  
  return response.content[0].text;
}

// Usage
const reply = await chatWithSystem(
  'List all users in JSON format',
  'You are a helpful assistant that always responds in JSON format.'
);
console.log(reply);
```

### 4. Image Understanding

```typescript
import fs from 'fs';

async function describeImage(imagePath: string) {
  const imageData = fs.readFileSync(imagePath, 'base64');
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe this image in detail.' },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageData
            }
          }
        ]
      }
    ]
  });
  
  return response.content[0].text;
}

// Usage
const description = await describeImage('photo.jpg');
console.log(description);
```

### 5. Streaming Completion

```typescript
async function streamChat(prompt: string) {
  const stream = await anthropic.messages.createStream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      { role: 'user', content: prompt }
    ]
  });
  
  let fullText = '';
  for await (const event of stream) {
    if (event.type === 'message_delta') {
      process.stdout.write(event.delta.text);
      fullText += event.delta.text;
    }
  }
  
  return fullText;
}

// Usage
await streamChat('Tell me a long story');
```

### 6. Tool Use (Beta)

```typescript
async function useTools(prompt: string) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    tools: [
      {
        name: 'get_weather',
        description: 'Get the current weather for a location',
        input_schema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'The city and state, e.g., San Francisco, CA'
            }
          },
          required: ['location']
        }
      }
    ],
    messages: [
      { role: 'user', content: prompt }
    ]
  });
  
  return response;
}

// Usage
const result = await useTools('What is the weather in San Francisco?');
// Check if tool was used
if (result.content.some((block: any) => block.type === 'tool_use')) {
  console.log('Tool was used!');
}
```

### 7. Parallel Requests

```typescript
async function parallelChat(prompts: string[], model: string) {
  const requests = prompts.map(prompt => 
    anthropic.messages.create({
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })
  );
  
  const responses = await Promise.all(requests);
  return responses.map(r => r.content[0].text);
}

// Usage
const prompts = ['Hello', 'Hi', 'Hey'];
const replies = await parallelChat(prompts, 'claude-3-haiku-20240307');
console.log(replies);
```

## Migration Guide

### From Legacy Completions to Messages API

**Legacy completions-style prompt:**
```json
{
  "prompt": "\n\nHuman: Hello\n\nAssistant:",
  "max_tokens_to_sample": 1024
}
```

**Claude 3:**
```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "messages": [
    {"role": "user", "content": "Hello"}
  ]
}
```

### From Text Completions to Messages API

**Old (Text Completions):**
```json
{
  "prompt": "Human: Hello\n\nAssistant:",
  "max_tokens_to_sample": 1024
}
```

**New (Messages):**
```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "messages": [
    {"role": "user", "content": "Hello"}
  ]
}
```

## Cost Optimization

### Token Counting

```typescript
function countTokens(text: string): number {
  // Approximate count - use official tokenizer for accuracy
  return Math.ceil(text.length / 4);
}

function getCost(model: string, tokens: number, isInput: boolean): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-opus-4-1-20250805': { input: 0.000015, output: 0.000075 },
    'claude-sonnet-4-20250514': { input: 0.000003, output: 0.000015 },
    'claude-3-haiku-20240307': { input: 0.00000025, output: 0.00000125 },
    'claude-3-5-haiku-20241022': { input: 0.0000008, output: 0.000004 }
  };
  
  const rates = pricing[model];
  if (!rates) return 0;
  
  return isInput ? tokens * rates.input : tokens * rates.output;
}

// Usage
const inputTokens = 1000;
const outputTokens = 500;
const model = 'claude-sonnet-4-20250514';

const inputCost = getCost(model, inputTokens, true);
const outputCost = getCost(model, outputTokens, false);
const totalCost = inputCost + outputCost;

console.log(`Total cost: $${totalCost.toFixed(6)}`);
```

### Cost-Saving Tips

1. **Use Haiku for simple tasks** - 10x cheaper than Opus
2. **Cache responses** - Avoid recomputing the same thing
3. **Use max_tokens wisely** - Set appropriate limits
4. **Summarize long conversations** - Reduce context window usage
5. **Batch requests** - Process multiple inputs at once
6. **Use system messages effectively** - Reduce repetition in prompts
7. **Compress images** - Smaller images = fewer tokens

## Alternatives Comparison

| Feature | Anthropic Claude | OpenAI GPT-4 | Mistral Large | Groq Llama3 |
|---------|------------------|---------------|---------------|--------------|
| Max Context | 200K | 128K | 128K | 32K |
| Multi-modal | ✅ | ✅ | ❌ | ❌ |
| Function Calling | ✅ Beta | ✅ | ✅ | ❌ |
| Price (Input) | $0.000003/tok | $0.00003/tok | $0.0000027/tok | $0.0000008/tok |
| Price (Output) | $0.000015/tok | $0.00006/tok | $0.0000027/tok | $0.0000008/tok |
| Latency | Moderate | High | Moderate | Low |
| Strengths | Reasoning, Safety | General, Plugins | Open-source, Fine-tuning | Speed, Low cost |

## Future Features

- **Voice Input** - Speech-to-text integration
- **Video Understanding** - Analyze video frames
- **More Tools** - Expanded function calling
- **Custom Models** - Fine-tuned models
- **Longer Context** - Beyond 200K tokens
- **Real-time Search** - Web browsing capability

## Principles

- **Be explicit** - Always set clear system messages
- **Validate everything** - Never trust user input
- **Handle errors gracefully** - Users shouldn't see raw errors
- **Optimize for cost** - Use the right model for the task
- **Monitor usage** - Track tokens, latency, and errors
- **Document well** - Code should be self-documenting

## Workflow

1. **Initialize client** - Create Anthropic instance with API key
2. **Choose model** - Select based on task complexity and budget
3. **Format request** - Proper message structure and parameters
4. **Send request** - Handle both streaming and non-streaming
5. **Process response** - Extract text, check for tool use, validate
6. **Handle errors** - Retry on rate limits, surface meaningful errors
7. **Monitor** - Track performance and usage
8. **Optimize** - Improve based on feedback and metrics
