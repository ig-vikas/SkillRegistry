---
name: bun-support
type: skill
description: Bun runtime support for AI agent gateway services including HTTP, WebSocket, SQLite, file I/O, test compatibility, performance tuning, and Node migration patterns.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [runtime, backend, performance]
tags: [bun, runtime, sqlite, http, node-compat, performance, migration]
---

# Bun Support Expert

Add Bun runtime support where it improves startup, local development, SQLite access, and single-binary operational simplicity. Keep Node compatibility unless the package is explicitly Bun-only.

Bun is a JavaScript runtime with built-in TypeScript transpilation, HTTP server APIs, test runner, SQLite, and package manager support. Treat Bun-specific APIs as an optimization boundary.

## Architecture

```
Shared Gateway Code
   | runtime adapter
   +-> Node server (Express/Fastify)
   +-> Bun server (Bun.serve)
   +-> Bun SQLite storage adapter
```

## Core Components

| Component | Purpose | Technology/Implementation |
|-----------|---------|--------------------------|
| Runtime Adapter | Abstract Node vs Bun APIs | Small interfaces |
| Bun HTTP Server | Fast local API server | `Bun.serve` |
| Bun SQLite Store | Local relational metadata | `bun:sqlite` |
| File I/O Adapter | Fast local reads/writes | `Bun.file`, `Bun.write` |
| Compatibility Layer | Preserve Node builds | conditional exports |

## Setup & Installation

```bash
bun --version
bun install
bun test
bun run src/index.ts
```

Keep `pnpm` for monorepo dependency management if the workspace standardizes on pnpm; use Bun as a runtime adapter.

## Configuration (Zod Schema)

```typescript
import { z } from "zod";

export const BunSupportConfigSchema = z.object({
  enabled: z.boolean().default(false),
  http: z.object({
    port: z.number().int().min(1).max(65535).default(3000),
    hostname: z.string().default("127.0.0.1"),
    idleTimeoutSeconds: z.number().int().positive().default(60),
  }).default({}),
  sqlite: z.object({
    path: z.string().default("./data/gateway.sqlite"),
    wal: z.boolean().default(true),
    strict: z.boolean().default(true),
  }).default({}),
  compatibility: z.object({
    requireNodeFallback: z.boolean().default(true),
    avoidBunOnlyInSharedPackages: z.boolean().default(true),
  }).default({}),
});

export type BunSupportConfig = z.infer<typeof BunSupportConfigSchema>;
```

## Implementation

### Bun HTTP Server

```typescript
export function startBunServer(config: BunSupportConfig, gateway: AgentGateway) {
  return Bun.serve({
    port: config.http.port,
    hostname: config.http.hostname,
    idleTimeout: config.http.idleTimeoutSeconds,
    async fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === "/health") {
        const health = await gateway.health();
        return Response.json(health, { status: health.ok ? 200 : 503 });
      }
      if (url.pathname === "/api/chat" && req.method === "POST") {
        try {
          const body = await req.json();
          const result = await gateway.handleChat(body);
          return Response.json(result);
        } catch (error) {
          return Response.json({ error: error instanceof Error ? error.message : "unknown_error" }, { status: 400 });
        }
      }
      return Response.json({ error: "not_found" }, { status: 404 });
    },
  });
}
```

### Bun SQLite Adapter

```typescript
import { Database } from "bun:sqlite";

export class BunSessionIndex {
  private db: Database;
  constructor(path: string, wal = true) {
    this.db = new Database(path, { create: true });
    if (wal) this.db.run("PRAGMA journal_mode = WAL;");
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        updatedAt INTEGER NOT NULL,
        eventCount INTEGER NOT NULL DEFAULT 0
      )
    `);
  }

  upsertSession(id: string, userId: string): void {
    this.db.query(`
      INSERT INTO sessions (id, userId, updatedAt, eventCount)
      VALUES ($id, $userId, $updatedAt, 1)
      ON CONFLICT(id) DO UPDATE SET updatedAt = excluded.updatedAt, eventCount = sessions.eventCount + 1
    `).run({ $id: id, $userId: userId, $updatedAt: Date.now() });
  }

  close(): void {
    this.db.close();
  }
}
```

## Integration with Gateway

Use conditional startup:

```typescript
if (process.versions.bun) {
  startBunServer(BunSupportConfigSchema.parse(config.bun), gateway);
} else {
  startServer(createExpressServer(config.http, gateway), config.http);
}
```

## Best Practices

1. Keep Bun-only imports out of shared Node packages.
2. Use conditional exports for Bun-specific adapters.
3. Enable SQLite WAL for concurrent readers.
4. Benchmark real gateway workloads, not synthetic loops only.
5. Keep tests runnable under the project-standard runner.
6. Verify native dependencies before switching runtime.
7. Do not assume every Node API or package behavior is identical.

## Testing

### Unit Tests

```typescript
it("parses Bun defaults", () => {
  expect(BunSupportConfigSchema.parse({}).sqlite.wal).toBe(true);
});
```

### Integration Tests

```bash
bun test
bun run src/index.ts
curl http://127.0.0.1:3000/health
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `bun:sqlite` import fails in Node | Bun-only module imported eagerly | Move import behind Bun adapter |
| Native package behaves differently | Node compatibility gap | Use Node path for that package |
| WAL sidecar files persist | SQLite platform behavior | Run checkpoint/truncate before close when needed |
| Tests pass in Bun but fail in Node | Runtime-specific APIs leaked | Add Node CI job |
| HTTP middleware missing | `Bun.serve` is not Express | Use Fetch API handlers or keep Express adapter |

### Debug Commands

```bash
bun --version
bun run -e "console.log(process.versions)"
bun run -e "import { Database } from 'bun:sqlite'; console.log(new Database(':memory:').query('select 1').get())"
```

## Resources

- **[Bun HTTP Server](https://bun.sh/docs/runtime/http/server)** - `Bun.serve` API.
- **[Bun SQLite](https://bun.com/docs/runtime/sqlite)** - `bun:sqlite`, WAL, transactions, parameters.
- **[Bun File I/O](https://bun.sh/docs/api/file-io)** - File APIs.
- **[Bun Test Runner](https://bun.sh/docs/cli/test)** - Built-in test runner.
- **[Node Package Conditional Exports](https://nodejs.org/api/packages.html#conditional-exports)** - Runtime-specific entry points.

## Principles

1. Bun support is an adapter, not a rewrite.
2. Runtime-specific code belongs at the boundary.
3. Benchmark before claiming performance wins.
4. Keep Node fallback healthy.
5. Prefer simple Fetch-compatible handlers for Bun-native services.
