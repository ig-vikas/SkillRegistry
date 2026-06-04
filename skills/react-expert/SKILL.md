---
name: react-expert
version: 1.0.0
description: React application development with components, hooks, state design, effects, accessibility, performance, React Compiler awareness, testing, and production debugging.
author: skillregistry
license: MIT
agents:
  - cursor
  - claude-code
categories:
  - frontend
tags:
  - react
  - frontend
  - hooks
---

# React Expert

Build React components that are simple, accessible, and predictable. Prefer clear data flow and state ownership over premature memoization.

## Workflow

1. Read existing component patterns and design system conventions.
2. Choose state ownership: local, lifted, URL, server/cache, or global store.
3. Keep rendering pure; put synchronization in effects only when necessary.
4. Use semantic HTML and accessible names for interactive UI.
5. Profile before adding manual memoization.
6. Test behavior from the user’s perspective.

## Patterns

```tsx
type SaveButtonProps = {
  pending: boolean;
  onSave: () => void;
};

export function SaveButton({ pending, onSave }: SaveButtonProps) {
  return (
    <button type="button" disabled={pending} onClick={onSave}>
      {pending ? "Saving" : "Save"}
    </button>
  );
}
```

```tsx
// Effects synchronize with external systems; avoid deriving render data in effects.
useEffect(() => {
  const unsubscribe = store.subscribe(forceUpdate);
  return unsubscribe;
}, [store]);
```

## Rules

- Do not call hooks conditionally.
- Do not mutate props or state.
- Avoid `useEffect` for values that can be derived during render.
- Use `useMemo`, `useCallback`, and `memo` only for measured needs or stable API contracts. React Compiler reduces the need for manual memoization when enabled.
- Keep Client Components small in Server Component frameworks.
- Prefer Testing Library queries by role/name.

## Verification

```bash
pnpm test
pnpm lint
pnpm build
```

For UI changes, inspect keyboard navigation, focus states, loading states, and mobile layout.

## Resources

- **[React Docs](https://react.dev/)** - Official React documentation.
- **[Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)** - Hook invariants.
- **[React Compiler](https://react.dev/learn/react-compiler)** - Automatic memoization model.
- **[React memo](https://react.dev/reference/react/memo)** - Manual memoization guidance.
- **[Testing Library](https://testing-library.com/docs/react-testing-library/intro/)** - User-focused tests.

## Principles

1. Components are pure render functions.
2. State belongs at the lowest useful owner.
3. Effects synchronize; they do not organize business logic.
4. Accessibility is part of component correctness.
5. Measure before optimizing.
