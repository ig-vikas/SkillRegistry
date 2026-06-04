---
name: jwt-hardening
version: 1.0.0
description: JWT hardening for authentication systems, including RFC 8725 best practices, jose verification, algorithm allowlists, claims validation, token confusion prevention, revocation, and secure storage.
author: skillregistry
license: MIT
agents:
  - cursor
categories:
  - security
  - backend
tags:
  - jwt
  - security
  - jose
---

# JWT Hardening

Harden JWT use by validating every trust boundary explicitly: algorithm, key, issuer, audience, expiry, token type, and replay-sensitive identifiers. Prefer the `token-management` skill for full lifecycle implementation.

## Workflow

1. Determine token purpose: access, ID, refresh, device, or one-time action.
2. Use a separate issuer/audience/type profile per token purpose.
3. Verify with an explicit algorithm allowlist and key source.
4. Validate registered claims and required private claims.
5. Check revocation where the risk requires it.
6. Store browser tokens in secure cookies or a BFF pattern; avoid localStorage for sensitive bearer tokens.

## jose Verification

```typescript
import { jwtVerify } from "jose";

export async function verifyAccessJwt(token: string, key: Uint8Array) {
  const { payload, protectedHeader } = await jwtVerify(token, key, {
    algorithms: ["HS256"],
    issuer: "https://agent.local",
    audience: "agent-gateway",
    clockTolerance: "30s",
    requiredClaims: ["sub", "exp", "iat", "jti", "typ"],
  });

  if (protectedHeader.alg !== "HS256") throw new Error("Unexpected JWT algorithm");
  if (payload.typ !== "access") throw new Error("Wrong token type");
  if (typeof payload.sub !== "string") throw new Error("Missing subject");
  return payload;
}
```

## Rules

- Never accept `alg: none`.
- Do not derive accepted algorithms from the token header.
- Prevent cross-JWT confusion with a required `typ` or equivalent token-use claim.
- Validate `iss`, `aud`, `exp`, `nbf`, `iat`, and `jti`.
- Keep access JWTs short-lived.
- Do not put secrets or sensitive prompts in JWT payloads.
- Use JWKS with `kid` for asymmetric key rotation; cache keys with sane TTLs.
- Use opaque, hashed, rotating refresh tokens rather than long-lived refresh JWTs unless the architecture demands otherwise.

## Verification

Test invalid algorithm, wrong issuer, wrong audience, expired token, missing `jti`, wrong `typ`, and revoked `jti`.

```bash
pnpm vitest run jwt
```

## Resources

- **[RFC 7519 JWT](https://www.rfc-editor.org/rfc/rfc7519.html)** - JWT standard.
- **[RFC 8725 JWT BCP](https://www.rfc-editor.org/rfc/rfc8725.html)** - Best current practices.
- **[RFC 9700 OAuth 2.0 Security BCP](https://www.rfc-editor.org/rfc/rfc9700.html)** - OAuth token security and refresh token rotation.
- **[jose](https://github.com/panva/jose)** - JavaScript JOSE/JWT library.
- **[OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)** - JWT attack and mitigation patterns.

## Principles

1. JWTs are bearer credentials.
2. Claims are untrusted until verified.
3. Token purpose must be explicit.
4. Algorithm confusion is prevented by configuration, not inspection.
5. Short lifetimes reduce blast radius.
