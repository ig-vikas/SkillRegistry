---
name: message-routing
type: skill
description: Message routing engine for AI agent gateway with channel+sender lookup, binding resolution, mention detection, and authorization checks.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [backend, ai-ml, messaging]
tags: [routing, message, channel, sender, binding, authorization, telegram]
---

# Message Routing Expert

Implement intelligent message routing for AI agent gateway that looks up channel+sender pairs in config bindings, falls back to default agent, and handles authorization and mention requirements.

## Routing Algorithm

```
Incoming Message
     │
     ▼
┌─────────────────┐
│ 1. Parse Message │
│ - Extract channel │
│ - Extract sender  │
│ - Extract content │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Auth Check    │
│ - Is sender      │
│   allowlisted?   │
│ - Pairing       │
│   required?     │
└────────┬────────┘
         │
         ├── NO ─────────────────────▶ Reject/Request Pairing
         │
         ▼ YES
┌─────────────────┐
│ 3. Mention Check │
│ - Is group chat? │
│ - Is mentioned?  │
│ - Config allows? │
└────────┬────────┘
         │
         ├── NO (group + not mentioned) ──────────────▶ Ignore
         │
         ▼ YES
┌─────────────────┐
│ 4. Find Binding  │
│ - channel+sender│
│ - channel only  │
│ - wildcard      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Derive Key   │
│ - SHA256 hash   │
│ - Load Session  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. Route to     │
│    Agent        │
│ - Process      │
│ - Stream reply │
└─────────────────┘
```

## Implementation

```typescript
import { createHash } from 'crypto';

interface RoutingConfig {
  requireMention: boolean;
  mentionPattern: string;
  bindings: Array<{
    channelId: string;
    senderId?: string;
    agent: string;
    mode: 'default' | 'strict' | 'sandbox';
    autoApprove: boolean;
    mentionRequired: boolean;
  }>;
  allowlist: {
    users: string[];
    channels: string[];
    ips: string[];
  };
  defaultAgent: string;
}

interface RouteResult {
  sessionKey: string;
  agent: string;
  mode: 'default' | 'strict' | 'sandbox';
  shouldRespond: boolean;
  reason?: string;
  requiresApproval?: boolean;
}

export class MessageRouter {
  constructor(private config: RoutingConfig) {}
  
  route(
    channelId: string,
    senderId: string,
    content: string,
    platform: string,
    ip?: string
  ): RouteResult {
    // 1. Authorization check
    const authResult = this.checkAuthorization(senderId, channelId, platform, ip);
    if (!authResult.authorized) {
      return {
        sessionKey: '',
        agent: '',
        mode: 'default',
        shouldRespond: false,
        reason: authResult.reason,
        requiresApproval: authResult.requiresPairing,
      };
    }
    
    // 2. Mention check for group chats
    const mentionResult = this.checkMentionRequirement(channelId, senderId, content, platform);
    if (!mentionResult.shouldRespond) {
      return {
        ...mentionResult,
        sessionKey: deriveSessionKey(channelId, senderId),
      };
    }
    
    // 3. Find binding
    const binding = this.findBinding(channelId, senderId);
    const agent = binding?.agent || this.config.defaultAgent;
    const mode = binding?.mode || 'default';
    const autoApprove = binding?.autoApprove || false;
    
    // 4. Derive session key
    const sessionKey = deriveSessionKey(channelId, senderId);
    
    return {
      sessionKey,
      agent,
      mode,
      shouldRespond: true,
      requiresApproval: !autoApprove && this.config.requireMention,
    };
  }
  
  private checkAuthorization(
    senderId: string,
    channelId: string,
    platform: string,
    ip?: string
  ): { authorized: boolean; reason?: string; requiresPairing?: boolean } {
    // Check IP allowlist
    if (ip && this.config.allowlist.ips.length > 0) {
      if (!this.config.allowlist.ips.includes(ip)) {
        return { authorized: false, reason: 'IP not allowlisted' };
      }
    }
    
    // Check user allowlist
    if (this.config.allowlist.users.includes(senderId)) {
      return { authorized: true };
    }
    
    // Check channel allowlist
    if (this.config.allowlist.channels.includes(channelId)) {
      return { authorized: true };
    }
    
    // Platform-specific checks
    if (platform === 'telegram') {
      // Check if chat is in allowed chats
      const telegramConfig = this.config.platforms?.telegram;
      if (telegramConfig?.allowedChats?.includes(channelId)) {
        return { authorized: true };
      }
    }
    
    // Require pairing for unknown senders
    return { 
      authorized: false, 
      reason: 'Sender not authorized',
      requiresPairing: true 
    };
  }
  
  private checkMentionRequirement(
    channelId: string,
    senderId: string,
    content: string,
    platform: string
  ): { shouldRespond: boolean; reason?: string } {
    // Skip for direct messages (not group chats)
    if (!this.isGroupChat(channelId, platform)) {
      return { shouldRespond: true };
    }
    
    // Check if mention is required
    const mentionRequired = this.config.requireMention;
    if (!mentionRequired) {
      return { shouldRespond: true };
    }
    
    // Check if mentioned
    const isMentioned = this.isMentioned(content, senderId, platform);
    if (isMentioned) {
      return { shouldRespond: true };
    }
    
    // Check binding-specific requirement
    const binding = this.findBinding(channelId, senderId);
    if (binding?.mentionRequired === false) {
      return { shouldRespond: true };
    }
    
    return { 
      shouldRespond: false, 
      reason: 'Bot not mentioned in group chat' 
    };
  }
  
  private isGroupChat(channelId: string, platform: string): boolean {
    // Telegram: negative chat IDs are groups/supergroups
    if (platform === 'telegram') {
      return channelId.startsWith('-100') || (Number(channelId) < 0);
    }
    
    // Discord: guild channels
    if (platform === 'discord') {
      return channelId !== 'dm' && !channelId.startsWith('DM');
    }
    
    // Default: assume group if channel ID contains hyphen or is numeric
    return /^[\d-]+$/.test(channelId);
  }
  
  private isMentioned(content: string, senderId: string, platform: string): boolean {
    // Telegram: @botname or @botname bot
    if (platform === 'telegram') {
      const botName = this.getBotName();
      const mentionPattern = new RegExp(`@${botName}\\b`, 'i');
      return mentionPattern.test(content);
    }
    
    // Discord: <@botid> or <@!botid>
    if (platform === 'discord') {
      const botId = this.getBotId();
      const mentionPattern = new RegExp(`<@!?${botId}>`, 'i');
      return mentionPattern.test(content);
    }
    
    // Generic: @bot or @botname
    const genericPattern = /@bot\b/i;
    return genericPattern.test(content);
  }
  
  private findBinding(channelId: string, senderId: string) {
    // 1. Exact match: channel + sender
    const exactMatch = this.config.bindings.find(b => 
      b.channelId === channelId && b.senderId === senderId
    );
    if (exactMatch) return exactMatch;
    
    // 2. Channel match: channel only (wildcard sender)
    const channelMatch = this.config.bindings.find(b => 
      b.channelId === channelId && b.senderId === undefined
    );
    if (channelMatch) return channelMatch;
    
    // 3. Wildcard match: * for channel or sender
    const wildcardMatch = this.config.bindings.find(b => 
      b.channelId === '*' || b.senderId === '*'
    );
    
    return wildcardMatch || null;
  }
  
  private getBotName(): string {
    // Implement based on your config
    return 'MyAgentBot';
  }
  
  private getBotId(): string {
    // Implement based on your config
    return '123456789';
  }
}

function deriveSessionKey(channelId: string, senderId: string): string {
  const key = `${channelId}:${senderId}`;
  const hash = createHash('sha256');
  hash.update(key);
  return hash.digest('hex');
}
```

## Binding Configuration

### Binding Types

```typescript
type BindingConfig = {
  // Exact match for specific user in specific channel
  channelId: string;
  senderId: string;
  agent: string;
  mode: 'default' | 'strict' | 'sandbox';
  autoApprove: boolean;
  mentionRequired: boolean;
};

// Examples
const bindings: BindingConfig[] = [
  // User-specific in a channel
  {
    channelId: 'telegram:12345',
    senderId: 'user:67890',
    agent: 'anthropic',
    mode: 'default',
    autoApprove: true,
    mentionRequired: false,
  },
  
  // Channel-wide (all users)
  {
    channelId: 'telegram:12345',
    agent: 'openai',
    mode: 'strict',
    autoApprove: false,
    mentionRequired: true,
  },
  
  // User-specific across all channels
  {
    channelId: '*',
    senderId: 'user:67890',
    agent: 'local',
    mode: 'sandbox',
    autoApprove: true,
    mentionRequired: false,
  },
  
  // Global default
  {
    channelId: '*',
    senderId: '*',
    agent: 'openai',
    mode: 'default',
    autoApprove: false,
    mentionRequired: true,
  },
];
```

## Platform-Specific Routing

### Telegram

```typescript
class TelegramRouter {
  constructor(private baseRouter: MessageRouter) {}
  
  route(update: TelegramUpdate): RouteResult | null {
    // Extract channel and sender from Telegram update
    const channelId = this.getChannelId(update);
    const senderId = this.getSenderId(update);
    const content = this.getContent(update);
    
    if (!channelId || !senderId) return null;
    
    return this.baseRouter.route(
      `telegram:${channelId}`,
      `telegram:${senderId}`,
      content,
      'telegram'
    );
  }
  
  private getChannelId(update: TelegramUpdate): string | null {
    if (update.message) {
      return String(update.message.chat.id);
    }
    if (update.callback_query) {
      return String(update.callback_query.message?.chat.id);
    }
    return null;
  }
  
  private getSenderId(update: TelegramUpdate): string | null {
    if (update.message) {
      return String(update.message.from?.id);
    }
    if (update.callback_query) {
      return String(update.callback_query.from?.id);
    }
    return null;
  }
  
  private getContent(update: TelegramUpdate): string {
    if (update.message?.text) {
      return update.message.text;
    }
    if (update.message?.caption) {
      return update.message.caption;
    }
    if (update.callback_query?.data) {
      return update.callback_query.data;
    }
    return '';
  }
}
```

### WebSocket (Control UI / Mobile)

```typescript
class WebSocketRouter {
  constructor(private baseRouter: MessageRouter) {}
  
  route(message: WebSocketMessage, client: WebSocketClient): RouteResult | null {
    const channelId = message.channelId;
    const senderId = client.userId; // From authentication
    const content = message.text;
    
    // For WebSocket, we typically want to respond
    return this.baseRouter.route(
      channelId,
      senderId,
      content,
      'websocket'
    );
  }
}
```

### Webhook (Generic)

```typescript
class WebhookRouter {
  constructor(private baseRouter: MessageRouter) {}
  
  route(
    path: string,
    body: any,
    headers: Record<string, string>
  ): RouteResult | null {
    // Extract platform from path
    const platformMatch = path.match(/\/webhook\/([^\/]+)/);
    const platform = platformMatch?.[1] || 'unknown';
    
    // Platform-specific parsing
    switch (platform) {
      case 'telegram':
        const telegramUpdate = body;
        const telegramRouter = new TelegramRouter(this.baseRouter);
        return telegramRouter.route(telegramUpdate);
      
      case 'discord':
        return this.routeDiscord(body);
      
      case 'slack':
        return this.routeSlack(body);
      
      default:
        // Generic webhook
        const channelId = body.channel || body.chatId || headers['x-channel-id'];
        const senderId = body.user || body.from || headers['x-sender-id'];
        const content = body.text || body.content || JSON.stringify(body);
        
        if (!channelId || !senderId) return null;
        
        return this.baseRouter.route(
          `${platform}:${channelId}`,
          `${platform}:${senderId}`,
          content,
          platform
        );
    }
  }
}
```

## Mention Detection Patterns

### Telegram

```typescript
function isMentionedTelegram(content: string, botName: string): boolean {
  // @botname
  const atMention = new RegExp(`@${botName}\b`, 'i');
  
  // @botname bot (with space for ambiguity)
  const spacedMention = new RegExp(`@${botName} bot\b`, 'i');
  
  // Direct mention in reply
  // (Telegram doesn't have a standard way, but we can check for reply_to_message)
  
  return atMention.test(content) || spacedMention.test(content);
}
```

### Discord

```typescript
function isMentionedDiscord(content: string, botId: string): boolean {
  // <@botid>
  const simpleMention = new RegExp(`<@${botId}>`, 'i');
  
  // <@!botid> (with exclamation for nickname)
  const nicknameMention = new RegExp(`<@!${botId}>`, 'i');
  
  // @here or @everyone (should always respond)
  const hereMention = /@(here|everyone)\b/i;
  
  return simpleMention.test(content) || 
         nicknameMention.test(content) ||
         hereMention.test(content);
}
```

### Slack

```typescript
function isMentionedSlack(content: string, botId: string, botName: string): boolean {
  // <@botid>
  const idMention = new RegExp(`<@${botId}>`, 'i');
  
  // @botname
  const nameMention = new RegExp(`@${botName}\b`, 'i');
  
  // @channel, @here, @everyone
  const specialMentions = /@(channel|here|everyone)\b/i;
  
  return idMention.test(content) || 
         nameMention.test(content) ||
         specialMentions.test(content);
}
```

## Authorization Flows

### Pairing Code Flow

```typescript
class PairingManager {
  private pendingPairings = new Map<string, { code: string; expires: number; senderId: string }>();
  private pairings = new Map<string, { senderId: string; createdAt: number }>();
  
  generatePairingCode(senderId: string): string {
    const code = this.generateRandomCode();
    const expires = Date.now() + (this.config.pairingTimeout * 1000);
    
    this.pendingPairings.set(code, { code, expires, senderId });
    
    // Cleanup expired codes
    setTimeout(() => this.pendingPairings.delete(code), this.config.pairingTimeout * 1000);
    
    return code;
  }
  
  async completePairing(code: string, approverId: string): Promise<boolean> {
    const pending = this.pendingPairings.get(code);
    
    if (!pending) return false;
    if (Date.now() > pending.expires) {
      this.pendingPairings.delete(code);
      return false;
    }
    
    // Check if approver is authorized
    if (!this.isApprover(approverId)) {
      return false;
    }
    
    // Complete pairing
    this.pairings.set(pending.senderId, {
      senderId: pending.senderId,
      createdAt: Date.now(),
    });
    
    this.pendingPairings.delete(code);
    return true;
  }
  
  isPaired(senderId: string): boolean {
    return this.pairings.has(senderId);
  }
  
  private generateRandomCode(): string {
    return require('crypto').randomInt(100000, 1000000).toString();
  }
  
  private isApprover(userId: string): boolean {
    // Owner or admin
    return this.config.allowlist.admins.includes(userId);
  }
}
```

### Token-Based Authorization

```typescript
class TokenManager {
  private tokens = new Map<string, { userId: string; expires: number; deviceId?: string }>();
  
  generateToken(userId: string, deviceId?: string, ttl?: number): string {
    const token = this.generateRandomToken();
    const expires = Date.now() + (ttl || this.config.tokenExpiry) * 1000;
    
    this.tokens.set(token, { userId, expires, deviceId });
    
    return token;
  }
  
  rotateToken(oldToken: string): string | null {
    const entry = this.tokens.get(oldToken);
    if (!entry) return null;
    
    // Invalidate old token
    this.tokens.delete(oldToken);
    
    // Generate new token
    return this.generateToken(entry.userId, entry.deviceId);
  }
  
  validateToken(token: string): { userId: string; deviceId?: string } | null {
    const entry = this.tokens.get(token);
    
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.tokens.delete(token);
      return null;
    }
    
    return { userId: entry.userId, deviceId: entry.deviceId };
  }
  
  private generateRandomToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
}
```

## Integration with Gateway

```typescript
// In AgentGateway class
class AgentGateway {
  private router: MessageRouter;
  private pairingManager: PairingManager;
  private tokenManager: TokenManager;
  
  async handleIncomingMessage(message: IncomingMessage): Promise<RouteResult | null> {
    // Route message
    const routeResult = this.router.route(
      message.channelId,
      message.senderId,
      message.content,
      message.platform,
      message.ip
    );
    
    // Handle pairing required
    if (routeResult.requiresApproval) {
      const pairingCode = this.pairingManager.generatePairingCode(message.senderId);
      await this.sendPairingRequest(message.channelId, message.senderId, pairingCode, message.platform);
      return null;
    }
    
    // Handle not authorized
    if (!routeResult.shouldRespond) {
      this.logger.warn(`Message rejected: ${routeResult.reason}`);
      return null;
    }
    
    // Process message
    const sessionKey = routeResult.sessionKey;
    const response = await this.processMessage(
      sessionKey,
      message.content,
      routeResult.agent,
      routeResult.mode
    );
    
    return { ...routeResult, response };
  }
  
  private async sendPairingRequest(
    channelId: string,
    senderId: string,
    code: string,
    platform: string
  ) {
    // Platform-specific pairing message
    switch (platform) {
      case 'telegram':
        await this.telegram.sendMessage(channelId, 
          `Please enter this pairing code in your control UI: \`${code}\``);
        break;
      case 'websocket':
        this.webSocketServer.sendToClient(senderId, {
          type: 'pairing_required',
          code,
        });
        break;
    }
  }
}
```

## Testing

### Unit Tests

```typescript
import { MessageRouter } from './router';

describe('MessageRouter', () => {
  const config: RoutingConfig = {
    requireMention: true,
    mentionPattern: '@bot',
    bindings: [
      { channelId: 'telegram:123', senderId: 'user:1', agent: 'openai', mode: 'default', autoApprove: true, mentionRequired: false },
      { channelId: 'telegram:123', agent: 'anthropic', mode: 'strict', autoApprove: false, mentionRequired: true },
    ],
    allowlist: { users: ['user:1'], channels: ['telegram:123'], ips: [] },
    defaultAgent: 'openai',
    platforms: { telegram: { allowedChats: ['123'] } },
  };
  
  const router = new MessageRouter(config);
  
  it('routes to user-specific binding', () => {
    const result = router.route('telegram:123', 'user:1', 'Hello', 'telegram');
    expect(result.agent).toBe('openai');
    expect(result.mode).toBe('default');
    expect(result.shouldRespond).toBe(true);
    expect(result.requiresApproval).toBe(false);
  });
  
  it('routes to channel-wide binding', () => {
    const result = router.route('telegram:123', 'user:2', 'Hello', 'telegram');
    expect(result.agent).toBe('anthropic');
    expect(result.mode).toBe('strict');
    expect(result.shouldRespond).toBe(true);
    expect(result.requiresApproval).toBe(true);
  });
  
  it('falls back to default agent', () => {
    const result = router.route('telegram:456', 'user:1', 'Hello', 'telegram');
    expect(result.agent).toBe('openai');
    expect(result.shouldRespond).toBe(false); // Not in allowlist
  });
  
  it('blocks unauthorized senders', () => {
    const result = router.route('telegram:123', 'user:999', 'Hello', 'telegram');
    expect(result.shouldRespond).toBe(false);
    expect(result.reason).toContain('not authorized');
    expect(result.requiresApproval).toBe(true);
  });
  
  it('respects mention requirement in groups', () => {
    const result = router.route('telegram:-123', 'user:1', 'Hello', 'telegram');
    expect(result.shouldRespond).toBe(false);
    expect(result.reason).toContain('not mentioned');
  });
  
  it('responds when mentioned', () => {
    const result = router.route('telegram:-123', 'user:1', '@bot Hello', 'telegram');
    expect(result.shouldRespond).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('MessageRouter Integration', () => {
  it('handles Telegram update', async () => {
    const router = new MessageRouter(config);
    const telegramRouter = new TelegramRouter(router);
    
    const update = {
      message: {
        chat: { id: 123 },
        from: { id: 1 },
        text: 'Hello',
      },
    };
    
    const result = telegramRouter.route(update as any);
    expect(result).not.toBeNull();
    expect(result?.shouldRespond).toBe(true);
  });
  
  it('handles WebSocket message', () => {
    const router = new MessageRouter(config);
    const wsRouter = new WebSocketRouter(router);
    
    const client = { userId: 'user:1' } as any;
    const message = { channelId: 'telegram:123', text: 'Hello' };
    
    const result = wsRouter.route(message, client);
    expect(result).not.toBeNull();
    expect(result?.shouldRespond).toBe(true);
  });
});
```

## Best Practices

1. **Cache Bindings**: Pre-compute binding lookups for performance
2. **Batch Processing**: Process messages in batches when possible
3. **Async Authorization**: Don't block on async auth checks
4. **Rate Limiting**: Limit messages per sender/channel
5. **Logging**: Log routing decisions for debugging
6. **Metrics**: Track routing latency, success rates
7. **Circuit Breakers**: Handle platform API failures gracefully

## Performance Considerations

| Operation | Complexity | Cacheable | Notes |
|-----------|------------|-----------|-------|
| Authorization | O(1) | ✅ Yes | Use hash lookups |
| Mention check | O(n) | ❌ No | n = message length |
| Binding lookup | O(m) | ✅ Yes | m = bindings count |
| Session derivation | O(1) | ✅ Yes | SHA256 hash |

## Configuration Tips

```yaml
# Recommended config for production
routing:
  requireMention: true          # Require mention in groups
  mentionPattern: '@bot'       # Customize mention pattern
  defaultAgent: 'openai'        # Fallback agent
  
  bindings:
    # Owner gets full access
    - channelId: '*'
      senderId: 'user:owner'
      agent: 'anthropic'
      mode: 'default'
      autoApprove: true
      mentionRequired: false
    
    # Specific channel with strict mode
    - channelId: 'telegram:123'
      agent: 'openai'
      mode: 'strict'
      autoApprove: false
      mentionRequired: true
  
  allowlist:
    users: ['user:owner', 'user:trusted']
    channels: ['telegram:123', 'telegram:456']
    ips: ['192.168.1.0/24']
```

## Resources

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Discord API](https://discord.com/developers/docs/intro)
- [Slack API](https://api.slack.com/)
- [SHA256 Hashing](https://en.wikipedia.org/wiki/SHA-2)

## Principles

1. **Security First**: Never process unauthorized messages
2. **Explicit Routing**: Clear rules for message destination
3. **Flexibility**: Support multiple platforms and binding types
4. **Performance**: Optimize hot paths (authorization, binding lookup)
5. **Debuggable**: Log decisions for troubleshooting
6. **Extensible**: Easy to add new platforms
