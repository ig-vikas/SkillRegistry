---
name: docker-expert
version: 1.0.0
description: Dockerfile best practices and multi-stage builds.
author: skillregistry
license: MIT
agents:
  - cursor
  - codex
categories:
  - devops
  - cloud
tags:
  - devops
---

# Docker Expert

Use non-root users, minimal base images, and .dockerignore.

## Principles

- Follow established conventions in the codebase
- Prefer small, focused changes
- Document non-obvious decisions

## Workflow

1. Understand the task and constraints
2. Plan before implementing
3. Verify with tests or manual checks
