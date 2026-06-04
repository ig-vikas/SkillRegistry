---
name: graphql-expert
version: 1.0.0
description: GraphQL schema, resolver, authorization, DataLoader, pagination, query cost/depth limiting, error masking, and production server guidance.
author: skillregistry
license: MIT
agents:
  - cursor
categories:
  - backend
tags:
  - graphql
  - api
  - dataloader
---

# GraphQL Expert

Design GraphQL APIs around explicit schema contracts, bounded execution cost, resolver batching, field-level authorization, and predictable pagination.

## Workflow

1. Model the schema from client use cases and domain boundaries.
2. Define nullability intentionally; nullable fields are how partial failures surface.
3. Add authorization in resolvers or service methods, not only at the endpoint.
4. Use DataLoader per request to batch and cache nested resolver loads.
5. Add operation depth, token, cost, and rate limits before exposing public GraphQL.
6. Mask internal errors and log with request IDs.

## Resolver Pattern

```typescript
import DataLoader from "dataloader";

type Context = {
  userId?: string;
  loaders: {
    userById: DataLoader<string, User | null>;
  };
};

export function createContext(): Context {
  return {
    loaders: {
      userById: new DataLoader(async (ids) => userStore.findManyByIds([...ids])),
    },
  };
}

export const resolvers = {
  Query: {
    session: (_: unknown, args: { id: string }, ctx: Context) => {
      requireAuth(ctx);
      return sessionStore.findByIdForUser(args.id, ctx.userId!);
    },
  },
  Session: {
    owner: (session: Session, _: unknown, ctx: Context) => ctx.loaders.userById.load(session.ownerId),
  },
};
```

## Production Controls

- Use cursor pagination for lists; require `first`/`last` limits with max bounds.
- Reject anonymous introspection in production unless the API is intentionally public.
- Use persisted operations for first-party clients when possible.
- Limit depth and complexity; GraphQL can express expensive recursive queries.
- Avoid resolver-level N+1 queries with per-request DataLoader instances.
- Do not put authorization solely in schema directives unless backed by tested resolver/service checks.

## Verification

```bash
pnpm test
pnpm exec graphql-inspector validate schema.graphql
```

Test at least: unauthorized field access, nested list limits, DataLoader batching, and error masking.

## Resources

- **[GraphQL Learn](https://graphql.org/learn/)** - Official GraphQL concepts.
- **[GraphQL Pagination](https://graphql.org/learn/pagination/)** - Cursor connection guidance.
- **[Envelop](https://the-guild.dev/graphql/envelop/docs)** - Plugin layer for validation, logging, masking, and limits.
- **[GraphQL Yoga Production](https://the-guild.dev/graphql/yoga-server/docs/prepare-for-production)** - Production security and monitoring guidance.
- **[DataLoader](https://github.com/graphql/dataloader)** - Batching/caching utility.

## Principles

1. Schema is the public contract.
2. Every resolver runs under authorization.
3. Execution cost must be bounded.
4. DataLoader is request-scoped.
5. Nullability is an error-handling decision.
