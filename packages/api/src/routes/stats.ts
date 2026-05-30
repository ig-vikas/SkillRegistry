import { count, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import type { Database } from '../db/client.js';
import { skills, users } from '../db/schema.js';
import { ok } from '../lib/envelope.js';

/**
 * Create stats routes.
 * @param db - Database
 */
export function createStatsRoutes(db: Database) {
  const app = new Hono();

  app.get('/', async (c) => {
    const [skillCount] = await db.select({ count: count() }).from(skills);
    const [userCount] = await db.select({ count: count() }).from(users);
    const [downloadSum] = await db
      .select({ total: sql<number>`sum(${skills.downloads})` })
      .from(skills);

    const totalSkills = skillCount?.count ?? 0;
    const totalAuthors = userCount?.count ?? 0;
    const totalDownloads = downloadSum?.total ?? 0;

    return c.json(
      ok({
        totalSkills,
        totalDownloads,
        totalAuthors,
        skills: totalSkills,
        downloads: totalDownloads,
        authors: totalAuthors,
      }),
    );
  });

  return app;
}
