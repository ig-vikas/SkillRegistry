---
name: memory-persistence
type: skill
description: Append-only session memory, conversation history, JSON Lines persistence, compaction, checkpoints, pagination, and token-aware retention for local AI agents.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [storage, backend, ai-ml]
tags: [memory, sessions, jsonl, compaction, checkpoints, token-counting, persistence]
---

# Memory Persistence Expert

Implement durable local conversation memory for the gateway using append-only JSON Lines logs, session indexes, periodic compaction, and token-aware retrieval.

Memory persistence must be crash-tolerant and auditable. Append events instead of rewriting history, then derive compact views for fast loading.

## Architecture

```
Inbound Message -> SessionManager -> JSONL Event Log
                                  -> Session Index
                                  -> Compactor -> Summary Checkpoint
                                  -> Retriever -> AgentGateway context
```

## Core Components

| Component | Purpose | Technology/Implementation |
|-----------|---------|--------------------------|
| SessionLog | Append immutable session events | `.jsonl` with one valid JSON object per line |
| SessionIndex | Fast lookup and pagination metadata | SQLite or compact JSON index |
| TokenCounter | Estimate context pressure | Provider tokenizer or `tiktoken` compatible library |
| Compactor | Summarize older turns and retain recent messages | LLM summarizer + checkpoint event |
| RetentionJob | Enforce TTL and archive policy | Scheduled file rotation |

## Setup & Installation

```bash
pnpm add zod
pnpm add -D vitest typescript @types/node
```

Optional: add a tokenizer package compatible with your provider. Keep a character-based fallback for local/offline use.

## Configuration (Zod Schema)

```typescript
import { z } from "zod";

export const MemoryConfigSchema = z.object({
  rootDir: z.string().default("./data/sessions"),
  fileExtension: z.literal(".jsonl").default(".jsonl"),
  fsync: z.boolean().default(false),
  maxLineBytes: z.number().int().positive().default(512 * 1024),
  pageSize: z.number().int().min(1).max(500).default(50),
  compaction: z.object({
    enabled: z.boolean().default(true),
    maxContextTokens: z.number().int().positive().default(64_000),
    targetSummaryTokens: z.number().int().positive().default(2_000),
    keepRecentTurns: z.number().int().min(1).default(20),
    minEventsBeforeCompaction: z.number().int().positive().default(100),
  }).default({}),
  retention: z.object({
    enabled: z.boolean().default(true),
    days: z.number().int().positive().default(90),
    archiveDir: z.string().optional(),
  }).default({}),
});

export type MemoryConfig = z.infer<typeof MemoryConfigSchema>;
```

## Implementation

### Session Types and JSONL Store

```typescript
import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";

export const MemoryEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("message"), id: z.string(), sessionId: z.string(), role: z.enum(["user", "assistant", "system", "tool"]), content: z.string(), createdAt: z.number().int(), metadata: z.record(z.unknown()).default({}) }),
  z.object({ type: z.literal("summary"), id: z.string(), sessionId: z.string(), content: z.string(), fromEventId: z.string(), toEventId: z.string(), tokenCount: z.number().int(), createdAt: z.number().int() }),
  z.object({ type: z.literal("checkpoint"), id: z.string(), sessionId: z.string(), summaryEventId: z.string(), retainedEventIds: z.array(z.string()), createdAt: z.number().int() }),
]);

export type MemoryEvent = z.infer<typeof MemoryEventSchema>;

export class JsonlSessionStore {
  constructor(private config: MemoryConfig) {}

  async append(event: MemoryEvent): Promise<void> {
    const parsed = MemoryEventSchema.parse(event);
    const line = JSON.stringify(parsed);
    if (Buffer.byteLength(line, "utf8") > this.config.maxLineBytes) throw new Error("Memory event exceeds maxLineBytes");
    const file = this.sessionPath(parsed.sessionId);
    await mkdir(dirname(file), { recursive: true });
    await appendFile(file, `${line}\n`, "utf8");
  }

  async read(sessionId: string): Promise<MemoryEvent[]> {
    const file = this.sessionPath(sessionId);
    let text = "";
    try {
      text = await readFile(file, "utf8");
    } catch (error: any) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
    return text.split("\n").filter(Boolean).map((line, index) => {
      try {
        return MemoryEventSchema.parse(JSON.parse(line));
      } catch (error) {
        throw new Error(`Invalid JSONL at ${file}:${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  async replaceWithCompacted(sessionId: string, events: MemoryEvent[]): Promise<void> {
    const file = this.sessionPath(sessionId);
    const tmp = `${file}.tmp`;
    await mkdir(dirname(file), { recursive: true });
    await writeFile(tmp, events.map((event) => JSON.stringify(MemoryEventSchema.parse(event))).join("\n") + "\n", "utf8");
    await rename(tmp, file);
  }

  page(events: MemoryEvent[], cursor = 0, limit = this.config.pageSize) {
    const items = events.slice(cursor, cursor + limit);
    return { items, nextCursor: cursor + items.length < events.length ? cursor + items.length : undefined };
  }

  private sessionPath(sessionId: string): string {
    const safe = sessionId.replace(/[^a-zA-Z0-9_.-]/g, "_");
    return join(this.config.rootDir, `${safe}${this.config.fileExtension}`);
  }
}
```

### Compaction Logic

```typescript
export interface Summarizer {
  summarize(input: { messages: MemoryEvent[]; targetTokens: number }): Promise<string>;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function compactSession(store: JsonlSessionStore, config: MemoryConfig, summarizer: Summarizer, sessionId: string) {
  const events = await store.read(sessionId);
  const messages = events.filter((event) => event.type === "message");
  if (messages.length < config.compaction.minEventsBeforeCompaction) return { compacted: false };

  const keep = messages.slice(-config.compaction.keepRecentTurns);
  const summarize = messages.slice(0, Math.max(0, messages.length - keep.length));
  const tokenCount = summarize.reduce((sum, event) => sum + estimateTokens(event.content), 0);
  if (tokenCount < config.compaction.maxContextTokens) return { compacted: false };

  const summary = await summarizer.summarize({ messages: summarize, targetTokens: config.compaction.targetSummaryTokens });
  const summaryEvent: MemoryEvent = {
    type: "summary",
    id: crypto.randomUUID(),
    sessionId,
    content: summary,
    fromEventId: summarize[0]!.id,
    toEventId: summarize.at(-1)!.id,
    tokenCount: estimateTokens(summary),
    createdAt: Date.now(),
  };
  const checkpoint: MemoryEvent = {
    type: "checkpoint",
    id: crypto.randomUUID(),
    sessionId,
    summaryEventId: summaryEvent.id,
    retainedEventIds: keep.map((event) => event.id),
    createdAt: Date.now(),
  };
  await store.replaceWithCompacted(sessionId, [summaryEvent, ...keep, checkpoint]);
  return { compacted: true, summaryEventId: summaryEvent.id };
}
```

## Integration with Gateway

```typescript
export class SessionManager {
  constructor(private store: JsonlSessionStore) {}
  async recordUserMessage(sessionId: string, content: string) {
    await this.store.append({ type: "message", id: crypto.randomUUID(), sessionId, role: "user", content, createdAt: Date.now(), metadata: {} });
  }
}
```

## Best Practices

1. Append raw events before calling the LLM so crashes do not lose user input.
2. Use atomic replace for compacted files.
3. Keep summaries as events, not hidden metadata.
4. Validate each JSONL line with Zod on read.
5. Separate retention deletion from compaction.
6. Keep vector memory IDs linked to session event IDs.
7. Use pagination for UI and debugging endpoints.

## Testing

### Unit Tests

```typescript
it("round trips JSONL events", async () => {
  await store.append({ type: "message", id: "m1", sessionId: "s1", role: "user", content: "hello", createdAt: 1, metadata: {} });
  expect((await store.read("s1"))[0]?.id).toBe("m1");
});
```

### Integration Tests

```typescript
it("compacts older messages into a summary", async () => {
  const summarizer = { summarize: async () => "summary" };
  const result = await compactSession(store, config, summarizer, "s1");
  expect(result.compacted).toBe(true);
});
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Invalid JSONL read | Partial/corrupt write | Report line number and recover from last valid line |
| Context still too large | Summary too long or keep window too large | Lower `keepRecentTurns` or target summary tokens |
| Slow session load | Very large un-compacted log | Run compaction and maintain session index |
| Lost ordering | Mixed timestamps from clients | Use server append order as source of truth |
| Path traversal | Raw session IDs used as paths | Sanitize IDs or hash path names |

### Debug Commands

```bash
Get-Content .\data\sessions\s1.jsonl -Tail 20
Get-Content .\data\sessions\s1.jsonl | Measure-Object -Line
```

## Resources

- **[JSON Lines](https://jsonlines.org/)** - JSONL format rules.
- **[OpenAI Token Counting Help](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them)** - Token counting concepts.
- **[OpenAI tiktoken](https://github.com/openai/tiktoken)** - Tokenizer implementation.
- **[Node.js File System](https://nodejs.org/api/fs.html)** - Atomic file and append APIs.
- **[OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)** - Safe audit logging guidance.

## Principles

1. Append first, derive later.
2. Validate history at the boundary.
3. Compaction must preserve provenance.
4. Summaries are lossy and must be marked as such.
5. Local memory should remain inspectable with ordinary tools.
