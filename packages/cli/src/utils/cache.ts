import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { RegistryIndex, SkillManifest } from '@skillregistry/core';
import { getConfig } from './config.js';

export function getCacheDir(): string {
  return process.env.SKILLREGISTRY_CACHE_DIR ?? join(homedir(), '.cache', 'skillreg');
}

function getIndexPath(): string {
  return join(getCacheDir(), 'index.json');
}

/**
 * Ensure cache directory exists.
 */
async function ensureCache(): Promise<void> {
  await mkdir(join(getCacheDir(), 'skills'), { recursive: true });
}

/**
 * Get cached registry index if not expired.
 * @returns Cached index or null
 */
export async function getCachedIndex(): Promise<RegistryIndex | null> {
  try {
    const config = await getConfig();
    const ttl = (config.cacheTtl ?? 3600) * 1000;
    const raw = await readFile(getIndexPath(), 'utf8');
    const parsed = JSON.parse(raw) as { cachedAt: number; index: RegistryIndex };
    if (Date.now() - parsed.cachedAt > ttl) return null;
    return parsed.index;
  } catch {
    return null;
  }
}

/**
 * Store registry index in cache.
 * @param index - Registry index
 */
export async function setCachedIndex(index: RegistryIndex): Promise<void> {
  await ensureCache();
  await writeFile(
    getIndexPath(),
    JSON.stringify({ cachedAt: Date.now(), index }, null, 2),
    'utf8',
  );
}

/**
 * Get cached skill manifest.
 * @param name - Skill name
 * @param version - Skill version
 * @returns Cached manifest or null
 */
export async function getSkillCache(
  name: string,
  version: string,
): Promise<SkillManifest | null> {
  try {
    const path = join(getCacheDir(), 'skills', name, version, 'manifest.json');
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as SkillManifest;
  } catch {
    return null;
  }
}

/**
 * Cache a skill manifest.
 * @param manifest - Skill manifest
 */
export async function setSkillCache(manifest: SkillManifest): Promise<void> {
  await ensureCache();
  const dir = join(getCacheDir(), 'skills', manifest.name, manifest.version);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
}

export const CACHE_DIR = getCacheDir();
