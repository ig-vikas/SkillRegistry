---
name: vue-master
version: 1.0.0
description: Vue 3 application development with Composition API, script setup, TypeScript props/emits, Pinia, reactivity, component design, testing, and performance patterns.
author: skillregistry
license: MIT
agents:
  - cursor
  - codex
categories:
  - frontend
tags:
  - vue
  - frontend
  - pinia
---

# Vue Master

Build Vue 3 components with `<script setup>`, Composition API, strong prop/event typing, focused stores, and predictable reactivity.

## Workflow

1. Inspect whether the project uses Options API, Composition API, Nuxt, or plain Vue.
2. Match existing component and store conventions.
3. Use `<script setup lang="ts">` for new Vue 3 SFCs unless the project uses another pattern.
4. Keep props immutable and emit events for parent-owned changes.
5. Use Pinia for shared application state, not for every local component field.
6. Test component behavior through rendered output and user events.

## Component Pattern

```vue
<script setup lang="ts">
const props = defineProps<{
  title: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  save: [value: string]
}>()
</script>

<template>
  <button type="button" :disabled="props.disabled" @click="emit('save', props.title)">
    {{ props.title }}
  </button>
</template>
```

## Rules

- Use `ref` for primitives and replacement, `reactive` for cohesive objects.
- Use `computed` for derived state instead of watchers.
- Use watchers for side effects and external synchronization.
- Destructure props carefully; Vue 3.5+ supports reactive destructured props, but older versions do not.
- Use `storeToRefs` when destructuring Pinia state/getters.
- Keep composables framework-focused and side-effect-aware.

## Verification

```bash
pnpm test
pnpm typecheck
pnpm build
```

## Resources

- **[Vue 3 Docs](https://vuejs.org/)** - Official Vue documentation.
- **[script setup](https://vuejs.org/api/sfc-script-setup.html)** - SFC compile-time API.
- **[Vue Reactivity Core](https://vuejs.org/api/reactivity-core.html)** - `ref`, `reactive`, `computed`, watchers.
- **[Pinia](https://pinia.vuejs.org/)** - Official Vue store library.
- **[Vue Test Utils](https://test-utils.vuejs.org/)** - Component testing.

## Principles

1. Reactivity should be explicit.
2. Props down, events up.
3. Stores are shared state, not dumping grounds.
4. Computed state beats watcher-maintained duplicates.
5. Version-specific Vue behavior matters.
