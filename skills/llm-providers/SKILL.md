---
name: llm-providers
type: skill
description: Provider abstraction for OpenAI, Anthropic, and local LLMs with normalized messages, streaming, retries, fallback, rate limiting, and cost tracking.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [ai-ml, backend, integration]
tags: [openai, anthropic, ollama, providers, streaming, retries, fallback, cost]
---

# LLM Providers Expert

Implement a provider abstraction that lets the gateway call OpenAI, Anthropic, and local models through one typed interface. The abstraction must normalize messages, streaming deltas, errors, token usage, cost, and retry behavior without hiding provider-specific capabilities.

Provider code is infrastructure. Keep it small, observable, and strict about inputs because every agent request flows through it.

## Architecture

```
AgentGateway -> LlmService -> ProviderRegistry
                         |-> OpenAIProvider
                         |-> AnthropicProvider
                         |-> OllamaProvider
                         +-> CostTracker / RateLimiter / RetryPolicy
```

## Core Components

| Component | Purpose | Technology/Implementation |
|-----------|---------|--------------------------|
| Provider Interface | Stable gateway contract | TypeScript interfaces and Zod config |
| OpenAI Adapter | Responses API and embeddings | `openai` SDK |
| Anthropic Adapter | Messages API and SSE streaming | `@anthropic-ai/sdk` |
| Local Adapter | Ollama chat/generate endpoint | `fetch`, local base URL |
| Error Normalizer | Retryable vs fatal classification | Provider status codes and error types |
| Cost Tracker | Usage and price accounting | Model metadata table |

## Setup & Installation

```bash
pnpm add openai @anthropic-ai/sdk zod
pnpm add -D vitest typescript @types/node
```

For local models, install and run Ollama separately, then expose `http://localhost:11434`.

## Configuration (Zod Schema)

```typescript
import { z } from "zod";

export const ProviderConfigSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("openai"),
    id: z.string().default("openai"),
    apiKeyEnv: z.string().default("OPENAI_API_KEY"),
    baseURL: z.string().url().optional(),
    model: z.string().default("gpt-4.1-mini"),
    timeoutMs: z.number().int().positive().default(60_000),
    maxRetries: z.number().int().min(0).max(5).default(2),
  }),
  z.object({
    type: z.literal("anthropic"),
    id: z.string().default("anthropic"),
    apiKeyEnv: z.string().default("ANTHROPIC_API_KEY"),
    baseURL: z.string().url().optional(),
    model: z.string().default("claude-sonnet-4-5"),
    timeoutMs: z.number().int().positive().default(60_000),
    maxRetries: z.number().int().min(0).max(5).default(2),
  }),
  z.object({
    type: z.literal("ollama"),
    id: z.string().default("ollama"),
    baseURL: z.string().url().default("http://localhost:11434"),
    model: z.string().default("llama3.2"),
    keepAlive: z.string().default("5m"),
    timeoutMs: z.number().int().positive().default(120_000),
  }),
]);

export const LlmProvidersConfigSchema = z.object({
  providers: z.array(ProviderConfigSchema).min(1),
  defaults: z.object({
    temperature: z.number().min(0).max(2).default(0.2),
    maxOutputTokens: z.number().int().positive().max(128_000).default(2048),
    stream: z.boolean().default(true),
  }).default({}),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
```

## Implementation

### Provider Interface

```typescript
export type Role = "system" | "user" | "assistant" | "tool";

export interface GatewayMessage {
  role: Role;
  content: string;
  name?: string;
}

export interface CompletionRequest {
  messages: GatewayMessage[];
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
}

export interface CompletionChunk {
  type: "text" | "tool_call" | "usage" | "done";
  text?: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface CompletionResult {
  text: string;
  usage?: { inputTokens: number; outputTokens: number };
  raw?: unknown;
}

export interface LlmProvider {
  id: string;
  complete(request: CompletionRequest): Promise<CompletionResult>;
  stream(request: CompletionRequest): AsyncIterable<CompletionChunk>;
  health(): Promise<{ ok: boolean; latencyMs: number; error?: string }>;
}
```

### OpenAI Provider

```typescript
import OpenAI from "openai";

export class OpenAIProvider implements LlmProvider {
  readonly id: string;
  private client: OpenAI;

  constructor(private config: Extract<ProviderConfig, { type: "openai" }>) {
    this.id = config.id;
    const apiKey = process.env[config.apiKeyEnv];
    if (!apiKey) throw new Error(`Missing ${config.apiKeyEnv}`);
    this.client = new OpenAI({ apiKey, baseURL: config.baseURL, timeout: config.timeoutMs, maxRetries: config.maxRetries });
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const response = await this.client.responses.create({
      model: request.model ?? this.config.model,
      input: request.messages.map((m) => ({ role: m.role === "tool" ? "user" : m.role, content: m.content })),
      temperature: request.temperature,
      max_output_tokens: request.maxOutputTokens,
    }, { signal: request.signal });

    return {
      text: response.output_text,
      usage: response.usage ? { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens } : undefined,
      raw: response,
    };
  }

  async *stream(request: CompletionRequest): AsyncIterable<CompletionChunk> {
    const stream = await this.client.responses.create({
      model: request.model ?? this.config.model,
      input: request.messages.map((m) => ({ role: m.role === "tool" ? "user" : m.role, content: m.content })),
      temperature: request.temperature,
      max_output_tokens: request.maxOutputTokens,
      stream: true,
    }, { signal: request.signal });

    for await (const event of stream) {
      if (event.type === "response.output_text.delta") yield { type: "text", text: event.delta };
      if (event.type === "response.completed" && event.response.usage) {
        yield { type: "usage", usage: { inputTokens: event.response.usage.input_tokens, outputTokens: event.response.usage.output_tokens } };
      }
    }
    yield { type: "done" };
  }

  async health() {
    const started = Date.now();
    try {
      await this.client.models.list();
      return { ok: true, latencyMs: Date.now() - started };
    } catch (error) {
      return { ok: false, latencyMs: Date.now() - started, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
```

### Anthropic Provider

```typescript
import Anthropic from "@anthropic-ai/sdk";

export class AnthropicProvider implements LlmProvider {
  readonly id: string;
  private client: Anthropic;

  constructor(private config: Extract<ProviderConfig, { type: "anthropic" }>) {
    this.id = config.id;
    const apiKey = process.env[config.apiKeyEnv];
    if (!apiKey) throw new Error(`Missing ${config.apiKeyEnv}`);
    this.client = new Anthropic({ apiKey, baseURL: config.baseURL, timeout: config.timeoutMs, maxRetries: config.maxRetries });
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const system = request.messages.find((m) => m.role === "system")?.content;
    const messages = request.messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "assistant" ? "assistant" as const : "user" as const, content: m.content }));
    const response = await this.client.messages.create({
      model: request.model ?? this.config.model,
      max_tokens: request.maxOutputTokens ?? 2048,
      temperature: request.temperature,
      system,
      messages,
    }, { signal: request.signal });
    const text = response.content.filter((c) => c.type === "text").map((c) => c.text).join("");
    return { text, usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }, raw: response };
  }

  async *stream(request: CompletionRequest): AsyncIterable<CompletionChunk> {
    const system = request.messages.find((m) => m.role === "system")?.content;
    const messages = request.messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "assistant" ? "assistant" as const : "user" as const, content: m.content }));
    const stream = this.client.messages.stream({
      model: request.model ?? this.config.model,
      max_tokens: request.maxOutputTokens ?? 2048,
      temperature: request.temperature,
      system,
      messages,
    }, { signal: request.signal });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield { type: "text", text: event.delta.text };
      if (event.type === "message_delta") yield { type: "usage", usage: { inputTokens: 0, outputTokens: event.usage.output_tokens } };
    }
    yield { type: "done" };
  }

  async health() {
    const started = Date.now();
    try {
      await this.complete({ messages: [{ role: "user", content: "ping" }], maxOutputTokens: 1 });
      return { ok: true, latencyMs: Date.now() - started };
    } catch (error) {
      return { ok: false, latencyMs: Date.now() - started, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
```

### Ollama Provider

```typescript
export class OllamaProvider implements LlmProvider {
  readonly id: string;
  constructor(private config: Extract<ProviderConfig, { type: "ollama" }>) {
    this.id = config.id;
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const res = await fetch(`${this.config.baseURL}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: request.model ?? this.config.model, messages: request.messages, stream: false, keep_alive: this.config.keepAlive }),
      signal: request.signal,
    });
    if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
    const json = await res.json() as any;
    return { text: json.message?.content ?? "", usage: { inputTokens: json.prompt_eval_count ?? 0, outputTokens: json.eval_count ?? 0 }, raw: json };
  }

  async *stream(request: CompletionRequest): AsyncIterable<CompletionChunk> {
    const res = await fetch(`${this.config.baseURL}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: request.model ?? this.config.model, messages: request.messages, stream: true, keep_alive: this.config.keepAlive }),
      signal: request.signal,
    });
    if (!res.ok || !res.body) throw new Error(`Ollama stream failed: ${res.status}`);
    for await (const chunk of res.body.pipeThrough(new TextDecoderStream())) {
      for (const line of chunk.split("\n").filter(Boolean)) {
        const event = JSON.parse(line);
        if (event.message?.content) yield { type: "text", text: event.message.content };
        if (event.done) yield { type: "usage", usage: { inputTokens: event.prompt_eval_count ?? 0, outputTokens: event.eval_count ?? 0 } };
      }
    }
    yield { type: "done" };
  }

  async health() {
    const started = Date.now();
    try {
      const res = await fetch(`${this.config.baseURL}/api/tags`);
      return { ok: res.ok, latencyMs: Date.now() - started, error: res.ok ? undefined : await res.text() };
    } catch (error) {
      return { ok: false, latencyMs: Date.now() - started, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
```

## Integration with Gateway

```typescript
export class ProviderRegistry {
  private providers = new Map<string, LlmProvider>();
  register(provider: LlmProvider) { this.providers.set(provider.id, provider); }
  get(id: string): LlmProvider {
    const provider = this.providers.get(id);
    if (!provider) throw new Error(`Unknown provider: ${id}`);
    return provider;
  }
}
```

## Best Practices

1. Normalize errors into retryable, rate-limited, auth, validation, and provider-down classes.
2. Use `AbortController` for request timeouts and user cancellation.
3. Keep provider-specific raw responses for debugging, but do not expose them to clients by default.
4. Track usage per model, user, channel, and session.
5. Use streaming for long outputs to avoid proxy and provider timeouts.
6. Keep local models behind the same safety and authorization gates as cloud models.
7. Never log API keys, raw tokens, or sensitive prompts without redaction.

## Testing

### Unit Tests

```typescript
it("parses provider config", () => {
  const parsed = ProviderConfigSchema.parse({ type: "ollama" });
  expect(parsed.baseURL).toBe("http://localhost:11434");
});
```

### Integration Tests

```typescript
it("streams text from a mock provider", async () => {
  const chunks: string[] = [];
  for await (const chunk of provider.stream({ messages: [{ role: "user", content: "hello" }] })) {
    if (chunk.text) chunks.push(chunk.text);
  }
  expect(chunks.join("")).toContain("hello");
});
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 from provider | Missing/wrong API key | Check env var name and process environment |
| Streaming hangs | Proxy buffering or no body reader | Disable proxy buffering and consume stream |
| Anthropic role errors | Unsupported role sequence | Normalize tool/system messages before request |
| Ollama returns JSONL parse errors | Chunk boundaries split lines | Buffer partial lines between chunks |
| Cost reports wrong | Model price table stale | Version prices and store raw usage |

### Debug Commands

```bash
curl http://localhost:11434/api/tags
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
curl -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01" https://api.anthropic.com/v1/models
```

## Resources

- **[OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses)** - Official response, tool, and streaming API.
- **[OpenAI Streaming Guide](https://platform.openai.com/docs/guides/streaming-responses)** - Streaming response patterns.
- **[Anthropic Messages API](https://docs.anthropic.com/en/api/messages)** - Claude Messages API reference.
- **[Anthropic Streaming Messages](https://docs.anthropic.com/en/docs/build-with-claude/streaming)** - SSE event flow and SDK streaming.
- **[Ollama API](https://docs.ollama.com/api)** - Local model REST API.

## Principles

1. One gateway contract, explicit provider adapters.
2. Provider differences are normalized, not ignored.
3. Every request is cancellable, observable, and budgeted.
4. Streaming is a first-class path.
5. Fallback must preserve user intent and security policy.
