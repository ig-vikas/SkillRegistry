import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ParseError, SkillParseError, ValidationError } from '../errors.js';
import {
  extractFrontmatterOnly,
  parseSkillFile,
  parseSkillFromString,
  parseSkillMd,
  serializeSkillMd,
} from '../parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, 'fixtures', 'valid-skill', 'SKILL.md');

describe('parseSkillMd', () => {
  it('parses valid frontmatter and body', async () => {
    const raw = await readFile(fixturePath, 'utf8');
    const { frontmatter, body } = parseSkillMd(raw);
    expect(frontmatter.name).toBe('react-expert');
    expect(body).toContain('# React Expert');
  });

  it('throws on missing frontmatter', () => {
    expect(() => parseSkillMd('# No frontmatter')).toThrow(ParseError);
  });

  it('throws on unclosed frontmatter', () => {
    expect(() => parseSkillMd('---\nname: test')).toThrow(ParseError);
  });
});

describe('parseSkillFromString', () => {
  it('validates and returns manifest', async () => {
    const raw = await readFile(fixturePath, 'utf8');
    const manifest = parseSkillFromString(raw);
    expect(manifest.name).toBe('react-expert');
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.content).toContain('React Expert');
  });

  it('throws on missing required fields', () => {
    const raw = `---
name: bad-skill
version: 1.0.0
---
# Body
`;
    expect(() => parseSkillFromString(raw)).toThrow(ValidationError);
  });
});

describe('parseSkillFile', () => {
  it('parses valid SKILL.md with correct frontmatter', async () => {
    const manifest = await parseSkillFile(fixturePath);
    expect(manifest.name).toBe('react-expert');
    expect(manifest.agents).toEqual(['cursor', 'claude-code']);
  });

  it('throws SkillParseError on missing required fields', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'skillregistry-core-'));
    const path = join(dir, 'SKILL.md');
    await writeFile(path, '---\nname: incomplete\nversion: 1.0.0\n---\n# Body\n', 'utf8');
    await expect(parseSkillFile(path)).rejects.toThrow(SkillParseError);
  });

  it('throws SkillParseError on invalid YAML', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'skillregistry-core-'));
    const path = join(dir, 'SKILL.md');
    await writeFile(path, '---\nname: [unterminated\n---\n# Body\n', 'utf8');
    await expect(parseSkillFile(path)).rejects.toThrow(SkillParseError);
  });
});

describe('extractFrontmatterOnly', () => {
  it('returns skill metadata', async () => {
    const raw = await readFile(fixturePath, 'utf8');
    const skill = extractFrontmatterOnly(raw);
    expect(skill.agents).toContain('cursor');
  });
});

describe('serializeSkillMd', () => {
  it('round-trips manifest', async () => {
    const raw = await readFile(fixturePath, 'utf8');
    const manifest = parseSkillFromString(raw);
    const serialized = serializeSkillMd(manifest);
    const reparsed = parseSkillFromString(serialized);
    expect(reparsed.name).toBe(manifest.name);
    expect(reparsed.content.trim()).toBe(manifest.content.trim());
  });
});
