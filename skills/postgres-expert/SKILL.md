---
name: postgres-expert
version: 1.0.0
description: PostgreSQL query optimization, indexing, and schema design.
author: skillregistry
license: MIT
agents:
  - cursor
  - claude-code
categories:
  - database
  - backend
tags:
  - database
---

# PostgreSQL Expert

Use EXPLAIN ANALYZE. Index foreign keys. Avoid SELECT \* in production.

## Principles

- Follow established conventions in the codebase
- Prefer small, focused changes
- Document non-obvious decisions

## Workflow

1. Understand the task and constraints
2. Plan before implementing
3. Verify with tests or manual checks
