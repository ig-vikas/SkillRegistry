import { randomUUID } from 'node:crypto';
import type { SkillManifest } from '@skillregistry/core';
import { scanManifest } from '@skillregistry/scanner';
import { eq } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { securityReports, skills } from '../db/schema.js';

/**
 * Scan manifest and persist security report.
 * @param db - Database
 * @param skillId - Skill ID
 * @param manifest - Skill manifest
 * @returns Security report
 */
export async function scanAndPersist(db: Database, skillId: string, manifest: SkillManifest) {
  const report = scanManifest(manifest);

  await db.insert(securityReports).values({
    id: randomUUID(),
    skillId,
    score: report.score,
    passed: report.passed,
    blocked: report.blocked,
    issuesJson: JSON.stringify(report.issues),
    scannedAt: report.scanned_at,
  });

  await db.update(skills).set({ securityScore: report.score }).where(eq(skills.id, skillId));

  return report;
}
