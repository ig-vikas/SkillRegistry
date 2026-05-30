import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  githubId: text('github_id').notNull().unique(),
  username: text('username').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const skills = sqliteTable(
  'skills',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    version: text('version').notNull(),
    description: text('description').notNull(),
    authorId: text('author_id').references(() => users.id),
    content: text('content').notNull(),
    rawFrontmatter: text('raw_frontmatter').notNull(),
    license: text('license').notNull(),
    repository: text('repository'),
    securityScore: integer('security_score').notNull().default(0),
    verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
    downloads: integer('downloads').notNull().default(0),
    checksum: text('checksum').notNull(),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  },
  (t) => [uniqueIndex('skills_name_version').on(t.name, t.version), index('skills_name_idx').on(t.name)],
);

export const skillAgents = sqliteTable('skill_agents', {
  skillId: text('skill_id')
    .notNull()
    .references(() => skills.id, { onDelete: 'cascade' }),
  agentType: text('agent_type').notNull(),
});

export const skillCategories = sqliteTable('skill_categories', {
  skillId: text('skill_id')
    .notNull()
    .references(() => skills.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
});

export const skillTags = sqliteTable('skill_tags', {
  skillId: text('skill_id')
    .notNull()
    .references(() => skills.id, { onDelete: 'cascade' }),
  tag: text('tag').notNull(),
});

export const securityReports = sqliteTable('security_reports', {
  id: text('id').primaryKey(),
  skillId: text('skill_id')
    .notNull()
    .references(() => skills.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  passed: integer('passed', { mode: 'boolean' }).notNull(),
  blocked: integer('blocked', { mode: 'boolean' }).notNull(),
  issuesJson: text('issues_json').notNull(),
  scannedAt: text('scanned_at').notNull(),
});

export const downloads = sqliteTable('downloads', {
  id: text('id').primaryKey(),
  skillId: text('skill_id')
    .notNull()
    .references(() => skills.id, { onDelete: 'cascade' }),
  userAgent: text('user_agent'),
  ipHash: text('ip_hash'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const collections = sqliteTable('collections', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  authorId: text('author_id').references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const collectionSkills = sqliteTable('collection_skills', {
  collectionId: text('collection_id')
    .notNull()
    .references(() => collections.id, { onDelete: 'cascade' }),
  skillId: text('skill_id')
    .notNull()
    .references(() => skills.id, { onDelete: 'cascade' }),
});
