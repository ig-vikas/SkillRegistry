---
name: embedding-storage
type: skill
description: Embedding generation, normalization, caching, batching, dimensionality management, and vector storage integration for semantic retrieval.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [ai-ml, storage, retrieval]
tags: [embeddings, vector-search, openai, sentence-transformers, caching, normalization, batching]
---

# Embedding Storage Expert

Implement embedding generation and storage for semantic search. The service should batch requests, cache deterministic embeddings, enforce dimensions, normalize vectors where appropriate, and persist vectors through the LanceDB storage layer.

Embeddings are model-specific data. Never mix dimensions or embedding models in the same vector column unless the schema explicitly separates them.

## Architecture

```
Text chunks -> EmbeddingService -> Cache
                            | miss
                            v
                         Provider API / Local Model
                            v
                       Vector normalization
                            v
                       Vector Store (LanceDB)
```

## Core Components

| Component | Purpose | Technology/Implementation |
|-----------|---------|--------------------------|
| Chunker | Split text into embeddable units | Token/character windows |
| EmbeddingProvider | Generate vectors | OpenAI embeddings, local service |
| Cache | Avoid duplicate embedding cost | SHA-256 key by model+text+dimension |
| Normalizer | Prepare cosine/dot vectors | L2 normalization |
| StorageAdapter | Persist vectors and metadata | LanceDB repository |

## Setup & Installation

```bash
pnpm add openai zod
pnpm add -D vitest typescript @types/node
```

For local sentence-transformer models, expose a small HTTP embedding service or use an ONNX runtime adapter in a separate process.

## Configuration (Zod Schema)

```typescript
import { z } from "zod";

export const EmbeddingConfigSchema = z.object({
  provider: z.enum(["openai", "local-http"]).default("openai"),
  model: z.string().default("text-embedding-3-small"),
  dimensions: z.number().int().positive().default(1536),
  normalize: z.boolean().default(true),
  batchSize: z.number().int().min(1).max(2048).default(128),
  maxInputChars: z.number().int().positive().default(24_000),
  cache: z.object({
    enabled: z.boolean().default(true),
    maxEntries: z.number().int().positive().default(100_000),
    ttlSeconds: z.number().int().positive().default(60 * 60 * 24 * 30),
  }).default({}),
  openai: z.object({
    apiKeyEnv: z.string().default("OPENAI_API_KEY"),
    baseURL: z.string().url().optional(),
  }).default({}),
  localHttp: z.object({
    endpoint: z.string().url().default("http://localhost:8000/embed"),
    timeoutMs: z.number().int().positive().default(30_000),
  }).default({}),
});

export type EmbeddingConfig = z.infer<typeof EmbeddingConfigSchema>;
```

## Implementation

### Embedding Service

```typescript
import OpenAI from "openai";
import { createHash } from "node:crypto";

export interface EmbeddingResult {
  text: string;
  vector: number[];
  model: string;
  dimensions: number;
  cached: boolean;
}

export class EmbeddingCache {
  private values = new Map<string, { vector: number[]; expiresAt: number }>();
  constructor(private ttlSeconds: number, private maxEntries: number) {}
  get(key: string): number[] | undefined {
    const value = this.values.get(key);
    if (!value || value.expiresAt < Date.now()) return undefined;
    return value.vector;
  }
  set(key: string, vector: number[]): void {
    if (this.values.size >= this.maxEntries) this.values.delete(this.values.keys().next().value);
    this.values.set(key, { vector, expiresAt: Date.now() + this.ttlSeconds * 1000 });
  }
}

export class EmbeddingService {
  private openai?: OpenAI;
  private cache: EmbeddingCache;

  constructor(private config: EmbeddingConfig) {
    this.cache = new EmbeddingCache(config.cache.ttlSeconds, config.cache.maxEntries);
    if (config.provider === "openai") {
      const apiKey = process.env[config.openai.apiKeyEnv];
      if (!apiKey) throw new Error(`Missing ${config.openai.apiKeyEnv}`);
      this.openai = new OpenAI({ apiKey, baseURL: config.openai.baseURL });
    }
  }

  async embed(texts: string[]): Promise<EmbeddingResult[]> {
    const sanitized = texts.map((text) => text.slice(0, this.config.maxInputChars));
    const results = new Map<number, EmbeddingResult>();
    const misses: Array<{ index: number; text: string; key: string }> = [];

    sanitized.forEach((text, index) => {
      const key = this.cacheKey(text);
      const cached = this.config.cache.enabled ? this.cache.get(key) : undefined;
      if (cached) results.set(index, { text, vector: cached, model: this.config.model, dimensions: cached.length, cached: true });
      else misses.push({ index, text, key });
    });

    for (let i = 0; i < misses.length; i += this.config.batchSize) {
      const batch = misses.slice(i, i + this.config.batchSize);
      const vectors = await this.generate(batch.map((item) => item.text));
      vectors.forEach((vector, offset) => {
        const item = batch[offset]!;
        const normalized = this.config.normalize ? normalizeVector(vector) : vector;
        this.validateVector(normalized);
        if (this.config.cache.enabled) this.cache.set(item.key, normalized);
        results.set(item.index, { text: item.text, vector: normalized, model: this.config.model, dimensions: normalized.length, cached: false });
      });
    }

    return sanitized.map((_, index) => {
      const result = results.get(index);
      if (!result) throw new Error(`Missing embedding result at index ${index}`);
      return result;
    });
  }

  private async generate(texts: string[]): Promise<number[][]> {
    if (this.config.provider === "openai") {
      const response = await this.openai!.embeddings.create({
        model: this.config.model,
        input: texts,
        dimensions: this.config.dimensions,
      });
      return response.data.map((item) => item.embedding);
    }
    const res = await fetch(this.config.localHttp.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: this.config.model, input: texts, dimensions: this.config.dimensions }),
    });
    if (!res.ok) throw new Error(`Local embedding service failed: ${res.status} ${await res.text()}`);
    const json = await res.json() as { embeddings: number[][] };
    return json.embeddings;
  }

  private cacheKey(text: string): string {
    return createHash("sha256").update(`${this.config.provider}:${this.config.model}:${this.config.dimensions}:${text}`).digest("base64url");
  }

  private validateVector(vector: number[]): void {
    if (vector.length !== this.config.dimensions) throw new Error(`Expected ${this.config.dimensions} dimensions, got ${vector.length}`);
    if (!vector.every(Number.isFinite)) throw new Error("Embedding contains non-finite values");
  }
}

export function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) return vector;
  return vector.map((value) => value / norm);
}
```

### Storage Adapter

```typescript
export async function embedAndStore(service: EmbeddingService, repo: LanceMemoryRepository, rows: Omit<MemoryVector, "vector">[]) {
  const embeddings = await service.embed(rows.map((row) => row.text));
  await repo.upsert(rows.map((row, index) => ({ ...row, vector: embeddings[index]!.vector })));
}
```

## Integration with Gateway

Run embedding generation after message persistence and before retrieval indexing:

```typescript
await sessionStore.append(messageEvent);
await embedAndStore(embeddingService, memoryRepo, [memoryRow]);
```

## Best Practices

1. Keep model, dimension, and normalization in metadata.
2. Normalize vectors for cosine search unless the database/provider already guarantees it.
3. Batch inputs to reduce request overhead.
4. Cache by exact model, dimension, provider, and input text.
5. Do not silently truncate important documents; chunk them intentionally.
6. Monitor embedding failures separately from LLM completion failures.
7. Re-embed when changing models or dimensions.

## Testing

### Unit Tests

```typescript
it("normalizes vectors to unit length", () => {
  const vector = normalizeVector([3, 4]);
  expect(Math.hypot(...vector)).toBeCloseTo(1);
});
```

### Integration Tests

```typescript
it("caches repeated embeddings", async () => {
  const [a] = await service.embed(["same"]);
  const [b] = await service.embed(["same"]);
  expect(b.cached).toBe(true);
  expect(b.vector).toEqual(a.vector);
});
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Vector DB rejects rows | Dimension mismatch | Recreate/version table per embedding model |
| Similarity quality is poor | Bad chunking or wrong metric | Evaluate chunk size and metric with labeled queries |
| Costs spike | Cache disabled or duplicate chunks | Enable cache and deduplicate text |
| Local embeddings differ by run | Non-deterministic model server | Pin model revision and runtime settings |
| OpenAI request too large | Batch or input exceeds limits | Chunk text and lower `batchSize` |

### Debug Commands

```bash
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
curl -X POST http://localhost:8000/embed -H "content-type: application/json" -d '{"input":["hello"],"model":"all-MiniLM-L6-v2"}'
```

## Resources

- **[OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)** - Embedding API and dimensions parameter.
- **[text-embedding-3-small](https://developers.openai.com/api/docs/models/text-embedding-3-small)** - Model reference and pricing.
- **[Sentence Transformers all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)** - Local 384-dimensional embedding model.
- **[LanceDB Vector Search](https://docs.lancedb.com/search/vector-search)** - Vector search and filtering.
- **[FAISS](https://faiss.ai/)** - ANN library reference for comparison.

## Principles

1. Embeddings are schema-bound data.
2. Retrieval quality depends on chunking, model, metric, and index together.
3. Cache deterministic work.
4. Validate dimensions at every boundary.
5. Re-embedding is a migration, not a configuration toggle.
