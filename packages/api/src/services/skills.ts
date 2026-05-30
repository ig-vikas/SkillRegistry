import { createHash, randomUUID } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import type { RegistryEntry, SkillManifest } from '@skillregistry/core';
import { hashContent } from '@skillregistry/core';
import type { Database } from '../db/client.js';
import {
  skillAgents,
  skillCategories,
  skillTags,
  skills,
  users,
} from '../db/schema.js';
import { scanAndPersist } from './scanner.js';

/**
 * Get latest skill row by name.
 * @param db - Database
 * @param name - Skill name
 */
export async function getSkillByName(db: Database, name: string) {
  const [row] = await db
    .select()
    .from(skills)
    .where(eq(skills.name, name))
    .orderBy(desc(skills.createdAt))
    .limit(1);
  return row;
}

/**
 * Publish a new skill version.
 * @param db - Database
 * @param manifest - Skill manifest
 * @param authorId - Author user ID
 */
export async function publishSkill(
  db: Database,
  manifest: SkillManifest,
  authorId: string,
) {
  const id = randomUUID();
  const checksum = hashContent(manifest.content);

  await db.insert(skills).values({
    id,
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    authorId,
    content: manifest.content,
    rawFrontmatter: JSON.stringify(manifest),
    license: manifest.license,
    repository: manifest.repository ?? null,
    securityScore: 0,
    verified: false,
    downloads: 0,
    checksum,
  });

  for (const agent of manifest.agents) {
    await db.insert(skillAgents).values({ skillId: id, agentType: agent });
  }
  for (const category of manifest.categories) {
    await db.insert(skillCategories).values({ skillId: id, category });
  }
  for (const tag of manifest.tags) {
    await db.insert(skillTags).values({ skillId: id, tag });
  }

  const report = await scanAndPersist(db, id, manifest);
  if (report.blocked) {
    await db.delete(skills).where(eq(skills.id, id));
    throw new Error(`Skill blocked by security scanner (score: ${report.score})`);
  }

  return { id, report };
}

/**
 * Build registry index map from database.
 * @param db - Database
 */
export async function buildRegistryIndex(db: Database) {
  const allSkills = await db.select().from(skills);
  const index: Record<string, RegistryEntry> = {};

  for (const skill of allSkills) {
    const agents = await db
      .select()
      .from(skillAgents)
      .where(eq(skillAgents.skillId, skill.id));
    const categories = await db
      .select()
      .from(skillCategories)
      .where(eq(skillCategories.skillId, skill.id));
    const [author] = await db.select().from(users).where(eq(users.id, skill.authorId ?? ''));

    index[skill.name] = {
      name: skill.name,
      version: skill.version,
      description: skill.description,
      author: author?.username ?? 'unknown',
      categories: categories.map((c) => c.category) as RegistryEntry['categories'],
      agents: agents.map((a) => a.agentType) as RegistryEntry['agents'],
      security_score: skill.securityScore,
      verified: skill.verified,
      downloads: skill.downloads,
      checksum: skill.checksum,
    };
  }

  return index;
}

/**
 * Hash IP for download tracking.
 * @param ip - IP address
 */
export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}
