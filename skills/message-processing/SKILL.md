---
name: message-processing
type: skill
description: Message parsing, normalization, validation, sanitization, command extraction, routing, rate limiting, and error handling for agent gateway inputs.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [backend, messaging, security]
tags: [messages, parsing, commands, validation, sanitization, routing, rate-limit, pipeline]
---

# Message Processing Expert

Implement the gateway message pipeline: normalize platform payloads, validate input, extract commands, route to sessions/agents, apply safety controls, and produce consistent processing results.

Message processing is the boundary between untrusted user input and agent behavior. Keep it deterministic, observable, and conservative.

## Architecture

```
Platform Payload -> Normalizer -> Validator -> Sanitizer -> Command Extractor
                                                    |
                                                    v
                                             Router / AgentGateway
```

## Core Components

| Component | Purpose | Technology/Implementation |
|-----------|---------|--------------------------|
| Normalizer | Convert platform payloads to gateway messages | Zod schemas |
| Validator | Reject malformed/oversized input | Zod and length limits |
| Sanitizer | Remove control chars and unsafe markup | Plain-text normalization |
| CommandExtractor | Parse slash/bang commands | Deterministic parser |
| Router | Choose session and agent | message-routing/session manager |
| RateLimiter | Prevent spam and tool abuse | Token bucket |

## Setup & Installation

```bash
pnpm add zod
pnpm add -D vitest typescript @types/node
```

## Configuration (Zod Schema)

```typescript
import { z } from "zod";

export const MessageProcessingConfigSchema = z.object({
  maxTextChars: z.number().int().positive().default(100_000),
  maxCommandArgs: z.number().int().positive().default(32),
  commandPrefixes: z.array(z.string()).default(["/", "!"]),
  mentionRequiredInGroups: z.boolean().default(true),
  botUsernames: z.array(z.string()).default([]),
  sanitize: z.object({
    trim: z.boolean().default(true),
    collapseWhitespace: z.boolean().default(false),
    stripControlChars: z.boolean().default(true),
  }).default({}),
  rateLimit: z.object({
    messagesPerMinute: z.number().int().positive().default(60),
    commandsPerMinute: z.number().int().positive().default(20),
  }).default({}),
});

export type MessageProcessingConfig = z.infer<typeof MessageProcessingConfigSchema>;
```

## Implementation

### Parser and Command Extractor

```typescript
import { z } from "zod";

export const GatewayInputMessageSchema = z.object({
  platform: z.enum(["telegram", "discord", "websocket", "http"]),
  channelId: z.string().min(1),
  senderId: z.string().min(1),
  messageId: z.string().min(1),
  channelType: z.enum(["direct", "group"]).default("direct"),
  text: z.string().min(1),
  timestamp: z.number().int().positive(),
  metadata: z.record(z.unknown()).default({}),
});

export type GatewayInputMessage = z.infer<typeof GatewayInputMessageSchema>;

export interface ParsedCommand {
  name: string;
  args: string[];
  raw: string;
}

export interface ProcessedMessage {
  message: GatewayInputMessage;
  sanitizedText: string;
  command?: ParsedCommand;
  shouldRespond: boolean;
}

export class MessageProcessor {
  constructor(private config: MessageProcessingConfig) {}

  process(input: unknown): ProcessedMessage {
    const parsed = GatewayInputMessageSchema.parse(input);
    const sanitizedText = this.sanitize(parsed.text);
    if (sanitizedText.length > this.config.maxTextChars) throw new Error("Message exceeds maxTextChars");
    const command = this.extractCommand(sanitizedText);
    const shouldRespond = parsed.channelType === "direct" || !this.config.mentionRequiredInGroups || this.hasBotMention(sanitizedText);
    return { message: { ...parsed, text: sanitizedText }, sanitizedText, command, shouldRespond };
  }

  extractCommand(text: string): ParsedCommand | undefined {
    const prefix = this.config.commandPrefixes.find((candidate) => text.startsWith(candidate));
    if (!prefix) return undefined;
    const parts = splitCommandLine(text.slice(prefix.length));
    const name = parts.shift()?.toLowerCase();
    if (!name) return undefined;
    if (parts.length > this.config.maxCommandArgs) throw new Error("Too many command arguments");
    return { name, args: parts, raw: text };
  }

  private sanitize(text: string): string {
    let result = text;
    if (this.config.sanitize.stripControlChars) result = result.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
    if (this.config.sanitize.collapseWhitespace) result = result.replace(/\s+/g, " ");
    if (this.config.sanitize.trim) result = result.trim();
    return result;
  }

  private hasBotMention(text: string): boolean {
    const lower = text.toLowerCase();
    return this.config.botUsernames.some((name) => lower.includes(`@${name.toLowerCase()}`));
  }
}

export function splitCommandLine(input: string): string[] {
  const args: string[] = [];
  const pattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(\S+)/g;
  for (const match of input.matchAll(pattern)) {
    args.push((match[1] ?? match[2] ?? match[3] ?? "").replace(/\\(["'])/g, "$1"));
  }
  return args;
}
```

### Command Router

```typescript
type CommandHandler = (message: ProcessedMessage) => Promise<unknown>;

export class CommandRouter {
  private handlers = new Map<string, CommandHandler>();
  register(name: string, handler: CommandHandler): void {
    this.handlers.set(name.toLowerCase(), handler);
  }
  async execute(message: ProcessedMessage): Promise<unknown> {
    if (!message.command) return undefined;
    const handler = this.handlers.get(message.command.name);
    if (!handler) throw new Error(`Unknown command: ${message.command.name}`);
    return handler(message);
  }
}
```

## Integration with Gateway

```typescript
export async function handlePlatformMessage(input: unknown) {
  const processed = processor.process(input);
  if (!processed.shouldRespond) return { ignored: true };
  if (processed.command) return commandRouter.execute(processed);
  return gateway.handleIncomingMessage(processed.message);
}
```

## Best Practices

1. Normalize platform payloads before routing.
2. Validate untrusted input with Zod.
3. Sanitize for control characters, not meaning.
4. Keep command parsing deterministic; do not ask an LLM to parse commands.
5. Enforce mention gating in group channels.
6. Rate-limit commands separately from normal messages.
7. Log processing decisions with message IDs, not full sensitive text.

## Testing

### Unit Tests

```typescript
it("parses quoted command arguments", () => {
  expect(splitCommandLine('run "hello world" --fast')).toEqual(["run", "hello world", "--fast"]);
});
```

### Integration Tests

```typescript
it("ignores group messages without mention", async () => {
  const result = processor.process({ platform: "telegram", channelId: "c", senderId: "u", messageId: "m", channelType: "group", text: "hello", timestamp: Date.now(), metadata: {} });
  expect(result.shouldRespond).toBe(false);
});
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Bot responds to every group message | Mention gating disabled | Enable `mentionRequiredInGroups` |
| Commands with spaces break | Naive `split(" ")` parser | Use quoted argument parser |
| Control characters corrupt logs | Input not sanitized | Strip C0 controls before persistence |
| Unknown platform payload crashes | Missing normalizer | Add platform-specific schema |
| Users bypass limits with commands | Shared rate bucket | Separate command and message rate limits |

### Debug Commands

```bash
curl -X POST http://localhost:3000/api/chat -H "content-type: application/json" -d '{"sessionId":"s1","message":"/help"}'
curl http://localhost:3000/api/messages/m1/trace
```

## Resources

- **[Zod Documentation](https://zod.dev/)** - Runtime validation.
- **[OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)** - Input validation strategy.
- **[Telegram Bot API Update](https://core.telegram.org/bots/api#update)** - Telegram message payloads.
- **[Discord Interactions](https://docs.discord.com/developers/interactions/receiving-and-responding)** - Discord command payloads.
- **[Unicode Security Considerations](https://www.unicode.org/reports/tr36/)** - Text handling risks.

## Principles

1. Parse before routing.
2. Validate before persistence.
3. Commands are grammar, not guesses.
4. Group chat response policy must be explicit.
5. Message IDs make processing auditable.
