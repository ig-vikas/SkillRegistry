/** Supported AI coding agent types */
export type AgentType =
  | 'claude-code'
  | 'cursor'
  | 'codex'
  | 'copilot'
  | 'gemini-cli'
  | 'openclaw'
  | 'windsurf';

/** Skill category taxonomy */
export type Category =
  | 'frontend'
  | 'backend'
  | 'security'
  | 'devops'
  | 'ai-ml'
  | 'database'
  | 'testing'
  | 'docs'
  | 'mobile'
  | 'cloud'
  | 'performance'
  | 'accessibility'
  | 'code-quality'
  | 'architecture';

/** Skill frontmatter metadata */
export interface Skill {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  agents: AgentType[];
  categories: Category[];
  tags: string[];
  security_score?: number | undefined;
  verified?: boolean | undefined;
  downloads?: number | undefined;
  repository?: string | undefined;
  created_at?: string | undefined;
  updated_at?: string | undefined;
}

/** Additional file bundled with a skill */
export interface SkillFile {
  path: string;
  content: string;
  type: 'example' | 'doc' | 'config' | 'reference';
}

/** Full skill package including body and files */
export interface SkillManifest extends Skill {
  content: string;
  files: SkillFile[];
}

/** Security scan issue severity */
export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/** Single security finding */
export interface SecurityIssue {
  severity: SecuritySeverity;
  code: string;
  message: string;
  line?: number | undefined;
  evidence?: string | undefined;
}

/** Complete security scan report */
export interface SecurityReport {
  skill_name: string;
  score: number;
  passed: boolean;
  blocked: boolean;
  issues: SecurityIssue[];
  scanned_at: string;
}

/** Registry index entry for a skill */
export interface RegistryEntry {
  name: string;
  version: string;
  description: string;
  author: string;
  categories: Category[];
  agents: AgentType[];
  security_score: number;
  verified: boolean;
  downloads: number;
  checksum: string;
}

/** Master registry index */
export interface RegistryIndex {
  version: string;
  updated_at: string;
  skills: Record<string, RegistryEntry>;
}

/** Standard API response envelope */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta: PaginatedMeta | Record<string, unknown> | null;
}

/** API error payload */
export interface ApiError {
  code: string;
  message: string;
}

/** Pagination metadata */
export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Lock file skill entry */
export interface LockSkillEntry {
  version: string;
  resolved: string;
  checksum: string;
  security_score: number;
  installed_agents: AgentType[];
  installed_at: string;
}

/** Project lock file */
export interface LockFile {
  lockfileVersion: number;
  skills: Record<string, LockSkillEntry>;
}

/** Search result item */
export interface SkillSearchResult {
  name: string;
  version: string;
  description: string;
  author: string;
  categories: Category[];
  agents: AgentType[];
  security_score: number;
  verified: boolean;
  downloads: number;
}

/** Skill install result */
export interface InstallResult {
  name: string;
  version: string;
  agents: AgentType[];
  path: string;
  security_score: number;
}

/** Installed skill summary */
export interface InstalledSkill {
  name: string;
  version: string;
  agent: AgentType;
  path: string;
  security_score?: number;
}

/** Available skill update */
export interface UpdateAvailable {
  name: string;
  currentVersion: string;
  latestVersion: string;
}

/** Trending skill entry */
export interface TrendingSkill {
  name: string;
  version: string;
  description: string;
  security_score: number;
  downloads: number;
  trend_score: number;
}
