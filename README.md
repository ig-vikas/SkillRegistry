# SkillRegistry

**npm for AI agent skills** — discover, install, scan, and publish reusable skills for Cursor, Claude Code, Codex, Copilot, Gemini CLI, OpenClaw, and Windsurf.

## Features

- **Universal CLI** — `npx skillregistry add react-expert`
- **8-point security scanner** — blocks unsafe skills before install
- **Web registry** — browse, search, and review security reports
- **MCP server** — discover and install skills from inside your agent session
- **REST API** — powers the CLI and web UI

## Quick start

```bash
# Install a skill
npx skillregistry add react-expert

# Search the registry
npx skillregistry search security

# Scan a local skill
npx skillregistry scan ./skills/my-skill

# Initialize lock file
npx skillregistry init
```

## Comparison

| Feature                  | SkillRegistry            | npm          | Cursor rules |
| ------------------------ | ------------------------ | ------------ | ------------ |
| Security scanning        | 8 checks, blocks install | ❌           | ❌           |
| Multi-agent support      | 7 agents                 | N/A          | Cursor only  |
| Version locking          | ✅                       | ✅           | ❌           |
| MCP integration          | ✅                       | ❌           | ❌           |
| Open standard (SKILL.md) | ✅                       | package.json | ❌           |

## Monorepo

| Package                     | Description             |
| --------------------------- | ----------------------- |
| `@skillregistry/core`       | Types, schema, parser   |
| `@skillregistry/scanner`    | Security scanner engine |
| `@skillregistry/cli`        | CLI tool                |
| `@skillregistry/api`        | REST API (Hono.js)      |
| `@skillregistry/mcp-server` | MCP server              |
| `@skillregistry/web`        | Next.js registry site   |

## Development

```bash
pnpm install
pnpm build
pnpm test

# Generate registry.json from seed skills
pnpm generate:registry

# Run API
pnpm --filter @skillregistry/api dev

# Run web
pnpm --filter @skillregistry/web dev
```

## License

MIT
