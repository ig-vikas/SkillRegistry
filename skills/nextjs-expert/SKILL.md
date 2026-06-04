---
name: nextjs-expert
version: 1.0.0
description: Next.js App Router development with React Server Components, Server Actions, route handlers, caching, streaming, metadata, security, testing, and deployment guidance.
author: skillregistry
license: MIT
agents:
  - cursor
  - claude-code
categories:
  - frontend
tags:
  - nextjs
  - react
  - app-router
---

# Next.js Expert

Build Next.js apps with App Router conventions: Server Components by default, Client Components only for browser state/effects/events, explicit caching, and secure route handlers/actions.

## Workflow

1. Inspect existing Next.js version and routing mode before editing.
2. Keep data fetching close to the route or server component that owns it.
3. Add `"use client"` only at the smallest interactive boundary.
4. Make caching explicit for dynamic data: `cache: "no-store"`, `revalidate`, `revalidatePath`, or `revalidateTag`.
5. Authenticate and authorize every Server Action and Route Handler.
6. Verify with typecheck, lint, tests, and a browser smoke test.

## Patterns

```tsx
// app/sessions/page.tsx - Server Component by default
export default async function SessionsPage() {
  const sessions = await getSessions();
  return <SessionList sessions={sessions} />;
}
```

```tsx
// app/sessions/actions.ts
"use server";

import { revalidatePath } from "next/cache";

export async function createSession(formData: FormData) {
  const user = await requireUser();
  await sessionService.create(user.id, String(formData.get("name") ?? ""));
  revalidatePath("/sessions");
}
```

```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({ ok: true });
}
```

## Rules

- Do not pass secrets or server-only objects to Client Components.
- Do not mutate data in Server Components; use Server Actions or Route Handlers.
- Do not rely on implicit cache behavior for user-specific data.
- Use Suspense/loading UI for slow server data.
- Use `next/image`, metadata APIs, and route segment config where they fit existing app patterns.
- Keep API routes for external clients/webhooks; use Server Actions for UI-driven mutations.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

For UI changes, run the app and check at least one desktop and mobile viewport.

## Resources

- **[Next.js App Router](https://nextjs.org/docs/app)** - Official App Router documentation.
- **[Next.js Caching](https://nextjs.org/docs/app/deep-dive/caching)** - Data, route, and router cache behavior.
- **[Server Actions and Mutations](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)** - Mutation model.
- **[Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)** - HTTP route APIs.
- **[React Server Components](https://react.dev/reference/rsc/server-components)** - RSC model.

## Principles

1. Server by default, client by exception.
2. Cache behavior must be explicit for dynamic data.
3. Server Actions are authenticated endpoints.
4. Small client boundaries keep bundles small.
5. Build output is the final compatibility check.
