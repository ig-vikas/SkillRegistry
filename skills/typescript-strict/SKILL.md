---
name: typescript-strict
type: skill
description: Strict TypeScript configuration and runtime validation patterns for safe AI agent gateway code, including Zod schemas, type guards, exhaustive checks, and migration guidance.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [typescript, tooling, quality]
tags: [typescript, strict, zod, type-safety, validation, type-guards, migration]
---

# TypeScript Strict Expert

Enable strict TypeScript across gateway packages and pair compile-time types with runtime validation. Strict TypeScript catches local mistakes; Zod catches untrusted runtime data from HTTP, webhooks, config, providers, and storage.

Do not use `any` to escape uncertainty. Convert unknown input into validated domain types at the boundary.

## Architecture

```
Untrusted Input -> Zod Schema -> Typed Domain Object -> Strict TS Code
Provider Output -> Zod Schema -> Normalized Result -> Gateway
```

## Core Components

| Component | Purpose | Technology/Implementation |
|-----------|---------|--------------------------|
| tsconfig Base | Strict compiler defaults | `strict`, `noUncheckedIndexedAccess` |
| Runtime Schemas | Validate unknown data | Zod |
| Type Guards | Narrow dynamic values | Predicate functions |
| Exhaustive Checks | Prevent missing union branches | `never` checks |
| Migration Rules | Incremental adoption | package-by-package strictness |

## Setup & Installation

```bash
pnpm add zod
pnpm add -D typescript tsx @types/node
pnpm tsc --init
```

## Configuration (Zod Schema)

```typescript
import { z } from "zod";

export const TypeScriptStrictConfigSchema = z.object({
  strict: z.literal(true).default(true),
  noUncheckedIndexedAccess: z.boolean().default(true),
  exactOptionalPropertyTypes: z.boolean().default(true),
  noImplicitOverride: z.boolean().default(true),
  noFallthroughCasesInSwitch: z.boolean().default(true),
  noPropertyAccessFromIndexSignature: z.boolean().default(true),
  useUnknownInCatchVariables: z.boolean().default(true),
  skipLibCheck: z.boolean().default(true),
});
```

## Implementation

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "useUnknownInCatchVariables": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "declaration": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

### Type-Safe API Boundary

```typescript
import { z } from "zod";

export const GatewayMessageSchema = z.object({
  platform: z.enum(["telegram", "discord", "websocket", "http"]),
  channelId: z.string().min(1),
  senderId: z.string().min(1),
  messageId: z.string().min(1),
  text: z.string().min(1).max(100_000),
  timestamp: z.number().int().positive(),
});

export type GatewayMessage = z.infer<typeof GatewayMessageSchema>;

export function parseGatewayMessage(input: unknown): GatewayMessage {
  const parsed = GatewayMessageSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid gateway message: ${JSON.stringify(parsed.error.flatten())}`);
  }
  return parsed.data;
}
```

### Exhaustive Union Handling

```typescript
type StreamEvent =
  | { type: "text"; text: string }
  | { type: "usage"; inputTokens: number; outputTokens: number }
  | { type: "done" };

export function renderEvent(event: StreamEvent): string {
  switch (event.type) {
    case "text": return event.text;
    case "usage": return `[usage ${event.inputTokens}/${event.outputTokens}]`;
    case "done": return "";
    default: {
      const neverEvent: never = event;
      return neverEvent;
    }
  }
}
```

## Integration with Gateway

Validate config once during startup, then pass typed config through constructors:

```typescript
const config = GatewayConfigSchema.parse(loadConfigFile());
const gateway = new AgentGateway(config);
```

## Best Practices

1. Use `unknown` for untrusted data until parsed.
2. Prefer discriminated unions for events and provider responses.
3. Enable `noUncheckedIndexedAccess` for arrays/maps from dynamic data.
4. Use `satisfies` for config literals.
5. Avoid non-null assertions except at proven invariants with a comment.
6. Keep schema and type together using `z.infer`.
7. Convert provider-specific shapes into gateway domain types immediately.

## Testing

### Unit Tests

```typescript
it("rejects malformed gateway messages", () => {
  expect(() => parseGatewayMessage({ text: "missing ids" })).toThrow(/Invalid gateway message/);
});
```

### Integration Tests

```bash
pnpm tsc -p tsconfig.json --noEmit
pnpm vitest run
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Many `possibly undefined` errors | `noUncheckedIndexedAccess` enabled | Check index result before use |
| Optional property assignment errors | `exactOptionalPropertyTypes` | Omit property or include explicit `undefined` in type |
| Catch variable is unknown | `useUnknownInCatchVariables` | Narrow with `instanceof Error` |
| Module import errors | `NodeNext` requires extensions/exports | Align package `type`, exports, and imports |
| Zod schema diverges from type | Manual interface duplication | Use `z.infer` |

### Debug Commands

```bash
pnpm tsc --showConfig
pnpm tsc -p tsconfig.json --noEmit
pnpm typecheck
```

## Resources

- **[TypeScript TSConfig Reference](https://www.typescriptlang.org/tsconfig/)** - Compiler options reference.
- **[TypeScript Strict](https://www.typescriptlang.org/tsconfig/#strict)** - Strict mode umbrella option.
- **[Zod Documentation](https://zod.dev/)** - Runtime schema validation.
- **[Node TypeScript Packages](https://nodejs.org/api/packages.html)** - ESM and package exports.
- **[TypeScript Handbook Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)** - Type narrowing and guards.

## Principles

1. Unknown at the edge, typed inside.
2. Runtime validation completes compile-time checking.
3. Exhaustive unions prevent silent protocol drift.
4. Strict config should be shared and enforced in CI.
5. Types should express invariants, not hide uncertainty.
