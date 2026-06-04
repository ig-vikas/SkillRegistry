---
name: presence-system
type: skill
description: WebSocket presence tracking for online, away, offline, and last-seen state with heartbeats, multi-device sessions, persistence, and status broadcasting.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [realtime, backend, websocket]
tags: [presence, websocket, heartbeat, multi-device, last-seen, status, realtime]
---

# Presence System Expert

Implement presence for gateway users and devices: online/offline/away state, heartbeat-based disconnect detection, multi-device aggregation, last-seen persistence, and status broadcasts to subscribed clients.

Presence is soft state. It should recover from dropped connections and process restarts without blocking core message delivery.

## Architecture

```
WebSocket Connection -> PresenceManager -> Device Presence Map
                                    |       |
                                    |       +-> Last-seen Store
                                    v
                              Broadcast to channel subscribers
```

## Core Components

| Component | Purpose | Technology/Implementation |
|-----------|---------|--------------------------|
| PresenceManager | Track device state | In-memory map plus persistence |
| HeartbeatMonitor | Detect broken connections | WebSocket ping/pong or app ping |
| Aggregator | User-level status from devices | online if any device online |
| Broadcaster | Notify subscribers | WebSocket gateway |
| Store | Keep last seen across restarts | SQLite or JSONL metadata |

## Setup & Installation

```bash
pnpm add ws zod
pnpm add -D @types/ws vitest typescript @types/node
```

## Configuration (Zod Schema)

```typescript
import { z } from "zod";

export const PresenceConfigSchema = z.object({
  heartbeatIntervalMs: z.number().int().positive().default(30_000),
  heartbeatTimeoutMs: z.number().int().positive().default(75_000),
  awayAfterMs: z.number().int().positive().default(5 * 60_000),
  offlineRetentionMs: z.number().int().positive().default(24 * 60 * 60_000),
  persistLastSeen: z.boolean().default(true),
  broadcastDebounceMs: z.number().int().min(0).default(250),
});

export type PresenceConfig = z.infer<typeof PresenceConfigSchema>;
```

## Implementation

### Presence Manager

```typescript
export type PresenceStatus = "online" | "away" | "offline";

export interface DevicePresence {
  userId: string;
  deviceId: string;
  connectionId: string;
  status: PresenceStatus;
  channels: Set<string>;
  connectedAt: number;
  lastSeenAt: number;
  lastHeartbeatAt: number;
}

export interface PresenceStore {
  saveLastSeen(userId: string, deviceId: string, lastSeenAt: number): Promise<void>;
}

export class PresenceManager {
  private devices = new Map<string, DevicePresence>();

  constructor(private config: PresenceConfig, private store?: PresenceStore) {}

  connect(input: { userId: string; deviceId: string; connectionId: string; channels?: string[] }): DevicePresence {
    const now = Date.now();
    const presence: DevicePresence = {
      userId: input.userId,
      deviceId: input.deviceId,
      connectionId: input.connectionId,
      status: "online",
      channels: new Set(input.channels ?? []),
      connectedAt: now,
      lastSeenAt: now,
      lastHeartbeatAt: now,
    };
    this.devices.set(this.key(input.userId, input.deviceId), presence);
    return presence;
  }

  heartbeat(userId: string, deviceId: string): void {
    const device = this.devices.get(this.key(userId, deviceId));
    if (!device) return;
    device.lastHeartbeatAt = Date.now();
    device.lastSeenAt = Date.now();
    device.status = "online";
  }

  async disconnect(userId: string, deviceId: string): Promise<void> {
    const key = this.key(userId, deviceId);
    const device = this.devices.get(key);
    if (!device) return;
    device.status = "offline";
    device.lastSeenAt = Date.now();
    await this.store?.saveLastSeen(userId, deviceId, device.lastSeenAt);
    this.devices.delete(key);
  }

  sweep(): Array<{ userId: string; deviceId: string; status: PresenceStatus }> {
    const now = Date.now();
    const changed: Array<{ userId: string; deviceId: string; status: PresenceStatus }> = [];
    for (const device of this.devices.values()) {
      if (now - device.lastHeartbeatAt > this.config.heartbeatTimeoutMs) {
        void this.disconnect(device.userId, device.deviceId);
        changed.push({ userId: device.userId, deviceId: device.deviceId, status: "offline" });
      } else if (now - device.lastSeenAt > this.config.awayAfterMs && device.status === "online") {
        device.status = "away";
        changed.push({ userId: device.userId, deviceId: device.deviceId, status: "away" });
      }
    }
    return changed;
  }

  getUserStatus(userId: string): PresenceStatus {
    const devices = [...this.devices.values()].filter((device) => device.userId === userId);
    if (devices.some((device) => device.status === "online")) return "online";
    if (devices.some((device) => device.status === "away")) return "away";
    return "offline";
  }

  listChannelUsers(channelId: string): Array<{ userId: string; status: PresenceStatus }> {
    const users = new Set([...this.devices.values()].filter((d) => d.channels.has(channelId)).map((d) => d.userId));
    return [...users].map((userId) => ({ userId, status: this.getUserStatus(userId) }));
  }

  private key(userId: string, deviceId: string): string {
    return `${userId}:${deviceId}`;
  }
}
```

### WebSocket Integration

```typescript
export function startPresenceSweep(manager: PresenceManager, broadcast: (event: unknown) => void, config: PresenceConfig) {
  return setInterval(() => {
    for (const change of manager.sweep()) {
      broadcast({ type: "presence", ...change, timestamp: Date.now() });
    }
  }, config.heartbeatIntervalMs);
}
```

## Integration with Gateway

```typescript
ws.on("pong", () => presence.heartbeat(client.userId, client.deviceId));
ws.on("close", () => presence.disconnect(client.userId, client.deviceId));
```

## Best Practices

1. Treat presence as eventually consistent soft state.
2. Track devices separately and aggregate to user status.
3. Use server-observed heartbeat times.
4. Persist last-seen, not every heartbeat.
5. Debounce broadcasts in busy channels.
6. Expire stale offline records.
7. Never use presence as the only authorization signal.

## Testing

### Unit Tests

```typescript
it("marks a user online when one device is online", () => {
  manager.connect({ userId: "u1", deviceId: "d1", connectionId: "c1" });
  expect(manager.getUserStatus("u1")).toBe("online");
});
```

### Integration Tests

```typescript
it("marks stale devices offline during sweep", () => {
  vi.useFakeTimers();
  manager.connect({ userId: "u1", deviceId: "d1", connectionId: "c1" });
  vi.advanceTimersByTime(config.heartbeatTimeoutMs + 1);
  expect(manager.sweep()[0]?.status).toBe("offline");
});
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Users stuck online | Missing disconnect/sweep | Run sweep and handle `close` |
| Users flicker offline | Timeout too close to interval | Use timeout at least 2x interval |
| Multi-device status wrong | Overwriting by user ID | Key by user+device |
| High broadcast volume | Heartbeats broadcast | Broadcast only status changes |
| Last-seen inaccurate | Client timestamps trusted | Use server time |

### Debug Commands

```bash
curl http://localhost:3000/api/presence/u1
wscat -c ws://localhost:3001/ws
```

## Resources

- **[ws README](https://github.com/websockets/ws)** - WebSocket ping/pong and server patterns.
- **[RFC 6455 WebSocket](https://datatracker.ietf.org/doc/html/rfc6455)** - WebSocket protocol.
- **[MDN WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)** - Browser WebSocket API.
- **[Socket.IO Rooms](https://socket.io/docs/v4/rooms/)** - Presence-style room concepts.
- **[OWASP WebSocket Security](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html)** - Security guidance.

## Principles

1. Presence is soft, not authoritative.
2. Device state and user state are different.
3. Heartbeats detect failure; they are not activity.
4. Broadcast changes, not noise.
5. Last-seen must survive reconnects.
