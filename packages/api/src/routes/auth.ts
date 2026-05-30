import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { GitHub } from 'arctic';
import { Hono } from 'hono';
import * as jose from 'jose';
import type { Database } from '../db/client.js';
import { users } from '../db/schema.js';
import { fail, ok } from '../lib/envelope.js';
import { authMiddleware } from '../middleware/auth.js';

export interface AuthConfig {
  githubClientId: string;
  githubClientSecret: string;
  jwtSecret: string;
  webUrl: string;
}

/**
 * Create auth routes.
 * @param db - Database
 * @param config - Auth configuration
 */
export function createAuthRoutes(db: Database, config: AuthConfig) {
  const app = new Hono<{ Variables: { user: { id: string; username: string; githubId: string } } }>();
  const github = new GitHub(config.githubClientId, config.githubClientSecret, null);
  app.get('/github', async (c) => {
    const state = randomUUID();
    const url = github.createAuthorizationURL(state, ['read:user']);
    return c.redirect(url.toString());
  });

  app.get('/github/callback', async (c) => {
    const code = c.req.query('code');
    if (!code) {
      const { status, body } = fail('OAUTH_ERROR', 'Missing code', 400);
      return c.json(body, status);
    }

    try {
      const tokens = await github.validateAuthorizationCode(code);
      const accessToken = tokens.accessToken();
      const response = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const ghUser = (await response.json()) as {
        id: number;
        login: string;
        name?: string;
        avatar_url?: string;
      };

      const githubId = String(ghUser.id);
      const [existing] = await db.select().from(users).where(eq(users.githubId, githubId));

      let userId = existing?.id;
      if (!existing) {
        userId = randomUUID();
        await db.insert(users).values({
          id: userId,
          githubId,
          username: ghUser.login,
          displayName: ghUser.name ?? ghUser.login,
          avatarUrl: ghUser.avatar_url ?? null,
        });
      }

      const token = await new jose.SignJWT({
        username: ghUser.login,
        githubId,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(userId!)
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(new TextEncoder().encode(config.jwtSecret));

      return c.redirect(`${config.webUrl}/dashboard?token=${token}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'OAuth failed';
      const { status, body } = fail('OAUTH_ERROR', msg, 500);
      return c.json(body, status);
    }
  });

  app.get('/me', authMiddleware(config.jwtSecret), async (c) => {
    const user = c.get('user');
    const [row] = await db.select().from(users).where(eq(users.id, user.id));
    return c.json(ok(row ?? user));
  });

  app.post('/logout', () => {
    return new Response(
      JSON.stringify(ok({ loggedOut: true })),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': 'skr_token=; Path=/; HttpOnly; Max-Age=0',
        },
      },
    );
  });

  return app;
}
