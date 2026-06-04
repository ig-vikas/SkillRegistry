---
name: test-driven
version: 1.0.0
description: Test-driven and test-first development with Vitest, Testing Library, behavior-focused tests, fixtures, regression tests, mocks at boundaries, and red-green-refactor workflow.
author: skillregistry
license: MIT
agents:
  - cursor
  - claude-code
categories:
  - testing
  - code-quality
tags:
  - testing
  - tdd
  - vitest
---

# Test Driven

Use test-first when behavior is clear or a bug can be reproduced. The goal is not ceremony; it is a failing test that proves the problem and a passing test that protects the fix.

## Workflow

1. Write or identify a focused failing test.
2. Run it and confirm it fails for the expected reason.
3. Make the smallest implementation change.
4. Run the focused test until it passes.
5. Refactor while keeping tests green.
6. Run the broader relevant suite before finishing.

## Test Shape

```typescript
import { describe, expect, it, vi } from "vitest";

describe("refresh token rotation", () => {
  it("rejects reuse of a rotated refresh token", async () => {
    const issued = await service.issue(subject);
    await service.rotate(issued.refreshToken);
    await expect(service.rotate(issued.refreshToken)).rejects.toThrow(/replay/i);
  });
});
```

## Rules

- Test behavior, not private implementation details.
- Mock remote providers, clocks, randomness, and slow I/O at boundaries.
- Keep real validation schemas and pure domain logic in tests.
- Use regression tests for bugs.
- Prefer one clear assertion theme per test.
- Avoid snapshots for volatile LLM text or large DOM trees.

## Verification

```bash
pnpm vitest run path/to/file.test.ts
pnpm test
pnpm typecheck
```

## Resources

- **[Vitest](https://vitest.dev/)** - Test runner.
- **[Testing Library Guiding Principles](https://testing-library.com/docs/guiding-principles)** - User-centered test guidance.
- **[React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)** - React component testing.
- **[TestDouble TDD](https://testdouble.com/)** - Practical testing articles and patterns.

## Principles

1. Reproduce before fixing.
2. Red, green, refactor.
3. Behavior matters more than implementation shape.
4. Mocks belong at system boundaries.
5. Tests should make future refactors safer.
