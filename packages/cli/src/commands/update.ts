import { readLockFile } from '../utils/lock-file.js';
import { fetchRegistryIndex } from '../utils/downloader.js';
import { runAdd } from './add.js';
import { printTable } from '../utils/display.js';

export interface UpdateOptions {
  cwd?: string;
  registryPath?: string;
  skillsDir?: string;
}

/**
 * Update one or all locked skills.
 * @param skillName - Optional specific skill
 * @param options - Update options
 */
export async function runUpdate(skillName?: string, options?: UpdateOptions): Promise<void> {
  const cwd = options?.cwd ?? process.cwd();
  const lock = await readLockFile(cwd);
  const index = await fetchRegistryIndex(options?.registryPath);

  const toUpdate = skillName
    ? lock.skills[skillName]
      ? [skillName]
      : []
    : Object.keys(lock.skills);

  if (toUpdate.length === 0) {
    console.log('No skills to update.');
    return;
  }

  const updates: string[][] = [];

  for (const name of toUpdate) {
    const entry = index.skills[name];
    const locked = lock.skills[name];
    if (!entry || !locked) continue;
    if (entry.version !== locked.version) {
      await runAdd(name, { ...options, cwd });
      updates.push([name, locked.version, entry.version]);
    }
  }

  if (updates.length === 0) {
    console.log('All skills are up to date.');
  } else {
    printTable(['Skill', 'From', 'To'], updates);
  }
}
