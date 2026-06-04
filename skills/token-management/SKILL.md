---
name: token-management
type: skill
description: Secure JWT, OAuth 2.0, refresh token rotation, revocation, and cookie-based token lifecycle management for a local-first AI agent gateway.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [security, backend, auth]
tags: [jwt, oauth2, refresh-tokens, cookies, revocation, rotation, jose, security]
---

# Token Management Expert

Implement token lifecycle management for an AI agent gateway: short-lived access tokens, rotating refresh tokens, device-bound sessions, revocation, auditability, and secure browser/mobile transport.

Tokens are authentication material. Treat bearer tokens like passwords: minimize lifetime, store only hashes for long-lived secrets, bind tokens to device/session metadata where possible, and make revocation observable.

## Architecture

```
Client / Device
  | login / pair
  v
Auth Service -> Token Store (hashed refresh tokens, revocations)
  |              |
  | access JWT   +-> Audit Log
  v
Gateway Auth Middleware -> Authorization -> AgentGateway handlers
```

## Core Components

| Component | Purpose | Technology/Implementation |
|-----------|---------|--------------------------|
| TokenIssuer | Create signed access JWTs and opaque refresh tokens | `jose`, Node `crypto` |
| TokenVerifier | Validate issuer, audience, expiry, signature, and `jti` | `jwtVerify`, JWKS/key rotation |
| RefreshTokenStore | Persist hashed refresh tokens and token families | SQLite/Postgres, SHA-256/HMAC hashes |
| RotationService | Rotate refresh tokens and detect replay | One-time refresh tokens with family revocation |
| RevocationService | Revoke JWT IDs, sessions, devices, or users | TTL-backed deny list |
| CookieTransport | Set and clear secure cookies | `HttpOnly`, `Secure`, `SameSite`, scoped path |

## Setup & Installation

```bash
pnpm add jose zod
pnpm add -D vitest typescript @types/node
```

Use HTTPS in production. For local development, allow non-secure cookies only on `localhost`.

## Configuration (Zod Schema)

```typescript
import { z } from "zod";

export const TokenConfigSchema = z.object({
  issuer: z.string().url().default("http://localhost:3000"),
  audience: z.union([z.string(), z.array(z.string())]).default("agent-gateway"),
  algorithm: z.enum(["HS256", "RS256", "EdDSA"]).default("HS256"),
  accessTokenTtlSeconds: z.number().int().min(60).max(3600).default(900),
  refreshTokenTtlSeconds: z.number().int().min(3600).max(60 * 60 * 24 * 90).default(60 * 60 * 24 * 30),
  refreshTokenBytes: z.number().int().min(32).max(128).default(64),
  rotateRefreshTokens: z.boolean().default(true),
  revokeFamilyOnReuse: z.boolean().default(true),
  clockToleranceSeconds: z.number().int().min(0).max(300).default(30),
  accessCookieName: z.string().default("__Host-agw_access"),
  refreshCookieName: z.string().default("__Host-agw_refresh"),
  cookie: z.object({
    secure: z.boolean().default(true),
    httpOnly: z.boolean().default(true),
    sameSite: z.enum(["strict", "lax", "none"]).default("lax"),
    domain: z.string().optional(),
    accessPath: z.string().default("/"),
    refreshPath: z.string().default("/api/auth/refresh"),
  }).default({}),
  revocation: z.object({
    enabled: z.boolean().default(true),
    maxEntries: z.number().int().positive().default(100_000),
    cleanupIntervalSeconds: z.number().int().positive().default(300),
  }).default({}),
});

export type TokenConfig = z.infer<typeof TokenConfigSchema>;
```

## Implementation

### Token Service

```typescript
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export interface TokenSubject {
  userId: string;
  deviceId: string;
  sessionId: string;
  roles: string[];
}

export interface RefreshRecord {
  id: string;
  userId: string;
  deviceId: string;
  sessionId: string;
  familyId: string;
  tokenHash: string;
  previousTokenHash?: string;
  expiresAt: number;
  revokedAt?: number;
  createdAt: number;
}

export interface RefreshStore {
  insert(record: RefreshRecord): Promise<void>;
  findByHash(tokenHash: string): Promise<RefreshRecord | null>;
  revoke(id: string, reason: string): Promise<void>;
  revokeFamily(familyId: string, reason: string): Promise<void>;
}

export class TokenError extends Error {
  constructor(message: string, public code: "invalid" | "expired" | "revoked" | "replay") {
    super(message);
  }
}

export class TokenService {
  private readonly key: Uint8Array;

  constructor(private config: TokenConfig, private refreshStore: RefreshStore, secret: string) {
    if (secret.length < 32) throw new Error("Token secret must be at least 32 characters");
    this.key = new TextEncoder().encode(secret);
  }

  async issue(subject: TokenSubject): Promise<{ accessToken: string; refreshToken: string; refreshRecord: RefreshRecord }> {
    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID();
    const familyId = crypto.randomUUID();
    const refreshToken = this.createOpaqueToken();
    const refreshRecord: RefreshRecord = {
      id: crypto.randomUUID(),
      userId: subject.userId,
      deviceId: subject.deviceId,
      sessionId: subject.sessionId,
      familyId,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: Date.now() + this.config.refreshTokenTtlSeconds * 1000,
      createdAt: Date.now(),
    };

    await this.refreshStore.insert(refreshRecord);

    const accessToken = await this.issueAccessToken(subject, jti, now);

    return { accessToken, refreshToken, refreshRecord };
  }

  async verifyAccessToken(token: string): Promise<JWTPayload & { sub: string }> {
    const { payload } = await jwtVerify(token, this.key, {
      issuer: this.config.issuer,
      audience: this.config.audience,
      clockTolerance: this.config.clockToleranceSeconds,
    });
    if (!payload.sub) throw new TokenError("Missing subject", "invalid");
    return payload as JWTPayload & { sub: string };
  }

  async rotate(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = this.hashToken(refreshToken);
    const current = await this.refreshStore.findByHash(tokenHash);
    if (!current) throw new TokenError("Refresh token not found", "invalid");
    if (current.revokedAt) {
      if (this.config.revokeFamilyOnReuse) await this.refreshStore.revokeFamily(current.familyId, "refresh_reuse");
      throw new TokenError("Refresh token replay detected", "replay");
    }
    if (Date.now() >= current.expiresAt) throw new TokenError("Refresh token expired", "expired");

    await this.refreshStore.revoke(current.id, "rotated");
    const nextRefresh = this.createOpaqueToken();
    await this.refreshStore.insert({
      ...current,
      id: crypto.randomUUID(),
      tokenHash: this.hashToken(nextRefresh),
      previousTokenHash: current.tokenHash,
      revokedAt: undefined,
      createdAt: Date.now(),
    });

    const accessToken = await this.issueAccessToken({
      userId: current.userId,
      deviceId: current.deviceId,
      sessionId: current.sessionId,
      roles: [],
    }, crypto.randomUUID(), Math.floor(Date.now() / 1000));
    return { accessToken, refreshToken: nextRefresh };
  }

  constantTimeEquals(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
  }

  private createOpaqueToken(): string {
    return randomBytes(this.config.refreshTokenBytes).toString("base64url");
  }

  private async issueAccessToken(subject: TokenSubject, jti: string, now: number): Promise<string> {
    return new SignJWT({
      sub: subject.userId,
      sid: subject.sessionId,
      did: subject.deviceId,
      roles: subject.roles,
    })
      .setProtectedHeader({ alg: this.config.algorithm })
      .setIssuer(this.config.issuer)
      .setAudience(this.config.audience)
      .setJti(jti)
      .setIssuedAt(now)
      .setExpirationTime(now + this.config.accessTokenTtlSeconds)
      .sign(this.key);
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token, "utf8").digest("base64url");
  }
}
```

### Secure Cookies

```typescript
import type { Response } from "express";

export function setTokenCookies(res: Response, config: TokenConfig, accessToken: string, refreshToken: string): void {
  res.cookie(config.accessCookieName, accessToken, {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: config.cookie.accessPath,
    maxAge: config.accessTokenTtlSeconds * 1000,
  });
  res.cookie(config.refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: config.cookie.refreshPath,
    maxAge: config.refreshTokenTtlSeconds * 1000,
  });
}
```

## Integration with Gateway

Register token verification before authorization:

```typescript
export function authMiddleware(tokens: TokenService) {
  return async (req: any, res: any, next: any) => {
    try {
      const header = req.get("authorization");
      const token = header?.startsWith("Bearer ") ? header.slice(7) : req.cookies?.__Host_agw_access;
      if (!token) return res.status(401).json({ error: "missing_token" });
      req.auth = await tokens.verifyAccessToken(token);
      next();
    } catch {
      res.status(401).json({ error: "invalid_token" });
    }
  };
}
```

## Best Practices

1. Use short-lived access tokens and long-lived opaque refresh tokens.
2. Store only refresh-token hashes server-side.
3. Rotate refresh tokens on every use and revoke the family on reuse.
4. Prefer `HttpOnly; Secure; SameSite=Lax/Strict` cookies for browser clients.
5. Validate `iss`, `aud`, `exp`, `nbf`, `iat`, algorithm, and `jti`.
6. Avoid putting secrets, API keys, prompts, or PII in JWT claims.
7. Use asymmetric keys or JWKS when multiple services verify tokens.
8. Keep revocation checks fast with TTL indexes or bounded in-memory caches.

## Testing

### Unit Tests

```typescript
import { describe, expect, it } from "vitest";

describe("TokenConfigSchema", () => {
  it("rejects unsafe lifetimes", () => {
    expect(() => TokenConfigSchema.parse({ accessTokenTtlSeconds: 10 })).toThrow();
  });
});
```

### Integration Tests

```typescript
it("rejects refresh token reuse", async () => {
  const issued = await service.issue({ userId: "u1", deviceId: "d1", sessionId: "s1", roles: [] });
  await service.rotate(issued.refreshToken);
  await expect(service.rotate(issued.refreshToken)).rejects.toMatchObject({ code: "replay" });
});
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| JWT verifies locally but not in another service | Mismatched issuer/audience/key | Log `iss`, `aud`, `kid`; publish JWKS |
| Refresh token works twice | Old token not revoked atomically | Use transaction around lookup, revoke, insert |
| Cookies not sent cross-site | `SameSite`/CORS/credentials mismatch | Use `SameSite=None; Secure` only when required |
| Users stay logged in after logout | Access JWT still valid | Keep access TTL short and revoke `jti` for sensitive logout |
| Random 401s | Clock skew | Add small `clockToleranceSeconds` and sync clocks |

### Debug Commands

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/me
curl -i -X POST --cookie "refresh=..." http://localhost:3000/api/auth/refresh
```

## Resources

- **[RFC 7519 JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519.html)** - JWT claims and validation semantics.
- **[RFC 9700 OAuth 2.0 Security BCP](https://www.rfc-editor.org/rfc/rfc9700.html)** - Current OAuth security best practices, including refresh token rotation.
- **[jose Documentation](https://github.com/panva/jose)** - JOSE/JWT implementation for JavaScript runtimes.
- **[OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)** - Cookie and session storage guidance.
- **[OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)** - CSRF controls for cookie-based auth.

## Principles

1. Tokens are secrets.
2. Access tokens are disposable.
3. Refresh tokens are one-time credentials.
4. Revocation must be observable and testable.
5. Fail closed on malformed, expired, unknown, or replayed tokens.
