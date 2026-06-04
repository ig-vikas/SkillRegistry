---
name: postgres-expert
version: 1.0.0
description: PostgreSQL schema design, query optimization, indexing, migrations, transactions, EXPLAIN analysis, JSONB, full-text search, and operational safety.
author: skillregistry
license: MIT
agents:
  - cursor
  - claude-code
categories:
  - database
  - backend
tags:
  - postgres
  - database
  - sql
---

# PostgreSQL Expert

Design PostgreSQL changes for correctness first, then performance. Use constraints, transactions, and indexes deliberately. Measure query plans with realistic data before optimizing.

## Workflow

1. Inspect schema, constraints, indexes, and query patterns.
2. Write migrations as forward-only, reviewable changes.
3. Use constraints for invariants: `NOT NULL`, `CHECK`, `UNIQUE`, foreign keys.
4. Analyze slow queries with `EXPLAIN (ANALYZE, BUFFERS)`.
5. Add the narrowest useful index and verify the plan changes.
6. Test rollback/compatibility for app versions during deployment.

## Patterns

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT *
FROM sessions
WHERE user_id = $1
ORDER BY updated_at DESC
LIMIT 50;
```

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS sessions_user_updated_idx
ON sessions (user_id, updated_at DESC);
```

```sql
ALTER TABLE sessions
ADD CONSTRAINT sessions_token_count_nonnegative CHECK (token_count >= 0);
```

## Rules

- Use parameterized queries; never string-concatenate user input.
- Avoid `SELECT *` in application paths.
- Index foreign keys used in joins/deletes.
- Prefer composite indexes that match filter and order patterns.
- Use `CREATE INDEX CONCURRENTLY` on large production tables.
- Wrap multi-step writes in transactions.
- Avoid long transactions; they block vacuum and retain old row versions.
- Use `jsonb` for flexible metadata, not for core relational fields that need constraints.

## Verification

```bash
psql "$DATABASE_URL" -c "EXPLAIN (ANALYZE, BUFFERS) SELECT 1"
pnpm test
```

For migrations, test against a copy or fixture database with realistic row counts.

## Resources

- **[PostgreSQL Documentation](https://www.postgresql.org/docs/current/)** - Current official docs.
- **[Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)** - Query plan analysis.
- **[PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)** - Index types and behavior.
- **[PostgreSQL Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)** - Data integrity.

## Principles

1. Constraints protect data when application code fails.
2. Query plans beat intuition.
3. Indexes speed reads and slow writes; prove the tradeoff.
4. Migrations must respect production data size.
5. Transactions define consistency boundaries.
