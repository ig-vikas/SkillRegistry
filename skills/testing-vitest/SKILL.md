---
name: testing-vitest
type: skill
description: Vitest setup for TypeScript agent gateway packages with unit tests, integration tests, mocks, fake timers, MSW, coverage, fixtures, and CI patterns.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [testing, tooling, typescript]
tags: [vitest, mocks, coverage, fixtures, msw, integration-tests, ci]
---

# Vitest Testing Expert

Build a practical Vitest test setup for gateway packages: fast unit tests, isolated integration tests, HTTP tests, provider mocks, filesystem fixtures, fake timers, and coverage reporting.

Tests should verify behavior at the smallest useful boundary. Mock remote providers; use real parsers, schemas, and local storage where cheap.

## Architecture

```
src/
tests/
  unit/          -> pure logic
  integration/   -> HTTP, storage, provider adapters with mocks
  fixtures/      -> stable payloads
vitest.config.ts -> coverage, aliases, setup
```

## Core Components

| Component | Purpose | Technology/Implementation |
|-----------|---------|--------------------------|
| Vitest Config | Shared runner settings | `defineConfig` |
| Test Setup | Env, timers, cleanup | `setupFiles` |
| Mocks | Provider/network isolation | `vi.mock`, MSW |
| Fixtures | Realistic payloads | JSON fixtures |
| Coverage | Risk visibility | V8 coverage |
| CI Mode | Deterministic non-watch checks | `vitest run --coverage` |

## Setup & Installation

```bash
pnpm add -D vitest @vitest/coverage-v8 msw supertest typescript @types/node
```

## Configuration (Zod Schema)

```typescript
import { z } from "zod";

export const TestConfigSchema = z.object({
  environment: z.enum(["node", "jsdom", "happy-dom"]).default("node"),
  coverage: z.object({
    enabled: z.boolean().default(true),
    provider: z.enum(["v8", "istanbul"]).default("v8"),
    statements: z.number().min(0).max(100).default(80),
    branches: z.number().min(0).max(100).default(75),
    functions: z.number().min(0).max(100).default(80),
    lines: z.number().min(0).max(100).default(80),
  }).default({}),
  timeouts: z.object({
    testTimeout: z.number().int().positive().default(10_000),
    hookTimeout: z.number().int().positive().default(10_000),
  }).default({}),
});
```

## Implementation

### Vitest Config

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    testTimeout: 10_000,
    hookTimeout: 10_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/**/index.ts"],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

### Mocks and Fixtures

```typescript
// tests/setup.ts
import { afterEach, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
```

```typescript
// tests/unit/retry.test.ts
import { describe, expect, it, vi } from "vitest";

it("backs off before retrying", async () => {
  vi.useFakeTimers();
  const task = vi.fn().mockRejectedValueOnce(new Error("rate_limit")).mockResolvedValue("ok");
  const promise = retry(task, { attempts: 2, delayMs: 1000 });
  await vi.advanceTimersByTimeAsync(1000);
  await expect(promise).resolves.toBe("ok");
  expect(task).toHaveBeenCalledTimes(2);
});
```

### HTTP Integration Test

```typescript
import request from "supertest";

it("validates chat request body", async () => {
  const app = createExpressServer(config, fakeGateway);
  const res = await request(app).post("/api/chat").send({ sessionId: "s1", message: "" });
  expect(res.status).toBe(400);
});
```

## Integration with Gateway

Use dependency injection so tests can pass fake providers and stores:

```typescript
const gateway = new AgentGateway({
  providers: fakeProviderRegistry,
  memory: tempMemoryStore,
  approvals: fakeApprovalManager,
});
```

## Best Practices

1. Test Zod schemas with invalid inputs, not only valid defaults.
2. Use temp directories for storage tests.
3. Mock network calls at the HTTP boundary.
4. Use fake timers for retry, expiry, and heartbeat logic.
5. Keep provider API fixtures realistic and versioned.
6. Avoid snapshot tests for volatile LLM text.
7. Run focused tests before full coverage locally.

## Testing

### Unit Tests

```typescript
it("classifies retryable provider status codes", () => {
  expect(isRetryableStatus(429)).toBe(true);
  expect(isRetryableStatus(400)).toBe(false);
});
```

### Integration Tests

```typescript
it("routes a message through gateway with fake provider", async () => {
  fakeProvider.complete.mockResolvedValue({ text: "hello" });
  const result = await gateway.handleChat({ sessionId: "s1", message: "hi" });
  expect(result.text).toBe("hello");
});
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `vi.mock` does not apply | Import occurred before mock | Mock before importing subject or use dynamic import |
| Tests hang | Server/timer not closed | Close HTTP servers and restore timers in `afterEach` |
| Path aliases fail | Vite config differs from TS | Mirror aliases in Vitest config |
| Coverage misses files | Include/exclude patterns wrong | Set `coverage.include` to `src/**/*.ts` |
| Flaky integration tests | Shared state | Use temp dirs and fresh gateway per test |

### Debug Commands

```bash
pnpm vitest run tests/unit/provider-router.test.ts
pnpm vitest --inspect-brk
pnpm vitest run --coverage
```

## Resources

- **[Vitest Guide](https://vitest.dev/guide/)** - Official usage guide.
- **[Vitest Mocking](https://vitest.dev/guide/mocking)** - Mock APIs and patterns.
- **[Vitest Coverage](https://vitest.dev/guide/coverage)** - Coverage configuration.
- **[MSW Node Integration](https://mswjs.io/docs/integrations/node)** - Mock Service Worker for Node tests.
- **[SuperTest](https://github.com/ladjs/supertest)** - HTTP assertions.

## Principles

1. Tests should own their state.
2. Mock slow and remote boundaries.
3. Keep schemas and parsers real.
4. Use fake time for time-based behavior.
5. Coverage is a signal, not the goal.
