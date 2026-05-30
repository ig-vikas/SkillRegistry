import { Hono } from 'hono';
import { createDb, migrateDb, type Database } from './db/client.js';
import { corsMiddleware } from './middleware/cors.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import { createAuthorsRoutes } from './routes/authors.js';
import { createAuthRoutes } from './routes/auth.js';
import { createCategoriesRoutes } from './routes/categories.js';
import { createScanRoutes } from './routes/scan.js';
import { createSearchRoutes } from './routes/search.js';
import { createSkillsRoutes } from './routes/skills.js';
import { createStatsRoutes } from './routes/stats.js';
import { createTrendingRoutes } from './routes/trending.js';

export interface AppConfig {
  dbUrl: string;
  dbAuthToken?: string;
  jwtSecret: string;
  githubClientId: string;
  githubClientSecret: string;
  webUrl: string;
  corsOrigin?: string;
}

/**
 * Create Hono application.
 * @param config - App configuration
 * @returns Hono app and database
 */
export async function createApp(config: AppConfig): Promise<{ app: Hono; db: Database }> {
  const db = createDb(config.dbUrl, config.dbAuthToken);
  await migrateDb(db);

  const app = new Hono();

  app.use('*', corsMiddleware(config.corsOrigin ?? config.webUrl));
  app.use('/api/*', rateLimitMiddleware());

  const api = new Hono();

  api.route('/skills', createSkillsRoutes(db, config.jwtSecret));
  api.route('/search', createSearchRoutes(db));
  api.route('/trending', createTrendingRoutes(db));
  api.route('/scan', createScanRoutes());
  api.route('/stats', createStatsRoutes(db));
  api.route('/authors', createAuthorsRoutes(db));
  api.route('/categories', createCategoriesRoutes());
  api.route(
    '/auth',
    createAuthRoutes(db, {
      githubClientId: config.githubClientId,
      githubClientSecret: config.githubClientSecret,
      jwtSecret: config.jwtSecret,
      webUrl: config.webUrl,
    }),
  );

  app.route('/api/v1', api);

  app.get('/health', (c) => c.json({ status: 'ok' }));

  return { app, db };
}

export { createDb, migrateDb };
export type { Database };
