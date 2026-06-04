---
name: lancedb-storage
type: skill
description: LanceDB vector storage, indexing, CRUD, filtering, and hybrid retrieval patterns for local-first AI agent memory and retrieval systems.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [storage, ai-ml, vector-db]
tags: [lancedb, vector-search, embeddings, ann, hnsw, ivf-pq, hybrid-search, retrieval]
---

# LanceDB Storage Expert

Implement LanceDB as the local vector store for agent memory, semantic search, document retrieval, and embedding-backed message recall. LanceDB stores Apache Arrow/Lance data on disk and supports vector, scalar, and full-text indexes.

Use LanceDB when the gateway needs local-first retrieval without a separate database server. Design around immutable-ish batches, explicit schema/versioning, and measured recall/latency tradeoffs.

## Architecture

```
AgentGateway
  | upsert documents/messages
  v
Embedding Service -> LanceDB Table
                    | vector index: IVF_PQ / IVF_HNSW_*
                    | scalar index: BTREE / BITMAP / LABEL_LIST
                    v
Retriever -> rerank/filter -> LLM context
```

## Core Components

| Component | Purpose | Technology/Implementation |
|-----------|---------|--------------------------|
| LanceClient | Connect to local or cloud LanceDB | `@lancedb/lancedb` |
| TableManager | Create/open versioned tables | Arrow schema with vector column |
| VectorRepository | Add, update, delete, query rows | Batch writes and filtered vector search |
| IndexManager | Build vector/scalar/FTS indexes | IVF_PQ, IVF_HNSW_SQ, BTREE, FTS |
| Retriever | Normalize query API for gateway | Top-k, filters, `nprobes`, `refineFactor` |

## Setup & Installation

```bash
pnpm add @lancedb/lancedb apache-arrow zod
pnpm add -D vitest typescript @types/node
```

For local storage, keep the database path under the gateway data directory, for example `./data/lancedb`.

## Configuration (Zod Schema)

```typescript
import { z } from "zod";

export const LanceMetricSchema = z.enum(["l2", "cosine", "dot"]);

export const LanceDbConfigSchema = z.object({
  uri: z.string().default("./data/lancedb"),
  tableName: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/).default("agent_memory"),
  vectorColumn: z.string().default("vector"),
  embeddingDimension: z.number().int().positive().default(1536),
  metric: LanceMetricSchema.default("cosine"),
  createIfMissing: z.boolean().default(true),
  batchSize: z.number().int().min(1).max(10_000).default(256),
  index: z.object({
    enabled: z.boolean().default(true),
    type: z.enum(["IVF_PQ", "IVF_HNSW_SQ", "IVF_HNSW_FLAT", "IVF_HNSW_PQ"]).default("IVF_PQ"),
    numPartitions: z.number().int().positive().optional(),
    numSubVectors: z.number().int().positive().optional(),
    nprobes: z.number().int().positive().default(20),
    refineFactor: z.number().int().positive().default(10),
  }).default({}),
  scalarIndexes: z.array(z.object({
    column: z.string(),
    type: z.enum(["BTREE", "BITMAP", "LABEL_LIST"]),
  })).default([{ column: "sessionId", type: "BTREE" }, { column: "tags", type: "LABEL_LIST" }]),
  fullText: z.object({
    enabled: z.boolean().default(false),
    column: z.string().default("text"),
  }).default({}),
});

export type LanceDbConfig = z.infer<typeof LanceDbConfigSchema>;
```

## Implementation

### Repository

```typescript
import * as lancedb from "@lancedb/lancedb";

export interface MemoryVector {
  id: string;
  sessionId: string;
  userId: string;
  source: "message" | "document" | "summary" | "tool_result";
  text: string;
  vector: number[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export class LanceMemoryRepository {
  private db?: lancedb.Connection;
  private table?: lancedb.Table;

  constructor(private config: LanceDbConfig) {}

  async initialize(): Promise<void> {
    this.db = await lancedb.connect(this.config.uri);
    const names = await this.db.tableNames();
    if (names.includes(this.config.tableName)) {
      this.table = await this.db.openTable(this.config.tableName);
      return;
    }
    if (!this.config.createIfMissing) throw new Error(`Missing LanceDB table: ${this.config.tableName}`);
    this.table = await this.db.createTable(this.config.tableName, [this.sampleRow()]);
    await this.table.delete("id = '__schema_sample__'");
  }

  async upsert(rows: MemoryVector[]): Promise<void> {
    const table = this.requireTable();
    for (const row of rows) this.validateVector(row.vector);
    await table.mergeInsert("id").whenMatchedUpdateAll().whenNotMatchedInsertAll().execute(rows);
  }

  async deleteBySession(sessionId: string): Promise<void> {
    await this.requireTable().delete(`sessionId = '${this.escapeSql(sessionId)}'`);
  }

  async search(queryVector: number[], options: { limit?: number; sessionId?: string; tags?: string[] } = {}) {
    this.validateVector(queryVector);
    let query = this.requireTable()
      .search(queryVector)
      .metricType(this.config.metric)
      .limit(options.limit ?? 10)
      .nprobes(this.config.index.nprobes)
      .refineFactor(this.config.index.refineFactor);

    const filters: string[] = [];
    if (options.sessionId) filters.push(`sessionId = '${this.escapeSql(options.sessionId)}'`);
    if (options.tags?.length) filters.push(options.tags.map((tag) => `array_has(tags, '${this.escapeSql(tag)}')`).join(" AND "));
    if (filters.length) query = query.where(filters.join(" AND "));

    return query.toArray() as Promise<Array<MemoryVector & { _distance: number }>>;
  }

  async createIndexes(): Promise<void> {
    const table = this.requireTable();
    if (this.config.index.enabled) {
      await table.createIndex(this.config.vectorColumn, {
        config: lancedb.Index.ivfPq({
          distanceType: this.config.metric,
          numPartitions: this.config.index.numPartitions,
          numSubVectors: this.config.index.numSubVectors,
        }),
      });
    }
    for (const index of this.config.scalarIndexes) {
      await table.createIndex(index.column, { config: lancedb.Index.btree() });
    }
  }

  private requireTable(): lancedb.Table {
    if (!this.table) throw new Error("LanceDB repository is not initialized");
    return this.table;
  }

  private validateVector(vector: number[]): void {
    if (vector.length !== this.config.embeddingDimension) {
      throw new Error(`Expected vector dimension ${this.config.embeddingDimension}, got ${vector.length}`);
    }
    if (!vector.every(Number.isFinite)) throw new Error("Vector contains non-finite values");
  }

  private escapeSql(value: string): string {
    return value.replaceAll("'", "''");
  }

  private sampleRow(): MemoryVector {
    return {
      id: "__schema_sample__",
      sessionId: "schema",
      userId: "schema",
      source: "document",
      text: "",
      vector: Array.from({ length: this.config.embeddingDimension }, () => 0),
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {},
    };
  }
}
```

### Hybrid Search

```typescript
export async function hybridSearch(repo: LanceMemoryRepository, queryVector: number[], text: string) {
  const vectorResults = await repo.search(queryVector, { limit: 50 });
  return vectorResults
    .map((row) => ({
      ...row,
      score: 1 / (1 + row._distance) + (row.text.toLowerCase().includes(text.toLowerCase()) ? 0.15 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
```

## Integration with Gateway

Inject the repository into the memory/retrieval service:

```typescript
export class AgentGateway {
  async initializeStorage(config: LanceDbConfig) {
    this.memoryStore = new LanceMemoryRepository(config);
    await this.memoryStore.initialize();
    await this.memoryStore.createIndexes();
  }
}
```

## Best Practices

1. Keep one vector dimension per table.
2. Choose `cosine` for normalized text embeddings; use `dot` only when model guidance supports it.
3. Start with `IVF_PQ`; test `IVF_HNSW_SQ` when recall needs are higher and filters are light.
4. Tune `nprobes` and `refineFactor` with a labeled recall set.
5. Add scalar indexes for frequent filters such as `sessionId`, `userId`, and source type.
6. Batch writes to reduce metadata and transaction overhead.
7. Keep raw text and metadata with vectors for explainable retrieval.
8. Rebuild indexes after large backfills.

## Testing

### Unit Tests

```typescript
it("rejects vectors with wrong dimensions", async () => {
  const repo = new LanceMemoryRepository(LanceDbConfigSchema.parse({ embeddingDimension: 3 }));
  await expect(repo.upsert([{ id: "1", sessionId: "s", userId: "u", source: "message", text: "x", vector: [1, 2], tags: [], createdAt: 1, updatedAt: 1, metadata: {} }]))
    .rejects.toThrow(/dimension/);
});
```

### Integration Tests

```typescript
it("stores and retrieves similar rows", async () => {
  const repo = new LanceMemoryRepository(LanceDbConfigSchema.parse({ uri: "./tmp/lancedb-test", embeddingDimension: 3 }));
  await repo.initialize();
  await repo.upsert([{ id: "a", sessionId: "s1", userId: "u1", source: "message", text: "hello", vector: [1, 0, 0], tags: ["chat"], createdAt: Date.now(), updatedAt: Date.now(), metadata: {} }]);
  const rows = await repo.search([1, 0, 0], { limit: 1, sessionId: "s1" });
  expect(rows[0]?.id).toBe("a");
});
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Dimension mismatch | Model changed or table reused | Version table names by model/dimension |
| Slow filtered search | No scalar index or low selectivity | Add scalar index and test prefilter behavior |
| Low recall | Too few probes or aggressive PQ | Increase `nprobes`, `refineFactor`, or use HNSW/flat |
| Large disk usage | Storing duplicate text/metadata | Compact metadata and use batch cleanup |
| Query returns unexpected distances | Metric mismatch | Align normalization and `metricType` |

### Debug Commands

```bash
du -sh ./data/lancedb
node -e "import('@lancedb/lancedb').then(async l=>console.log(await (await l.connect('./data/lancedb')).tableNames()))"
```

## Resources

- **[LanceDB Documentation](https://docs.lancedb.com/)** - Official LanceDB guides.
- **[LanceDB Vector Indexes](https://docs.lancedb.com/indexing/vector-index)** - IVF, HNSW-backed IVF, PQ, and tuning guidance.
- **[LanceDB Vector Search](https://docs.lancedb.com/search/vector-search)** - Search parameters such as `nprobes` and `refine_factor`.
- **[LanceDB JavaScript API](https://lancedb.github.io/lancedb/js/)** - Node/TypeScript SDK reference.
- **[Apache Arrow](https://arrow.apache.org/)** - Columnar memory format used by Lance.

## Principles

1. Schema first, model second, index third.
2. Retrieval quality is measured, not assumed.
3. Metadata filters are part of the index design.
4. Batch writes and explicit compaction beat per-message churn.
5. Keep retrieval explainable by storing source text and provenance.
