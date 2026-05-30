import { readFile } from 'node:fs/promises';
import { scanManifest } from '@skillregistry/scanner';
import { parseSkillFromString } from '@skillregistry/core';
import { listInstalled } from '../utils/installer.js';
import { printTable } from '../utils/display.js';

export interface AuditOptions {
  cwd?: string;
  global?: boolean;
}

/**
 * Re-scan all installed skills.
 * @param options - Audit options
 */
export async function runAudit(options?: AuditOptions): Promise<void> {
  const cwd = options?.cwd ?? process.cwd();
  const installed = await listInstalled(cwd, undefined, options?.global);
  const rows: string[][] = [];
  let failed = false;

  for (const skill of installed) {
    const raw = await readFile(skill.path, 'utf8');
    const manifest = parseSkillFromString(raw);
    const report = scanManifest(manifest);
    rows.push([skill.name, String(report.score), report.blocked ? 'BLOCKED' : 'OK']);
    if (report.blocked) failed = true;
  }

  if (rows.length === 0) {
    console.log('No installed skills to audit.');
    return;
  }

  printTable(['Skill', 'Score', 'Status'], rows);
  if (failed) process.exitCode = 1;
}
