---
name: api-design
version: 1.0.0
description: REST and HTTP API design with OpenAPI 3.1, resource modeling, versioning, pagination, idempotency, errors, validation, auth boundaries, and production compatibility.
author: skillregistry
license: MIT
agents:
  - cursor
  - codex
categories:
  - backend
  - architecture
tags:
  - backend
  - rest
  - openapi
---

# API Design

Design APIs that are boring to consume and hard to misuse. Prefer explicit resources, stable contracts, precise validation, idempotent mutations, and machine-readable errors.

## Workflow

1. Model the resource and lifecycle before choosing endpoints.
2. Define request/response schemas with OpenAPI 3.1 and JSON Schema semantics.
3. Specify auth, authorization, rate limits, pagination, idempotency, and error behavior.
4. Implement validation at the HTTP boundary.
5. Add contract tests for representative success and failure cases.
6. Document migration/deprecation behavior before changing existing APIs.

## Patterns

Use nouns for resources and HTTP methods for actions:

```text
GET    /api/sessions
POST   /api/sessions
GET    /api/sessions/{sessionId}
PATCH  /api/sessions/{sessionId}
DELETE /api/sessions/{sessionId}
POST   /api/sessions/{sessionId}:compact   # command-style only when not CRUD
```

Use Problem Details for errors:

```json
{
  "type": "https://agent.local/problems/validation-error",
  "title": "Validation failed",
  "status": 400,
  "detail": "message is required",
  "instance": "/api/chat",
  "errors": [{ "path": "message", "code": "too_small" }]
}
```

OpenAPI 3.1 skeleton:

```yaml
openapi: 3.1.0
info:
  title: Agent Gateway API
  version: 1.0.0
paths:
  /api/chat:
    post:
      operationId: createChatTurn
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ChatRequest"
      responses:
        "200":
          description: Chat response
components:
  schemas:
    ChatRequest:
      type: object
      required: [sessionId, message]
      properties:
        sessionId: { type: string, minLength: 1 }
        message: { type: string, minLength: 1, maxLength: 100000 }
```

## Rules

- Use cursor pagination for changing datasets; include `nextCursor`.
- Require `Idempotency-Key` for retryable create/payment/tool-triggering mutations.
- Keep server-generated IDs opaque.
- Use `PATCH` for partial updates and define merge semantics.
- Return `401` for missing/invalid authentication and `403` for authenticated but denied.
- Do not expose internal stack traces, provider raw errors, or secrets.
- Version breaking changes through URL or media type; do not silently alter schemas.

## Verification

```bash
pnpm exec openapi lint openapi.yaml
pnpm test
curl -i http://localhost:3000/health
```

## Resources

- **[OpenAPI Specification](https://spec.openapis.org/oas/latest.html)** - Current OpenAPI 3.1 specification.
- **[OpenAPI 3.0 to 3.1 Upgrade](https://learn.openapis.org/upgrading/v3.0-to-v3.1.html)** - JSON Schema compatibility changes.
- **[RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html)** - Standard error response format.
- **[HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)** - Method and status code semantics.

## Principles

1. Contracts outlive implementations.
2. Errors are part of the API.
3. Idempotency makes retries safe.
4. Backward compatibility is a feature.
5. Validate at the boundary.
