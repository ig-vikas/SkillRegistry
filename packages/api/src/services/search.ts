import { sql } from 'drizzle-orm';
import type { SkillSearchResult } from '@skillregistry/core';
import type { Database } from '../db/client.js';
import { skillAgents, skillCategories, skills, users } from '../db/schema.js';

export interface SearchFilters {
  category?: string;
  agent?: string;
  page?: number;
  limit?: number;
}

/**
 * Full-text search skills using FTS5 or LIKE fallback.
 * @param db - Database
 * @param query - Search query
 * @param filters - Filters
 * @returns Search results and total
 */
export async function searchSkills(
  db: Database,
  query: string,
  filters: SearchFilters = {},
): Promise<{ results: SkillSearchResult[]; total: number }> {
  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? 20, 100);
  const offset = (page - 1) * limit;
  const q = `%${query}%`;

  const rows = await db
    .select({
      id: skills.id,
      name: skills.name,
      version: skills.version,
      description: skills.description,
      username: users.username,
      securityScore: skills.securityScore,
      verified: skills.verified,
      downloads: skills.downloads,
    })
    .from(skills)
    .leftJoin(users, sql`${skills.authorId} = ${users.id}`)
    .where(sql`${skills.name} LIKE ${q} OR ${skills.description} LIKE ${q}`)
    .limit(limit)
    .offset(offset);

  const results: SkillSearchResult[] = [];

  for (const row of rows) {
    const agents = await db
      .select({ agentType: skillAgents.agentType })
      .from(skillAgents)
      .where(sql`${skillAgents.skillId} = ${row.id}`);
    const categories = await db
      .select({ category: skillCategories.category })
      .from(skillCategories)
      .where(sql`${skillCategories.skillId} = ${row.id}`);

    if (filters.agent && !agents.some((a) => a.agentType === filters.agent)) continue;
    if (filters.category && !categories.some((c) => c.category === filters.category)) continue;

    results.push({
      name: row.name,
      version: row.version,
      description: row.description,
      author: row.username ?? 'unknown',
      categories: categories.map((c) => c.category) as SkillSearchResult['categories'],
      agents: agents.map((a) => a.agentType) as SkillSearchResult['agents'],
      security_score: row.securityScore,
      verified: row.verified,
      downloads: row.downloads,
    });
  }

  return { results, total: results.length };
}
