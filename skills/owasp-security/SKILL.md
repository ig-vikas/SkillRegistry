---
name: owasp-security
version: 1.0.0
description: OWASP-aligned application security review and remediation for access control, cryptography, injection, insecure design, misconfiguration, vulnerable dependencies, auth, integrity, logging, SSRF, and secure coding controls.
author: skillregistry
license: MIT
agents:
  - cursor
  - claude-code
  - copilot
categories:
  - security
tags:
  - owasp
  - security
  - appsec
---

# OWASP Security

Use OWASP Top 10 as a risk checklist, not a complete security program. Prioritize concrete exploitability in the codebase and apply small, verifiable fixes.

## Workflow

1. Identify assets, trust boundaries, authentication, authorization, and data flows.
2. Check the OWASP Top 10 categories against the actual change or subsystem.
3. Prefer framework-supported controls over custom security code.
4. Patch the smallest viable control and add a regression test.
5. Review logs/errors to ensure secrets and stack traces are not exposed.
6. Document residual risk if a full fix needs product or architecture work.

## Checklist

- Broken access control: object-level and function-level authorization.
- Cryptographic failures: TLS, secret handling, password hashing, key rotation.
- Injection: parameterized queries, command execution controls, output encoding.
- Insecure design: missing abuse cases, approval gates, rate limits.
- Misconfiguration: CORS, security headers, default credentials, debug flags.
- Vulnerable components: dependency scanning and patch policy.
- Auth failures: token lifetime, MFA/session controls, credential stuffing protection.
- Integrity failures: CI/CD permissions, signed artifacts, trusted update paths.
- Logging/monitoring failures: security events and alertable failures.
- SSRF: URL allowlists, DNS/IP validation, metadata IP blocks.

## Verification

```bash
pnpm test
pnpm audit
docker scout cves <image>
```

Also run targeted tests: unauthorized access, invalid tokens, malicious input, SSRF URL attempts, and secret redaction.

## Resources

- **[OWASP Top 10 2021](https://owasp.org/Top10/)** - Current web application risk awareness list.
- **[OWASP Proactive Controls 2024](https://top10proactive.owasp.org/the-top-10/)** - Developer-focused secure coding controls.
- **[OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)** - Practical implementation guidance.
- **[OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)** - Verification standard for deeper reviews.

## Principles

1. Security controls must be testable.
2. Authorization is checked server-side, every time.
3. Validate input and encode output.
4. Secrets never belong in logs, clients, or images.
5. Secure defaults beat documentation warnings.
