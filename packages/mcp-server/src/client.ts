import type { ApiEnvelope, SkillManifest, SkillSearchResult, TrendingSkill } from '@skillregistry/core';
import { REGISTRY_API_DEFAULT } from '@skillregistry/core';

/**
 * Typed API client for SkillRegistry.
 */
export class RegistryClient {
  constructor(private baseUrl = process.env.SKILLREGISTRY_API_URL ?? REGISTRY_API_DEFAULT) {}

  private async fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, init);
    const body = (await res.json()) as ApiEnvelope<T>;
    if (!body.success || body.data === null) {
      throw new Error(body.error?.message ?? 'API request failed');
    }
    return body.data;
  }

  /** Search skills */
  async search(query: string, opts?: { category?: string; agent?: string; limit?: number }) {
    const params = new URLSearchParams({ q: query });
    if (opts?.category) params.set('category', opts.category);
    if (opts?.agent) params.set('agent', opts.agent);
    if (opts?.limit) params.set('limit', String(opts.limit));
    return this.fetchApi<SkillSearchResult[]>(`/search?${params}`);
  }

  /** Get skill manifest */
  async getSkill(name: string): Promise<SkillManifest> {
    await this.fetchApi<unknown>(`/skills/${name}`);
    const res = await fetch(`${this.baseUrl}/skills/${name}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const body = (await res.json()) as ApiEnvelope<SkillManifest>;
    if (!body.success || !body.data) throw new Error('Failed to download skill');
    return body.data;
  }

  /** Get trending skills */
  async getTrending(period?: 'day' | 'week' | 'month', limit?: number) {
    const params = new URLSearchParams();
    if (period) params.set('period', period);
    if (limit) params.set('limit', String(limit));
    return this.fetchApi<TrendingSkill[]>(`/trending?${params}`);
  }

  /** Scan content */
  async scan(content: string) {
    return this.fetchApi<import('@skillregistry/core').SecurityReport>('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  }

  /** Get catalog */
  async getCatalog() {
    return this.fetchApi<{ skills: Record<string, unknown> }>('/skills?limit=1000');
  }
}
