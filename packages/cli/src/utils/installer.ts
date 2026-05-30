import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  AGENT_DIRS,
  type AgentType,
  type InstallResult,
  type InstalledSkill,
  type SkillManifest,
  expandHomePath,
  extractFrontmatterOnly,
  serializeSkillMd,
} from '@skillregistry/core';
import { SecurityBlockedError } from '@skillregistry/core';
import { scanManifest } from '@skillregistry/scanner';

export interface InstallOptions {
  manifest: SkillManifest;
  agents: AgentType[];
  global?: boolean;
  projectDir: string;
  force?: boolean;
}

/**
 * Resolve install directory for an agent.
 * @param agent - Agent type
 * @param projectDir - Project root
 * @param global - Use home directory paths
 * @returns Absolute install path
 */
export function getInstallDir(agent: AgentType, projectDir: string, global: boolean): string {
  const template = AGENT_DIRS[agent];
  const base = template.startsWith('~') || global ? expandHomePath(template) : join(projectDir, template);
  return base.endsWith('/') ? base : `${base}/`;
}

/**
 * Install skill to agent directories after security scan.
 * @param options - Install options
 * @returns Install result
 */
export async function installSkill(options: InstallOptions): Promise<InstallResult> {
  const { manifest, agents, global = false, projectDir, force = false } = options;
  const report = scanManifest(manifest);

  if (report.blocked && !force) {
    throw new SecurityBlockedError(
      `Skill blocked by security scanner (score: ${report.score})`,
      {
        score: report.score,
        issues: report.issues.map((i) => ({ code: i.code, severity: i.severity })),
      },
    );
  }

  const content = serializeSkillMd(manifest);
  const installedPaths: string[] = [];

  for (const agent of agents) {
    const dir = join(getInstallDir(agent, projectDir, global ?? false), manifest.name);
    await mkdir(dir, { recursive: true });
    const skillPath = join(dir, 'SKILL.md');
    await writeFile(skillPath, content, 'utf8');

    for (const file of manifest.files) {
      const filePath = join(dir, file.path);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, file.content, 'utf8');
    }
    installedPaths.push(skillPath);
  }

  return {
    name: manifest.name,
    version: manifest.version,
    agents,
    path: installedPaths[0] ?? '',
    security_score: report.score,
  };
}

/**
 * Uninstall skill from agent directories.
 * @param name - Skill name
 * @param projectDir - Project directory
 * @param agents - Agents to uninstall from (all if omitted)
 * @param global - Use global paths
 */
export async function uninstallSkill(
  name: string,
  projectDir: string,
  agents?: AgentType[],
  global = false,
): Promise<void> {
  const { SUPPORTED_AGENTS } = await import('@skillregistry/core');
  const targetAgents = agents ?? [...SUPPORTED_AGENTS];

  for (const agent of targetAgents) {
    const dir = join(getInstallDir(agent, projectDir, global), name);
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * List installed skills for an agent.
 * @param projectDir - Project directory
 * @param agent - Optional agent filter
 * @param global - Scan global dirs
 * @returns Installed skills
 */
export async function listInstalled(
  projectDir: string,
  agent?: AgentType,
  global = false,
): Promise<InstalledSkill[]> {
  const { SUPPORTED_AGENTS } = await import('@skillregistry/core');
  const agents = agent ? [agent] : [...SUPPORTED_AGENTS];
  const results: InstalledSkill[] = [];

  for (const a of agents) {
    const baseDir = getInstallDir(a, projectDir, global);
    let entries: string[] = [];
    try {
      entries = await readdir(baseDir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const skillPath = join(baseDir, entry, 'SKILL.md');
      try {
        const raw = await readFile(skillPath, 'utf8');
        const meta = extractFrontmatterOnly(raw);
        results.push({
          name: meta.name,
          version: meta.version,
          agent: a,
          path: skillPath,
          ...(meta.security_score !== undefined ? { security_score: meta.security_score } : {}),
        });
      } catch {
        /* skip invalid */
      }
    }
  }

  return results;
}
