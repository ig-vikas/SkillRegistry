---
name: refactor-expert
version: 1.0.0
description: Safe behavior-preserving refactoring guidance for code cleanup, decomposition, dependency boundaries, test-backed migrations, and code smell remediation.
author: skillregistry
license: MIT
agents:
  - cursor
  - windsurf
categories:
  - code-quality
tags:
  - refactoring
  - code-quality
---

# Refactor Expert

Refactor by making small, behavior-preserving changes with verification after each meaningful step. Do not mix refactoring with feature changes unless the user explicitly asks for both.

## Workflow

1. Identify the behavior that must remain unchanged.
2. Find the smallest useful refactoring: rename, extract function, move function, inline, split module, or remove duplication.
3. Run or add characterization tests before changing risky code.
4. Make one scoped transformation.
5. Run the relevant tests/typecheck.
6. Repeat only while the refactor directly supports the task.

## Safe Patterns

- Rename for clarity when names hide domain meaning.
- Extract functions when a block has one coherent purpose.
- Inline abstractions that no longer reduce complexity.
- Move code toward the data or module that owns the behavior.
- Replace conditionals with lookup tables only when it simplifies change.
- Break dependency cycles at module boundaries, not by adding global state.

## Rules

- Do not reformat unrelated code.
- Do not change public APIs unless the user requested a migration.
- Do not remove tests during refactors.
- Preserve error behavior unless the task is explicitly to change it.
- Commit-sized patches are easier to review than broad rewrites.

## Verification

```bash
pnpm test
pnpm typecheck
```

For untested legacy code, add characterization tests around the behavior you touch before changing structure.

## Resources

- **[Refactoring by Martin Fowler](https://www.martinfowler.com/books/refactoring.html)** - Core refactoring process and catalog.
- **[Refactoring Catalog](https://refactoring.com/catalog/)** - Named refactoring operations.
- **[Testing Library Principles](https://testing-library.com/docs/guiding-principles)** - Behavior-focused regression tests.

## Principles

1. Refactoring preserves behavior.
2. Small steps lower risk.
3. Tests are the safety rail.
4. Clarity beats clever abstractions.
5. Stop when the task is easier to complete and review.
