import { z } from 'zod';
import { MAX_CATEGORIES, MAX_DESCRIPTION_LENGTH } from './constants.js';
import { ValidationError } from './errors.js';
import type { Skill } from './types.js';

export const agentTypeSchema = z.enum([
  'claude-code',
  'cursor',
  'codex',
  'copilot',
  'gemini-cli',
  'openclaw',
  'windsurf',
]);

export const categorySchema = z.enum([
  'frontend',
  'backend',
  'security',
  'devops',
  'ai-ml',
  'database',
  'testing',
  'docs',
  'mobile',
  'cloud',
  'performance',
  'accessibility',
  'code-quality',
  'architecture',
]);

export const skillFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  type: z.enum(['example', 'doc', 'config', 'reference']),
});

export const skillFrontmatterSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'name must be kebab-case'),
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'version must be semver'),
  description: z.string().min(1).max(MAX_DESCRIPTION_LENGTH),
  author: z.string().min(1),
  license: z.string().min(1),
  agents: z.array(agentTypeSchema).min(1),
  categories: z.array(categorySchema).min(1).max(MAX_CATEGORIES),
  tags: z.array(z.string()).default([]),
  security_score: z.number().min(0).max(100).optional(),
  verified: z.boolean().optional(),
  downloads: z.number().int().nonnegative().optional(),
  repository: z.string().url().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const skillManifestSchema = skillFrontmatterSchema.extend({
  content: z.string(),
  files: z.array(skillFileSchema).default([]),
});

export const registryEntrySchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  author: z.string(),
  categories: z.array(categorySchema),
  agents: z.array(agentTypeSchema),
  security_score: z.number(),
  verified: z.boolean(),
  downloads: z.number(),
  checksum: z.string(),
});

export const registryIndexSchema = z.object({
  version: z.string(),
  updated_at: z.string(),
  skills: z.record(registryEntrySchema),
});

export const lockSkillEntrySchema = z.object({
  version: z.string(),
  resolved: z.string(),
  checksum: z.string(),
  security_score: z.number(),
  installed_agents: z.array(agentTypeSchema),
  installed_at: z.string(),
});

export const lockFileSchema = z.object({
  lockfileVersion: z.number(),
  skills: z.record(lockSkillEntrySchema),
});

export function validateSkill(skill: unknown): Skill {
  const result = skillFrontmatterSchema.safeParse(skill);
  if (!result.success) {
    const messages = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new ValidationError(`Invalid skill frontmatter: ${messages}`);
  }
  return result.data as Skill;
}

export type SkillFrontmatter = z.infer<typeof skillFrontmatterSchema>;
export type SkillFrontmatterInput = z.input<typeof skillFrontmatterSchema>;
export type SkillManifestInput = z.input<typeof skillManifestSchema>;
