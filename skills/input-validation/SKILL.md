---
name: input-validation
version: 1.0.0
description: Secure input validation with Zod 4, allowlists, canonicalization, semantic validation, file upload checks, API boundary parsing, and safe error reporting.
author: skillregistry
license: MIT
agents:
  - cursor
  - claude-code
categories:
  - security
  - backend
tags:
  - validation
  - zod
  - owasp
---

# Input Validation

Validate untrusted input at every boundary: HTTP, webhooks, WebSocket messages, config files, provider responses, CLI flags, and persisted data loaded from disk.

## Workflow

1. Treat inbound data as `unknown`.
2. Canonicalize/normalize before validation when encodings or Unicode forms matter.
3. Apply syntactic validation: type, format, length, enum, shape.
4. Apply semantic validation: business rules and cross-field constraints.
5. Return safe, structured validation errors.
6. Keep output encoding, SQL parameterization, and authorization as separate controls.

## Zod Pattern

```typescript
import { z } from "zod";

const ChatRequestSchema = z.object({
  sessionId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_.:-]+$/),
  message: z.string().trim().min(1).max(100_000),
  stream: z.boolean().default(false),
}).strict();

export function parseChatRequest(input: unknown) {
  const result = ChatRequestSchema.safeParse(input);
  if (!result.success) {
    return { ok: false as const, error: result.error.flatten() };
  }
  return { ok: true as const, data: result.data };
}
```

## Rules

- Prefer allowlists for structured fields.
- Use `.strict()` for external objects unless forward compatibility requires passthrough.
- Avoid regexes with catastrophic backtracking; anchor patterns.
- Validate arrays with item limits and object nesting limits.
- Validate file uploads by size, extension, detected MIME/content, and storage path.
- Do not trust client-side validation for security.
- Do not use validation as the primary XSS/SQLi defense; still encode output and parameterize queries.

## Verification

```bash
pnpm test
pnpm vitest run validation
```

Test malformed types, boundary lengths, unknown properties, Unicode/control characters, and semantic conflicts.

## Resources

- **[OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)** - Allowlist and canonicalization guidance.
- **[Zod](https://zod.dev/)** - TypeScript runtime validation.
- **[OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)** - Upload validation.
- **[Unicode Security Considerations](https://www.unicode.org/reports/tr36/)** - Unicode input risks.

## Principles

1. Unknown in, typed out.
2. Validate syntax and semantics.
3. Allowlists beat denylists.
4. Validation complements, not replaces, output encoding and parameterization.
5. Error messages should help clients, not attackers.
