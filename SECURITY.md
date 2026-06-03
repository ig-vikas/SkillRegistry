# Security Policy

## Reporting vulnerabilities

Please report security issues via GitHub Issues using the **Security Report** template. Do not open public issues for undisclosed vulnerabilities.

## Scanner limitations

The 8-point security scanner uses pattern matching and heuristics. It cannot guarantee a skill is safe. Always review skills before installing with `--force`.

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅        |

## Best practices

- Do not publish secrets in SKILL.md files
- Run `skillreg audit` periodically on installed skills
- Use `--force` only when you trust the skill source
