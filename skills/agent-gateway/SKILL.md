---
name: agent-gateway
type: skill
description: Local-first personal AI agent gateway architecture for Windows with messaging integrations, tool execution, and real-time streaming.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [backend, ai-ml, architecture, realtime]
tags: [agent, gateway, local-first, windows, realtime, websocket, messaging, ai]
---

# Agent Gateway Architecture

Build a local-first personal AI agent gateway on Windows that connects messaging platforms with LLM providers via HTTP/WebSocket endpoints.

## Architecture Overview

```
Messaging Platforms (Telegram) → Gateway → LLM Providers
                    ↓         ↓        ↓
               WebSocket   HTTP    Tools
               (Mobile)   (RPC)   (Bash, Browser, Canvas)
                    ↓         ↓        ↓
               Streaming  Config   Approval Gates
```

## Core Components

| Component | Purpose | Tech |
|-----------|---------|------|
| HTTP Server | REST/RPC endpoints | Express/Fastify |
| WebSocket | Real-time connections | ws/Socket.io |
| Message Router | Channel+sender lookup | Custom |
| Session Manager | Session lifecycle | Custom |
| Tool Gateway | Tool execution | node-pty, CDP |
| LLM Router | LLM provider selection | Custom |
| Storage | Persistence | LanceDB, SQLite |

## Message Flow

1. **Inbound**: Telegram webhook → Parse → Auth check → Route to agent → Load transcript → LLM completion → Stream reply
2. **Outbound**: LLM stream → Chunk tokens → WebSocket delivery → Client display

## Configuration (Zod Schema)

```typescript
GatewayConfig = {
  gateway: { port: 3000, wsPort: 3001, maxConnections: 1000 }
  security: { mode: 'always-require-approval' | 'owner-only' | 'yolo' }
  storage: { lancedbPath: string, sqlitePath: string, retentionDays: 90 }
  providers: Record<string, { type: 'openai'|'anthropic'|'local', apiKey: string, model: string }>
  tools: { bash: { enabled: true, requireApproval: true }, ... }
  bindings: { channelId: string, senderId: string, agent: string, mode: string }[]
  allowlist: { users: string[], channels: string[], ips: string[] }
}
```

## Session Management

- **Session Key**: `SHA256(channelId:senderId)`
- **Storage**: `.jsonl` append-only format
- **Compaction**: Summarize old turns, keep recent
- **Metadata**: Token count, last compaction, checkpoint

```typescript
// Session structure
interface Session {
  id: string
  channelId: string
  senderId: string
  createdAt: number
  updatedAt: number
  agent: string
  mode: 'default' | 'strict' | 'sandbox'
  state: {
    conversation: Array<{ role: string, content: string, timestamp: number }>
    pendingApproval?: { tool: string, arguments: any, requestedAt: number }
  }
  metadata: { tokenCount: number, lastCompaction: number, checkpoint?: string }
}
```

## Message Routing

```typescript
class MessageRouter {
  async routeMessage(channelId: string, senderId: string, message: string): Promise<{ session: Session, agent: string, shouldRespond: boolean }> {
    // 1. Check authorization (allowlist)
    // 2. Check mention requirement for group chats
    // 3. Find binding or use default agent
    // 4. Derive session key
    // 5. Load or create session
    // 6. Check compaction needed
    return { session, agent, shouldRespond: true }
  }
}
```

## Endpoints

### HTTP
- `GET /health` - Health check
- `GET /api/config` - Get configuration
- `POST /api/chat` - Send message
- `GET /api/channels` - List channels
- `POST /api/channels/:id/webhook` - Platform webhook

### WebSocket (ws://localhost:3001)

**Client → Server:**
- `{type: "pair", token: "..."}` - Pair device
- `{type: "subscribe", channelId: "..."}` - Subscribe
- `{type: "message", channelId: "...", text: "..."}` - Send message
- `{type: "canvas", channelId: "...", commands: [...]}` - Canvas update

**Server → Client:**
- `{type: "chunk", channelId: "...", delta: "..."}` - Message chunk
- `{type: "message", channelId: "...", text: "...", done: true}` - Complete
- `{type: "canvas", channelId: "...", commands: [...]}` - Canvas update
- `{type: "presence", userId: "...", status: "online"}` - Presence

## Tool Gateway

### Approval System
```typescript
// Config modes
'always-require-approval'  // Always ask before dangerous tools
'owner-only'             // Only owner can approve
'yolo'                   // No approval (sandbox recommended)
```

### Dangerous Tools (require approval)
- `bash` - Shell execution (node-pty)
- `cron` - Scheduled jobs

### Safe Tools (no approval)
- `browser` - Chrome CDP control
- `canvas` - Drawing commands
- `image` - Image generation (Sharp)
- `file` - File read/write

## Storage

### LanceDB (Vector Store)
- Embeddings storage
- Semantic search
- Session memory

### SQLite (Relational)
- Sessions table
- Messages table
- Structured querying

## Tech Stack

- **Runtime**: Node.js 20+, Bun (optional)
- **HTTP**: Express/Fastify
- **WebSocket**: ws/Socket.io
- **Validation**: Zod
- **Database**: LanceDB + SQLite
- **Terminal**: node-pty
- **Canvas**: @napi-rs/canvas
- **Images**: Sharp
- **Encryption**: @matrix-org/matrix-sdk-crypto-nodejs
- **Package Manager**: pnpm
- **Tests**: Vitest
- **TypeScript**: Strict mode

## Security Features

1. **Pairing Code Flow**: Unknown senders get pairing code
2. **Token Rotation**: Device tokens change on each connect
3. **Mention Gating**: Only respond when mentioned in groups (configurable)
4. **Allowlist**: Per-channel approved senders
5. **Sandbox Mode**: Isolated execution for dangerous tools
6. **Approval Gates**: Configurable per-tool approval requirements

## Quick Start

```bash
# Install
pnpm init
pnpm add express ws zod better-sqlite3 @lancedb/lancedb node-pty @napi-rs/canvas sharp
pnpm add -D typescript vitest tsx @types/node

# Basic gateway
import { AgentGateway } from './core/gateway';
const gateway = new AgentGateway(config);
await gateway.initialize();
```

## Directory Structure

```
agent-gateway/
├── src/
│   ├── config/         # Zod schemas, config loading
│   ├── core/           # Gateway, server, router
│   ├── services/       # Session, LLM, tools, storage
│   ├── platforms/      # Telegram, WebSocket
│   └── api/            # HTTP routes, middleware
├── tests/              # Unit & integration tests
└── data/               # LanceDB, SQLite, uploads
```

## Best Practices

- Use connection pooling for HTTP requests
- Implement rate limiting (100 req/min default)
- Cache LLM responses for identical prompts
- Add comprehensive logging (Winston)
- Monitor with Prometheus metrics
- Validate all inputs with Zod
- Use append-only .jsonl for immutability
- Compact sessions periodically

## Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
COPY data ./data
EXPOSE 3000 3001
HEALTHCHECK --interval=30s CMD wget -q -O- http://localhost:3000/health
CMD ["node", "dist/index.js"]
```

## Resources

- [Node-pty](https://github.com/microsoft/node-pty) - Terminal emulation
- [LanceDB](https://lancedb.github.io/) - Vector database
- [Sharp](https://sharp.pixelplumber.com/) - Image processing
- [Zod](https://zod.dev/) - Schema validation
- [Vitest](https://vitest.dev/) - Testing

## Principles

1. **Local-First**: All data stored locally, offline-capable
2. **Security**: Dangerous tools gated, configurable approval
3. **Performance**: Connection pooling, caching, efficient
4. **Reliability**: Error handling, retries, health checks
5. **Privacy**: No data leaves without consent
