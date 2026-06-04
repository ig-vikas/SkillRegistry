---
name: http-server
type: skill
description: Production HTTP server setup for AI agent gateways using Express or Fastify with routing, validation, CORS, security headers, rate limiting, errors, and health checks.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [backend, networking, security]
tags: [http, express, fastify, cors, middleware, rate-limit, errors, api]
---

# HTTP Server Expert

Implement the gateway HTTP API: health checks, chat endpoints, auth, webhooks, provider status, pairing, and admin operations. The server must validate inputs, enforce CORS and rate limits, centralize errors, and shut down cleanly.

Prefer Fastify for new high-throughput APIs and Express when matching existing middleware ecosystems. Keep the route surface explicit and small.

## Architecture

```
HTTP Client -> Security Headers -> CORS -> Rate Limit -> Auth -> Zod Validation
                                                               |
                                                               v
                                                         Route Handler
                                                               |
                                                               v
                                                       AgentGateway Service
```

## Core Components

| Component | Purpose | Technology/Implementation |
|-----------|---------|--------------------------|
| AppFactory | Build server with dependencies | Express or Fastify |
| Middleware Pipeline | Security, CORS, auth, rate limit | `helmet`, `cors`, `@fastify/*` |
| Validator | Runtime request/response checks | Zod |
| Error Handler | Consistent API errors | Typed `HttpError` |
| Health Routes | Liveness/readiness | Provider/storage checks |
| Shutdown | Drain requests and close resources | Signal handlers |

## Setup & Installation

```bash
pnpm add express cors helmet express-rate-limit zod
pnpm add -D @types/express @types/cors vitest supertest typescript @types/node
```

Fastify alternative:

```bash
pnpm add fastify @fastify/cors @fastify/helmet @fastify/rate-limit zod
```

## Configuration (Zod Schema)

```typescript
import { z } from "zod";

export const HttpServerConfigSchema = z.object({
  host: z.string().default("127.0.0.1"),
  port: z.number().int().min(1).max(65535).default(3000),
  trustProxy: z.boolean().default(false),
  bodyLimitBytes: z.number().int().positive().default(1024 * 1024),
  cors: z.object({
    enabled: z.boolean().default(true),
    origins: z.array(z.string()).default(["http://localhost:5173"]),
    credentials: z.boolean().default(true),
    methods: z.array(z.string()).default(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]),
  }).default({}),
  rateLimit: z.object({
    enabled: z.boolean().default(true),
    windowMs: z.number().int().positive().default(60_000),
    max: z.number().int().positive().default(120),
  }).default({}),
  securityHeaders: z.boolean().default(true),
  requestTimeoutMs: z.number().int().positive().default(60_000),
});

export type HttpServerConfig = z.infer<typeof HttpServerConfigSchema>;
```

## Implementation

### Express Server

```typescript
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z, type ZodSchema } from "zod";

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return next(new HttpError(400, "invalid_body", "Request body validation failed", parsed.error.flatten()));
    req.body = parsed.data;
    next();
  };
}

export function createExpressServer(config: HttpServerConfig, gateway: AgentGateway) {
  const app = express();
  app.set("trust proxy", config.trustProxy);
  if (config.securityHeaders) app.use(helmet());
  if (config.cors.enabled) {
    app.use(cors({
      origin: (origin, cb) => cb(null, !origin || config.cors.origins.includes(origin)),
      credentials: config.cors.credentials,
      methods: config.cors.methods,
    }));
  }
  if (config.rateLimit.enabled) app.use(rateLimit({ windowMs: config.rateLimit.windowMs, max: config.rateLimit.max }));
  app.use(express.json({ limit: config.bodyLimitBytes }));

  const ChatRequest = z.object({
    sessionId: z.string().min(1),
    message: z.string().min(1).max(100_000),
    stream: z.boolean().default(false),
  });

  app.get("/health", async (_req, res, next) => {
    try {
      const health = await gateway.health();
      res.status(health.ok ? 200 : 503).json(health);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/chat", validateBody(ChatRequest), async (req, res, next) => {
    try {
      const result = await gateway.handleChat(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.use((req, _res, next) => next(new HttpError(404, "not_found", `No route for ${req.method} ${req.path}`)));
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const http = error instanceof HttpError ? error : new HttpError(500, "internal_error", "Internal server error");
    res.status(http.status).json({ error: { code: http.code, message: http.message, details: http.details } });
  });

  return app;
}
```

### Graceful Startup

```typescript
import http from "node:http";

export function startServer(app: express.Express, config: HttpServerConfig) {
  const server = http.createServer(app);
  server.requestTimeout = config.requestTimeoutMs;
  server.listen(config.port, config.host);
  const shutdown = () => server.close(() => process.exit(0));
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  return server;
}
```

## Integration with Gateway

The HTTP layer should call gateway methods and avoid business logic:

```typescript
const config = HttpServerConfigSchema.parse(rawConfig.http);
const app = createExpressServer(config, gateway);
startServer(app, config);
```

## Best Practices

1. Validate request bodies, params, and query strings at route boundaries.
2. Use raw body parsing only for routes that require signature verification.
3. Return stable error codes; do not leak stack traces.
4. Lock down CORS to explicit origins when credentials are enabled.
5. Set rate limits per user/token when authenticated, per IP otherwise.
6. Keep health endpoints cheap and separate liveness from readiness.
7. Implement graceful shutdown for tests and deployment.

## Testing

### Unit Tests

```typescript
it("maps validation failures to 400", async () => {
  const res = await request(app).post("/api/chat").send({ message: "" });
  expect(res.status).toBe(400);
  expect(res.body.error.code).toBe("invalid_body");
});
```

### Integration Tests

```typescript
it("serves health", async () => {
  const res = await request(app).get("/health");
  expect([200, 503]).toContain(res.status);
});
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Webhook signatures fail | JSON parser consumed raw body | Mount raw parser before JSON for webhook route |
| Cookies not sent | CORS credentials/origin mismatch | Set explicit origin and `credentials: true` |
| 413 responses | Body limit too small | Increase `bodyLimitBytes` per endpoint |
| Async errors crash process | Missing route try/catch in Express 4 | Wrap handlers or use Express 5 behavior |
| Health check slow | Deep provider calls | Use cached readiness state |

### Debug Commands

```bash
curl -i http://localhost:3000/health
curl -i -X POST http://localhost:3000/api/chat -H "content-type: application/json" -d '{"sessionId":"s1","message":"hello"}'
```

## Resources

- **[Express Middleware](https://expressjs.com/en/guide/using-middleware.html)** - Middleware pipeline model.
- **[Express Error Handling](https://expressjs.com/en/guide/error-handling.html)** - Centralized error handling.
- **[Express CORS Middleware](https://expressjs.com/en/resources/middleware/cors.html)** - CORS configuration.
- **[Fastify Lifecycle](https://fastify.dev/docs/latest/Reference/Lifecycle/)** - Fastify request lifecycle.
- **[OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)** - API security controls.

## Principles

1. HTTP code is boundary code.
2. Validate before work.
3. Fail with stable machine-readable errors.
4. Keep transport concerns out of gateway logic.
5. Make shutdown and tests first-class.
