import type { AgentType, Category } from './types.js';

/** Default registry API base URL */
export const REGISTRY_API_DEFAULT = 'https://registry.skillregistry.dev/api/v1';

/** Maximum description length in frontmatter */
export const MAX_DESCRIPTION_LENGTH = 200;

/** Maximum categories per skill */
export const MAX_CATEGORIES = 5;

/** Lock file format version */
export const LOCKFILE_VERSION = 1;

/** Agent install directory paths (use expandHomePath at runtime for ~) */
export const AGENT_DIRS: Record<AgentType, string> = {
  'claude-code': '~/.claude/skills/',
  cursor: '.cursor/skills/',
  codex: '~/.codex/skills/',
  copilot: '.github/skills/',
  'gemini-cli': '~/.gemini/skills/',
  openclaw: '~/.openclaw/skills/',
  windsurf: '.windsurf/skills/',
};

/** All supported agent types */
export const SUPPORTED_AGENTS: readonly AgentType[] = [
  'claude-code',
  'cursor',
  'codex',
  'copilot',
  'gemini-cli',
  'openclaw',
  'windsurf',
] as const;

/** All skill categories */
export const CATEGORIES: readonly Category[] = [
  'frontend',
  'backend',
  'security',
  'devops',
  'ai-ml',
  'database',
  'testing',
  'docs',
  'mobile',
  'cloud',
  'performance',
  'accessibility',
  'code-quality',
  'architecture',
] as const;
