---
name: nvidia-nim-proxy
type: skill
version: 1.0.0
description: NVIDIA NIM expert - master NVIDIA NIM deployment, GPU-accelerated inference, custom model serving, and MCP integration for enterprise AI workloads.
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
  - devops
tags:
  - ai
  - api
  - nvidia
  - nim
  - gpu
  - inference
  - deployment
  - mcp
  - proxy
  - llm
---

# NVIDIA NIM Proxy Expert

Master NVIDIA NIM (NVIDIA Inference Microservice) for deploying, serving, and proxying AI models with GPU acceleration. Understand NIM architecture, deployment patterns, model serving, proxy implementation, and MCP (Model Context Protocol) integration.

## Quick Start

### Basic NIM Inference Request

```python
import requests

NIM_ENDPOINT = "http://localhost:8000/v1/chat/completions"

payload = {
    "model": "meta/llama-3.1-8b-instruct",
    "messages": [{"role": "user", "content": "What is NVIDIA NIM?"}],
    "max_tokens": 512,
    "temperature": 0.7
}

response = requests.post(NIM_ENDPOINT, json=payload)
print(response.json()["choices"][0]["message"]["content"])
```

### Using curl

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta/llama-3.1-8b-instruct",
    "messages": [{"role": "user", "content": "Explain NVIDIA NIM"}],
    "max_tokens": 256
  }'
```

## NIM Overview

### What is NVIDIA NIM?

NVIDIA NIM (NVIDIA Inference Microservice) is a set of pre-built, optimized containers for AI inference on NVIDIA GPUs. Key features:

- **GPU Acceleration**: Optimized with TensorRT-LLM
- **Containerized**: Easy deployment with Docker
- **OpenAPI Compliant**: Standard REST and gRPC APIs
- **Model Variety**: Support for Llama, Mistral, CodeLlama, and custom models
- **Enterprise Ready**: Security, monitoring, and scalability
- **MCP Support**: Native Model Context Protocol integration

### Architecture

```
Client Apps -> NIM Proxy (Auth, Rate Limiting, Load Balancing) -> NIM Microservices -> NVIDIA AI Platform (TensorRT-LLM, CUDA)
```

### Supported Model Types

| Category | Models | Use Case |
|----------|--------|----------|
| LLM | meta/llama-3.1-8b-instruct, meta/llama-3.1-70b-instruct, model-specific NGC slugs | Chat, text generation, code |
| Embeddings | nvidia/embedding-english-v1, bge-base-en, bge-large-en | Semantic search, retrieval |
| Reranking | nvidia/rerank-english-v1, bge-reranker-large | Passage reranking |
| Safety | llama-guard-7b | Content moderation |

## API Endpoints

### REST API (OpenAI-Compatible)
- `POST /v1/chat/completions` - Chat completions
- `POST /v1/completions` - Text completions
- `POST /v1/embeddings` - Generate embeddings
- `GET /v1/models` - List available models
- `GET /v1/models/{model}` - Model info

### gRPC API
- Service: `nvidia.inference.GRPCInferenceService`
- Methods: `ModelInfer`, `ModelStreamInfer`
- Port: 8001 (default)

## Request Parameters

### Chat Completions Request

```json
{
  "model": "meta/llama-3.1-8b-instruct",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What is NVIDIA NIM?"}
  ],
  "max_tokens": 512,
  "temperature": 0.7,
  "top_p": 0.9,
  "top_k": 50,
  "repetition_penalty": 1.1,
  "stream": false,
  "stop": ["\n\n"]
}
```

## Response Format

### Chat Completion Response

```json
{
  "id": "chatcmpl-1234567890",
  "object": "chat.completion",
  "created": 1717412345,
  "model": "meta/llama-3.1-8b-instruct",
  "choices": [{
    "index": 0,
    "message": {"role": "assistant", "content": "NVIDIA NIM is..."},
    "finish_reason": "stop"
  }],
  "usage": {"prompt_tokens": 15, "completion_tokens": 25, "total_tokens": 40}
}
```

### Streaming Response

```json
{
  "id": "chatcmpl-1234567890",
  "object": "chat.completion.chunk",
  "created": 1717412345,
  "model": "meta/llama-3.1-8b-instruct",
  "choices": [{
    "index": 0,
    "delta": {"role": "assistant", "content": "NVIDIA"},
    "finish_reason": null
  }]
}
```

## Advanced Features

### 1. MCP Integration

NIM supports Model Context Protocol for AI agent capabilities:

```typescript
import { McpClient } from '@modelcontextprotocol/sdk';

const mcpClient = new McpClient({
  endpoint: 'http://localhost:8000/mcp',
  transport: 'http'
});

// List resources
const resources = await mcpClient.listResources();

// Call a tool
const result = await mcpClient.callTool({
  name: 'generate_text',
  arguments: { prompt: 'Explain NVIDIA NIM', max_tokens: 256 }
});
```

### 2. Multi-GPU Deployment

```yaml
# docker-compose.multi-gpu.yml
version: '3.8'
services:
  nim-llama-70b:
    image: nvcr.io/ea-nvidia-ai/nim:llama-3.1-70b
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 4
              capabilities: [gpu]
    ports:
      - "8000:8000"
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
```

### 3. Quantization Options

| Quantization | VRAM Savings | Quality | Performance |
|---------------|--------------|---------|-------------|
| FP16 | 0% | Best | Baseline |
| INT8 | ~50% | Good | Slightly faster |
| INT4 | ~75% | Noticeable | Faster |
| AWQ | ~50-60% | Good | Slightly faster |
| GPTQ | ~75% | Good | Slightly faster |

```bash
docker run --gpus all -e NIM_QUANTIZATION=int4 nvcr.io/ea-nvidia-ai/nim:llama-3.1-8b
```

### 4. Auto-Scaling with Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nim-llama-8b
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: nim
        image: nvcr.io/ea-nvidia-ai/nim:llama-3.1-8b
        resources:
          limits:
            nvidia.com/gpu: 1
```

## Proxy Implementation

### Basic Proxy Server

```typescript
import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

const NIM_ENDPOINT = process.env.NIM_ENDPOINT || 'http://localhost:8000';

app.post('/v1/chat/completions', async (req, res) => {
  try {
    const response = await axios.post(
      `${NIM_ENDPOINT}/v1/chat/completions`,
      req.body,
      { headers: { 'Content-Type': 'application/json' } }
    );
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('NIM Proxy running on port 3000'));
```

### Streaming Proxy

```typescript
import { createServer } from 'http';
import axios from 'axios';

const NIM_ENDPOINT = process.env.NIM_ENDPOINT || 'http://localhost:8000';

const server = createServer(async (req, res) => {
  if (req.method === 'POST' && req.url?.includes('/v1/chat/completions')) {
    const { stream, ...body } = await parseBody(req);
    
    if (stream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      
      const response = await axios.post(
        `${NIM_ENDPOINT}/v1/chat/completions`,
        { ...body, stream: true },
        { responseType: 'stream' }
      );
      
      response.data.pipe(res);
    } else {
      const response = await axios.post(`${NIM_ENDPOINT}/v1/chat/completions`, body);
      res.end(JSON.stringify(response.data));
    }
  }
});

server.listen(3000, () => console.log('NIM Streaming Proxy running on port 3000'));
```

### OpenAI-Compatible Proxy

```typescript
import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

const NIM_ENDPOINT = process.env.NIM_ENDPOINT || 'http://localhost:8000';

// Transform OpenAI to NIM format
function transformToNim(openaiRequest: any): any {
  return {
    model: openaiRequest.model,
    messages: openaiRequest.messages,
    max_tokens: openaiRequest.max_tokens,
    temperature: openaiRequest.temperature,
    stream: openaiRequest.stream
  };
}

// Transform NIM to OpenAI format
function transformToOpenAI(nimResponse: any): any {
  return {
    id: nimResponse.id || `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: nimResponse.model,
    choices: nimResponse.choices.map((choice: any) => ({
      index: choice.index,
      message: { role: choice.message.role, content: choice.message.content },
      finish_reason: choice.finish_reason || 'stop'
    })),
    usage: nimResponse.usage
  };
}

app.post('/v1/chat/completions', async (req, res) => {
  const nimRequest = transformToNim(req.body);
  const response = await axios.post(`${NIM_ENDPOINT}/v1/chat/completions`, nimRequest);
  res.json(transformToOpenAI(response.data));
});

app.listen(3000, () => console.log('OpenAI-compatible NIM Proxy running on port 3000'));
```

### Load Balancing Proxy

```typescript
import express from 'express';
import axios from 'axios';
import { createHash } from 'crypto';

const app = express();
app.use(express.json());

const NIM_INSTANCES = ['http://nim-1:8000', 'http://nim-2:8000', 'http://nim-3:8000'];

// Round-robin
let currentIndex = 0;
function getNextInstance() {
  currentIndex = (currentIndex + 1) % NIM_INSTANCES.length;
  return NIM_INSTANCES[currentIndex];
}

// Consistent hashing
function getInstanceBySession(sessionId: string): string {
  const hash = createHash('sha256');
  hash.update(sessionId);
  const index = parseInt(hash.digest('hex'), 16) % NIM_INSTANCES.length;
  return NIM_INSTANCES[index];
}

app.post('/v1/chat/completions', async (req, res) => {
  const sessionId = req.headers['x-session-id'] as string;
  const instance = sessionId ? getInstanceBySession(sessionId) : getNextInstance();
  
  try {
    const response = await axios.post(`${instance}/v1/chat/completions`, req.body, {
      headers: { 'Content-Type': 'application/json' },
      responseType: req.body.stream ? 'stream' : 'json'
    });
    
    if (req.body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      response.data.pipe(res);
    } else {
      res.json(response.data);
    }
  } catch (error: any) {
    res.status(502).json({ error: 'Service unavailable' });
  }
});

app.listen(3000, () => console.log('Load-balanced NIM Proxy running on port 3000'));
```

## Error Handling

### Common Errors & Solutions

| Error | Code | Solution |
|-------|------|----------|
| Service Unavailable | 503 | Check if NIM container is running, verify GPU availability |
| Rate Limit Exceeded | 429 | Implement retry with backoff, scale up instances |
| Invalid Request | 400 | Validate JSON structure and required fields |
| Model Not Found | 404 | Verify model name, check if model is deployed |
| GPU OOM | 424/500 | Use smaller models, reduce batch size, enable quantization |
| Connection Error | ECONNREFUSED | Check network connectivity, verify endpoint URL |

### Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(private maxFailures: number = 5, private resetTimeout: number = 30000) {}
  
  shouldAllowRequest(): boolean {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }
    return true;
  }
  
  recordSuccess() { this.failures = 0; this.state = 'closed'; }
  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.maxFailures) this.state = 'open';
  }
}
```

### Retry with Exponential Backoff

```typescript
async function withRetry(fn: () => Promise<any>, maxRetries = 3, baseDelay = 1000) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt >= maxRetries) throw error;
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
}
```

## Best Practices

### 1. Health Checks

```typescript
async function checkNimHealth(endpoint: string): Promise<boolean> {
  try {
    const response = await axios.get(`${endpoint}/v1/models`, { timeout: 2000 });
    return response.status === 200;
  } catch { return false; }
}
```

### 2. Token Limit Validation

```typescript
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function validateTokenLimit(messages: any[], maxTokens: number, contextWindow = 32768) {
  const totalTokens = messages.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);
  if (totalTokens + maxTokens > contextWindow) {
    throw new Error(`Total tokens (${totalTokens + maxTokens}) exceeds context window (${contextWindow})`);
  }
}
```

### 3. Connection Pooling

```typescript
import axios from 'axios';
import { createAgent } from 'http-agent';

const httpAgent = createAgent({
  keepAlive: true,
  keepAliveMsecs: 60000,
  maxSockets: 100,
  maxFreeSockets: 10
});

const nimClient = axios.create({
  baseURL: NIM_ENDPOINT,
  httpAgent,
  timeout: 30000
});
```

### 4. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: { message: 'Too many requests', type: 'rate_limit', code: 429 } },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);
```

### 5. Request Batching

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
      const batch = this.queue.splice(0, Math.min(this.queue.length, 8));
      try {
        const batchRequest = { requests: batch.map(({ request }) => request) };
        const responses = await axios.post(`${NIM_ENDPOINT}/v1/batch`, batchRequest);
        batch.forEach((item, i) => item.resolve(responses.data.responses[i]));
      } catch (error) {
        batch.forEach(item => item.reject(error));
      }
    }
    this.processing = false;
  }
}
```

### 6. Response Caching

```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300, checkperiod: 600 });

async function cachedNimRequest(request: any) {
  const cacheKey = JSON.stringify({ model: request.model, messages: request.messages });
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  
  const response = await axios.post(NIM_ENDPOINT, request);
  cache.set(cacheKey, response.data);
  return response.data;
}
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { NIMProxy } from './nim-proxy';

vi.mock('axios');

describe('NIM Proxy', () => {
  const proxy = new NIMProxy('http://localhost:8000');
  
  beforeEach(() => vi.resetAllMocks());
  
  it('proxies chat completion request', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { id: '1', choices: [{ message: { content: 'Hi' } }] } });
    
    const response = await proxy.chatCompletion({
      model: 'llama-3.1-8b',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 50
    });
    
    expect(response.choices[0].message.content).toBe('Hi');
  });
});
```

### Integration Tests

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from './server';
import axios from 'axios';

describe('NIM Proxy Integration', () => {
  let server: any;
  
  beforeAll(async () => {
    server = createServer();
    await new Promise(resolve => server.listen(4000, resolve));
  });
  
  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
  });
  
  it('proxies to NIM endpoint', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { id: '1', choices: [{ message: { content: 'Test' } }] }
    });
    
    const response = await axios.post('http://localhost:4000/v1/chat/completions', {
      model: 'llama-3.1-8b',
      messages: [{ role: 'user', content: 'Test' }]
    });
    
    expect(response.status).toBe(200);
    expect(response.data.choices[0].message.content).toBe('Test');
  });
});
```

## Monitoring and Observability

### Metrics (Prometheus)

```typescript
import { createHistogram, createCounter, createGauge } from 'prom-client';

const requestDuration = createHistogram({
  name: 'nim_request_duration_seconds',
  help: 'Duration of NIM requests',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
});

const tokenUsage = createCounter({
  name: 'nim_tokens_total',
  help: 'Total tokens processed',
  labelNames: ['type']
});

const errorCount = createCounter({
  name: 'nim_errors_total',
  help: 'Total NIM errors',
  labelNames: ['status_code', 'model']
});

const activeRequests = createGauge({
  name: 'nim_active_requests',
  help: 'Number of active requests'
});

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  activeRequests.inc();
  
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    requestDuration.observe(duration);
    activeRequests.dec();
    
    if (res.statusCode >= 400) {
      errorCount.inc({ status_code: res.statusCode.toString(), model: req.body?.model || 'unknown' });
    }
  });
  
  next();
});
```

### Logging (Winston)

```typescript
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'nim-proxy.log', maxsize: 10000000, maxFiles: 10 })
  ]
});

app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  logger.info({ requestId, method: req.method, path: req.path, ip: req.ip });
  
  const originalSend = res.send;
  res.send = function(body: any) {
    logger.info({ requestId, status: res.statusCode, duration: `${Date.now() - (req as any).startTime}ms` });
    originalSend.call(this, body);
  };
  
  (req as any).startTime = Date.now();
  res.setHeader('X-Request-Id', requestId);
  next();
});
```

### Health Endpoints

```typescript
app.get('/health/live', (req, res) => res.json({ status: 'live' }));

app.get('/health/ready', async (req, res) => {
  try {
    const nimResponse = await axios.get(NIM_ENDPOINT + '/v1/models', { timeout: 2000 });
    res.json({ status: 'ready', nimStatus: 'available', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'not_ready', nimStatus: 'unavailable', error: error.message });
  }
});

app.get('/metrics', async (req, res) => {
  const metrics = await promClient.register.metrics();
  res.setHeader('Content-Type', promClient.register.contentType);
  res.end(metrics);
});
```

### Distributed Tracing (OpenTelemetry)

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const sdk = new NodeSDK({
  resource: { attributes: { 'service.name': 'nim-proxy', 'service.version': '1.0.0' } },
  traceExporter: new JaegerExporter({ endpoint: 'http://jaeger:14268/api/traces' }),
  instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();

process.on('SIGTERM', () => sdk.shutdown().then(() => process.exit(0)));
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

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/live || exit 1

CMD ["node", "dist/index.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  nim-proxy:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NIM_ENDPOINT=http://nim:8000
      - LOG_LEVEL=info
    depends_on:
      - nim
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3

  nim:
    image: nvcr.io/ea-nvidia-ai/nim:llama-3.1-8b
    ports:
      - "8000:8000"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
    restart: unless-stopped

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "14268:14268"
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    depends_on:
      - prometheus
    restart: unless-stopped
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nim-proxy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nim-proxy
  template:
    metadata:
      labels:
        app: nim-proxy
    spec:
      containers:
      - name: proxy
        image: your-registry/nim-proxy:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: NIM_ENDPOINT
          value: "http://nim-service:8000"
        resources:
          limits:
            memory: "1Gi"
            cpu: "1"
          requests:
            memory: "500Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10

---
apiVersion: v1
kind: Service
metadata:
  name: nim-proxy
spec:
  selector:
    app: nim-proxy
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nim-proxy-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nim-proxy
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Troubleshooting

### Common Issues & Solutions

1. **NIM Container Fails to Start**
   - Check NVIDIA Container Toolkit: `docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi`
   - Verify GPU drivers: `nvidia-smi`
   - Check CUDA version compatibility

2. **Out of GPU Memory**
   - Use smaller models
   - Enable quantization: `-e NIM_QUANTIZATION=int4`
   - Reduce batch size
   - Add more GPUs

3. **Slow Inference**
   - Use TensorRT-LLM optimized models
   - Enable FP16/INT8: `-e NIM_DATA_TYPE=fp16`
   - Check GPU utilization: `watch -n 1 nvidia-smi`
   - Use multiple GPUs

4. **Network Errors**
   - Check connectivity: `curl -v http://localhost:8000/v1/models`
   - Verify firewall rules
   - Check DNS resolution

5. **Model Not Found**
   - Verify model name: `curl http://localhost:8000/v1/models`
   - Check container logs: `docker logs nim-container`
   - Pull correct image: `docker pull nvcr.io/ea-nvidia-ai/nim:llama-3.1-8b`

6. **Permission Errors**
   - Add user to docker group: `sudo usermod -aG docker $USER`
   - Use sudo: `sudo docker run --gpus all ...`
   - Check file permissions

7. **Version Compatibility**
   - Check NIM version: `curl http://localhost:8000/v1/info`
   - Use specific version: `docker pull nvcr.io/ea-nvidia-ai/nim:llama-3.1-8b-v1.0.0`

### Debug Commands

```bash
# Enable debug logging
LOG_LEVEL=debug node dist/index.js

# View NIM logs
docker logs -f nim-container

# Test NIM endpoint
curl -v http://localhost:8000/v1/models

# Check GPU info
nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu --format=csv

# Profile with nvprof
nvprof --print-gpu-trace python your_script.py
```

## Resources

### Official Documentation
- [NVIDIA NIM Documentation](https://docs.nvidia.com/ai-enterprise/deployment-guide/nim)
- [NVIDIA AI Enterprise](https://www.nvidia.com/en-us/software/ai-enterprise/)
- [TensorRT-LLM](https://github.com/NVIDIA/TensorRT-LLM)
- [NVIDIA NGC Catalog](https://catalog.ngc.nvidia.com/)

### SDKs and Libraries
- [NIM Python SDK](https://pypi.org/project/nvidia-nim/)
- [NIM Client Library](https://github.com/NVIDIA/nim)
- [OpenAI Python Client](https://github.com/openai/openai-python) (compatible)
- [LangChain NIM Integration](https://python.langchain.com/docs/modules/models/llms/integrations/nvidia_ai_endpoints)

### Community
- [NVIDIA Developer Forums](https://forums.developer.nvidia.com/)
- [NVIDIA AI GitHub](https://github.com/NVIDIA/AI)

### Comparison with Other Providers

| Feature | NVIDIA NIM | Anthropic | OpenAI | Mistral | Groq | OpenRouter | DeepSeek |
|---------|------------|-----------|--------|---------|------|------------|----------|
| Self-Hosted | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GPU Acceleration | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Custom Models | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Open Source | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| MCP Support | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Multi-modal | ⚠️ Limited | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cost | Free | Pay-per-use | Pay-per-use | Pay-per-use | Pay-per-use | Pay-per-use | Pay-per-use |

## Examples

### 1. Basic Chat

```python
import requests

def chat(prompt: str, model: str = "meta/llama-3.1-8b-instruct"):
    response = requests.post(
        "http://localhost:8000/v1/chat/completions",
        json={
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 512,
            "temperature": 0.7
        }
    )
    return response.json()["choices"][0]["message"]["content"]

print(chat("What is NVIDIA NIM?"))
```

### 2. Multi-Turn Conversation

```python
class Conversation:
    def __init__(self, model: str = "meta/llama-3.1-8b-instruct"):
        self.model = model
        self.messages = []

    def send(self, prompt: str):
        self.messages.append({"role": "user", "content": prompt})
        response = requests.post(
            "http://localhost:8000/v1/chat/completions",
            json={
                "model": self.model,
                "messages": self.messages,
                "max_tokens": 512
            }
        )
        reply = response.json()["choices"][0]["message"]["content"]
        self.messages.append({"role": "assistant", "content": reply})
        return reply

conv = Conversation()
print(conv.send("Hello!"))
print(conv.send("What did I just say?"))
```

### 3. Generate Embeddings

```python
def generate_embeddings(texts: list):
    response = requests.post(
        "http://localhost:8000/v1/embeddings",
        json={
            "model": "nvidia/embedding-english-v1",
            "input": texts
        }
    )
    return [item["embedding"] for item in response.json()["data"]]

embeddings = generate_embeddings(["Hello", "World"])
print(f"Embedding dimension: {len(embeddings[0])}")
```

### 4. Streaming Chat

```python
def stream_chat(prompt: str):
    response = requests.post(
        "http://localhost:8000/v1/chat/completions",
        json={"model": "meta/llama-3.1-8b-instruct", "messages": [{"role": "user", "content": prompt}], "stream": True},
        stream=True
    )
    
    full_text = ""
    for chunk in response.iter_lines():
        if chunk:
            data = chunk.decode('utf-8').replace('data: ', '')
            if data != '[DONE]':
                import json
                chunk_data = json.loads(data)
                if 'choices' in chunk_data:
                    content = chunk_data['choices'][0]['delta'].get('content', '')
                    print(content, end='', flush=True)
                    full_text += content
    return full_text

stream_chat("Tell me a story")
```

### 5. System Message

```python
def chat_with_system(prompt: str, system: str = ""):
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    
    response = requests.post(
        "http://localhost:8000/v1/chat/completions",
        json={"model": "meta/llama-3.1-8b-instruct", "messages": messages, "max_tokens": 512}
    )
    return response.json()["choices"][0]["message"]["content"]

print(chat_with_system("List users in JSON", "Respond in JSON format"))
```

### 6. Batch Processing

```python
from concurrent.futures import ThreadPoolExecutor
import requests

def batch_chat(prompts: list, max_workers: int = 8):
    def process(prompt: str):
        response = requests.post(
            "http://localhost:8000/v1/chat/completions",
            json={"model": "meta/llama-3.1-8b-instruct", "messages": [{"role": "user", "content": prompt}], "max_tokens": 256}
        )
        return response.json()["choices"][0]["message"]["content"]
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        results = list(executor.map(process, prompts))
    return results

prompts = ["What is AI?", "Explain ML", "What is NVIDIA?"]
replies = batch_chat(prompts)
for p, r in zip(prompts, replies):
    print(f"Q: {p}\nA: {r[:50]}...\n")
```

### 7. MCP Integration

```typescript
import { McpClient } from '@modelcontextprotocol/sdk';

async function useNimWithMcp() {
  const client = new McpClient({
    endpoint: 'http://localhost:8000/mcp',
    transport: 'http'
  });
  
  const resources = await client.listResources();
  console.log('Resources:', resources);
  
  const result = await client.callTool({
    name: 'generate_text',
    arguments: { prompt: 'Explain NVIDIA NIM', max_tokens: 100 }
  });
  
  console.log('Result:', result);
}

useNimWithMcp();
```

### 8. Custom Model Deployment

```bash
# Convert model to NIM format
nim convert --model-type llama --model-path /path/to/model --output-dir /path/to/nim-model

# Build NIM container
docker build -t my-nim-model -f Dockerfile.nim /path/to/nim-model

# Run the NIM
docker run --gpus all -p 8000:8000 my-nim-model
```

## Migration Guide

### From OpenAI API

**Before:**
```python
import openai
client = openai.OpenAI(api_key="key")
response = client.chat.completions.create(model="meta/llama-3.1-8b-instruct", messages=[{"role": "user", "content": "Hi"}], max_tokens=100)
```

**After:**
```python
import requests
response = requests.post("http://localhost:8000/v1/chat/completions", json={
    "model": "meta/llama-3.1-8b-instruct",
    "messages": [{"role": "user", "content": "Hi"}],
    "max_tokens": 100
})
```

### From Hugging Face Transformers

**Before:**
```python
from transformers import AutoModelForCausalLM, AutoTokenizer
tokenizer = AutoTokenizer.from_pretrained("meta-llama/meta/llama-3.1-8b-instruct")
model = AutoModelForCausalLM.from_pretrained("meta-llama/meta/llama-3.1-8b-instruct")
inputs = tokenizer("Hello", return_tensors="pt")
outputs = model.generate(**inputs, max_new_tokens=100)
```

**After:**
```python
import requests
response = requests.post("http://localhost:8000/v1/chat/completions", json={
    "model": "meta/llama-3.1-8b-instruct",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 100
})
```

## Principles

- **GPU-First**: Always optimize for GPU utilization
- **Enterprise-Grade**: Security, reliability, and performance
- **Developer-Friendly**: Simple APIs and good documentation
- **Flexible**: Support multiple use cases and deployment scenarios
- **Observable**: Complete monitoring and logging
- **Scalable**: Design for horizontal scaling
- **Standard**: Use open standards and protocols
- **Innovative**: Leverage latest NVIDIA technologies

## Workflow

1. **Plan**: Determine requirements (model, performance, resources)
2. **Prepare**: Set up infrastructure (GPU, Docker, Network)
3. **Deploy**: Pull and run NIM container
4. **Configure**: Set environment variables and parameters
5. **Test**: Verify deployment with sample requests
6. **Proxy**: Set up NIM proxy for management
7. **Integrate**: Connect client applications
8. **Monitor**: Set up monitoring and logging
9. **Scale**: Add more resources as needed
10. **Optimize**: Tune for best performance and cost

## Cost Optimization

### Resource Management
- **Use Quantization**: INT8 (~50% VRAM savings) or INT4 (~75% VRAM savings)
- **Right-Size Models**: Use smallest model that meets requirements
- **Batch Requests**: Process multiple inputs together
- **Cache Responses**: Cache frequent queries
- **Monitor Usage**: Track token usage and optimize prompts

### Model Selection Guide

| Model | VRAM | Performance | Use Case |
|-------|------|-------------|----------|
| llama-3.1-8b | 16GB | Fast | General, testing |
| mistral-7b | 14GB | Fast | Reasoning |
| llama-3.1-70b | 140GB | Moderate | Production |
| model-specific NIM | See NGC model card | Varies | Pin the NGC image and `/v1/models` ID for production |
