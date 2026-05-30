import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsDir = join(__dirname, '..', 'skills');

const SEEDS: Array<{
  name: string;
  description: string;
  categories: string[];
  agents: string[];
  title: string;
  body: string;
}> = [
  {
    name: 'react-expert',
    description: 'Expert React patterns, hooks, and performance optimization.',
    categories: ['frontend'],
    agents: ['cursor', 'claude-code'],
    title: 'React Expert',
    body: 'Use functional components, colocate state, prefer composition over inheritance.',
  },
  {
    name: 'nextjs-expert',
    description: 'Next.js App Router, RSC, and deployment best practices.',
    categories: ['frontend'],
    agents: ['cursor', 'claude-code'],
    title: 'Next.js Expert',
    body: 'Prefer Server Components by default. Use client components only for interactivity.',
  },
  {
    name: 'vue-master',
    description: 'Vue 3 Composition API, Pinia, and component design.',
    categories: ['frontend'],
    agents: ['cursor', 'codex'],
    title: 'Vue Master',
    body: 'Use script setup, defineProps with TypeScript, and keep stores focused.',
  },
  {
    name: 'tailwind-pro',
    description: 'Tailwind CSS utility patterns and design system setup.',
    categories: ['frontend'],
    agents: ['cursor', 'windsurf'],
    title: 'Tailwind Pro',
    body: 'Use cn() for class merging. Prefer design tokens over arbitrary values.',
  },
  {
    name: 'a11y-audit',
    description: 'WCAG 2.1 accessibility audits and remediation guidance.',
    categories: ['accessibility', 'frontend'],
    agents: ['cursor', 'claude-code'],
    title: 'Accessibility Audit',
    body: 'Check color contrast, keyboard navigation, ARIA labels, and focus management.',
  },
  {
    name: 'postgres-expert',
    description: 'PostgreSQL query optimization, indexing, and schema design.',
    categories: ['database', 'backend'],
    agents: ['cursor', 'claude-code'],
    title: 'PostgreSQL Expert',
    body: 'Use EXPLAIN ANALYZE. Index foreign keys. Avoid SELECT * in production.',
  },
  {
    name: 'redis-patterns',
    description: 'Redis caching, pub/sub, and data structure patterns.',
    categories: ['database', 'backend'],
    agents: ['cursor'],
    title: 'Redis Patterns',
    body: 'Set TTL on cache keys. Use pipelines for bulk operations.',
  },
  {
    name: 'api-design',
    description: 'REST API design, versioning, and OpenAPI documentation.',
    categories: ['backend', 'architecture'],
    agents: ['cursor', 'codex'],
    title: 'API Design',
    body: 'Use consistent envelopes, proper HTTP status codes, and idempotent mutations.',
  },
  {
    name: 'graphql-expert',
    description: 'GraphQL schema design, resolvers, and N+1 prevention.',
    categories: ['backend'],
    agents: ['cursor'],
    title: 'GraphQL Expert',
    body: 'Use DataLoader for batching. Validate inputs with custom scalars.',
  },
  {
    name: 'owasp-security',
    description: 'OWASP Top 10 vulnerabilities and secure coding practices.',
    categories: ['security'],
    agents: ['cursor', 'claude-code', 'copilot'],
    title: 'OWASP Security',
    body: 'Prevent injection, broken auth, XSS, and insecure deserialization.',
  },
  {
    name: 'jwt-hardening',
    description: 'JWT authentication hardening and token lifecycle management.',
    categories: ['security', 'backend'],
    agents: ['cursor'],
    title: 'JWT Hardening',
    body: 'Use short-lived access tokens, rotate refresh tokens, validate alg header.',
  },
  {
    name: 'input-validation',
    description: 'Input validation with Zod and sanitization strategies.',
    categories: ['security', 'backend'],
    agents: ['cursor', 'claude-code'],
    title: 'Input Validation',
    body: 'Validate at API boundaries. Never trust client input.',
  },
  {
    name: 'docker-expert',
    description: 'Dockerfile best practices and multi-stage builds.',
    categories: ['devops', 'cloud'],
    agents: ['cursor', 'codex'],
    title: 'Docker Expert',
    body: 'Use non-root users, minimal base images, and .dockerignore.',
  },
  {
    name: 'github-actions',
    description: 'GitHub Actions CI/CD workflows and reusable actions.',
    categories: ['devops'],
    agents: ['cursor', 'copilot'],
    title: 'GitHub Actions',
    body: 'Cache dependencies. Use matrix builds. Pin action versions.',
  },
  {
    name: 'ci-cd-patterns',
    description: 'CI/CD pipeline patterns for reliable deployments.',
    categories: ['devops'],
    agents: ['cursor'],
    title: 'CI/CD Patterns',
    body: 'Fail fast on lint and test. Deploy only from main with approvals.',
  },
  {
    name: 'mcp-builder',
    description: 'Build MCP servers with the Model Context Protocol SDK.',
    categories: ['ai-ml'],
    agents: ['cursor', 'claude-code'],
    title: 'MCP Builder',
    body: 'Expose tools with Zod schemas. Use stdio transport for local agents.',
  },
  {
    name: 'prompt-engineer',
    description: 'Prompt engineering techniques for reliable LLM outputs.',
    categories: ['ai-ml'],
    agents: ['cursor', 'claude-code', 'gemini-cli'],
    title: 'Prompt Engineer',
    body: 'Be specific, provide examples, chain-of-thought for complex tasks.',
  },
  {
    name: 'rag-patterns',
    description: 'RAG architecture, chunking, and retrieval optimization.',
    categories: ['ai-ml', 'database'],
    agents: ['cursor'],
    title: 'RAG Patterns',
    body: 'Chunk by semantic boundaries. Rerank results. Cite sources in answers.',
  },
  {
    name: 'test-driven',
    description: 'Test-driven development with Vitest and Testing Library.',
    categories: ['testing', 'code-quality'],
    agents: ['cursor', 'claude-code'],
    title: 'Test Driven',
    body: 'Red-green-refactor. Test behavior not implementation. Mock at boundaries.',
  },
  {
    name: 'refactor-expert',
    description: 'Safe refactoring patterns and code smell remediation.',
    categories: ['code-quality'],
    agents: ['cursor', 'windsurf'],
    title: 'Refactor Expert',
    body: 'Small commits, keep tests green, extract until names read like prose.',
  },
];

async function main() {
  for (const seed of SEEDS) {
    const dir = join(skillsDir, seed.name);
    await mkdir(dir, { recursive: true });
    const content = `---
name: ${seed.name}
version: 1.0.0
description: ${seed.description}
author: skillregistry
license: MIT
agents:
${seed.agents.map((a) => `  - ${a}`).join('\n')}
categories:
${seed.categories.map((c) => `  - ${c}`).join('\n')}
tags:
  - ${seed.categories[0]}
---

# ${seed.title}

${seed.body}

## Principles

- Follow established conventions in the codebase
- Prefer small, focused changes
- Document non-obvious decisions

## Workflow

1. Understand the task and constraints
2. Plan before implementing
3. Verify with tests or manual checks
`;
    await writeFile(join(dir, 'SKILL.md'), content, 'utf8');
    console.log(`Created ${seed.name}`);
  }
}

main().catch(console.error);
