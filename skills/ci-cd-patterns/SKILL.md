---
name: ci-cd-patterns
version: 1.0.0
description: CI/CD pipeline patterns for reliable deployments.
author: skillregistry
license: MIT
agents:
  - cursor
categories:
  - devops
tags:
  - devops
---

# CI/CD Patterns

Fail fast on lint and test. Deploy only from main with approvals.

## Principles

- Follow established conventions in the codebase
- Prefer small, focused changes
- Document non-obvious decisions

## Workflow

1. Understand the task and constraints
2. Plan before implementing
3. Verify with tests or manual checks
