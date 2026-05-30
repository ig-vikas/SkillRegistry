import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import inquirer from 'inquirer';
import { slugify } from '@skillregistry/core';
import { success } from '../utils/display.js';

export interface CreateOptions {
  cwd?: string;
  noInteractive?: boolean;
}

interface CreateAnswers {
  description: string;
  author: string;
  agents: string[];
  categories: string[];
}

/**
 * Scaffold a new skill directory.
 * @param name - Skill name
 * @param options - Create options
 */
export async function runCreate(name: string, options?: CreateOptions): Promise<void> {
  const base = options?.cwd ?? process.cwd();
  const slug = slugify(name);

  const answers: CreateAnswers = options?.noInteractive
    ? {
        description: `Expert guidance for ${slug}`,
        author: 'your-username',
        agents: ['cursor'],
        categories: ['code-quality'],
      }
    : await inquirer.prompt<CreateAnswers>([
        {
          type: 'input',
          name: 'description',
          message: 'Description (max 200 chars):',
          default: `Expert guidance for ${slug}`,
        },
        {
          type: 'input',
          name: 'author',
          message: 'Author (GitHub username):',
          default: 'your-username',
        },
        {
          type: 'checkbox',
          name: 'agents',
          message: 'Target agents:',
          choices: ['cursor', 'claude-code', 'codex', 'copilot', 'gemini-cli', 'openclaw', 'windsurf'],
          default: ['cursor'],
        },
        {
          type: 'checkbox',
          name: 'categories',
          message: 'Categories:',
          choices: ['frontend', 'backend', 'security', 'devops', 'ai-ml', 'code-quality'],
          default: ['code-quality'],
        },
      ]);

  const skillDir = join(base, slug);
  await mkdir(skillDir, { recursive: true });

  const content = `---
name: ${slug}
version: 1.0.0
description: ${answers.description.slice(0, 200)}
author: ${answers.author}
license: MIT
agents:
${answers.agents.map((a) => `  - ${a}`).join('\n')}
categories:
${answers.categories.map((c) => `  - ${c}`).join('\n')}
tags: []
---

# ${name}

Describe what this skill teaches the AI agent.

## Guidelines

- Add domain-specific rules and patterns
- Include examples where helpful
`;

  await writeFile(join(skillDir, 'SKILL.md'), content, 'utf8');
  success(`Created skill at ${skillDir}/SKILL.md`);
}
