import { access, constants } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AgentType } from '@skillregistry/core';
import { SUPPORTED_AGENTS } from '@skillregistry/core';

export interface AgentStatus {
  agent: AgentType;
  installed: boolean;
  reason?: string;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function commandExists(cmd: string): Promise<boolean> {
  const { exec } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execAsync = promisify(exec);
  const which = process.platform === 'win32' ? 'where' : 'which';
  try {
    await execAsync(`${which} ${cmd}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect status of a single agent.
 * @param agent - Agent type
 * @param projectDir - Project directory
 * @returns Agent status
 */
export async function detectAgent(
  agent: AgentType,
  projectDir: string,
): Promise<AgentStatus> {
  switch (agent) {
    case 'claude-code':
      return {
        agent,
        installed: await commandExists('claude'),
        reason: 'claude binary in PATH',
      };
    case 'cursor':
      return {
        agent,
        installed:
          (await pathExists(join(projectDir, '.cursor'))) ||
          (await commandExists('cursor')),
        reason: '.cursor/ or cursor in PATH',
      };
    case 'codex':
      return {
        agent,
        installed: await commandExists('codex'),
        reason: 'codex binary in PATH',
      };
    case 'copilot':
      return {
        agent,
        installed: await pathExists(join(projectDir, '.github', 'copilot')),
        reason: '.github/copilot/',
      };
    case 'gemini-cli':
      return {
        agent,
        installed: await commandExists('gemini'),
        reason: 'gemini binary in PATH',
      };
    case 'openclaw':
      return {
        agent,
        installed: await commandExists('openclaw'),
        reason: 'openclaw binary in PATH',
      };
    case 'windsurf':
      return {
        agent,
        installed: await pathExists(join(projectDir, '.windsurf')),
        reason: '.windsurf/',
      };
    default:
      return { agent, installed: false };
  }
}

/**
 * Detect all installed agents.
 * @param projectDir - Project directory
 * @returns List of installed agent types
 */
export async function detectInstalledAgents(projectDir: string): Promise<AgentType[]> {
  const statuses = await Promise.all(
    SUPPORTED_AGENTS.map((agent) => detectAgent(agent, projectDir)),
  );
  return statuses.filter((s) => s.installed).map((s) => s.agent);
}

/**
 * Get detailed status for all agents.
 * @param projectDir - Project directory
 * @returns All agent statuses
 */
export async function getAllAgentStatuses(projectDir: string): Promise<AgentStatus[]> {
  return Promise.all(SUPPORTED_AGENTS.map((agent) => detectAgent(agent, projectDir)));
}

export async function getHomeDir(): Promise<string> {
  return homedir();
}
