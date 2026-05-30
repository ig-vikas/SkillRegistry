# SKILL.md Specification

SkillRegistry skills are defined by a `SKILL.md` file with YAML frontmatter and a Markdown body.

## File layout

```
my-skill/
├── SKILL.md          # Required
├── examples/         # Optional
└── references/       # Optional
```

## Frontmatter (required)

```yaml
---
name: my-skill              # kebab-case, unique
version: 1.0.0              # semver
description: Short summary  # max 200 characters
author: github-username
license: MIT                # SPDX identifier
agents:                     # at least one
  - cursor
  - claude-code
categories:                 # 1-5 categories
  - frontend
tags: []                   # free-form
---
```

## Supported agents

`claude-code`, `cursor`, `codex`, `copilot`, `gemini-cli`, `openclaw`, `windsurf`

## Categories

`frontend`, `backend`, `security`, `devops`, `ai-ml`, `database`, `testing`, `docs`, `mobile`, `cloud`, `performance`, `accessibility`, `code-quality`, `architecture`

## Security requirements

All published skills are scanned by the 8-point SkillRegistry security scanner. Skills with critical issues or score below 30 are blocked.

## Publishing checklist

- [ ] Valid frontmatter per this spec
- [ ] Security scan score ≥ 50
- [ ] No critical issues
- [ ] Tested with target agents
- [ ] Clear, actionable guidance in the body
