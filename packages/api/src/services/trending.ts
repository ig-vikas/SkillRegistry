import { desc, sql } from 'drizzle-orm';
import type { TrendingSkill } from '@skillregistry/core';
import type { Database } from '../db/client.js';
import { downloads, skills } from '../db/schema.js';

const PERIOD_MS: Record<string, number> = {
  day: 86_400_000,
  week: 604_800_000,
  month: 2_592_000_000,
};

/**
 * Get trending skills by download velocity.
 * @param db - Database
 * @param period - Time period
 * @param limit - Max results
 * @returns Trending skills
 */
export async function getTrending(
  db: Database,
  period: 'day' | 'week' | 'month' = 'week',
  limit = 10,
): Promise<TrendingSkill[]> {
  const since = new Date(Date.now() - PERIOD_MS[period]!).toISOString();

  const rows = await db
    .select({
      name: skills.name,
      version: skills.version,
      description: skills.description,
      securityScore: skills.securityScore,
      downloads: skills.downloads,
      recentDownloads: sql<number>`count(${downloads.id})`.as('recent'),
    })
    .from(skills)
    .leftJoin(downloads, sql`${downloads.skillId} = ${skills.id} AND ${downloads.createdAt} >= ${since}`)
    .groupBy(skills.id)
    .orderBy(desc(sql`recent`))
    .limit(limit);

  return rows.map((r) => ({
    name: r.name,
    version: r.version,
    description: r.description,
    security_score: r.securityScore,
    downloads: r.downloads,
    trend_score: Number(r.recentDownloads) || r.downloads,
  }));
}
