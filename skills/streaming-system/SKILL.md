---
name: streaming-system
type: skill
description: Server-Sent Events, WebSocket, and HTTP chunk streaming for LLM responses with backpressure, cancellation, reconnects, event formats, and client handling.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [realtime, backend, ai-ml]
tags: [sse, streaming, backpressure, websocket, chunks, cancellation, eventsource]
---

# Streaming System Expert

Implement token streaming from providers to HTTP and WebSocket clients. The system must support SSE, chunked fetch responses, cancellation, backpressure, completion markers, and error events.

Streaming is a protocol contract. Define event shapes and make clients tolerant of partial output, reconnects, and provider-specific event differences.

## Architecture

```
LLM Provider Stream -> StreamNormalizer -> Gateway Stream Bus
                                      |-> SSE endpoint
                                      |-> WebSocket channel
                                      |-> Chunked fetch response
```

## Core Components

| Component | Purpose | Technology/Implementation |
|-----------|---------|--------------------------|
| StreamNormalizer | Convert provider events | Async iterable of gateway events |
| SSE Writer | Browser-friendly one-way stream | `text/event-stream` |
| WebSocket Writer | Bidirectional realtime stream | `ws` |
| Backpressure Guard | Avoid unbounded buffers | `write()`/`drain`, Web Streams |
| Cancellation | Stop provider work | `AbortController` |
| Resume Metadata | Reconnect support | event IDs and final state |

## Setup & Installation

```bash
pnpm add zod ws
pnpm add -D @types/ws vitest typescript @types/node
```

## Configuration (Zod Schema)

```typescript
import { z } from "zod";

export const StreamingConfigSchema = z.object({
  protocol: z.enum(["sse", "websocket", "chunked"]).default("sse"),
  heartbeatMs: z.number().int().positive().default(15_000),
  maxStreamMs: z.number().int().positive().default(10 * 60_000),
  maxBufferedBytes: z.number().int().positive().default(1024 * 1024),
  includeEventIds: z.boolean().default(true),
  retryMs: z.number().int().positive().default(2000),
});

export type StreamingConfig = z.infer<typeof StreamingConfigSchema>;
```

## Implementation

### Event Format and SSE Writer

```typescript
export type GatewayStreamEvent =
  | { type: "start"; id: string; sessionId: string }
  | { type: "delta"; id: string; text: string }
  | { type: "usage"; id: string; inputTokens: number; outputTokens: number }
  | { type: "error"; id: string; code: string; message: string }
  | { type: "done"; id: string };

function encodeSse(event: GatewayStreamEvent, retryMs?: number): string {
  const lines = [
    `id: ${event.id}`,
    `event: ${event.type}`,
    retryMs ? `retry: ${retryMs}` : undefined,
    `data: ${JSON.stringify(event)}`,
    "",
    "",
  ].filter((line) => line !== undefined);
  return lines.join("\n");
}

export async function writeSse(res: import("http").ServerResponse, events: AsyncIterable<GatewayStreamEvent>, config: StreamingConfig) {
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    "connection": "keep-alive",
    "x-accel-buffering": "no",
  });

  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), config.heartbeatMs);
  try {
    for await (const event of events) {
      await writeWithBackpressure(res, encodeSse(event, config.retryMs));
      if (event.type === "done" || event.type === "error") break;
    }
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
}

function writeWithBackpressure(res: import("http").ServerResponse, chunk: string): Promise<void> {
  if (res.write(chunk)) return Promise.resolve();
  return new Promise((resolve) => res.once("drain", resolve));
}
```

### Stream Normalizer

```typescript
export async function* normalizeProviderStream(sessionId: string, chunks: AsyncIterable<CompletionChunk>): AsyncIterable<GatewayStreamEvent> {
  yield { type: "start", id: crypto.randomUUID(), sessionId };
  try {
    for await (const chunk of chunks) {
      if (chunk.type === "text" && chunk.text) yield { type: "delta", id: crypto.randomUUID(), text: chunk.text };
      if (chunk.type === "usage" && chunk.usage) yield { type: "usage", id: crypto.randomUUID(), inputTokens: chunk.usage.inputTokens, outputTokens: chunk.usage.outputTokens };
    }
    yield { type: "done", id: crypto.randomUUID() };
  } catch (error) {
    yield { type: "error", id: crypto.randomUUID(), code: "stream_failed", message: error instanceof Error ? error.message : "Unknown stream error" };
  }
}
```

## Integration with Gateway

```typescript
app.post("/api/chat/stream", async (req, res) => {
  const controller = new AbortController();
  req.on("close", () => controller.abort());
  const providerStream = gateway.streamChat({ ...req.body, signal: controller.signal });
  await writeSse(res, normalizeProviderStream(req.body.sessionId, providerStream), streamingConfig);
});
```

## Best Practices

1. Use SSE for one-way browser token streaming.
2. Use WebSocket when the client must send concurrent control messages.
3. Respect `write()` backpressure and wait for `drain`.
4. Send heartbeat comments to keep proxies from closing idle SSE connections.
5. Use `AbortController` on client disconnect.
6. Include explicit `done` and `error` events.
7. Disable proxy buffering for streaming routes.

## Testing

### Unit Tests

```typescript
it("encodes valid SSE frames", () => {
  const encoded = encodeSse({ type: "delta", id: "1", text: "hi" });
  expect(encoded).toContain("event: delta");
  expect(encoded).toContain("data:");
});
```

### Integration Tests

```typescript
it("streams delta and done events", async () => {
  const res = await fetch("http://localhost:3000/api/chat/stream", { method: "POST", body: JSON.stringify({ sessionId: "s1", message: "hi" }) });
  expect(res.headers.get("content-type")).toContain("text/event-stream");
});
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Browser receives all tokens at end | Proxy buffering | Set `x-accel-buffering: no` and disable buffering |
| Memory grows during slow clients | Ignored backpressure | Wait for `drain` before writing more |
| Stream never ends | Missing done/error handling | Emit final event in `finally` |
| Client cannot POST with EventSource | EventSource only GETs | POST to create stream ID, then GET SSE endpoint |
| Provider continues after disconnect | No abort wiring | Abort provider request on `close` |

### Debug Commands

```bash
curl -N http://localhost:3000/api/events
curl -N -H "Accept: text/event-stream" http://localhost:3000/api/chat/stream
```

## Resources

- **[MDN Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)** - SSE overview.
- **[MDN Using Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)** - Event stream format.
- **[Node.js Streams](https://nodejs.org/api/stream.html)** - Backpressure and `drain`.
- **[WHATWG Streams Standard](https://streams.spec.whatwg.org/)** - Web Streams and backpressure model.
- **[OpenAI Streaming Responses](https://platform.openai.com/docs/guides/streaming-responses)** - Provider streaming semantics.

## Principles

1. Streams are contracts, not strings.
2. Backpressure is a correctness requirement.
3. Cancellation must reach the provider.
4. Every stream ends with `done` or `error`.
5. Clients must tolerate partial output.
