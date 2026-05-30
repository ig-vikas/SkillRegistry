import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import type { Database } from '../db/client.js';
import { skills, users } from '../db/schema.js';
import { fail, ok } from '../lib/envelope.js';

/**
 * Create author routes.
 * @param db - Database
 */
export function createAuthorsRoutes(db: Database) {
  const app = new Hono();

  app.get('/:username', async (c) => {
    const username = c.req.param('username');
    const [author] = await db.select().from(users).where(eq(users.username, username));
    if (!author) {
      const { status, body } = fail('NOT_FOUND', 'Author not found', 404);
      return c.json(body, status);
    }
    const authorSkills = await db.select().from(skills).where(eq(skills.authorId, author.id));
    return c.json(ok({ author, skills: authorSkills }));
  });

  return app;
}
