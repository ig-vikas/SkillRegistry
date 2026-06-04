---
name: pnpm-monorepo
type: skill
description: pnpm workspace monorepo setup for AI agent gateway packages with catalogs, workspace protocol, shared configs, scripts, CI, and versioning.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [tooling, monorepo, node]
tags: [pnpm, workspaces, monorepo, catalogs, changesets, ci, typescript, packages]
---

# pnpm Monorepo Expert

Implement a maintainable pnpm workspace for the agent gateway: shared packages, strict dependency boundaries, reproducible installs, shared TypeScript/test config, and predictable release workflows.

pnpm is well-suited for local-first gateway development because its content-addressable store and workspace protocol make multi-package TypeScript projects fast and explicit.

## Architecture

```
repo/
  pnpm-workspace.yaml
  package.json
  packages/
    core/        -> AgentGateway
    http/        -> HTTP routes
    providers/   -> LLM provider adapters
    storage/     -> memory/vector stores
    ui/          -> control panel
```

## Core Components

| Component | Purpose | Technology/Implementation |
|-----------|---------|--------------------------|
| Workspace Manifest | Declare package globs and catalogs | `pnpm-workspace.yaml` |
| Root Package | Shared scripts and package manager pin | `package.json` |
| Internal Packages | Isolated gateway modules | `workspace:*` dependencies |
| Shared Config | TS/Vitest/ESLint defaults | `@skillregistry/config` |
| Versioning | Release and changelog automation | Changesets |
| CI | Reproducible install and filtered checks | `pnpm install --frozen-lockfile` |

## Setup & Installation

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm init
pnpm add -D typescript vitest tsx @types/node
```

## Configuration (Zod Schema)

```typescript
import { z } from "zod";

export const MonorepoConfigSchema = z.object({
  packageManager: z.string().regex(/^pnpm@\d+\.\d+\.\d+/).default("pnpm@10.0.0"),
  packages: z.array(z.string()).default(["packages/*", "apps/*"]),
  nodeVersion: z.string().default(">=20.11"),
  strictPeerDependencies: z.boolean().default(true),
  onlyBuiltDependencies: z.array(z.string()).default([]),
  catalogs: z.record(z.string()).default({
    typescript: "^5.9.0",
    vitest: "^4.0.0",
    zod: "^4.0.0",
  }),
});

export type MonorepoConfig = z.infer<typeof MonorepoConfigSchema>;
```

## Implementation

### Workspace Files

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
  - "apps/*"

catalog:
  typescript: ^5.9.0
  vitest: ^4.0.0
  zod: ^4.0.0
  tsx: ^4.20.0
```

```json
{
  "name": "agent-gateway-workspace",
  "private": true,
  "packageManager": "pnpm@10.0.0",
  "engines": { "node": ">=20.11" },
  "scripts": {
    "build": "pnpm -r --filter './packages/*' build",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "dev": "pnpm --filter @skillregistry/gateway dev"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "vitest": "catalog:",
    "tsx": "catalog:"
  }
}
```

### Internal Package

```json
{
  "name": "@skillregistry/providers",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "catalog:"
  }
}
```

### Shared TypeScript Config

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "sourceMap": true,
    "outDir": "dist",
    "skipLibCheck": true
  }
}
```

## Integration with Gateway

Use separate packages for core boundaries:

```typescript
import { AgentGateway } from "@skillregistry/core";
import { createExpressServer } from "@skillregistry/http";
import { ProviderRegistry } from "@skillregistry/providers";
```

## Best Practices

1. Use `workspace:*` for internal packages.
2. Put shared dependency versions in `catalog`.
3. Keep package `exports` explicit.
4. Run filtered commands during development.
5. Keep apps private; version libraries that may be published.
6. Commit `pnpm-lock.yaml`.
7. Use `--frozen-lockfile` in CI.

## Testing

### Unit Tests

```typescript
it("loads monorepo config defaults", () => {
  expect(MonorepoConfigSchema.parse({}).packages).toContain("packages/*");
});
```

### Integration Tests

```bash
pnpm install --frozen-lockfile
pnpm -r typecheck
pnpm -r test
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Internal package not found | Missing `workspace:*` dependency | Add dependency to consuming package |
| Duplicate dependency versions | Versions declared per package | Move versions to catalog |
| CI install fails | Lockfile not updated | Run `pnpm install` and commit lockfile |
| Build order wrong | Missing package dependency | Add internal dependency and use recursive build |
| Type imports fail | Missing `exports.types` | Add `types` and export map |

### Debug Commands

```bash
pnpm list -r --depth 0
pnpm why zod
pnpm --filter @skillregistry/providers test
pnpm -r exec pwd
```

## Resources

- **[pnpm Workspaces](https://pnpm.io/workspaces)** - Official workspace documentation.
- **[pnpm Workspace Manifest](https://pnpm.io/pnpm-workspace_yaml)** - `pnpm-workspace.yaml` reference.
- **[pnpm Catalogs](https://pnpm.io/catalogs)** - Centralized dependency versions.
- **[Changesets](https://github.com/changesets/changesets)** - Monorepo versioning.
- **[Node Package Exports](https://nodejs.org/api/packages.html#exports)** - Export map behavior.

## Principles

1. Dependency boundaries should be explicit.
2. Shared config should reduce drift, not hide behavior.
3. CI must use the lockfile.
4. Internal package APIs are still APIs.
5. Prefer filtered work over whole-repo work during development.
