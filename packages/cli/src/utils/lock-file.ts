import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AgentType, LockFile, LockSkillEntry } from '@skillregistry/core';
import { LOCKFILE_VERSION, lockFileSchema } from '@skillregistry/core';
import { ValidationError } from '@skillregistry/core';

export const LOCK_FILENAME = 'skillreg.lock.json';

/**
 * Read lock file from project directory.
 * @param cwd - Project directory
 * @returns Lock file
 */
export async function readLockFile(cwd: string): Promise<LockFile> {
  const path = join(cwd, LOCK_FILENAME);
  try {
    const raw = await readFile(path, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    const result = lockFileSchema.safeParse(parsed);
    if (!result.success) {
      throw new ValidationError('Invalid skillreg.lock.json');
    }
    return result.data as LockFile;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    return { lockfileVersion: LOCKFILE_VERSION, skills: {} };
  }
}

/**
 * Write lock file to project directory.
 * @param cwd - Project directory
 * @param lock - Lock file
 */
export async function writeLockFile(cwd: string, lock: LockFile): Promise<void> {
  const path = join(cwd, LOCK_FILENAME);
  await writeFile(path, JSON.stringify(lock, null, 2) + '\n', 'utf8');
}

/**
 * Add or update a skill entry in the lock file.
 * @param cwd - Project directory
 * @param name - Skill name
 * @param entry - Lock entry
 */
export async function upsertSkillEntry(
  cwd: string,
  name: string,
  entry: LockSkillEntry,
): Promise<void> {
  const lock = await readLockFile(cwd);
  lock.skills[name] = entry;
  await writeLockFile(cwd, lock);
}

/**
 * Remove a skill from the lock file.
 * @param cwd - Project directory
 * @param name - Skill name
 */
export async function removeSkillEntry(cwd: string, name: string): Promise<void> {
  const lock = await readLockFile(cwd);
  delete lock.skills[name];
  await writeLockFile(cwd, lock);
}

/**
 * Create empty lock file.
 * @param cwd - Project directory
 */
export async function initLockFile(cwd: string): Promise<void> {
  await writeLockFile(cwd, { lockfileVersion: LOCKFILE_VERSION, skills: {} });
}

export type { AgentType };
