import { serve } from '@hono/node-server';
import { createApp } from './index.js';

const port = Number(process.env.PORT ?? 3001);

async function main(): Promise<void> {
  const { app } = await createApp({
    dbUrl: process.env.TURSO_DATABASE_URL ?? 'file:./local.db',
    ...(process.env.TURSO_AUTH_TOKEN ? { dbAuthToken: process.env.TURSO_AUTH_TOKEN } : {}),
    jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    githubClientId: process.env.GITHUB_CLIENT_ID ?? '',
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    webUrl: process.env.WEB_URL ?? 'http://localhost:3000',
    ...(process.env.CORS_ORIGIN ? { corsOrigin: process.env.CORS_ORIGIN } : {}),
  });

  console.log(`SkillRegistry API listening on http://localhost:${port}`);
  serve({ fetch: app.fetch, port });
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
