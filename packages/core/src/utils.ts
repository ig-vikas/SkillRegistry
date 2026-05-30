import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import semver from 'semver';

/**
 * Convert a string to kebab-case slug.
 * @param name - Raw skill name
 * @returns Kebab-case slug
 */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Normalize skill name to kebab-case.
 * @param name - Raw name
 * @returns Normalized name
 */
export function normalizeSkillName(name: string): string {
  return slugify(name);
}

/**
 * Compare two semver strings.
 * @param a - First version
 * @param b - Second version
 * @returns -1, 0, or 1
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const result = semver.compare(a, b);
  if (result < 0) return -1;
  if (result > 0) return 1;
  return 0;
}

/**
 * Compute SHA-256 hex hash of content.
 * @param content - String to hash
 * @returns Hex digest
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export const generateChecksum = hashContent;

/**
 * Expand leading ~ to home directory.
 * @param path - Path possibly starting with ~
 * @returns Expanded path
 */
export function expandHomePath(path: string): string {
  if (path.startsWith('~/')) {
    return `${homedir()}${path.slice(1)}`;
  }
  if (path === '~') {
    return homedir();
  }
  return path;
}
