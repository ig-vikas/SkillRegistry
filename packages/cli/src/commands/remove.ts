import type { AgentType } from '@skillregistry/core';
import { success } from '../utils/display.js';
import { removeSkillEntry } from '../utils/lock-file.js';
import { uninstallSkill } from '../utils/installer.js';

export interface RemoveOptions {
  agent?: AgentType;
  global?: boolean;
  cwd?: string;
}

/**
 * Uninstall a skill.
 * @param skillName - Skill name
 * @param options - Remove options
 */
export async function runRemove(skillName: string, options?: RemoveOptions): Promise<void> {
  const cwd = options?.cwd ?? process.cwd();
  const agents = options?.agent ? [options.agent] : undefined;
  await uninstallSkill(skillName, cwd, agents, options?.global);
  await removeSkillEntry(cwd, skillName);
  success(`Removed ${skillName}`);
}
