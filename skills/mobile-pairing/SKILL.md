---
name: mobile-pairing
type: skill
description: Secure mobile and device pairing using QR codes, short-lived pairing codes, device registration, token exchange, rate limiting, and revocation.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [security, mobile, realtime]
tags: [pairing, qr-code, mobile, device-registration, tokens, websocket, qrcode]
---

# Mobile Pairing Expert

Implement secure pairing between the local gateway and mobile/control clients using short-lived pairing codes, QR codes, device registration, and token exchange.

Pairing bootstraps trust. Codes must be random, short-lived, single-use, rate-limited, and bound to an approving user or local session.

## Architecture

```
Owner UI -> Create Pairing Session -> QR / Code
Mobile App -> Scan / Enter Code -> Exchange
Gateway -> Register Device -> Issue Tokens -> WebSocket Connect
```

## Core Components

| Component | Purpose | Technology/Implementation |
|-----------|---------|--------------------------|
| PairingSessionStore | Track pending sessions | TTL map or SQLite |
| CodeGenerator | Generate human-enterable codes | Node `crypto` |
| QRService | Encode pairing URI | `qrcode` |
| DeviceRegistry | Store trusted devices | SQLite/JSON |
| TokenExchange | Issue device tokens | token-management skill |
| RateLimiter | Stop brute force | Per IP/code/user limits |

## Setup & Installation

```bash
pnpm add qrcode zod
pnpm add -D @types/qrcode vitest typescript @types/node
```

## Configuration (Zod Schema)

```typescript
import { z } from "zod";

export const MobilePairingConfigSchema = z.object({
  issuer: z.string().default("agent-gateway"),
  pairingBaseUrl: z.string().url().default("http://localhost:3000/pair"),
  codeLength: z.number().int().min(6).max(12).default(8),
  codeTtlSeconds: z.number().int().min(60).max(900).default(300),
  maxAttempts: z.number().int().min(1).max(20).default(5),
  qr: z.object({
    errorCorrectionLevel: z.enum(["L", "M", "Q", "H"]).default("M"),
    margin: z.number().int().min(0).max(10).default(2),
    width: z.number().int().min(128).max(1024).default(320),
  }).default({}),
});

export type MobilePairingConfig = z.infer<typeof MobilePairingConfigSchema>;
```

## Implementation

### Pairing Service

```typescript
import { randomInt, randomUUID } from "node:crypto";
import QRCode from "qrcode";

export interface PairingSession {
  id: string;
  code: string;
  ownerUserId: string;
  expiresAt: number;
  attempts: number;
  usedAt?: number;
}

export class PairingService {
  private sessions = new Map<string, PairingSession>();

  constructor(private config: MobilePairingConfig) {}

  async create(ownerUserId: string): Promise<{ session: PairingSession; uri: string; qrDataUrl: string }> {
    const session: PairingSession = {
      id: randomUUID(),
      code: this.generateCode(this.config.codeLength),
      ownerUserId,
      expiresAt: Date.now() + this.config.codeTtlSeconds * 1000,
      attempts: 0,
    };
    this.sessions.set(session.code, session);
    const uri = `${this.config.pairingBaseUrl}?code=${encodeURIComponent(session.code)}&issuer=${encodeURIComponent(this.config.issuer)}`;
    const qrDataUrl = await QRCode.toDataURL(uri, this.config.qr);
    return { session, uri, qrDataUrl };
  }

  exchange(input: { code: string; deviceName: string; devicePublicKey?: string }): PairingSession {
    const session = this.sessions.get(input.code.toUpperCase());
    if (!session) throw new Error("Invalid pairing code");
    session.attempts++;
    if (session.attempts > this.config.maxAttempts) {
      this.sessions.delete(session.code);
      throw new Error("Pairing attempts exceeded");
    }
    if (session.usedAt) throw new Error("Pairing code already used");
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(session.code);
      throw new Error("Pairing code expired");
    }
    session.usedAt = Date.now();
    this.sessions.delete(session.code);
    return session;
  }

  private generateCode(length: number): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < length; i++) code += alphabet[randomInt(alphabet.length)];
    return code;
  }
}
```

### Device Registration Endpoint

```typescript
const DeviceRegistrationSchema = z.object({
  code: z.string().min(6).max(12),
  deviceName: z.string().min(1).max(80),
  platform: z.enum(["ios", "android", "desktop", "web"]).default("web"),
  devicePublicKey: z.string().optional(),
});

app.post("/api/pairing/exchange", validateBody(DeviceRegistrationSchema), async (req, res, next) => {
  try {
    const session = pairing.exchange(req.body);
    const device = await deviceRegistry.register({ userId: session.ownerUserId, ...req.body });
    const tokens = await tokenService.issue({ userId: session.ownerUserId, deviceId: device.id, sessionId: crypto.randomUUID(), roles: ["viewer"] });
    res.json({ deviceId: device.id, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  } catch (error) {
    next(error);
  }
});
```

## Integration with Gateway

Expose pairing creation only to authenticated owners/admins:

```typescript
app.post("/api/pairing", requireRole("owner"), async (req, res) => {
  res.json(await pairing.create(req.auth.sub));
});
```

## Best Practices

1. Pairing codes are single-use and short-lived.
2. Use cryptographic randomness, not `Math.random`.
3. Rate-limit exchange attempts by IP and code.
4. Bind pairing sessions to the approving owner.
5. Do not put long-lived tokens directly in QR codes.
6. Register each device separately for revocation.
7. Show device name/platform during approval when available.

## Testing

### Unit Tests

```typescript
it("rejects reuse of a pairing code", () => {
  const session = service.exchange({ code, deviceName: "phone" });
  expect(session.ownerUserId).toBe("owner");
  expect(() => service.exchange({ code, deviceName: "phone" })).toThrow(/Invalid|used/);
});
```

### Integration Tests

```typescript
it("returns QR data URL for owner", async () => {
  const res = await request(app).post("/api/pairing").set("Authorization", `Bearer ${ownerToken}`);
  expect(res.body.qrDataUrl).toMatch(/^data:image\/png;base64,/);
});
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| QR scans but exchange fails | Base URL unreachable from phone | Use LAN HTTPS URL or tunnel |
| Codes brute-forced | No attempt limit | Add per-code and per-IP limits |
| Device cannot reconnect | Refresh token not stored | Store token securely in platform keystore |
| Old phone still has access | No device revocation | Revoke device token family |
| Code confusion | Ambiguous characters | Exclude `0/O/1/I` from alphabet |

### Debug Commands

```bash
curl -H "Authorization: Bearer $OWNER_TOKEN" -X POST http://localhost:3000/api/pairing
curl -X POST http://localhost:3000/api/pairing/exchange -H "content-type: application/json" -d '{"code":"ABCDEFGH","deviceName":"phone"}'
```

## Resources

- **[qrcode npm](https://www.npmjs.com/package/qrcode)** - QR code generation API.
- **[OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)** - Authentication controls.
- **[OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)** - Session and token handling.
- **[RFC 7636 PKCE](https://www.rfc-editor.org/rfc/rfc7636)** - Secure code exchange pattern.
- **[MDN Secure Contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts)** - Browser security context requirements.

## Principles

1. Pairing proves possession of a short-lived secret.
2. QR codes should bootstrap, not carry permanent credentials.
3. Every device is revocable.
4. Failed attempts are security signals.
5. Local-first still requires secure transport on hostile networks.
