import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema.js';

export type Database = LibSQLDatabase<typeof schema>;

/**
 * Create database client and Drizzle instance.
 * @param url - libSQL database URL
 * @param authToken - Optional Turso auth token
 * @returns Drizzle database
 */
export function createDb(url: string, authToken?: string): Database {
  const client: Client = createClient(authToken ? { url, authToken } : { url });
  return drizzle(client, { schema });
}

/**
 * Run migrations SQL on database (bootstrap for dev/test).
 * @param db - Drizzle database
 */
export async function migrateDb(db: Database): Promise<void> {
  const { sql } = await import('drizzle-orm');
  await db.run(sql`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    github_id TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT NOT NULL,
    author_id TEXT REFERENCES users(id),
    content TEXT NOT NULL,
    raw_frontmatter TEXT NOT NULL,
    license TEXT NOT NULL,
    repository TEXT,
    security_score INTEGER NOT NULL DEFAULT 0,
    verified INTEGER NOT NULL DEFAULT 0,
    downloads INTEGER NOT NULL DEFAULT 0,
    checksum TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS skills_name_version ON skills(name, version)`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS skill_agents (
    skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    agent_type TEXT NOT NULL
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS skill_categories (
    skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    category TEXT NOT NULL
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS skill_tags (
    skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    tag TEXT NOT NULL
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS security_reports (
    id TEXT PRIMARY KEY,
    skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    passed INTEGER NOT NULL,
    blocked INTEGER NOT NULL,
    issues_json TEXT NOT NULL,
    scanned_at TEXT NOT NULL
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS downloads (
    id TEXT PRIMARY KEY,
    skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    user_agent TEXT,
    ip_hash TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    author_id TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  await db.run(sql`CREATE TABLE IF NOT EXISTS collection_skills (
    collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE
  )`);

  await db.run(sql`CREATE VIRTUAL TABLE IF NOT EXISTS skills_fts USING fts5(
    name, description, tags, content='skills', content_rowid='rowid'
  )`);
}
