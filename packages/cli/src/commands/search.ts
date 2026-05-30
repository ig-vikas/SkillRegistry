import type { RegistryEntry } from '@skillregistry/core';
import { fetchRegistryIndex } from '../utils/downloader.js';
import { printTable } from '../utils/display.js';

export interface SearchOptions {
  registryPath?: string;
}

/**
 * Search registry by keyword.
 * @param query - Search query
 * @param options - Search options
 */
export async function runSearch(query: string, options?: SearchOptions): Promise<void> {
  const index = await fetchRegistryIndex(options?.registryPath);
  const q = query.toLowerCase();
  const matches = Object.values(index.skills).filter(
    (s: RegistryEntry) =>
      s.name.includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.author.toLowerCase().includes(q),
  );

  if (matches.length === 0) {
    console.log('No skills found.');
    return;
  }

  printTable(
    ['Name', 'Version', 'Score', 'Description'],
    matches
      .slice(0, 20)
      .map((s) => [s.name, s.version, String(s.security_score), s.description.slice(0, 50)]),
  );
}
