# Contributing to SkillRegistry

## Development setup

1. Node.js 20+
2. `pnpm install`
3. `pnpm build`
4. `pnpm test`

## Adding a skill

1. Create `skills/<name>/SKILL.md` following [SKILL_SPEC.md](./SKILL_SPEC.md)
2. Run `npx skillreg scan skills/<name>`
3. Ensure score ≥ 50 and no critical issues
4. Open a PR — CI will scan all skills

## Pull requests

- Keep changes focused
- Add tests for new behavior
- Run `pnpm lint` and `pnpm test` before submitting

## Publishing packages

Maintainers publish to npm on version tags via GitHub Actions.
