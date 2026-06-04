---
name: github-actions
version: 1.0.0
description: GitHub Actions workflow design, secure permissions, pnpm/Node CI, caching, matrix builds, OIDC deploys, artifacts, reusable workflows, and action hardening.
author: skillregistry
license: MIT
agents:
  - cursor
  - copilot
categories:
  - devops
tags:
  - github-actions
  - ci
  - oidc
---

# GitHub Actions

Write workflows that are deterministic, least-privileged, and safe for pull requests. Treat workflow YAML as production code.

## Workflow

1. Choose events deliberately: `pull_request` for validation, `push` to protected branches for publish/deploy.
2. Set explicit `permissions` at workflow or job level.
3. Install with lockfile enforcement.
4. Cache package manager store, not secrets or generated artifacts with sensitive content.
5. Upload reports/artifacts with retention limits.
6. Use environment protection and OIDC for deploys.

## Node/pnpm CI

```yaml
name: ci

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test -- --run
      - run: pnpm build
```

## Deploy Rules

```yaml
permissions:
  contents: read
  id-token: write

environment: production
```

- Use cloud OIDC federation instead of stored cloud credentials.
- Never expose secrets to `pull_request_target` code from forks.
- Pin high-risk third-party actions to commit SHA when policy requires it.
- Restrict deploy jobs to protected branches and environments.

## Verification

```bash
gh workflow run ci.yml
gh run list --workflow ci.yml
gh run view --log
```

## Resources

- **[GitHub Actions Docs](https://docs.github.com/en/actions)** - Workflow syntax and platform behavior.
- **[Security Hardening for GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)** - Official security guidance.
- **[OIDC Deployments](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)** - Short-lived cloud credentials.
- **[setup-node](https://github.com/actions/setup-node)** - Node setup and pnpm cache support.

## Principles

1. Default workflow permissions are too broad unless set explicitly.
2. Fork PRs are untrusted.
3. CI should be reproducible from the lockfile.
4. Deploys need environment gates.
5. Logs are public enough to treat secrets as compromised if printed.
