---
name: provider-routing
type: skill
description: Dynamic LLM provider routing with health checks, load balancing, fallback chains, circuit breakers, latency scoring, and cost-aware model selection.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [ai-ml, backend, reliability]
tags: [routing, load-balancing, circuit-breaker, failover, cost, latency, health-checks]
---

# Provider Routing Expert

Implement runtime routing across LLM providers so the gateway can choose the best available provider for a request based on capability, health, latency, cost, quota, and policy.

Routing is reliability logic. It should be deterministic enough to debug, adaptive enough to handle outages, and conservative enough to avoid sending sensitive workloads to unapproved providers.

## Architecture

```
AgentGateway -> ProviderRouter
                 | policy filter
                 | health + circuit state
                 | strategy score
                 v
              Selected LLM Provider -> fallback on retryable failure
```

## Core Components

| Component | Purpose | Technology/Implementation |
|-----------|---------|--------------------------|
| RoutePolicy | Defines allowed providers and constraints | Zod config by task/channel/user |
| HealthMonitor | Periodic checks and rolling latency | Provider `health()` |
| CircuitBreaker | Stop routing to failing providers | Closed/Open/Half-open |
| StrategyEngine | Select provider | Round-robin, least-loaded, latency, cost |
| FallbackExecutor | Try alternates on retryable errors | Ordered chain with budget limits |
| MetricsSink | Record route decisions | Structured logs/Prometheus |

## Setup & Installation

```bash
pnpm add zod
pnpm add -D vitest typescript @types/node
```

Use the `llm-providers` skill interface as the provider contract.

## Configuration (Zod Schema)

```typescript
import { z } from "zod";

export const RoutingConfigSchema = z.object({
  strategy: z.enum(["priority", "round-robin", "least-loaded", "lowest-latency", "lowest-cost", "weighted-score"]).default("weighted-score"),
  timeoutMs: z.number().int().positive().default(75_000),
  maxAttempts: z.number().int().min(1).max(5).default(3),
  retryableStatusCodes: z.array(z.number().int()).default([408, 409, 425, 429, 500, 502, 503, 504, 529]),
  health: z.object({
    enabled: z.boolean().default(true),
    intervalMs: z.number().int().positive().default(30_000),
    unhealthyAfterFailures: z.number().int().positive().default(3),
    healthyAfterSuccesses: z.number().int().positive().default(2),
  }).default({}),
  circuitBreaker: z.object({
    enabled: z.boolean().default(true),
    failureThreshold: z.number().int().positive().default(5),
    openMs: z.number().int().positive().default(60_000),
    halfOpenMaxCalls: z.number().int().positive().default(1),
  }).default({}),
  weights: z.object({
    latency: z.number().min(0).max(1).default(0.35),
    cost: z.number().min(0).max(1).default(0.30),
    successRate: z.number().min(0).max(1).default(0.25),
    priority: z.number().min(0).max(1).default(0.10),
  }).default({}),
  providers: z.array(z.object({
    id: z.string(),
    priority: z.number().int().min(0).default(100),
    weight: z.number().positive().default(1),
    maxConcurrent: z.number().int().positive().default(20),
    inputCostPerMillion: z.number().min(0).default(0),
    outputCostPerMillion: z.number().min(0).default(0),
    capabilities: z.array(z.enum(["chat", "tools", "vision", "json", "streaming", "local", "private"])).default(["chat", "streaming"]),
  })).min(1),
});

export type RoutingConfig = z.infer<typeof RoutingConfigSchema>;
```

## Implementation

### Router Class

```typescript
export interface RouteRequest extends CompletionRequest {
  requiredCapabilities?: string[];
  maxEstimatedCostUsd?: number;
  preferredProviders?: string[];
}

interface ProviderState {
  id: string;
  inflight: number;
  successes: number;
  failures: number;
  latencyMs: number;
  circuit: "closed" | "open" | "half-open";
  openedAt?: number;
}

export class ProviderRouter {
  private states = new Map<string, ProviderState>();
  private rr = 0;

  constructor(private config: RoutingConfig, private registry: ProviderRegistry) {
    for (const provider of config.providers) {
      this.states.set(provider.id, { id: provider.id, inflight: 0, successes: 0, failures: 0, latencyMs: 1000, circuit: "closed" });
    }
  }

  async complete(request: RouteRequest): Promise<CompletionResult & { providerId: string; attempts: string[] }> {
    const attempts: string[] = [];
    const candidates = this.rankCandidates(request);
    let lastError: unknown;

    for (const candidate of candidates.slice(0, this.config.maxAttempts)) {
      attempts.push(candidate.id);
      const state = this.requireState(candidate.id);
      const provider = this.registry.get(candidate.id);
      const started = Date.now();
      state.inflight++;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
        const result = await provider.complete({ ...request, signal: request.signal ?? controller.signal });
        clearTimeout(timeout);
        this.recordSuccess(state, Date.now() - started);
        return { ...result, providerId: candidate.id, attempts };
      } catch (error) {
        lastError = error;
        this.recordFailure(state);
        if (!this.isRetryable(error)) break;
      } finally {
        state.inflight--;
      }
    }

    throw new Error(`All provider routes failed. attempts=${attempts.join(",")} last=${lastError instanceof Error ? lastError.message : String(lastError)}`);
  }

  rankCandidates(request: RouteRequest) {
    const providers = this.config.providers
      .filter((p) => !request.preferredProviders?.length || request.preferredProviders.includes(p.id))
      .filter((p) => (request.requiredCapabilities ?? []).every((cap) => p.capabilities.includes(cap as any)))
      .filter((p) => this.isAvailable(p.id))
      .filter((p) => this.requireState(p.id).inflight < p.maxConcurrent);

    if (this.config.strategy === "round-robin") return this.roundRobin(providers);
    if (this.config.strategy === "priority") return providers.sort((a, b) => a.priority - b.priority);
    if (this.config.strategy === "least-loaded") return providers.sort((a, b) => this.requireState(a.id).inflight - this.requireState(b.id).inflight);
    if (this.config.strategy === "lowest-latency") return providers.sort((a, b) => this.requireState(a.id).latencyMs - this.requireState(b.id).latencyMs);
    if (this.config.strategy === "lowest-cost") return providers.sort((a, b) => this.estimateCost(a, request) - this.estimateCost(b, request));
    return providers.sort((a, b) => this.score(b, request) - this.score(a, request));
  }

  private score(provider: RoutingConfig["providers"][number], request: RouteRequest): number {
    const state = this.requireState(provider.id);
    const total = Math.max(1, state.successes + state.failures);
    const successRate = state.successes / total;
    const latencyScore = 1 / Math.max(1, state.latencyMs);
    const costScore = 1 / Math.max(0.000001, this.estimateCost(provider, request));
    const priorityScore = 1 / Math.max(1, provider.priority);
    return latencyScore * this.config.weights.latency
      + costScore * this.config.weights.cost
      + successRate * this.config.weights.successRate
      + priorityScore * this.config.weights.priority;
  }

  private estimateCost(provider: RoutingConfig["providers"][number], request: RouteRequest): number {
    const inputChars = request.messages.reduce((n, m) => n + m.content.length, 0);
    const estimatedInputTokens = Math.ceil(inputChars / 4);
    const outputTokens = request.maxOutputTokens ?? 1000;
    return (estimatedInputTokens * provider.inputCostPerMillion + outputTokens * provider.outputCostPerMillion) / 1_000_000;
  }

  private isAvailable(id: string): boolean {
    const state = this.requireState(id);
    if (state.circuit === "closed") return true;
    if (state.circuit === "open" && state.openedAt && Date.now() - state.openedAt > this.config.circuitBreaker.openMs) {
      state.circuit = "half-open";
      return true;
    }
    return state.circuit === "half-open";
  }

  private recordSuccess(state: ProviderState, latencyMs: number): void {
    state.successes++;
    state.failures = 0;
    state.latencyMs = Math.round(state.latencyMs * 0.8 + latencyMs * 0.2);
    if (state.circuit === "half-open") state.circuit = "closed";
  }

  private recordFailure(state: ProviderState): void {
    state.failures++;
    if (this.config.circuitBreaker.enabled && state.failures >= this.config.circuitBreaker.failureThreshold) {
      state.circuit = "open";
      state.openedAt = Date.now();
    }
  }

  private roundRobin<T>(items: T[]): T[] {
    if (items.length === 0) return [];
    const start = this.rr++ % items.length;
    return [...items.slice(start), ...items.slice(0, start)];
  }

  private requireState(id: string): ProviderState {
    const state = this.states.get(id);
    if (!state) throw new Error(`Missing provider state for ${id}`);
    return state;
  }

  private isRetryable(error: unknown): boolean {
    const status = typeof error === "object" && error && "status" in error ? Number((error as any).status) : undefined;
    return status ? this.config.retryableStatusCodes.includes(status) : true;
  }
}
```

### Health Checks

```typescript
export function startProviderHealthChecks(router: ProviderRouter, registry: ProviderRegistry, config: RoutingConfig): NodeJS.Timeout {
  return setInterval(async () => {
    await Promise.all(config.providers.map(async (provider) => {
      const health = await registry.get(provider.id).health();
      if (!health.ok) console.warn("provider_unhealthy", { providerId: provider.id, error: health.error });
    }));
  }, config.health.intervalMs);
}
```

## Integration with Gateway

```typescript
export class AgentGateway {
  async respond(messages: GatewayMessage[]) {
    return this.providerRouter.complete({
      messages,
      requiredCapabilities: ["chat", "streaming"],
      maxOutputTokens: 2048,
    });
  }
}
```

## Best Practices

1. Filter by policy before scoring providers.
2. Never route private/local-only requests to cloud providers.
3. Use circuit breakers for repeated failures and retry only idempotent generation attempts.
4. Cap concurrent requests per provider to avoid self-inflicted rate limits.
5. Keep cost estimates approximate and reconcile with actual usage after response.
6. Log route candidates, selected provider, attempts, latency, and failure class.
7. Do not fallback across models with incompatible tool or JSON guarantees unless the caller allows it.

## Testing

### Unit Tests

```typescript
it("chooses only providers with required capabilities", () => {
  const ranked = router.rankCandidates({ messages: [], requiredCapabilities: ["private"] });
  expect(ranked.every((p) => p.capabilities.includes("private"))).toBe(true);
});
```

### Integration Tests

```typescript
it("falls back after retryable provider failure", async () => {
  const result = await router.complete({ messages: [{ role: "user", content: "hello" }] });
  expect(result.attempts.length).toBeGreaterThanOrEqual(1);
  expect(result.providerId).toBeDefined();
});
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Router always chooses one provider | Weight/cost dominates score | Normalize scores and inspect decision logs |
| Fallback leaks data | Missing policy filter | Require capability/privacy constraints before ranking |
| Circuit never recovers | No half-open probe | Allow limited half-open calls after `openMs` |
| Rate limits still happen | Concurrency cap too high | Lower `maxConcurrent` and honor `Retry-After` |
| Costs differ from estimate | Token estimate is approximate | Store actual provider usage and reconcile |

### Debug Commands

```bash
curl http://localhost:3000/api/providers/health
curl http://localhost:3000/api/providers/routes?capability=private
```

## Resources

- **[Microsoft Circuit Breaker Pattern](https://learn.microsoft.com/azure/architecture/patterns/circuit-breaker)** - Fault isolation pattern.
- **[AWS Timeouts, Retries, and Backoff](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)** - Retry and backoff design.
- **[OpenAI Rate Limits](https://platform.openai.com/docs/guides/rate-limits)** - Provider quota behavior.
- **[Anthropic Rate Limits](https://docs.anthropic.com/en/api/rate-limits)** - Claude API rate limit guidance.
- **[Ollama API](https://docs.ollama.com/api)** - Local model endpoint behavior.

## Principles

1. Policy gates precede optimization.
2. Reliability decisions must be explainable.
3. Failover is bounded by budget, privacy, and capability.
4. Health is measured continuously.
5. A cheap failed request is more expensive than a successful routed one.
