---
name: tailwind-pro
version: 1.0.0
description: Tailwind CSS v4 utility and design-system guidance, theme variables, responsive layouts, class composition, accessibility, component variants, and migration-aware styling.
author: skillregistry
license: MIT
agents:
  - cursor
  - windsurf
categories:
  - frontend
tags:
  - tailwind
  - css
  - design-system
---

# Tailwind Pro

Use Tailwind as a utility API over design tokens. Prefer theme variables and reusable component variants over scattered arbitrary values.

## Workflow

1. Inspect the existing Tailwind version and styling conventions.
2. Reuse design tokens before adding new colors, spacing, or radius values.
3. In Tailwind v4, define new tokens with CSS `@theme` variables.
4. Use class composition helpers such as `clsx` plus `tailwind-merge` for variants.
5. Keep accessibility states visible: focus, disabled, hover, active, reduced motion.
6. Verify responsive layouts at realistic viewport widths.

## Tailwind v4 Theme Pattern

```css
@import "tailwindcss";

@theme {
  --color-surface: oklch(0.98 0.01 250);
  --color-accent: oklch(0.62 0.18 250);
  --radius-control: 0.375rem;
}
```

```tsx
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return twMerge(clsx(inputs));
}
```

## Rules

- Prefer semantic component props over exposing raw class strings everywhere.
- Avoid arbitrary values when a token should exist.
- Keep focus-visible styles explicit.
- Use container/responsive utilities based on layout needs, not device assumptions.
- Do not hide content from assistive tech with CSS unless intentionally decorative.
- Avoid large `@apply` layers for component systems; components are usually clearer.

## Verification

```bash
pnpm build
pnpm test
```

Inspect desktop/mobile screenshots and interactive states after styling changes.

## Resources

- **[Tailwind CSS Docs](https://tailwindcss.com/docs)** - Official utility reference.
- **[Tailwind Theme Variables](https://tailwindcss.com/docs/customizing-spacing)** - v4 token model.
- **[Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4)** - v4 architecture and migration context.
- **[tailwind-merge](https://github.com/dcastil/tailwind-merge)** - Conflict-aware class merging.

## Principles

1. Tokens first, utilities second.
2. Responsive design is content-driven.
3. State styles are part of the component.
4. Class composition should be deterministic.
5. Styling changes need visual verification.
