---
name: a11y-audit
version: 1.0.0
description: WCAG 2.2 accessibility audit and remediation guidance for frontend code, UI reviews, keyboard/focus testing, ARIA usage, contrast, forms, and regression checks.
author: skillregistry
license: MIT
agents:
  - cursor
  - claude-code
categories:
  - accessibility
  - frontend
tags:
  - accessibility
  - wcag
  - aria
  - testing
---

# Accessibility Audit

Audit and fix user-facing interfaces against WCAG 2.2 AA unless the user specifies another target. Prioritize defects that block keyboard, screen reader, low-vision, motor, or cognitive access before visual polish.

## Workflow

1. Identify the user flows and components under review.
2. Inspect semantic HTML first: headings, landmarks, labels, buttons, links, form errors, tables, dialogs, and live regions.
3. Verify keyboard behavior: logical tab order, visible focus, escape/close behavior, no traps, and roving tabindex only for composite widgets.
4. Check WCAG 2.2 AA visual requirements: text contrast, non-text contrast, focus visible, target size minimum, reflow, spacing, and reduced motion.
5. Test with tooling and manual checks. Use automated tools for coverage, not as proof of accessibility.
6. Patch the smallest set of components/styles needed and add regression tests where the project supports them.

## Implementation Patterns

```tsx
// Dialogs: trap focus, expose name, and restore focus after close.
<div role="dialog" aria-modal="true" aria-labelledby="settings-title">
  <h2 id="settings-title">Settings</h2>
  <button type="button" aria-label="Close settings" onClick={onClose}>×</button>
</div>
```

```css
/* Preserve visible focus; do not remove outline globally. */
:focus-visible {
  outline: 3px solid CanvasText;
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
}
```

## Checks

- Use native controls before ARIA. A real `<button>` is better than `role="button"`.
- Every input has a programmatic label and errors are linked with `aria-describedby`.
- Icon-only controls have accessible names.
- Status updates use `aria-live` only when asynchronous feedback matters.
- Text contrast is at least 4.5:1 for normal text and 3:1 for large text.
- Interactive targets meet WCAG 2.2 target size guidance or have sufficient spacing.
- Focus order matches visual and task order.
- Content works at 200% zoom and narrow viewport without two-axis scrolling.

## Verification

```bash
# Common project-level checks when available
pnpm test
pnpm exec playwright test
pnpm exec axe http://localhost:3000
```

Manual checks still required: keyboard-only navigation, screen reader smoke test, focus visibility, zoom/reflow, and reduced-motion behavior.

## Resources

- **[WCAG 2.2](https://www.w3.org/TR/WCAG22/)** - Current W3C accessibility success criteria.
- **[WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)** - Accessible widget patterns.
- **[axe-core](https://github.com/dequelabs/axe-core)** - Automated accessibility testing engine.
- **[Testing Library Accessibility](https://testing-library.com/docs/queries/about/#priority)** - Query priority based on accessible interactions.

## Principles

1. Native semantics first.
2. Keyboard access is non-negotiable.
3. ARIA fixes semantics; it does not add behavior.
4. Automated tests find issues, manual checks confirm usability.
5. Accessibility regressions are product regressions.
