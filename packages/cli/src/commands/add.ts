import type { AgentType } from '@skillregistry/core';
import { detectInstalledAgents } from '../utils/agent-detector.js';
import { downloadSkill, fetchRegistryIndex, resolveVersion } from '../utils/downloader.js';
import { error, spinner } from '../utils/display.js';
import { installSkill } from '../utils/installer.js';
import { upsertSkillEntry } from '../utils/lock-file.js';
import { getRegistryUrl } from '../utils/config.js';

export interface AddOptions {
  agent?: AgentType;
  global?: boolean;
  force?: boolean;
  skillsDir?: string;
  registryPath?: string;
  cwd?: string;
}

/**
 * Install a skill from the registry.
 * @param skillName - Skill name
 * @param options - Install options
 */
export async function runAdd(skillName: string, options?: AddOptions): Promise<void> {
  const cwd = options?.cwd ?? process.cwd();
  const spin = spinner(`Resolving ${skillName}...`);

  try {
    const index = await fetchRegistryIndex(options?.registryPath);
    const version = resolveVersion(index, skillName);
    const entry = index.skills[skillName];
    if (!entry) throw new Error('Skill not found');

    spin.text = `Downloading ${skillName}@${version}...`;
    const { manifest, checksum } = await downloadSkill(skillName, version, {
      ...(options?.skillsDir ? { skillsDir: options.skillsDir } : {}),
    });

    const agents = options?.agent ? [options.agent] : await detectInstalledAgents(cwd);

    if (agents.length === 0) {
      spin.fail('No agents detected. Use --agent <type>.');
      process.exitCode = 1;
      return;
    }

    spin.text = `Installing to ${agents.join(', ')}...`;
    const result = await installSkill({
      manifest,
      agents,
      projectDir: cwd,
      ...(options?.global !== undefined ? { global: options.global } : {}),
      ...(options?.force !== undefined ? { force: options.force } : {}),
    });

    const registryUrl = await getRegistryUrl();
    await upsertSkillEntry(cwd, skillName, {
      version,
      resolved: `${registryUrl}/skills/${skillName}/${version}`,
      checksum,
      security_score: result.security_score,
      installed_agents: agents,
      installed_at: new Date().toISOString(),
    });

    spin.succeed(`Installed ${skillName}@${version} (score: ${result.security_score})`);
  } catch (err) {
    spin.fail(err instanceof Error ? err.message : 'Install failed');
    if (options?.force !== true) process.exitCode = 1;
    error(err instanceof Error ? err.message : 'Unknown error');
  }
}
