import { Hono } from 'hono';
import type { Database } from '../db/client.js';
import { ok } from '../lib/envelope.js';
import { getTrending } from '../services/trending.js';

/**
 * Create trending routes.
 * @param db - Database
 */
export function createTrendingRoutes(db: Database) {
  const app = new Hono();

  app.get('/', async (c) => {
    const period = (c.req.query('period') ?? 'week') as 'day' | 'week' | 'month';
    const limit = Number(c.req.query('limit') ?? 10);
    const trending = await getTrending(db, period, limit);
    return c.json(ok(trending));
  });

  return app;
}
