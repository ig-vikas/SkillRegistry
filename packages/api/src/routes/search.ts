import { Hono } from 'hono';
import type { Database } from '../db/client.js';
import { ok } from '../lib/envelope.js';
import { searchSkills } from '../services/search.js';

/**
 * Create search routes.
 * @param db - Database
 */
export function createSearchRoutes(db: Database) {
  const app = new Hono();

  app.get('/', async (c) => {
    const q = c.req.query('q') ?? '';
    const category = c.req.query('category');
    const agent = c.req.query('agent');
    const page = Number(c.req.query('page') ?? 1);
    const limit = Number(c.req.query('limit') ?? 20);

    const { results, total } = await searchSkills(db, q, {
      ...(category ? { category } : {}),
      ...(agent ? { agent } : {}),
      page,
      limit,
    });
    return c.json(ok(results, { page, limit, total, totalPages: Math.ceil(total / limit) }));
  });

  return app;
}
