---
name: redis-patterns
version: 1.0.0
description: Redis caching, TTLs, key design, distributed locks, streams, pub/sub, rate limiting, invalidation, observability, and production reliability patterns.
author: skillregistry
license: MIT
agents:
  - cursor
categories:
  - database
  - backend
tags:
  - redis
  - cache
  - streams
---

# Redis Patterns

Use Redis for bounded, operationally safe ephemeral data: caches, rate limits, queues/streams, pub/sub fanout, locks, and session-adjacent state. Do not treat Redis as a silent source of truth unless persistence and recovery are designed.

## Workflow

1. Decide the data role: cache, coordination, queue, session, or primary store.
2. Define key names, TTLs, cardinality, and memory bounds.
3. Use atomic commands or Lua/functions for multi-step invariants.
4. Add invalidation strategy before caching writes.
5. Test expiration, eviction, retries, and failover behavior.
6. Monitor memory, key count, latency, hit rate, and rejected connections.

## Patterns

```typescript
// Cache-aside with TTL and stampede guard shape.
const key = `session:${sessionId}:summary`;
const cached = await redis.get(key);
if (cached) return JSON.parse(cached);

const value = await loadSummary(sessionId);
await redis.set(key, JSON.stringify(value), { EX: 300 });
return value;
```

```text
rate:user:{userId}:messages -> INCR + EXPIRE in one Lua script
lock:job:{jobId}             -> SET value NX PX 30000
stream:gateway-events        -> XADD / XREADGROUP
```

## Rules

- Every cache key gets a TTL unless there is an explicit reason not to.
- Include version prefixes in keys when payload schemas change.
- Avoid unbounded keys, lists, sets, and streams.
- Use Redis Streams for durable-ish work queues; Pub/Sub is fire-and-forget.
- Use `SET NX PX` with unique lock values and safe release checks for locks.
- Do not cache authorization decisions without short TTL and invalidation.
- Monitor eviction policy; unexpected evictions are correctness bugs for some uses.

## Verification

```bash
redis-cli PING
redis-cli --scan --pattern 'session:*' | head
redis-cli INFO memory
redis-cli SLOWLOG GET 10
```

## Resources

- **[Redis Docs](https://redis.io/docs/latest/)** - Official Redis documentation.
- **[Redis Patterns](https://redis.io/docs/latest/develop/use/patterns/)** - Data structure and coordination patterns.
- **[Redis Streams](https://redis.io/docs/latest/develop/data-types/streams/)** - Stream processing.
- **[Redis Distributed Locks](https://redis.io/docs/latest/develop/use/patterns/distributed-locks/)** - Locking guidance and Redlock discussion.

## Principles

1. Redis data must be bounded.
2. TTLs are part of the schema.
3. Cache invalidation must be designed with writes.
4. Pub/Sub is not a queue.
5. Atomicity belongs in Redis commands/scripts, not client timing.
