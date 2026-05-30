---
name: redis-patterns
version: 1.0.0
description: Redis caching, pub/sub, and data structure patterns.
author: skillregistry
license: MIT
agents:
  - cursor
categories:
  - database
  - backend
tags:
  - database
---

# Redis Patterns

Set TTL on cache keys. Use pipelines for bulk operations.

## Principles

- Follow established conventions in the codebase
- Prefer small, focused changes
- Document non-obvious decisions

## Workflow

1. Understand the task and constraints
2. Plan before implementing
3. Verify with tests or manual checks
