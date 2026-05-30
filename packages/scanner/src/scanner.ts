import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { extractFrontmatterOnly } from '@skillregistry/core';
import type { Skill, SecurityReport, SkillManifest } from '@skillregistry/core';
import checkDangerousCommands from './checks/dangerous-commands.js';
import checkDataExfiltration from './checks/data-exfiltration.js';
import checkExternalFetches from './checks/external-fetches.js';
import checkObfuscation from './checks/obfuscation.js';
import type { CheckFunction } from './checks/prompt-injection.js';
import checkPromptInjection from './checks/prompt-injection.js';
import checkPrivilegeEscalation from './checks/privilege-escalation.js';
import checkSchemaValidation from './checks/schema-validation.js';
import checkSecretDetection from './checks/secret-detection.js';
import { dedupeIssues } from './checks/utils.js';
import { calculateScore, isBlocked, passed } from './scoring.js';

const CHECKS: CheckFunction[] = [
  checkSchemaValidation,
  checkPromptInjection,
  checkDataExfiltration,
  checkSecretDetection,
  checkDangerousCommands,
  checkObfuscation,
  checkPrivilegeEscalation,
  checkExternalFetches,
];

const FALLBACK_METADATA: Skill = {
  name: 'scan-preview',
  version: '0.0.0',
  description: 'preview',
  author: 'anonymous',
  license: 'MIT',
  agents: ['cursor'],
  categories: ['code-quality'],
  tags: [],
};

/**
 * Run all security checks on skill content.
 * @param content - Full SKILL.md or body content
 * @param metadata - Skill frontmatter metadata
 * @returns Security report
 */
export function scanSkill(content: string, metadata?: Skill): SecurityReport {
  const skill = metadata ?? readMetadata(content);
  const allIssues = CHECKS.flatMap((check) => check(content, skill));
  const issues = dedupeIssues(allIssues);
  const score = calculateScore(issues);
  const blocked = isBlocked(issues, score);

  return {
    skill_name: skill.name,
    score,
    passed: passed(score),
    blocked,
    issues,
    scanned_at: new Date().toISOString(),
  };
}

function readMetadata(content: string): Skill {
  try {
    return extractFrontmatterOnly(content);
  } catch {
    return FALLBACK_METADATA;
  }
}

/**
 * Scan a full skill manifest.
 * @param manifest - Skill manifest
 * @returns Security report
 */
export function scanManifest(manifest: SkillManifest): SecurityReport {
  const fullContent = `${manifest.content}\n${manifest.files.map((f) => f.content).join('\n')}`;
  return scanSkill(fullContent, manifest);
}

/**
 * Scan a skill directory containing SKILL.md.
 * @param dir - Directory path
 * @returns Security report
 */
export async function scanPath(dir: string): Promise<SecurityReport> {
  const pathStat = await stat(dir);
  const skillPath = pathStat.isDirectory() ? join(dir, 'SKILL.md') : dir;
  const raw = await readFile(skillPath, 'utf8');
  const { parseSkillFromString } = await import('@skillregistry/core');
  const manifest = parseSkillFromString(raw);
  return scanManifest(manifest);
}
