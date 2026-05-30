import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { skillManifestSchema } from '@skillregistry/core';
import type { Database } from '../db/client.js';
import { downloads, securityReports, skillAgents, skillCategories, skills, users } from '../db/schema.js';
import { fail, ok } from '../lib/envelope.js';
import { authMiddleware } from '../middleware/auth.js';
import { buildRegistryIndex, getSkillByName, hashIp, publishSkill } from '../services/skills.js';

export interface SkillsRouteEnv {
  Variables: { user: { id: string; username: string; githubId: string } };
}

/**
 * Create skills routes.
 * @param db - Database
 * @param jwtSecret - JWT secret
 */
export function createSkillsRoutes(db: Database, jwtSecret: string) {
  const app = new Hono<SkillsRouteEnv>();

  app.get('/', async (c) => {
    const page = Number(c.req.query('page') ?? 1);
    const limit = Math.min(Number(c.req.query('limit') ?? 20), 100);
    const index = await buildRegistryIndex(db);
    const entries = Object.values(index);
    const start = (page - 1) * limit;
    const slice = entries.slice(start, start + limit);
    return c.json(
      ok(
        slice,
        { page, limit, total: entries.length, totalPages: Math.ceil(entries.length / limit) },
      ),
    );
  });

  app.get('/:name', async (c) => {
    const name = c.req.param('name');
    const skill = await getSkillByName(db, name);
    if (!skill) {
      const { status, body } = fail('NOT_FOUND', `Skill not found: ${name}`, 404);
      return c.json(body, status);
    }
    const agents = await db.select().from(skillAgents).where(eq(skillAgents.skillId, skill.id));
    const categories = await db
      .select()
      .from(skillCategories)
      .where(eq(skillCategories.skillId, skill.id));
    const [author] = skill.authorId
      ? await db.select().from(users).where(eq(users.id, skill.authorId)).limit(1)
      : [];
    return c.json(
      ok({
        name: skill.name,
        version: skill.version,
        description: skill.description,
        author: author?.username ?? 'unknown',
        license: skill.license,
        repository: skill.repository,
        content: skill.content,
        security_score: skill.securityScore,
        verified: skill.verified,
        downloads: skill.downloads,
        checksum: skill.checksum,
        agents: agents.map((a) => a.agentType),
        categories: categories.map((cat) => cat.category),
        tags: [],
      }),
    );
  });

  app.get('/:name/versions', async (c) => {
    const name = c.req.param('name');
    const versions = await db
      .select({ version: skills.version, createdAt: skills.createdAt })
      .from(skills)
      .where(eq(skills.name, name));
    if (versions.length === 0) {
      const { status, body } = fail('NOT_FOUND', `Skill not found: ${name}`, 404);
      return c.json(body, status);
    }
    return c.json(ok(versions));
  });

  app.get('/:name/security', async (c) => {
    const name = c.req.param('name');
    const skill = await getSkillByName(db, name);
    if (!skill) {
      const { status, body } = fail('NOT_FOUND', `Skill not found: ${name}`, 404);
      return c.json(body, status);
    }
    const [report] = await db
      .select()
      .from(securityReports)
      .where(eq(securityReports.skillId, skill.id))
      .limit(1);
    if (!report) {
      const { status, body } = fail('NOT_FOUND', 'No security report', 404);
      return c.json(body, status);
    }
    return c.json(
      ok({
        skill_name: name,
        score: report.score,
        passed: report.passed,
        blocked: report.blocked,
        issues: JSON.parse(report.issuesJson) as unknown[],
        scanned_at: report.scannedAt,
      }),
    );
  });

  app.post('/:name/download', async (c) => {
    const name = c.req.param('name');
    const skill = await getSkillByName(db, name);
    if (!skill) {
      const { status, body } = fail('NOT_FOUND', `Skill not found: ${name}`, 404);
      return c.json(body, status);
    }

    const ip = c.req.header('x-forwarded-for') ?? '0.0.0.0';
    await db.insert(downloads).values({
      id: randomUUID(),
      skillId: skill.id,
      userAgent: c.req.header('user-agent') ?? null,
      ipHash: hashIp(ip),
    });
    await db
      .update(skills)
      .set({ downloads: skill.downloads + 1 })
      .where(eq(skills.id, skill.id));

    const agents = await db.select().from(skillAgents).where(eq(skillAgents.skillId, skill.id));
    const categories = await db
      .select()
      .from(skillCategories)
      .where(eq(skillCategories.skillId, skill.id));

    return c.json(
      ok({
        name: skill.name,
        version: skill.version,
        description: skill.description,
        author: 'registry',
        license: skill.license,
        agents: agents.map((a) => a.agentType),
        categories: categories.map((cat) => cat.category),
        tags: [],
        content: skill.content,
        files: [],
      }),
    );
  });

  app.post('/', authMiddleware(jwtSecret), async (c) => {
    const user = c.get('user');
    const body: unknown = await c.req.json();
    const parsed = skillManifestSchema.safeParse(body);
    if (!parsed.success) {
      const { status, body: errBody } = fail('VALIDATION_ERROR', parsed.error.message, 400);
      return c.json(errBody, status);
    }
    try {
      const { id, report } = await publishSkill(db, parsed.data, user.id);
      return c.json(ok({ id, security: report }), 201);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Publish failed';
      const { status, body: errBody } = fail('PUBLISH_BLOCKED', msg, 422);
      return c.json(errBody, status);
    }
  });

  app.delete('/:name', authMiddleware(jwtSecret), async (c) => {
    const name = c.req.param('name');
    await db.delete(skills).where(eq(skills.name, name));
    return c.json(ok({ deleted: name }));
  });

  return app;
}
