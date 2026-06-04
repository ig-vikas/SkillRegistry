---
name: gemini-proxy
type: skill
version: 1.0.0
description: Google Gemini API expert - master requests, responses, multi-modal capabilities, and best practices for all Gemini models.
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
  - google
  - gemini
  - gemini-1.5
  - multi-modal
  - llm
  - proxy
---

# Gemini Proxy Expert

Master the Google Gemini API for text and multi-modal AI applications. Understand the unique request/response format, authentication, and advanced features like function calling, caching, and grounding.

## Quick Start

### Basic Request

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

const result = await model.generateContent({
  contents: [
    { role: 'user', parts: [{ text: 'Hello, Gemini!' }] }
  ]
});

console.log(result.response.text());
```

### REST API Request

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [
          { "text": "Hello, Gemini!" }
        ]
      }
    ]
  }'
```

## Models Overview

### Latest Models (Gemini 1.5)

| Model | Context Window | Max Output Tokens | Use Case | Status |
|-------|----------------|-------------------|----------|--------|
| gemini-1.5-pro-latest | 1,048,576 | 8,192 | Most capable | GA |
| gemini-1.5-flash-latest | 1,048,576 | 8,192 | Fast, efficient | GA |
| gemini-1.5-pro-001 | 1,048,576 | 8,192 | Stable Pro | GA |
| gemini-1.5-flash-001 | 1,048,576 | 8,192 | Stable Flash | GA |

### Previous Generation (Gemini 1.0)

| Model | Context Window | Max Output Tokens | Status |
|-------|----------------|-------------------|--------|
| gemini-1.0-pro | 32,768 | 2,048 | Legacy |
| gemini-1.0-pro-001 | 32,768 | 2,048 | Legacy |
| gemini-pro-vision | 16,384 | 4,096 | Vision model |

### Embedding Models

- `embedding-001` - 768 dimensions
- `text-embedding-004` - Latest text embeddings

## API Endpoints

### Generate Content (Main)
- **URL**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- **Method**: POST
- **Auth**: API Key in query param or Bearer token

### Stream Generate Content
- **URL**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent`
- **Method**: POST
- **Auth**: API Key in query param or Bearer token

### Count Tokens
- **URL**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:countTokens`
- **Method**: POST

### Get Model
- **URL**: `https://generativelanguage.googleapis.com/v1beta/models/{model}`
- **Method**: GET

### List Models
- **URL**: `https://generativelanguage.googleapis.com/v1beta/models`
- **Method**: GET

## Authentication

### API Key (Recommended)
```bash
curl "https://...?key=$API_KEY"
```

### Bearer Token
```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" ...
```

### Service Account
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "...",
  "client_email": "...@your-project-id.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

## Request Parameters

### Basic Request

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {"text": "Your message here"}
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.9,
    "topP": 0.95,
    "topK": 40,
    "maxOutputTokens": 8192,
    "stopSequences": []
  },
  "safetySettings": [
    {
      "category": "HARM_CATEGORY_HARASSMENT",
      "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    }
  ]
}
```

### Content Parts

#### Text Part
```json
{"text": "Hello, world!"}
```

#### File Data (Base64)
```json
{
  "fileData": {
    "mimeType": "image/jpeg",
    "fileUri": "gs://bucket/image.jpg"
  }
}
```

#### Inline Data (Base64)
```json
{
  "inlineData": {
    "mimeType": "image/png",
    "data": "base64_encoded_data"
  }
}
```

### Generation Config

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| temperature | number | 0.0-2.0 | 0.9 | Controls randomness |
| topP | number | 0.0-1.0 | 0.95 | Nucleus sampling |
| topK | number | 1-64 | 40 | Top-k sampling |
| maxOutputTokens | number | 1-8192 | 2048 | Max tokens in response |
| stopSequences | array | - | [] | Custom stop sequences |

### Safety Settings

Categories:
- `HARM_CATEGORY_HARASSMENT`
- `HARM_CATEGORY_HATE_SPEECH`
- `HARM_CATEGORY_SEXUALLY_EXPLICIT`
- `HARM_CATEGORY_DANGEROUS_CONTENT`
- `HARM_CATEGORY_CIVIC_INTEGRITY`

Thresholds:
- `HARM_BLOCK_THRESHOLD_UNSPECIFIED`
- `BLOCK_NONE`
- `BLOCK_ONLY_HIGH`
- `BLOCK_MEDIUM_AND_ABOVE`
- `BLOCK_LOW_AND_ABOVE`

## Response Format

### Basic Response

```json
{
  "candidates": [
    {
      "content": {
        "role": "assistant",
        "parts": [
          {
            "text": "Hello! I'm Gemini, here to help you."
          }
        ]
      },
      "finishReason": "STOP",
      "index": 0,
      "safetyRatings": [
        {
          "category": "HARM_CATEGORY_HARASSMENT",
          "probability": "NEGLIGIBLE"
        }
      ]
    }
  ],
  "promptFeedback": {
    "safetyRatings": []
  },
  "usageMetadata": {
    "promptTokenCount": 25,
    "candidatesTokenCount": 10,
    "totalTokenCount": 35
  }
}
```

### Finish Reasons
- `STOP` - Normal completion
- `MAX_TOKENS` - Hit max output tokens
- `SAFETY` - Blocked by safety filter
- `RECITATION` - Blocked for reciting training data
- `OTHER` - Other reasons

## Multi-Modal Capabilities

### Image Input

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {"text": "What is in this image?"},
        {
          "inlineData": {
            "mimeType": "image/jpeg",
            "data": "base64_image_data"
          }
        }
      ]
    }
  ]
}
```

### Video Input

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {"text": "What is happening in this video?"},
        {
          "fileData": {
            "mimeType": "video/mp4",
            "fileUri": "gs://bucket/video.mp4"
          }
        }
      ]
    }
  ]
}
```

### Audio Input

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {"text": "Transcribe this audio"},
        {
          "fileData": {
            "mimeType": "audio/wav",
            "fileUri": "gs://bucket/audio.wav"
          }
        }
      ]
    }
  ]
}
```

### Multi-Modal Output

Gemini can generate images (limited beta):

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {"text": "Draw a picture of a sunset over the ocean"}
      ]
    }
  ],
  "generationConfig": {
    "modalities": ["VISION"]
  }
}
```

## Advanced Features

### 1. Function Calling

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {"text": "What's the weather in SF?"}
      ]
    }
  ],
  "tools": [
    {
      "functionDeclarations": [
        {
          "name": "get_weather",
          "description": "Get current weather for a location",
          "parameters": {
            "type": "OBJECT",
            "properties": {
              "location": {
                "type": "STRING",
                "description": "City and state"
              }
            },
            "required": ["location"]
          }
        }
      ]
    }
  ]
}
```

**Function Call Response:**
```json
{
  "candidates": [
    {
      "content": {
        "role": "assistant",
        "parts": [
          {"text": "I'll check the weather for you."},
          {
            "functionCall": {
              "name": "get_weather",
              "args": {"location": "San Francisco, CA"}
            }
          }
        ]
      }
    }
  ]
}
```

### 2. Caching

Gemini automatically caches content. Use `cacheControl` to manage:

```json
{
  "contents": [...],
  "cacheControl": {
    "cacheMode": "CACHE_MODE_UNSPECIFIED" // or CACHE_MODE_ENABLED, CACHE_MODE_DISABLED
  }
}
```

### 3. Grounding (Web Search)

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {"text": "What's the latest AI news?"}
      ]
    }
  ],
  "tools": [
    {
      "grounding": {
        "groundingConfig": {
          "groundingSource": "GROUNDING_SOURCE_TYPE_SEARCH"
        }
      }
    }
  ]
}
```

### 4. System Instructions

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {"text": "List all products"}
      ]
    }
  ],
  "systemInstruction": {
    "parts": [
      {"text": "You are a helpful assistant that always responds in JSON format."}
    ]
  }
}
```

## Streaming

### Server-Sent Events

```typescript
const streamingResp = await model.generateContentStream({
  contents: [{ role: 'user', parts: [{ text: 'Tell me a story' }] }]
});

for await (const chunk of streamingResp.stream) {
  const chunkText = chunk.candidates[0]?.content?.parts[0]?.text;
  if (chunkText) {
    process.stdout.write(chunkText);
  }
}
```

### Streaming Response Format

```json
{
  "candidates": [
    {
      "content": {
        "role": "assistant",
        "parts": [
          {"text": "Hello"}
        ]
      },
      "index": 0
    }
  ]
}
```

## Error Handling

### Common Errors

#### 400 Invalid Request
```json
{
  "error": {
    "code": 400,
    "message": "Invalid request format",
    "status": "INVALID_ARGUMENT"
  }
}
```

#### 401 Unauthorized
```json
{
  "error": {
    "code": 401,
    "message": "Request had invalid authentication credentials",
    "status": "UNAUTHENTICATED"
  }
}
```

#### 403 Forbidden
```json
{
  "error": {
    "code": 403,
    "message": "Permission denied",
    "status": "PERMISSION_DENIED"
  }
}
```

#### 404 Not Found
```json
{
  "error": {
    "code": 404,
    "message": "Model not found",
    "status": "NOT_FOUND"
  }
}
```

#### 429 Rate Limit Exceeded
```json
{
  "error": {
    "code": 429,
    "message": "Quota exceeded",
    "status": "RESOURCE_EXHAUSTED"
  }
}
```

#### 500 Internal Server Error
```json
{
  "error": {
    "code": 500,
    "message": "Internal error",
    "status": "INTERNAL"
  }
}
```

### Safety Ratings

If content is blocked:
```json
{
  "candidates": [],
  "promptFeedback": {
    "safetyRatings": [
      {
        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
        "probability": "HIGH",
        "blocked": true
      }
    ]
  }
}
```

## Proxy Implementation

### Basic Proxy

```typescript
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/gemini/generate', async (req, res) => {
  try {
    const { model, contents, generationConfig, safetySettings } = req.body;
    
    const modelInstance = genAI.getGenerativeModel({ model });
    const result = await modelInstance.generateContent({
      contents,
      generationConfig,
      safetySettings
    });
    
    res.json({
      text: result.response.text(),
      finishReason: result.response.candidates[0]?.finishReason,
      usage: result.response.usageMetadata
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

app.listen(3000);
```

### OpenAI-Compatible Proxy

```typescript
function openAIToGemini(openAIRequest: any): any {
  return {
    contents: openAIRequest.messages.map((m: any) => ({
      role: m.role,
      parts: [{ text: typeof m.content === 'string' ? m.content : m.content[0]?.text || '' }]
    })),
    generationConfig: {
      temperature: openAIRequest.temperature || 0.9,
      maxOutputTokens: openAIRequest.max_tokens || 2048,
      topP: openAIRequest.top_p || 0.95,
      topK: openAIRequest.top_k || 40
    }
  };
}

function geminiToOpenAI(geminiResponse: any): any {
  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: geminiResponse.model || 'gemini-1.5-pro',
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || ''
      },
      finish_reason: geminiResponse.candidates?.[0]?.finishReason?.toLowerCase() || 'stop'
    }],
    usage: {
      prompt_tokens: geminiResponse.usageMetadata?.promptTokenCount || 0,
      completion_tokens: geminiResponse.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: geminiResponse.usageMetadata?.totalTokenCount || 0
    }
  };
}

app.post('/v1/chat/completions', async (req, res) => {
  const geminiRequest = openAIToGemini(req.body);
  const model = genAI.getGenerativeModel({ model: req.body.model || 'gemini-1.5-pro' });
  const result = await model.generateContent(geminiRequest);
  res.json(geminiToOpenAI(result.response));
});
```

### Streaming Proxy

```typescript
app.post('/gemini/stream', async (req, res) => {
  const { model, contents } = req.body;
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  const modelInstance = genAI.getGenerativeModel({ model });
  const streamingResp = await modelInstance.generateContentStream({ contents });
  
  for await (const chunk of streamingResp.stream) {
    const text = chunk.candidates[0]?.content?.parts[0]?.text;
    if (text) {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
  }
  
  res.write('data: [DONE]\n\n');
  res.end();
});
```

## Best Practices

### 1. Always Set Safety Settings

```json
{
  "safetySettings": [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"}
  ]
}
```

### 2. Handle Multi-Modal Inputs Properly

```typescript
function validateParts(parts: any[]): boolean {
  return parts.every(part => {
    if (part.text) return true;
    if (part.inlineData) {
      return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(part.inlineData.mimeType);
    }
    if (part.fileData) {
      return ['image/*', 'video/*', 'audio/*'].some(type => 
        part.fileData.mimeType.startsWith(type));
    }
    return false;
  });
}
```

### 3. Use System Instructions for Context

```typescript
function createRequestWithSystem(prompt: string, system: string) {
  return {
    contents: [
      { role: 'user', parts: [{ text: prompt }] }
    ],
    systemInstruction: {
      parts: [{ text: system }]
    }
  };
}
```

### 4. Validate Content Before Sending

```typescript
import { HarmBlockThreshold, HarmCategory } from '@google/generative-ai';

function isSafe(content: string): boolean {
  // Basic profanity check - use proper library in production
  const profanities = ['bad', 'hate', 'violent'];
  return !profanities.some(word => content.toLowerCase().includes(word));
}

async function safeGenerate(model: any, prompt: string) {
  if (!isSafe(prompt)) {
    throw new Error('Content violates safety policy');
  }
  
  return model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }]
  });
}
```

### 5. Retry on Rate Limits

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

## Performance Optimization

### 1. Connection Pooling

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Agent } from 'https';

const httpsAgent = new Agent({
  keepAlive: true,
  keepAliveMsecs: 60000,
  maxSockets: 20,
  maxFreeSockets: 10
});

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY,
  { httpsAgent }
);
```

### 2. Caching

```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 }); // 10 minute cache

async function cachedGenerate(model: any, prompt: string) {
  const cacheKey = `gemini:${model}:${prompt}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }]
  });
  
  cache.set(cacheKey, result);
  return result;
}
```

### 3. Batching

```typescript
class RequestBatcher {
  private batch: Array<{ prompt: string; resolve: Function }> = [];
  private processing = false;
  
  add(prompt: string) {
    return new Promise((resolve) => {
      this.batch.push({ prompt, resolve });
      this.process();
    });
  }
  
  async process() {
    if (this.processing || this.batch.length < 3) return;
    
    this.processing = true;
    const batch = this.batch.splice(0, 3);
    
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      const results = await Promise.all(
        batch.map(({ prompt }) => 
          model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
        )
      );
      batch.forEach((item, i) => item.resolve(results[i]));
    } finally {
      this.processing = false;
    }
  }
}
```

## Testing

### Unit Tests

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { describe, it, expect, vi } from 'vitest';

describe('Gemini Proxy', () => {
  it('generates content', async () => {
    const genAI = new GoogleGenerativeAI('test-key');
    
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{
          content: {
            role: 'assistant',
            parts: [{ text: 'Hello!' }]
          },
          finishReason: 'STOP'
        }],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15
        }
      })
    }));
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Hi' }] }]
    });
    
    expect(result.response.text()).toBe('Hello!');
  });
});
```

### Integration Tests

```typescript
import { createProxy } from './proxy';

describe('Gemini Proxy Integration', () => {
  it('proxies requests', async () => {
    const proxy = createProxy({ port: 3001 });
    
    const response = await fetch('http://localhost:3001/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Test' }] }]
      })
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.text).toBeDefined();
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

### Environment Variables

```bash
# Required
GEMINI_API_KEY=...

# Optional
PORT=3000
MODEL=gemini-1.5-pro
TIMEOUT=30000
MAX_TOKENS=8192
LOG_LEVEL=info
```

## Monitoring

### Metrics

```typescript
import { createHistogram, createCounter } from 'prom-client';

const requestDuration = createHistogram({
  name: 'gemini_request_duration_seconds',
  help: 'Duration of Gemini requests',
  buckets: [0.1, 0.5, 1, 2, 5]
});

const tokenUsage = createCounter({
  name: 'gemini_tokens_total',
  help: 'Total tokens used',
  labelNames: ['type']
});

const errorCount = createCounter({
  name: 'gemini_errors_total',
  help: 'Total errors'
});
```

### Logging

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - start
    });
  });
  
  next();
});
```

## Troubleshooting

### Common Issues

1. **Invalid API Key**
   - Verify key format
   - Check if key is expired
   - Ensure billing is enabled

2. **Model Not Available**
   - Check if model is available in your region
   - Verify you have access
   - Try a different model

3. **Rate Limit Exceeded**
   - Implement retry logic
   - Check quota in Google Cloud Console
   - Request quota increase

4. **Safety Filter Blocked**
   - Review safety ratings
   - Adjust safety settings
   - Modify prompt to be safer

5. **Context Too Long**
   - Reduce input tokens
   - Use shorter prompts
   - Enable caching

### Debug Mode

```bash
# Enable verbose logging
DEBUG=gemini:* node index.js
```

## Resources

### Official Documentation
- [Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [API Reference](https://ai.google.dev/api)
- [Model Information](https://ai.google.dev/models)
- [Pricing](https://ai.google.dev/pricing)

### SDKs
- [Official Node.js SDK](https://github.com/google-generative-ai/generative-ai-js)
- [Official Python SDK](https://github.com/google-generative-ai/generative-ai-python)
- [REST API Guide](https://ai.google.dev/api/rest)

### Tools
- [API Explorer](https://api-explorer.firebaseapp.com/apis/generativelanguage.googleapis.com/v1beta)
- [Token Calculator](https://ai.google.dev/token-calculator)

## Comparison with Other Providers

| Feature | Gemini | Claude | GPT-4 | Mistral | Groq |
|---------|--------|--------|-------|---------|------|
| Max Context | 1M | 200K | 128K | 128K | 32K |
| Multi-modal | ✅ | ✅ Claude 3 | ✅ | ❌ | ❌ |
| Function Calling | ✅ | ✅ Beta | ✅ | ✅ | ❌ |
| Web Search | ✅ Grounding | ✅ Beta | ❌ | ❌ | ❌ |
| Caching | ✅ | ❌ | ❌ | ❌ | ❌ |
| Price (Input) | ~$0.0000025/tok | $0.000003/tok | $0.00003/tok | $0.0000027/tok | $0.0000008/tok |
| Price (Output) | ~$0.00001/tok | $0.000015/tok | $0.00006/tok | $0.0000027/tok | $0.0000008/tok |

## Principles

- **Safety First**: Always set appropriate safety settings
- **Validate Inputs**: Check content before sending
- **Handle Multi-modal**: Support text, images, video, audio
- **Optimize Costs**: Use caching and batching
- **Monitor Usage**: Track tokens and latency
- **Secure Keys**: Never expose API keys

## Workflow

1. **Initialize client** - Create GoogleGenerativeAI instance
2. **Select model** - Choose based on task and budget
3. **Format request** - Proper contents and generation config
4. **Send request** - Handle streaming or batch
5. **Process response** - Extract text, check finish reason
6. **Handle errors** - Retry on rate limits, validate safety
7. **Monitor** - Track performance and usage
8. **Optimize** - Cache, batch, and improve

## Examples

### 1. Basic Text Generation

```typescript
async function generateText(prompt: string) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }]
  });
  
  return result.response.text();
}
```

### 2. Multi-turn Conversation

```typescript
class Conversation {
  private history: Array<{ role: 'user' | 'model'; parts: any[] }> = [];
  
  async send(prompt: string, modelName: string = 'gemini-1.5-pro') {
    this.history.push({ role: 'user', parts: [{ text: prompt }] });
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const result = await model.generateContent({
      contents: this.history,
      generationConfig: { maxOutputTokens: 8192 }
    });
    
    const text = result.response.text();
    this.history.push({ role: 'model', parts: [{ text }] });
    
    return text;
  }
}
```

### 3. Image Description

```typescript
import fs from 'fs';

async function describeImage(imagePath: string) {
  const imageData = fs.readFileSync(imagePath, 'base64');
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  
  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'Describe this image in detail.' },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageData
            }
          }
        ]
      }
    ]
  });
  
  return result.response.text();
}
```

### 4. System Instruction

```typescript
async function chatWithSystem(prompt: string, system: string) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    systemInstruction: {
      parts: [{ text: system }]
    }
  });
  
  return result.response.text();
}
```

### 5. Function Calling

```typescript
async function useFunctions(prompt: string) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [
      {
        functionDeclarations: [
          {
            name: 'get_weather',
            description: 'Get current weather',
            parameters: {
              type: 'OBJECT',
              properties: {
                location: { type: 'STRING', description: 'City name' }
              },
              required: ['location']
            }
          }
        ]
      }
    ]
  });
  
  return result;
}
```

### 6. Streaming

```typescript
async function streamResponse(prompt: string) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  
  const streamingResp = await model.generateContentStream({
    contents: [{ role: 'user', parts: [{ text: prompt }] }]
  });
  
  let fullText = '';
  for await (const chunk of streamingResp.stream) {
    const text = chunk.candidates[0]?.content?.parts[0]?.text;
    if (text) {
      process.stdout.write(text);
      fullText += text;
    }
  }
  
  return fullText;
}
```

### 7. Embeddings

```typescript
async function getEmbeddings(texts: string[]) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'embedding-001' });
  
  const embeddings = await Promise.all(
    texts.map(text => model.embedContent(text))
  );
  
  return embeddings.map(e => e.embedding.values);
}
```

### 8. Parallel Requests

```typescript
async function parallelGenerate(prompts: string[]) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  
  const results = await Promise.all(
    prompts.map(prompt => 
      model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
    )
  );
  
  return results.map(r => r.response.text());
}
```

## Cost Optimization

### Token Counting

```typescript
function countTokens(text: string): number {
  // Approximate - use official tokenizer for accuracy
  return Math.ceil(text.length / 4);
}

async function getCost(prompt: string, model: string) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const modelInstance = genAI.getGenerativeModel({ model });
  
  const count = await modelInstance.countTokens({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
  
  const pricing = {
    'gemini-1.5-pro': { input: 0.0000025, output: 0.00001 },
    'gemini-1.5-flash': { input: 0.00000035, output: 0.00000105 },
    'gemini-1.0-pro': { input: 0.000005, output: 0.000015 }
  };
  
  const rates = pricing[model as keyof typeof pricing];
  return {
    input: count.totalTokens * (rates?.input || 0),
    output: 0 // Output tokens unknown until generation
  };
}
```

### Cost-Saving Tips

1. **Use Flash for simple tasks** - 10x cheaper than Pro
2. **Cache frequent requests** - Avoid recomputing
3. **Set appropriate maxOutputTokens** - Don't over-request
4. **Use system instructions** - Reduce repetition
5. **Batch requests** - Process multiple at once
6. **Enable caching** - Let Google cache common requests
7. **Monitor usage** - Track and optimize

## Future Features

- More multi-modal capabilities
- Custom models and fine-tuning
- Expanded function calling
- Better caching controls
- Real-time data integration
- Voice and video generation

## Principles

- **Safety**: Always consider safety implications
- **Multi-modal**: Embrace all input/output types
- **Efficiency**: Optimize for cost and performance
- **Observability**: Monitor and log everything
- **Flexibility**: Support various use cases
- **Reliability**: Handle errors gracefully

## Workflow

1. **Authenticate** - Set up API key or service account
2. **Select model** - Choose based on capabilities and cost
3. **Format request** - Proper contents, parts, and config
4. **Send request** - Handle both streaming and batch
5. **Process response** - Extract text, check safety, validate
6. **Handle errors** - Retry on rate limits, check safety ratings
7. **Monitor** - Track tokens, latency, and errors
8. **Optimize** - Cache, batch, and improve performance
