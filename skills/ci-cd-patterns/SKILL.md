---
name: ci-cd-patterns
version: 1.0.0
description: CI/CD pipeline patterns for reliable builds, tests, artifacts, deployments, environment promotion, supply-chain security, and rollback-safe delivery.
author: skillregistry
license: MIT
agents:
  - cursor
categories:
  - devops
tags:
  - devops
  - ci
  - cd
---

# CI/CD Patterns

Build pipelines that prove a change is safe before release and make deployment reversible. Keep CI deterministic, fast, and least-privileged.

## Workflow

1. Identify required quality gates: format, lint, typecheck, tests, build, image scan, contract tests.
2. Run fast checks first and avoid deployment work on untrusted pull requests.
3. Build immutable artifacts once; promote the same artifact across environments.
4. Use environment-scoped secrets and approvals for production.
5. Publish test reports, coverage, SBOM/provenance, and deployment metadata.
6. Define rollback before deploying.

## Pipeline Shape

```text
pull_request:
  install -> lint -> typecheck -> unit tests -> build

main:
  install -> full test -> build artifact/image -> scan -> publish -> deploy staging

release:
  promote known artifact -> deploy prod -> smoke test -> monitor -> rollback if needed
```

## Production Rules

- Use lockfile-based installs: `pnpm install --frozen-lockfile`.
- Cache package stores, not `node_modules`, unless the platform explicitly supports it safely.
- Give jobs explicit permissions; default to read-only.
- Use OIDC federation for cloud deploys instead of long-lived cloud keys.
- Pin third-party actions/images by version or digest according to risk policy.
- Never deploy from unreviewed fork PR contexts.
- Keep secrets out of logs and build arguments.

## Example Commands

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test -- --run
pnpm build
docker buildx build --provenance=true --sbom=true .
```

## Verification

- Confirm CI fails on type errors and test failures.
- Confirm production deploy requires protected branch/environment.
- Confirm artifact digest is the same across staging and production.
- Confirm rollback command works from a clean terminal.

## Resources

- **[GitHub Actions Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)** - Official workflow security guidance.
- **[GitHub OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)** - Cloud auth without long-lived secrets.
- **[SLSA](https://slsa.dev/)** - Supply-chain integrity framework.
- **[Docker Build CI](https://docs.docker.com/build/ci/)** - Buildx CI patterns.

## Principles

1. CI proves; CD promotes.
2. Build once, deploy many.
3. Least privilege for every job.
4. Rollback is part of delivery.
5. Reproducibility beats clever caching.
