import { access, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { RegistryEntry, RegistryIndex, SkillManifest } from '@skillregistry/core';
import {
  NotFoundError,
  hashContent,
  parseSkillFromString,
  serializeSkillMd,
} from '@skillregistry/core';
import { getCachedIndex, getSkillCache, setCachedIndex, setSkillCache } from './cache.js';
import { getConfig, getRegistryUrl } from './config.js';

const moduleDir = process.argv[1] ? dirname(resolve(process.argv[1])) : process.cwd();

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function findUp(fileName: string, startDir: string): Promise<string | null> {
  let current = startDir;
  for (;;) {
    const candidate = join(current, fileName);
    if (await pathExists(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

async function findLocalRegistryPath(): Promise<string | null> {
  return (
    (await findUp('registry.json', process.cwd())) ?? (await findUp('registry.json', moduleDir))
  );
}

async function findLocalSkillsDir(): Promise<string | null> {
  return (await findUp('skills', process.cwd())) ?? (await findUp('skills', moduleDir));
}

/**
 * Load registry index from API, cache, or local monorepo file.
 * @param localRegistryPath - Optional path to registry.json
 * @returns Registry index
 */
export async function fetchRegistryIndex(localRegistryPath?: string): Promise<RegistryIndex> {
  if (localRegistryPath) {
    const raw = await readFile(localRegistryPath, 'utf8');
    return JSON.parse(raw) as RegistryIndex;
  }

  const config = await getConfig();
  if (!config.offlineMode) {
    try {
      const url = `${await getRegistryUrl()}/skills?limit=1000`;
      const res = await fetch(url);
      if (res.ok) {
        const body = (await res.json()) as {
          success: boolean;
          data: RegistryEntry[] | { skills: RegistryIndex['skills'] };
        };
        if (body.success && body.data) {
          const skills = Array.isArray(body.data)
            ? Object.fromEntries(body.data.map((skill) => [skill.name, skill]))
            : body.data.skills;
          const index: RegistryIndex = {
            version: '1',
            updated_at: new Date().toISOString(),
            skills,
          };
          await setCachedIndex(index);
          return index;
        }
      }
    } catch {
      /* fall through to cache */
    }
  }

  const cached = await getCachedIndex();
  if (cached) return cached;

  const fallbackRegistryPath = await findLocalRegistryPath();
  if (fallbackRegistryPath) {
    const raw = await readFile(fallbackRegistryPath, 'utf8');
    return JSON.parse(raw) as RegistryIndex;
  }

  throw new NotFoundError(
    'Registry unreachable and no cached index. Use --offline with a local registry.json.',
  );
}

/**
 * Resolve skill name to latest or specific version from index.
 * @param index - Registry index
 * @param name - Skill name
 * @param version - Optional version
 * @returns Resolved version string
 */
export function resolveVersion(index: RegistryIndex, name: string, version?: string): string {
  const entry = index.skills[name];
  if (!entry) {
    throw new NotFoundError(`Skill not found: ${name}`);
  }
  return version ?? entry.version;
}

/**
 * Download skill manifest from API or local skills directory.
 * @param name - Skill name
 * @param version - Skill version
 * @param options - Download options
 * @returns Manifest and checksum
 */
export async function downloadSkill(
  name: string,
  version: string,
  options?: { skillsDir?: string },
): Promise<{ manifest: SkillManifest; checksum: string }> {
  const cached = await getSkillCache(name, version);
  if (cached) {
    const checksum = hashContent(serializeSkillMd(cached));
    return { manifest: cached, checksum };
  }

  const localSkillsDir = options?.skillsDir ?? (await findLocalSkillsDir());
  if (localSkillsDir) {
    const skillPath = join(localSkillsDir, name, 'SKILL.md');
    const raw = await readFile(skillPath, 'utf8');
    const manifest = parseSkillFromString(raw);
    const checksum = hashContent(raw);
    await setSkillCache(manifest);
    return { manifest, checksum };
  }

  try {
    const url = `${await getRegistryUrl()}/skills/${name}/download`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version }),
    });
    if (res.ok) {
      const body = (await res.json()) as { success: boolean; data: SkillManifest };
      if (body.success && body.data) {
        await setSkillCache(body.data);
        const checksum = hashContent(serializeSkillMd(body.data));
        return { manifest: body.data, checksum };
      }
    }
  } catch {
    /* offline */
  }

  throw new NotFoundError(`Could not download skill: ${name}@${version}`);
}
