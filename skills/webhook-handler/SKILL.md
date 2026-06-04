---
name: webhook-handler
type: skill
description: Secure webhook endpoint handling for Telegram, Discord, and generic providers with raw body verification, idempotency, parsing, retries, and gateway routing.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [backend, security, integration]
tags: [webhooks, telegram, discord, signatures, idempotency, retries, parsing, security]
---

# Webhook Handler Expert

Implement webhook ingestion for messaging platforms and provider callbacks. A webhook handler must authenticate the sender, validate the payload, deduplicate deliveries, acknowledge quickly, and enqueue or route work safely.

Webhook systems are at-least-once delivery systems. Correct handling requires both authenticity checks and idempotency checks.

## Architecture

```
Provider HTTP POST -> Raw Body Capture -> Signature/Secret Verification
                                      -> Zod Parse
                                      -> Idempotency Check
                                      -> Queue / AgentGateway
                                      -> Fast ACK
```

## Core Components

| Component | Purpose | Technology/Implementation |
|-----------|---------|--------------------------|
| RawBodyRoute | Preserve bytes for signature verification | `express.raw` or Fastify raw body |
| Verifier | Telegram secret token, Discord Ed25519 | Header validation, `tweetnacl` |
| Parser | Normalize platform events | Zod schemas |
| IdempotencyStore | Deduplicate retries | Event ID TTL store |
| Dispatcher | Send normalized message to gateway | `handleIncomingMessage` |
| RetryQueue | Process slow work asynchronously | BullMQ, SQLite queue, or local worker |

## Setup & Installation

```bash
pnpm add zod tweetnacl
pnpm add -D vitest supertest typescript @types/node
```

Use raw body parsing for Discord and HMAC-style providers. Telegram uses a secret header instead of signing the body.

## Configuration (Zod Schema)

```typescript
import { z } from "zod";

export const WebhookConfigSchema = z.object({
  basePath: z.string().default("/webhooks"),
  bodyLimitBytes: z.number().int().positive().default(1024 * 1024),
  ackTimeoutMs: z.number().int().positive().default(2500),
  idempotencyTtlSeconds: z.number().int().positive().default(60 * 60 * 24),
  telegram: z.object({
    enabled: z.boolean().default(false),
    secretTokenEnv: z.string().default("TELEGRAM_WEBHOOK_SECRET"),
  }).default({}),
  discord: z.object({
    enabled: z.boolean().default(false),
    publicKeyEnv: z.string().default("DISCORD_PUBLIC_KEY"),
  }).default({}),
});

export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;
```

## Implementation

### Verification and Idempotency

```typescript
import nacl from "tweetnacl";
import { z } from "zod";

export class IdempotencyStore {
  private seen = new Map<string, number>();
  constructor(private ttlMs: number) {}
  checkAndMark(key: string): boolean {
    const now = Date.now();
    for (const [id, expires] of this.seen) if (expires < now) this.seen.delete(id);
    if (this.seen.has(key)) return false;
    this.seen.set(key, now + this.ttlMs);
    return true;
  }
}

export function verifyTelegramSecret(headers: Record<string, string | string[] | undefined>, expected: string): boolean {
  const actual = headers["x-telegram-bot-api-secret-token"];
  return typeof actual === "string" && actual.length > 0 && actual === expected;
}

export function verifyDiscordSignature(rawBody: Buffer, timestamp: string | undefined, signature: string | undefined, publicKeyHex: string): boolean {
  if (!timestamp || !signature) return false;
  const message = Buffer.concat([Buffer.from(timestamp), rawBody]);
  return nacl.sign.detached.verify(
    new Uint8Array(message),
    Buffer.from(signature, "hex"),
    Buffer.from(publicKeyHex, "hex"),
  );
}

export const TelegramUpdateSchema = z.object({
  update_id: z.number().int(),
  message: z.object({
    message_id: z.number().int(),
    chat: z.object({ id: z.union([z.string(), z.number()]), type: z.string() }),
    from: z.object({ id: z.union([z.string(), z.number()]).optional(), username: z.string().optional() }).optional(),
    text: z.string().optional(),
    date: z.number().int(),
  }).optional(),
});

export const DiscordInteractionSchema = z.object({
  id: z.string(),
  type: z.number().int(),
  token: z.string(),
  channel_id: z.string().optional(),
  member: z.unknown().optional(),
  data: z.object({ name: z.string().optional(), options: z.array(z.unknown()).optional() }).optional(),
});
```

### Express Routes

```typescript
import express from "express";

export function createWebhookRouter(config: WebhookConfig, gateway: AgentGateway) {
  const router = express.Router();
  const idempotency = new IdempotencyStore(config.idempotencyTtlSeconds * 1000);

  router.post("/telegram", express.json({ limit: config.bodyLimitBytes }), async (req, res) => {
    const secret = process.env[config.telegram.secretTokenEnv] ?? "";
    if (!verifyTelegramSecret(req.headers as any, secret)) return res.status(401).json({ error: "invalid_secret" });
    const parsed = TelegramUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });
    const update = parsed.data;
    if (!idempotency.checkAndMark(`telegram:${update.update_id}`)) return res.status(200).json({ ok: true, duplicate: true });
    res.status(200).json({ ok: true });
    if (update.message?.text) {
      await gateway.handleIncomingMessage({
        platform: "telegram",
        channelId: String(update.message.chat.id),
        senderId: String(update.message.from?.id ?? "unknown"),
        messageId: String(update.message.message_id),
        text: update.message.text,
        timestamp: update.message.date * 1000,
      });
    }
  });

  router.post("/discord", express.raw({ type: "application/json", limit: config.bodyLimitBytes }), async (req, res) => {
    const publicKey = process.env[config.discord.publicKeyEnv] ?? "";
    const timestamp = req.get("x-signature-timestamp") ?? undefined;
    const signature = req.get("x-signature-ed25519") ?? undefined;
    if (!verifyDiscordSignature(req.body, timestamp, signature, publicKey)) return res.status(401).json({ error: "invalid_signature" });
    const payload = JSON.parse(req.body.toString("utf8"));
    const parsed = DiscordInteractionSchema.safeParse(payload);
    if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });
    if (parsed.data.type === 1) return res.json({ type: 1 });
    if (!idempotency.checkAndMark(`discord:${parsed.data.id}`)) return res.status(200).json({ type: 5 });
    res.status(200).json({ type: 5 });
    await gateway.handleIncomingMessage({ platform: "discord", channelId: parsed.data.channel_id ?? "unknown", senderId: "discord", messageId: parsed.data.id, text: parsed.data.data?.name ?? "", timestamp: Date.now() });
  });

  return router;
}
```

## Integration with Gateway

Mount webhook routes before global JSON parsing if any route needs raw bytes:

```typescript
app.use("/webhooks", createWebhookRouter(webhookConfig, gateway));
```

## Best Practices

1. Verify signatures or shared secrets before parsing business data.
2. Preserve raw request bytes for signature schemes.
3. Acknowledge quickly and process slow work asynchronously.
4. Deduplicate using provider event IDs with TTL.
5. Treat duplicate valid events as success, not errors.
6. Log verification failures without logging secrets or full payloads.
7. Configure provider retry windows and timeout expectations.

## Testing

### Unit Tests

```typescript
it("deduplicates event ids", () => {
  const store = new IdempotencyStore(60_000);
  expect(store.checkAndMark("evt_1")).toBe(true);
  expect(store.checkAndMark("evt_1")).toBe(false);
});
```

### Integration Tests

```typescript
it("rejects telegram requests without the secret header", async () => {
  const res = await request(app).post("/webhooks/telegram").send({ update_id: 1 });
  expect(res.status).toBe(401);
});
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Discord endpoint verification fails | Body was JSON-parsed before verification | Use `express.raw` for that route |
| Telegram accepts spoofed requests | Missing secret token check | Set `secret_token` and validate header |
| Duplicate agent responses | Provider retry processed twice | Add idempotency before dispatch |
| Provider times out | Handler waits for LLM | ACK first and process asynchronously |
| Signature valid but replayed | No timestamp/id check | Enforce timestamp freshness and event dedupe |

### Debug Commands

```bash
curl -i -X POST http://localhost:3000/webhooks/telegram -H "X-Telegram-Bot-Api-Secret-Token: $TELEGRAM_WEBHOOK_SECRET" -H "content-type: application/json" -d '{"update_id":1}'
curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo
```

## Resources

- **[Telegram Bot API setWebhook](https://core.telegram.org/bots/api#setwebhook)** - Secret token webhook header.
- **[Discord Receiving and Responding](https://docs.discord.com/developers/interactions/receiving-and-responding)** - Interaction endpoint and signature requirements.
- **[OWASP Webhook Security Guidance](https://cheatsheetseries.owasp.org/)** - General input validation and API security references.
- **[tweetnacl-js](https://github.com/dchest/tweetnacl-js)** - Ed25519 signature verification.
- **[Express Raw Body Parser](https://expressjs.com/en/api.html#express.raw)** - Raw body middleware.

## Principles

1. Authenticity and idempotency are separate checks.
2. Fast ACKs keep provider retries under control.
3. Raw bytes matter for signatures.
4. Duplicate delivery is normal.
5. Webhooks are untrusted input until proven otherwise.
