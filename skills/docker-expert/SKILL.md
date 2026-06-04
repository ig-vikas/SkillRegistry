---
name: docker-expert
version: 1.0.0
description: Docker and containerization best practices for Node/TypeScript services, multi-stage builds, BuildKit cache/secrets, non-root runtime images, health checks, and image hardening.
author: skillregistry
license: MIT
agents:
  - cursor
  - codex
categories:
  - devops
  - cloud
tags:
  - docker
  - containers
  - buildkit
---

# Docker Expert

Create small, reproducible, secure runtime images. Use multi-stage builds, `.dockerignore`, pinned bases where appropriate, non-root users, and BuildKit features for cache and secrets.

## Workflow

1. Inspect runtime requirements and package manager.
2. Separate dependency install, build, and runtime stages.
3. Copy only built artifacts and production dependencies into the runtime image.
4. Run as a non-root user and set an explicit `WORKDIR`.
5. Add health check only when the service exposes a reliable health endpoint.
6. Build and scan the image in CI.

## Node/pnpm Dockerfile

```dockerfile
# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/package.json
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd --system app && useradd --system --gid app app
COPY --from=build --chown=app:app /app/packages/core/dist ./dist
COPY --from=build --chown=app:app /app/node_modules ./node_modules
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
```

`.dockerignore`:

```text
.git
node_modules
dist
coverage
.env
*.log
```

## Rules

- Prefer `COPY` over `ADD` unless extracting local tar archives or using `ADD` intentionally.
- Do not pass secrets with `ARG`; use BuildKit `--mount=type=secret`.
- Pin base images by digest for high-security production builds; schedule rebuilds for patches.
- Keep package install layers before source copy for cache reuse.
- Do not run production services as root.
- Do not include test fixtures, source maps, or build tools unless required.

## Verification

```bash
docker buildx build --target runtime -t agent-gateway:local .
docker run --rm -p 3000:3000 agent-gateway:local
docker history agent-gateway:local
docker scout cves agent-gateway:local
```

## Resources

- **[Dockerfile Best Practices](https://docs.docker.com/engine/userguide/eng-image/dockerfile_best-practices/)** - Official Docker guidance.
- **[Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)** - Build/runtime separation.
- **[Dockerfile Reference](https://docs.docker.com/reference/dockerfile/)** - BuildKit syntax and instruction behavior.
- **[Build Cache Optimization](https://docs.docker.com/build/cache/optimize/)** - Cache ordering and mounts.

## Principles

1. Final images contain runtime needs only.
2. Secrets never enter layers.
3. Non-root is the default.
4. Cache intentionally.
5. Rebuild regularly for patched bases.
