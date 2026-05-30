import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractFrontmatterOnly, validateSkill } from '../index.js';
import { describe, expect, it } from 'vitest';
import { skillFrontmatterSchema } from '../schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsDir = join(__dirname, '..', '..', '..', '..', 'skills');

describe('skillFrontmatterSchema', () => {
  const valid = {
    name: 'test-skill',
    version: '1.0.0',
    description: 'A test skill',
    author: 'dev',
    license: 'MIT',
    agents: ['cursor'] as const,
    categories: ['frontend'] as const,
    tags: [],
  };

  it('accepts valid frontmatter', () => {
    const result = skillFrontmatterSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects invalid agent', () => {
    const result = skillFrontmatterSchema.safeParse({
      ...valid,
      agents: ['unknown-agent'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects description over 200 chars', () => {
    const result = skillFrontmatterSchema.safeParse({
      ...valid,
      description: 'x'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 5 categories', () => {
    const result = skillFrontmatterSchema.safeParse({
      ...valid,
      categories: [
        'frontend',
        'backend',
        'security',
        'devops',
        'ai-ml',
        'database',
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-kebab-case name', () => {
    const result = skillFrontmatterSchema.safeParse({
      ...valid,
      name: 'Bad_Name',
    });
    expect(result.success).toBe(false);
  });

  it('passes all seed skills in skills/ directory', async () => {
    const entries = await readdir(skillsDir, { withFileTypes: true });
    const skillDirs = entries.filter((entry) => entry.isDirectory());
    expect(skillDirs.length).toBeGreaterThan(0);

    for (const dir of skillDirs) {
      const raw = await readFile(join(skillsDir, dir.name, 'SKILL.md'), 'utf8');
      expect(() => validateSkill(extractFrontmatterOnly(raw))).not.toThrow();
    }
  });

  it('rejects unknown agent type', () => {
    expect(() => validateSkill({ ...valid, agents: ['unknown-agent'] })).toThrow();
  });

  it('rejects invalid semver', () => {
    expect(() => validateSkill({ ...valid, version: 'latest' })).toThrow();
  });

  it('rejects name with spaces or uppercase', () => {
    expect(() => validateSkill({ ...valid, name: 'Bad Skill' })).toThrow();
  });
});
