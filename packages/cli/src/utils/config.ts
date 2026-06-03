import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { REGISTRY_API_DEFAULT } from '@skillregistry/core';
import type { AgentType } from '@skillregistry/core';

export interface UserConfig {
  registryUrl?: string;
  defaultAgent?: AgentType;
  cacheTtl?: number;
  offlineMode?: boolean;
  authToken?: string;
}

const CONFIG_DIR = join(homedir(), '.skillreg');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

/**
 * Load user configuration from disk.
 * @returns User config object
 */
export async function getConfig(): Promise<UserConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf8');
    return JSON.parse(raw) as UserConfig;
  } catch {
    return {};
  }
}

/**
 * Merge and persist user configuration.
 * @param partial - Partial config to merge
 */
export async function setConfig(partial: UserConfig): Promise<void> {
  const current = await getConfig();
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify({ ...current, ...partial }, null, 2), 'utf8');
}

/**
 * Get registry API base URL.
 * @returns API URL
 */
export async function getRegistryUrl(): Promise<string> {
  const config = await getConfig();
  return config.registryUrl ?? REGISTRY_API_DEFAULT;
}

export { CONFIG_DIR, CONFIG_PATH, dirname };
