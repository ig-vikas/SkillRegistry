import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseSkillFromString } from '@skillregistry/core';
import { scanManifest } from '@skillregistry/scanner';
import { getConfig, getRegistryUrl } from '../utils/config.js';
import { error, success } from '../utils/display.js';

/**
 * Publish a skill to the registry API.
 * @param skillDir - Directory containing SKILL.md
 */
export async function runPublish(skillDir?: string): Promise<void> {
  const dir = skillDir ?? process.cwd();
  const raw = await readFile(join(dir, 'SKILL.md'), 'utf8');
  const manifest = parseSkillFromString(raw);
  const report = scanManifest(manifest);

  if (report.blocked) {
    error(`Skill blocked by scanner (score: ${report.score}). Fix issues before publishing.`);
    process.exitCode = 1;
    return;
  }

  const config = await getConfig();
  if (!config.authToken) {
    error('Not authenticated. Set authToken in ~/.skillreg/config.json after OAuth.');
    process.exitCode = 1;
    return;
  }

  const url = `${await getRegistryUrl()}/skills`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.authToken}`,
    },
    body: JSON.stringify(manifest),
  });

  if (!res.ok) {
    error(`Publish failed: ${res.status} ${await res.text()}`);
    process.exitCode = 1;
    return;
  }

  success(`Published ${manifest.name}@${manifest.version}`);
}
