---
name: session-management
type: skill
description: Session lifecycle management for AI agent gateway with .jsonl append-only transcripts, compaction checkpoints, and key derivation.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [backend, ai-ml, data]
tags: [session, management, jsonl, compaction, persistence, ai]
---

# Session Management Expert

Implement session lifecycle management for AI agent gateway with append-only `.jsonl` transcripts, automatic compaction, and secure key derivation.

## Session Key Derivation

```typescript
import { createHash } from 'crypto';

function deriveSessionKey(channelId: string, senderId: string): string {
  const key = `${channelId}:${senderId}`;
  const hash = createHash('sha256');
  hash.update(key);
  return hash.digest('hex');
}

// Usage
deriveSessionKey('telegram:12345', 'user:67890')
// => 'a1b2c3d4e5f6...'
```

## Session Structure

```typescript
interface SessionMessage {
  id: string;              // UUID v4
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;         // Message text
  timestamp: number;        // Unix timestamp
  tool_calls?: Array<{    // For tool calls
    id: string;
    name: string;
    arguments: any;
  }>;
  tool_results?: Array<{  // For tool results
    id: string;
    result: any;
  }>;
  metadata?: {            // Additional metadata
    tokenCount?: number;
    model?: string;
    latency?: number;
  };
}

interface Session {
  id: string;                    // sessionKey
  channelId: string;             // e.g., 'telegram:12345'
  senderId: string;              // e.g., 'user:67890'
  createdAt: number;             // Creation timestamp
  updatedAt: number;             // Last update timestamp
  agent: string;                 // LLM provider/agent name
  mode: 'default' | 'strict' | 'sandbox';
  state: {
    conversation: SessionMessage[];
    pendingApproval?: {
      tool: string;
      arguments: any;
      requestedAt: number;
      requestedBy: string;
    };
    activeTool?: {
      name: string;
      startedAt: number;
    };
  };
  metadata: {
    tokenCount: number;          // Total tokens in session
    lastCompaction: number;     // Last compaction timestamp
    checkpoint?: string;          // Summary of older turns
    compactionCount: number;     // Number of compactions performed
  };
}
```

## .jsonl Append-Only Format

### File Structure
```
/data/sessions/
  a1b2c3d4e5f6...jsonl    # Session file (append-only)
  x9y8z7w6v5u4...jsonl
  ...
```

### File Content
```jsonl
{"id":"msg_001","role":"system","content":"You are a helpful assistant.","timestamp":1717412345000}
{"id":"msg_002","role":"user","content":"Hello!","timestamp":1717412345100}
{"id":"msg_003","role":"assistant","content":"Hi there! How can I help?","timestamp":1717412345200}
{"id":"msg_004","role":"user","content":"What is 2+2?","timestamp":1717412345300}
{"id":"msg_005","role":"assistant","content":"4","timestamp":1717412345400}
```

### Advantages
- **Immutable**: Once written, never modified
- **Append-only**: Simple file operations, no seeks
- **Crash-safe**: Incomplete writes don't corrupt existing data
- **Streamable**: Can read from any point
- **Portable**: JSON is human-readable and widely supported

## Session Manager Implementation

```typescript
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class SessionManager {
  private sessionDir: string;
  private sessions = new Map<string, Session>();
  
  constructor(sessionDir: string = './data/sessions') {
    this.sessionDir = sessionDir;
  }
  
  async initialize() {
    await fs.mkdir(this.sessionDir, { recursive: true });
    await this.loadActiveSessions();
  }
  
  private async loadActiveSessions() {
    // Load sessions that were recently updated
    // (Implementation: scan directory, read recent files)
  }
  
  async createSession(
    channelId: string,
    senderId: string,
    agent: string,
    mode: Session['mode'] = 'default'
  ): Promise<Session> {
    const sessionKey = deriveSessionKey(channelId, senderId);
    const now = Date.now();
    
    const session: Session = {
      id: sessionKey,
      channelId,
      senderId,
      createdAt: now,
      updatedAt: now,
      agent,
      mode,
      state: {
        conversation: [],
      },
      metadata: {
        tokenCount: 0,
        lastCompaction: now,
        compactionCount: 0,
      },
    };
    
    // Create initial system message
    const systemMessage: SessionMessage = {
      id: uuidv4(),
      role: 'system',
      content: this.getSystemPrompt(agent, mode),
      timestamp: now,
      metadata: { tokenCount: 0 },
    };
    
    await this.appendMessage(sessionKey, systemMessage);
    session.state.conversation.push(systemMessage);
    
    this.sessions.set(sessionKey, session);
    return session;
  }
  
  async loadSession(sessionKey: string): Promise<Session | null> {
    // Check in-memory cache first
    if (this.sessions.has(sessionKey)) {
      return this.sessions.get(sessionKey)!;
    }
    
    // Load from disk
    const filePath = this.getSessionPath(sessionKey);
    const exists = await fs.access(filePath).then(() => true).catch(() => false);
    
    if (!exists) {
      return null;
    }
    
    // Parse .jsonl file
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    
    const session: Partial<Session> = {
      id: sessionKey,
      state: { conversation: [] },
      metadata: { tokenCount: 0, compactionCount: 0 },
    };
    
    let firstMessage: SessionMessage | null = null;
    
    for (const line of lines) {
      if (!line.trim()) continue;
      const message: SessionMessage = JSON.parse(line);
      session.state!.conversation.push(message);
      
      // Extract metadata from first message
      if (!firstMessage) firstMessage = message;
    }
    
    if (!firstMessage) return null;
    
    // Reconstruct session metadata
    session.channelId = firstMessage.metadata?.channelId;
    session.senderId = firstMessage.metadata?.senderId;
    session.createdAt = firstMessage.timestamp;
    session.updatedAt = session.state.conversation[session.state.conversation.length - 1].timestamp;
    session.agent = firstMessage.metadata?.agent || 'default';
    session.mode = firstMessage.metadata?.mode || 'default';
    session.metadata!.tokenCount = this.calculateTokenCount(session.state.conversation);
    session.metadata!.lastCompaction = firstMessage.metadata?.lastCompaction || session.createdAt;
    
    this.sessions.set(sessionKey, session as Session);
    return session as Session;
  }
  
  async appendMessage(sessionKey: string, message: SessionMessage): Promise<void> {
    const session = await this.loadSession(sessionKey);
    if (!session) {
      throw new Error(`Session ${sessionKey} not found`);
    }
    
    // Write to .jsonl file
    const filePath = this.getSessionPath(sessionKey);
    const line = JSON.stringify(message) + '\n';
    await fs.appendFile(filePath, line);
    
    // Update in-memory
    session.state.conversation.push(message);
    session.updatedAt = message.timestamp || Date.now();
    session.metadata.tokenCount += message.metadata?.tokenCount || estimateTokens(message.content);
    
    this.sessions.set(sessionKey, session);
  }
  
  async appendToSession(
    sessionKey: string,
    role: SessionMessage['role'],
    content: string,
    metadata?: SessionMessage['metadata']
  ): Promise<SessionMessage> {
    const now = Date.now();
    const message: SessionMessage = {
      id: uuidv4(),
      role,
      content,
      timestamp: now,
      metadata: {
        tokenCount: estimateTokens(content),
        ...metadata,
      },
    };
    
    await this.appendMessage(sessionKey, message);
    return message;
  }
  
  private getSessionPath(sessionKey: string): string {
    return path.join(this.sessionDir, `${sessionKey}.jsonl`);
  }
  
  private getSystemPrompt(agent: string, mode: Session['mode']): string {
    const prompts: Record<string, Record<Session['mode'], string>> = {
      'openai': {
        default: 'You are a helpful AI assistant.',
        strict: 'You are a helpful AI assistant. Always be cautious and verify information.',
        sandbox: 'You are a helpful AI assistant running in a sandboxed environment.',
      },
      'anthropic': {
        default: 'You are a helpful assistant.',
        strict: 'You are a helpful assistant. Always verify before acting.',
        sandbox: 'You are a helpful assistant in a sandboxed environment.',
      },
    };
    
    return prompts[agent]?.[mode] || prompts['openai'][mode] || prompts['openai'].default;
  }
  
  private calculateTokenCount(messages: SessionMessage[]): number {
    return messages.reduce((sum, msg) => 
      sum + (msg.metadata?.tokenCount || estimateTokens(msg.content)),
    0);
  }
}

function estimateTokens(text: string): number {
  // Approximate token counting
  // 4 characters ≈ 1 token for English
  return Math.ceil(text.length / 4);
}
```

## Compaction System

### Compaction Strategy

1. **Trigger**: When conversation exceeds `CHECKPOINT_INTERVAL` messages (default: 100)
2. **Action**: 
   - Keep most recent N messages in full
   - Summarize older messages into a checkpoint
   - Prepend checkpoint as system message
3. **Benefits**: 
   - Reduce LLM context window usage
   - Maintain conversation history
   - Improve performance

```typescript
const CHECKPOINT_INTERVAL = 100; // Keep last 100 messages
const CHECKPOINT_MIN_LENGTH = 50; // Minimum messages to compact

export class CompactionManager {
  constructor(private sessionManager: SessionManager) {}
  
  async checkAndCompact(sessionKey: string): Promise<boolean> {
    const session = await this.sessionManager.loadSession(sessionKey);
    if (!session) return false;
    
    const conversationLength = session.state.conversation.length;
    
    if (conversationLength <= CHECKPOINT_INTERVAL) {
      return false; // No compaction needed
    }
    
    // Don't compact if we just compacted recently
    const timeSinceCompaction = Date.now() - session.metadata.lastCompaction;
    const MIN_COMPACTION_INTERVAL = 3600000; // 1 hour
    if (timeSinceCompaction < MIN_COMPACTION_INTERVAL) {
      return false;
    }
    
    await this.compactSession(session);
    return true;
  }
  
  private async compactSession(session: Session): Promise<void> {
    const conversation = session.state.conversation;
    const recent = conversation.slice(-CHECKPOINT_INTERVAL);
    const old = conversation.slice(0, -CHECKPOINT_INTERVAL);
    
    // Generate summary of old messages using LLM
    const summary = await this.summarizeMessages(old);
    
    // Create checkpoint message
    const checkpointMessage: SessionMessage = {
      id: uuidv4(),
      role: 'system',
      content: `[CHECKPOINT] Previous conversation summary: ${summary}`,
      timestamp: Date.now(),
      metadata: {
        tokenCount: estimateTokens(summary),
        checkpoint: true,
        summarizedMessages: old.length,
        originalTokenCount: this.calculateTokenCount(old),
      },
    };
    
    // Create new conversation with checkpoint + recent
    const newConversation = [checkpointMessage, ...recent];
    
    // Write new .jsonl file (atomic operation)
    const tempPath = `${session.id}.tmp.jsonl`;
    const sessionPath = this.sessionManager.getSessionPath(session.id);
    
    // Write all messages to temp file
    for (const msg of newConversation) {
      const line = JSON.stringify(msg) + '\n';
      await fs.appendFile(path.join(this.sessionManager['sessionDir'], tempPath), line);
    }
    
    // Atomic rename
    await fs.rename(
      path.join(this.sessionManager['sessionDir'], tempPath),
      sessionPath
    );
    
    // Update session in memory
    session.state.conversation = newConversation;
    session.updatedAt = Date.now();
    session.metadata.lastCompaction = Date.now();
    session.metadata.compactionCount++;
    session.metadata.tokenCount = this.calculateTokenCount(newConversation);
    session.metadata.checkpoint = summary;
    
    this.sessionManager['sessions'].set(session.id, session);
  }
  
  private async summarizeMessages(messages: SessionMessage[]): Promise<string> {
    // Use LLM to summarize messages
    // Implementation depends on your LLM provider
    const prompt = this.buildSummaryPrompt(messages);
    
    const response = await llm.chat({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.3,
    });
    
    return response.content;
  }
  
  private buildSummaryPrompt(messages: SessionMessage[]): string {
    const userMessages = messages
      .filter(m => m.role === 'user')
      .map(m => `User: ${m.content}`)
      .join('\n');
    
    const assistantMessages = messages
      .filter(m => m.role === 'assistant')
      .map(m => `Assistant: ${m.content}`)
      .join('\n');
    
    return `Please provide a concise summary (2-3 sentences) of the following conversation:\n\n${userMessages}\n\n${assistantMessages}`;
  }
  
  private calculateTokenCount(messages: SessionMessage[]): number {
    return messages.reduce((sum, msg) => 
      sum + (msg.metadata?.tokenCount || estimateTokens(msg.content)),
    0);
  }
}
```

## Session Cleanup

### Retention Policy

```typescript
class SessionCleanup {
  constructor(
    private sessionManager: SessionManager,
    private retentionDays: number = 90
  ) {}
  
  async cleanupOldSessions(): Promise<{ deleted: number; kept: number }> {
    const sessionDir = this.sessionManager['sessionDir'];
    const files = await fs.readdir(sessionDir);
    const now = Date.now();
    const retentionMs = this.retentionDays * 24 * 60 * 60 * 1000;
    
    let deleted = 0;
    let kept = 0;
    
    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;
      
      const filePath = path.join(sessionDir, file);
      const stat = await fs.stat(filePath);
      
      if (now - stat.mtimeMs > retentionMs) {
        await fs.unlink(filePath);
        deleted++;
      } else {
        kept++;
      }
    }
    
    // Also remove from memory cache
    for (const [sessionKey, session] of this.sessionManager['sessions']) {
      if (now - session.updatedAt > retentionMs) {
        this.sessionManager['sessions'].delete(sessionKey);
      }
    }
    
    return { deleted, kept };
  }
  
  async cleanupEmptySessions(): Promise<{ deleted: number }> {
    const sessionDir = this.sessionManager['sessionDir'];
    const files = await fs.readdir(sessionDir);
    
    let deleted = 0;
    
    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;
      
      const filePath = path.join(sessionDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Empty or only system message
      const lines = content.trim().split('\n').filter(l => l.trim());
      if (lines.length <= 1) {
        await fs.unlink(filePath);
        deleted++;
      }
    }
    
    return { deleted };
  }
}
```

## Usage Examples

### Basic Usage

```typescript
import { SessionManager } from './session-manager';

const manager = new SessionManager('./data/sessions');
await manager.initialize();

// Create a new session
const session = await manager.createSession(
  'telegram:12345',
  'user:67890',
  'openai',
  'default'
);

// Append user message
const userMessage = await manager.appendToSession(
  session.id,
  'user',
  'What is 2+2?'
);

// Append assistant message
const assistantMessage = await manager.appendToSession(
  session.id,
  'assistant',
  '4'
);

// Load session
const loaded = await manager.loadSession(session.id);
console.log(loaded?.state.conversation);
```

### With Compaction

```typescript
import { CompactionManager } from './compaction-manager';

const compaction = new CompactionManager(manager);

// After each message, check if compaction is needed
for (const message of incomingMessages) {
  await manager.appendToSession(session.id, message.role, message.content);
  await compaction.checkAndCompact(session.id);
}
```

### With Cleanup

```typescript
import { SessionCleanup } from './cleanup';

const cleanup = new SessionCleanup(manager, 30); // 30 day retention

// Run cleanup daily
setInterval(async () => {
  const result = await cleanup.cleanupOldSessions();
  console.log(`Cleanup: deleted ${result.deleted}, kept ${result.kept}`);
}, 24 * 60 * 60 * 1000);
```

## Advanced Features

### Session Snapshots

```typescript
class SessionSnapshot {
  constructor(private sessionManager: SessionManager) {}
  
  async createSnapshot(sessionKey: string): Promise<SessionSnapshotData> {
    const session = await this.sessionManager.loadSession(sessionKey);
    if (!session) throw new Error('Session not found');
    
    return {
      id: uuidv4(),
      sessionId: session.id,
      channelId: session.channelId,
      senderId: session.senderId,
      createdAt: Date.now(),
      data: {
        conversation: session.state.conversation,
        metadata: session.metadata,
      },
    };
  }
  
  async restoreSnapshot(snapshot: SessionSnapshotData): Promise<Session> {
    const session = await this.sessionManager.createSession(
      snapshot.channelId,
      snapshot.senderId,
      'default',
      'default'
    );
    
    // Clear existing conversation
    session.state.conversation = [];
    
    // Restore from snapshot
    for (const message of snapshot.data.conversation) {
      await this.sessionManager.appendMessage(session.id, message);
    }
    
    session.metadata = snapshot.data.metadata;
    session.updatedAt = Date.now();
    
    return session;
  }
}
```

### Session Export/Import

```typescript
class SessionExport {
  constructor(private sessionManager: SessionManager) {}
  
  async exportSession(sessionKey: string, format: 'jsonl' | 'json' = 'jsonl'): Promise<Uint8Array> {
    const session = await this.sessionManager.loadSession(sessionKey);
    if (!session) throw new Error('Session not found');
    
    if (format === 'jsonl') {
      const filePath = this.sessionManager.getSessionPath(sessionKey);
      return await fs.readFile(filePath);
    }
    
    // JSON format
    return Buffer.from(JSON.stringify(session, null, 2));
  }
  
  async importSession(
    data: Uint8Array,
    format: 'jsonl' | 'json' = 'jsonl',
    targetKey?: string
  ): Promise<Session> {
    if (format === 'jsonl') {
      // Create new session key if not provided
      const sessionKey = targetKey || uuidv4();
      const filePath = path.join(this.sessionManager['sessionDir'], `${sessionKey}.jsonl`);
      await fs.writeFile(filePath, data);
      
      // Load and parse
      const session = await this.sessionManager.loadSession(sessionKey);
      if (!session) throw new Error('Failed to load imported session');
      return session;
    }
    
    // JSON format
    const sessionData = JSON.parse(data.toString()) as Session;
    
    // Ensure we have a valid session key
    const sessionKey = sessionData.id || uuidv4();
    sessionData.id = sessionKey;
    
    // Write as .jsonl
    const filePath = path.join(this.sessionManager['sessionDir'], `${sessionKey}.jsonl`);
    for (const message of sessionData.state.conversation) {
      const line = JSON.stringify(message) + '\n';
      await fs.appendFile(filePath, line);
    }
    
    this.sessionManager['sessions'].set(sessionKey, sessionData);
    return sessionData;
  }
}
```

### Session Search

```typescript
class SessionSearch {
  constructor(private sessionManager: SessionManager) {}
  
  async searchSessions(
    query: string,
    limit: number = 10
  ): Promise<Array<{ sessionId: string; score: number; snippet: string }>> {
    const sessionDir = this.sessionManager['sessionDir'];
    const files = await fs.readdir(sessionDir);
    const results: Array<{ sessionId: string; score: number; snippet: string }> = [];
    
    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;
      
      const sessionKey = file.replace('.jsonl', '');
      const session = await this.sessionManager.loadSession(sessionKey);
      if (!session) continue;
      
      // Search in conversation
      for (const message of session.state.conversation) {
        if (message.content.toLowerCase().includes(query.toLowerCase())) {
          const snippet = this.createSnippet(message.content, query, 100);
          results.push({
            sessionId: sessionKey,
            score: 1, // Simple matching
            snippet,
          });
          break;
        }
      }
    }
    
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
  
  private createSnippet(text: string, query: string, maxLength: number): string {
    const queryIndex = text.toLowerCase().indexOf(query.toLowerCase());
    const start = Math.max(0, queryIndex - 20);
    const end = Math.min(text.length, queryIndex + query.length + maxLength);
    
    let snippet = text.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    
    return snippet;
  }
}
```

## Integration with Gateway

```typescript
// In AgentGateway class
import { SessionManager } from './session-management';
import { CompactionManager } from './session-management/compaction';
import { SessionCleanup } from './session-management/cleanup';

class AgentGateway {
  private sessionManager: SessionManager;
  private compactionManager: CompactionManager;
  private cleanup: SessionCleanup;
  
  async initialize() {
    this.sessionManager = new SessionManager('./data/sessions');
    await this.sessionManager.initialize();
    
    this.compactionManager = new CompactionManager(this.sessionManager);
    this.cleanup = new SessionCleanup(this.sessionManager, this.config.retentionDays);
    
    // Start cleanup job
    this.startCleanupJob();
  }
  
  private startCleanupJob() {
    setInterval(async () => {
      await this.cleanup.cleanupOldSessions();
      await this.cleanup.cleanupEmptySessions();
    }, 24 * 60 * 60 * 1000); // Daily
  }
  
  async handleMessage(channelId: string, senderId: string, message: string): Promise<string> {
    const sessionKey = deriveSessionKey(channelId, senderId);
    
    // Load or create session
    let session = await this.sessionManager.loadSession(sessionKey);
    if (!session) {
      session = await this.sessionManager.createSession(
        channelId, senderId, this.defaultAgent, 'default'
      );
    }
    
    // Check compaction
    await this.compactionManager.checkAndCompact(sessionKey);
    
    // Append user message
    await this.sessionManager.appendToSession(sessionKey, 'user', message);
    
    // Process with LLM
    const response = await this.processWithLLM(session, message);
    
    // Append assistant message
    await this.sessionManager.appendToSession(sessionKey, 'assistant', response);
    
    // Check compaction again
    await this.compactionManager.checkAndCompact(sessionKey);
    
    return response;
  }
}
```

## Best Practices

1. **Atomic Writes**: Use temp files + rename for crash safety
2. **Memory Cache**: Keep active sessions in memory for performance
3. **Periodic Compaction**: Run compaction after every N messages
4. **Background Cleanup**: Run cleanup jobs during low-traffic periods
5. **Error Recovery**: Handle file system errors gracefully
6. **Concurrency Control**: Use file locks for concurrent writes
7. **Backup**: Regularly backup session directory
8. **Monitoring**: Track session counts, token usage, compaction stats

## Performance Considerations

| Operation | Complexity | Optimization |
|-----------|------------|--------------|
| Load session | O(n) messages | Memory cache |
| Append message | O(1) | File append |
| Compaction | O(n) | Background job |
| Search | O(n) sessions | Indexing |
| Cleanup | O(n) files | Batch processing |

## Configuration Options

```typescript
interface SessionConfig {
  sessionDir: string;           // Session directory path
  checkpointInterval: number;   // Messages before compaction
  retentionDays: number;        // Session retention period
  maxSessionSize: number;       // Max .jsonl file size
  compactionMinInterval: number; // Min time between compactions
  cleanupInterval: number;     // Cleanup job interval
}
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Session not found | Wrong key | Verify channelId:senderId combination |
| Compaction fails | LLM error | Check LLM provider connection |
| High disk usage | Too many sessions | Reduce retentionDays, run cleanup |
| Memory leaks | Too many cached sessions | Limit cache size, evict old |
| File locks | Concurrent writes | Use proper file locking |
| Corrupt .jsonl | Crash during write | Use atomic writes |

### Debug Commands

```bash
# List sessions
ls -lh data/sessions/

# View session
cat data/sessions/a1b2c3d4.jsonl

# Count messages
grep -c "^{" data/sessions/*.jsonl

# Check disk usage
du -sh data/sessions/

# Monitor writes
tail -f data/sessions/*.jsonl
```

## Resources

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Append-only Logs](https://en.wikipedia.org/wiki/Write-ahead_logging)
- [UUID v4](https://uuidjs.github.io/)
- [JSON Lines Format](https://jsonlines.org/)

## Principles

1. **Immutability**: Never modify existing data
2. **Crash Safety**: Atomic operations, append-only
3. **Performance**: Optimize for read/write patterns
4. **Simplicity**: Easy to understand and debug
5. **Reliability**: Handle errors gracefully
6. **Scalability**: Works with thousands of sessions
