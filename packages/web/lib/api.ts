import type {
  ApiEnvelope,
  RegistryEntry,
  SkillSearchResult,
  TrendingSkill,
} from '@skillregistry/core';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/**
 * Fetch from SkillRegistry API with envelope parsing.
 */
export async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    next: { revalidate: 60 },
  });
  const body = (await res.json()) as ApiEnvelope<T>;
  if (!body.success || body.data === null) {
    throw new Error(body.error?.message ?? 'API error');
  }
  return body.data;
}

export async function getStats() {
  return fetchApi<{ skills: number; authors: number; downloads: number }>('/stats');
}

export async function getTrending(limit = 10) {
  return fetchApi<TrendingSkill[]>(`/trending?limit=${limit}`);
}

export async function searchSkills(q: string) {
  return fetchApi<SkillSearchResult[]>(`/search?q=${encodeURIComponent(q)}`);
}

export async function getSkills(): Promise<Record<string, RegistryEntry>> {
  const data = await fetchApi<RegistryEntry[] | { skills: Record<string, RegistryEntry> }>(
    '/skills?limit=100',
  );
  if (Array.isArray(data)) {
    return Object.fromEntries(data.map((skill) => [skill.name, skill]));
  }
  return data.skills;
}

export async function getSkill(name: string) {
  return fetchApi<RegistryEntry & { content?: string; agents: string[]; categories: string[] }>(
    `/skills/${name}`,
  );
}

export async function getSecurityReport(name: string) {
  return fetchApi<{
    skill_name: string;
    score: number;
    passed: boolean;
    blocked: boolean;
    issues: { severity: string; code: string; message: string }[];
  }>(`/skills/${name}/security`);
}

export { API_URL };
