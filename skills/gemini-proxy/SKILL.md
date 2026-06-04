---
name: gemini-proxy
type: skill
version: 1.0.0
description: Production guide for proxying Google Gemini API requests with the current Google GenAI SDK, multimodal content, streaming, safety settings, and gateway integration.
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
  - multimodal
  - streaming
  - llm
  - proxy
---

# Gemini Proxy Expert

Use this skill when implementing a local-first gateway adapter for Google Gemini. The current production baseline is the `@google/genai` TypeScript SDK with Gemini 2.5 model IDs such as `gemini-2.5-flash` for low-latency workloads and `gemini-2.5-pro` for complex reasoning and long-context analysis.

## Architecture

```
AgentGateway
  -> GeminiProxy
     -> request validation
     -> provider policy and safety settings
     -> Google GenAI SDK or REST API
     -> normalized text/tool/usage response
     -> audit log and cost tracker
```

## Core Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| Gemini client | Sends requests to Gemini models | `@google/genai` |
| Request normalizer | Converts gateway messages into Gemini contents | Zod, typed adapters |
| Safety policy | Applies category thresholds per workspace | Gemini safety settings |
| Streaming bridge | Converts Gemini streams to gateway events | Async iterables, SSE/WebSocket |
| Model registry | Discovers available model IDs and capabilities | Gemini `models.list` REST endpoint |

## Setup & Installation

```bash
pnpm add @google/genai zod
pnpm add -D typescript vitest @types/node
```

Use `GEMINI_API_KEY` for Google AI Studio API-key access. Use Vertex AI and service-account credentials when an enterprise deployment requires Google Cloud IAM, VPC controls, regionality, or centralized quota management.

## Configuration (Zod Schema)

```typescript
import { z } from 'zod';

export const GeminiProxyConfigSchema = z.object({
  apiKey: z.string().min(1).optional(),
  defaultModel: z.string().default('gemini-2.5-flash'),
  proModel: z.string().default('gemini-2.5-pro'),
  timeoutMs: z.number().int().min(1_000).max(300_000).default(60_000),
  maxOutputTokens: z.number().int().min(1).max(65_536).default(8_192),
  temperature: z.number().min(0).max(2).default(0.2),
  topP: z.number().min(0).max(1).default(0.95),
  safety: z.array(z.object({
    category: z.enum([
      'HARM_CATEGORY_HATE_SPEECH',
      'HARM_CATEGORY_DANGEROUS_CONTENT',
      'HARM_CATEGORY_HARASSMENT',
      'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    ]),
    threshold: z.enum([
      'BLOCK_NONE',
      'BLOCK_ONLY_HIGH',
      'BLOCK_MEDIUM_AND_ABOVE',
      'BLOCK_LOW_AND_ABOVE',
    ]),
  })).default([]),
});

export type GeminiProxyConfig = z.infer<typeof GeminiProxyConfigSchema>;
```

## Implementation

### Client Adapter

```typescript
import { GoogleGenAI } from '@google/genai';
import { GeminiProxyConfig, GeminiProxyConfigSchema } from './config';

export interface GatewayMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GatewayCompletion {
  model: string;
  text: string;
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
}

export class GeminiProxy {
  private readonly ai: GoogleGenAI;
  private readonly config: GeminiProxyConfig;

  constructor(config: Partial<GeminiProxyConfig> = {}) {
    this.config = GeminiProxyConfigSchema.parse(config);
    this.ai = new GoogleGenAI({ apiKey: this.config.apiKey ?? process.env.GEMINI_API_KEY });
  }

  async complete(messages: GatewayMessage[], model = this.config.defaultModel): Promise<GatewayCompletion> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await this.ai.models.generateContent({
        model,
        contents: this.toContents(messages),
        config: {
          maxOutputTokens: this.config.maxOutputTokens,
          temperature: this.config.temperature,
          topP: this.config.topP,
          safetySettings: this.config.safety,
        },
      });

      return {
        model,
        text: response.text ?? '',
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount,
          outputTokens: response.usageMetadata?.candidatesTokenCount,
          totalTokens: response.usageMetadata?.totalTokenCount,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Gemini request timed out after ${this.config.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async *stream(messages: GatewayMessage[], model = this.config.defaultModel): AsyncGenerator<string> {
    const stream = await this.ai.models.generateContentStream({
      model,
      contents: this.toContents(messages),
      config: {
        maxOutputTokens: this.config.maxOutputTokens,
        temperature: this.config.temperature,
        topP: this.config.topP,
        safetySettings: this.config.safety,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) yield text;
    }
  }

  private toContents(messages: GatewayMessage[]) {
    return messages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));
  }
}
```

### REST Fallback

```typescript
export async function generateGeminiText(apiKey: string, prompt: string, model = 'gemini-2.5-flash') {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini API failed: ${response.status} ${body}`);
  }

  return response.json() as Promise<{
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
  }>;
}
```

## Integration with Gateway

```typescript
gateway.registerProvider('gemini', {
  async complete(request) {
    return geminiProxy.complete(request.messages, request.model);
  },
  async *stream(request) {
    yield* geminiProxy.stream(request.messages, request.model);
  },
});
```

## Best Practices

1. Pin explicit model IDs for reproducible tests and regulated workflows; use configurable defaults for app-level model upgrades.
2. Prefer `gemini-2.5-flash` for routing, extraction, and high-volume tasks; reserve `gemini-2.5-pro` for complex reasoning and long-context analysis.
3. Log safety blocks, finish reasons, latency, and token usage without storing raw secrets or sensitive prompts.
4. Keep API keys server-side. Browser clients should call your gateway, not Google APIs directly.
5. Use model discovery before enabling optional parameters because supported features differ by model.
6. Add retries only for transient 429/5xx failures, with exponential backoff and idempotency at the gateway layer.

## Testing

```typescript
import { describe, expect, it, vi } from 'vitest';
import { GeminiProxy } from './gemini-proxy';

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: vi.fn(async () => ({
        text: 'ok',
        usageMetadata: { promptTokenCount: 2, candidatesTokenCount: 1, totalTokenCount: 3 },
      })),
    };
  },
}));

describe('GeminiProxy', () => {
  it('normalizes Gemini responses', async () => {
    const proxy = new GeminiProxy({ apiKey: 'test' });
    const response = await proxy.complete([{ role: 'user', content: 'hello' }]);
    expect(response.text).toBe('ok');
    expect(response.usage?.totalTokens).toBe(3);
  });
});
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| `API key not valid` | Wrong key or wrong Google project | Regenerate a Gemini API key and check environment injection |
| Safety block | Safety threshold blocked content | Return a structured refusal and log the block category |
| Unsupported parameter | Model does not support a feature | Query model metadata or route to a capable model |
| Timeout on long context | Large multimodal payload | Increase timeout, use Files API, or summarize before sending |

## Debug Commands

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"

curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"role":"user","parts":[{"text":"ping"}]}]}'
```

## Resources

- **[Gemini API Models](https://ai.google.dev/gemini-api/docs/models)** - Current model IDs, limits, and capabilities.
- **[Gemini Text Generation](https://ai.google.dev/gemini-api/docs/text-generation)** - Official generation examples for the Google GenAI SDK.
- **[Google GenAI SDK](https://github.com/googleapis/js-genai)** - Official JavaScript/TypeScript SDK source.
- **[Gemini API Safety Settings](https://ai.google.dev/gemini-api/docs/safety-settings)** - Harm categories, thresholds, and safety behavior.

## Principles

1. Normalize provider-specific responses at the gateway boundary.
2. Keep credentials server-side and rotate them through the gateway secret store.
3. Treat model capabilities as data discovered from the provider, not constants embedded in business logic.
4. Separate policy failures, transport failures, and model refusals for reliable retries and observability.
