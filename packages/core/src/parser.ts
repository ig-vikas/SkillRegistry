import { readFile } from 'node:fs/promises';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { ParseError, ValidationError } from './errors.js';
import { skillFrontmatterSchema, skillManifestSchema } from './schema.js';
import type { Skill, SkillManifest } from './types.js';

/**
 * Split SKILL.md into YAML frontmatter and markdown body.
 * @param raw - Raw SKILL.md content
 * @returns Parsed frontmatter object and body
 */
export function parseSkillMd(raw: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith('---')) {
    throw new ParseError('SKILL.md must start with YAML frontmatter (---)');
  }

  const endIndex = trimmed.indexOf('\n---', 3);
  if (endIndex === -1) {
    throw new ParseError('SKILL.md frontmatter is not closed with ---');
  }

  const yamlBlock = trimmed.slice(3, endIndex).trim();
  const body = trimmed.slice(endIndex + 4).replace(/^\n/, '');

  let frontmatter: Record<string, unknown>;
  try {
    const parsed: unknown = parseYaml(yamlBlock);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new ParseError('Frontmatter must be a YAML object');
    }
    frontmatter = parsed as Record<string, unknown>;
  } catch (err) {
    throw new ParseError('Invalid YAML frontmatter', {
      cause: err instanceof Error ? err : undefined,
    });
  }

  return { frontmatter, body };
}

/**
 * Parse and validate SKILL.md string into a manifest.
 * @param raw - Raw SKILL.md content
 * @returns Validated skill manifest
 */
export function parseSkillFromString(raw: string): SkillManifest {
  const { frontmatter, body } = parseSkillMd(raw);
  const result = skillManifestSchema.safeParse({
    ...frontmatter,
    content: body,
    files: [],
  });

  if (!result.success) {
    const messages = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new ValidationError(`Invalid skill manifest: ${messages}`);
  }

  return result.data as SkillManifest;
}

/**
 * Read and parse a SKILL.md file from disk.
 * @param filePath - Path to SKILL.md
 * @returns Validated skill manifest
 */
export async function parseSkillFile(filePath: string): Promise<SkillManifest> {
  const raw = await readFile(filePath, 'utf8');
  return parseSkillFromString(raw);
}

/**
 * Extract and validate frontmatter only (no body required in output).
 * @param raw - Raw SKILL.md content
 * @returns Validated skill metadata
 */
export function extractFrontmatterOnly(raw: string): Skill {
  const { frontmatter } = parseSkillMd(raw);
  const result = skillFrontmatterSchema.safeParse(frontmatter);

  if (!result.success) {
    const messages = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new ValidationError(`Invalid skill frontmatter: ${messages}`);
  }

  return result.data as Skill;
}

/**
 * Serialize a skill manifest back to SKILL.md format.
 * @param manifest - Skill manifest
 * @returns SKILL.md string
 */
export function serializeSkillMd(manifest: SkillManifest): string {
  const { content, files: _files, ...frontmatter } = manifest;
  void _files;
  const yaml = stringifyYaml(frontmatter).trimEnd();
  return `---\n${yaml}\n---\n\n${content}`;
}
