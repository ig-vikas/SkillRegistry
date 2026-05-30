---
name: jwt-hardening
version: 1.0.0
description: JWT authentication hardening and token lifecycle management.
author: skillregistry
license: MIT
agents:
  - cursor
categories:
  - security
  - backend
tags:
  - security
---

# JWT Hardening

Use short-lived access tokens, rotate refresh tokens, validate alg header.

## Principles

- Follow established conventions in the codebase
- Prefer small, focused changes
- Document non-obvious decisions

## Workflow

1. Understand the task and constraints
2. Plan before implementing
3. Verify with tests or manual checks
