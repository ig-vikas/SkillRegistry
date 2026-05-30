import { homedir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  compareVersions,
  expandHomePath,
  generateChecksum,
  hashContent,
  normalizeSkillName,
  slugify,
} from '../utils.js';
import {
  NotFoundError,
  SecurityBlockedError,
  SkillRegistryError,
  VersionMismatchError,
} from '../errors.js';

describe('slugify', () => {
  it('converts to kebab-case', () => {
    expect(slugify('React Expert')).toBe('react-expert');
    expect(slugify('  Foo_Bar  ')).toBe('foo-bar');
  });
});

describe('normalizeSkillName', () => {
  it('matches slugify', () => {
    expect(normalizeSkillName('My Skill')).toBe('my-skill');
  });
});

describe('compareVersions', () => {
  it('compares semver correctly', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
    expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });
});

describe('hashContent', () => {
  it('returns stable sha256 hex', () => {
    const a = hashContent('hello');
    const b = hashContent('hello');
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('differs for different content', () => {
    expect(hashContent('a')).not.toBe(hashContent('b'));
  });
});

describe('generateChecksum', () => {
  it('returns consistent SHA-256 for same input', () => {
    expect(generateChecksum('same')).toBe(generateChecksum('same'));
    expect(generateChecksum('same')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns different hash for different input', () => {
    expect(generateChecksum('one')).not.toBe(generateChecksum('two'));
  });
});

describe('compareVersions sorting', () => {
  it('correctly sorts semver array', () => {
    const versions = ['2.0.0', '1.0.1', '1.0.0', '1.10.0'];
    expect(versions.sort(compareVersions)).toEqual(['1.0.0', '1.0.1', '1.10.0', '2.0.0']);
  });
});

describe('expandHomePath', () => {
  it('expands leading home shorthand', () => {
    expect(expandHomePath('~')).toBe(homedir());
    expect(expandHomePath('~/skills')).toBe(`${homedir()}/skills`);
    expect(expandHomePath('/tmp/skills')).toBe('/tmp/skills');
  });
});

describe('errors', () => {
  it('sets error codes and extra report data', () => {
    expect(new SkillRegistryError('X', 'message').code).toBe('X');
    expect(new NotFoundError('missing').code).toBe('NOT_FOUND');
    expect(new VersionMismatchError('bad version').code).toBe('VERSION_MISMATCH');

    const blocked = new SecurityBlockedError('blocked', {
      score: 10,
      issues: [{ code: 'PROMPT_INJECTION', severity: 'critical' }],
    });
    expect(blocked.code).toBe('SECURITY_BLOCKED');
    expect(blocked.report.score).toBe(10);
  });
});
