---
name: config-system
type: skill
description: Zod-validated configuration system for AI agent gateway with security modes, tool permissions, and platform-specific settings.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [backend, configuration, security]
tags: [config, zod, validation, security, permissions, settings]
---

# Configuration System Expert

Build a comprehensive, Zod-validated configuration system for AI agent gateway with security modes, tool permissions, platform integrations, and multi-environment support.

## Configuration Structure

```
config/
├── default.json          # Default configuration
├── production.json       # Production overrides
├── development.json      # Development overrides
├── schema.ts             # Zod schema definitions
└── loader.ts             # Config loading logic
```

## Core Schema (Zod)

```typescript
// src/config/schema.ts
import { z } from 'zod';

// Security modes
export const SecurityMode = z.enum(['always-require-approval', 'owner-only', 'yolo']);
export type SecurityMode = z.infer<typeof SecurityMode>;

// Session modes
export const SessionMode = z.enum(['default', 'strict', 'sandbox']);
export type SessionMode = z.infer<typeof SessionMode>;

// Provider types
export const ProviderType = z.enum([
  'openai', 'anthropic', 'local', 'groq', 'mistral', 'gemini'
]);
export type ProviderType = z.infer<typeof ProviderType>;

// Tool names
export const ToolName = z.enum([
  'bash', 'browser', 'canvas', 'cron', 'image', 'file'
]);
export type ToolName = z.infer<typeof ToolName>;

// Platform types
export const PlatformType = z.enum([
  'telegram', 'discord', 'slack', 'whatsapp', 'websocket', 'matrix'
]);
export type PlatformType = z.infer<typeof PlatformType>;
```

## Gateway Configuration

```typescript
// Gateway settings
export const GatewayConfigSchema = z.object({
  name: z.string().default('agent-gateway'),
  port: z.number().int().positive().default(3000),
  wsPort: z.number().int().positive().default(3001),
  host: z.string().default('localhost'),
  publicUrl: z.string().url().optional(),
  maxConnections: z.number().int().positive().default(1000),
  rateLimit: z.number().int().positive().default(100),
  corsOrigins: z.array(z.string().url()).default(['*']),
});

type GatewayConfig = z.infer<typeof GatewayConfigSchema>;
```

## Security Configuration

```typescript
export const SecurityConfigSchema = z.object({
  // Global security mode
  mode: SecurityMode.default('owner-only'),
  
  // Pairing settings
  pairingTimeout: z.number().int().positive().default(300), // 5 minutes
  pairingCodeLength: z.number().int().min(4).max(12).default(6),
  
  // Token settings
  tokenExpiry: z.number().int().positive().default(86400), // 24 hours
  rotateTokensOnConnect: z.boolean().default(true),
  tokenLength: z.number().int().min(32).max(128).default(64),
  
  // Sandbox settings
  sandboxEnabled: z.boolean().default(true),
  sandboxTimeout: z.number().int().positive().default(30000),
  
  // Mention settings
  requireMention: z.boolean().default(true),
  mentionPattern: z.string().default('@bot'),
  
  // Rate limiting
  rateLimitPerUser: z.number().int().positive().default(100),
  rateLimitPerChannel: z.number().int().positive().default(200),
  rateLimitWindow: z.number().int().positive().default(60), // seconds
  
  // Logging
  logLevel: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('info'),
  auditLog: z.boolean().default(true),
});

type SecurityConfig = z.infer<typeof SecurityConfigSchema>;
```

## Storage Configuration

```typescript
export const StorageConfigSchema = z.object({
  // Directories
  baseDir: z.string().default('./data'),
  sessionsDir: z.string().default('./data/sessions'),
  lancedbPath: z.string().default('./data/lancedb'),
  sqlitePath: z.string().default('./data/transcripts.db'),
  uploadsDir: z.string().default('./data/uploads'),
  tempDir: z.string().default('./data/temp'),
  
  // Retention
  retentionDays: z.number().int().positive().default(90),
  maxSessionSize: z.number().int().positive().default(10 * 1024 * 1024), // 10MB
  compactionInterval: z.number().int().positive().default(86400), // 24 hours
  compactionThreshold: z.number().int().positive().default(100), // messages
  
  // Backups
  backupEnabled: z.boolean().default(true),
  backupInterval: z.number().int().positive().default(86400), // 24 hours
  backupDir: z.string().default('./backups'),
  maxBackups: z.number().int().positive().default(7),
});

type StorageConfig = z.infer<typeof StorageConfigSchema>;
```

## LLM Provider Configuration

```typescript
export const LLMProviderConfigSchema = z.object({
  type: ProviderType,
  baseUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  model: z.string(),
  timeout: z.number().int().positive().default(60000),
  maxTokens: z.number().int().positive().default(4096),
  temperature: z.number().min(0).max(2).default(0.7),
  topP: z.number().min(0).max(1).default(0.9),
  topK: z.number().int().positive().optional(),
  repetitionPenalty: z.number().min(0).max(2).default(1.1),
  stopSequences: z.array(z.string()).default([]),
  headers: z.record(z.string()).optional(),
});

type LLMProviderConfig = z.infer<typeof LLMProviderConfigSchema>;

export const ProvidersConfigSchema = z.record(LLMProviderConfigSchema);
type ProvidersConfig = z.infer<typeof ProvidersConfigSchema>;
```

## Default Agent Configuration

```typescript
export const DefaultAgentConfigSchema = z.object({
  provider: z.string(),
  model: z.string(),
  systemPrompt: z.string().optional(),
  maxTokens: z.number().int().positive().default(4096),
  temperature: z.number().min(0).max(2).default(0.7),
  tools: z.array(ToolName).default([]),
  toolChoice: z.enum(['auto', 'none', 'required']).default('auto'),
});

type DefaultAgentConfig = z.infer<typeof DefaultAgentConfigSchema>;
```

## Tool Configuration

```typescript
export const ToolConfigSchema = z.object({
  enabled: z.boolean().default(true),
  requireApproval: z.boolean().default(false),
  allowedUsers: z.array(z.string()).default([]),
  blockedUsers: z.array(z.string()).default([]),
  allowedChannels: z.array(z.string()).default([]),
  blockedChannels: z.array(z.string()).default([]),
  timeout: z.number().int().positive().default(30000),
  maxRetries: z.number().int().nonnegative().default(3),
  maxOutput: z.number().int().positive().default(10000),
});

type ToolConfig = z.infer<typeof ToolConfigSchema>;

export const ToolsConfigSchema = z.object({
  bash: ToolConfigSchema.default({
    enabled: true,
    requireApproval: true,
    allowedUsers: [],
    timeout: 30000,
    maxOutput: 10000,
  }),
  browser: ToolConfigSchema.default({
    enabled: true,
    requireApproval: false,
    allowedUsers: [],
    timeout: 60000,
  }),
  canvas: ToolConfigSchema.default({
    enabled: true,
    requireApproval: false,
    allowedUsers: [],
    timeout: 10000,
  }),
  cron: ToolConfigSchema.default({
    enabled: true,
    requireApproval: true,
    allowedUsers: [],
    timeout: 60000,
  }),
  image: ToolConfigSchema.default({
    enabled: true,
    requireApproval: false,
    allowedUsers: [],
    timeout: 30000,
  }),
  file: ToolConfigSchema.default({
    enabled: true,
    requireApproval: false,
    allowedUsers: [],
    timeout: 10000,
  }),
});

type ToolsConfig = z.infer<typeof ToolsConfigSchema>;
```

## Platform Configuration

### Telegram

```typescript
export const TelegramPlatformConfigSchema = z.object({
  enabled: z.boolean().default(false),
  token: z.string().optional(),
  webhookUrl: z.string().url().optional(),
  webhookSecret: z.string().optional(),
  allowedChats: z.array(z.string()).default([]),
  blockedChats: z.array(z.string()).default([]),
  useWebhook: z.boolean().default(true),
  pollInterval: z.number().int().positive().default(1000), // ms
  botName: z.string().optional(),
  parseMode: z.enum(['MarkdownV2', 'HTML', 'Markdown']).default('MarkdownV2'),
});

type TelegramPlatformConfig = z.infer<typeof TelegramPlatformConfigSchema>;
```

### Discord

```typescript
export const DiscordPlatformConfigSchema = z.object({
  enabled: z.boolean().default(false),
  token: z.string().optional(),
  clientId: z.string().optional(),
  guildId: z.string().optional(),
  allowedChannels: z.array(z.string()).default([]),
  blockedChannels: z.array(z.string()).default([]),
  intents: z.array(z.number()).default([
    1 << 0,   // GUILDS
    1 << 9,   // GUILD_MESSAGES
    1 << 10,  // GUILD_MESSAGE_REACTIONS
    1 << 14,  // MESSAGE_CONTENT
  ]),
});

type DiscordPlatformConfig = z.infer<typeof DiscordPlatformConfigSchema>;
```

### Matrix

```typescript
export const MatrixPlatformConfigSchema = z.object({
  enabled: z.boolean().default(false),
  homeserver: z.string().url().default('https://matrix.org'),
  username: z.string().optional(),
  password: z.string().optional(),
  deviceId: z.string().optional(),
  storePath: z.string().default('./data/matrix-store'),
  encryption: z.object({
    enabled: z.boolean().default(true),
    keyBackup: z.boolean().default(true),
  }).default({}),
});

type MatrixPlatformConfig = z.infer<typeof MatrixPlatformConfigSchema>;
```

### Platforms Config

```typescript
export const PlatformsConfigSchema = z.object({
  telegram: TelegramPlatformConfigSchema.optional(),
  discord: DiscordPlatformConfigSchema.optional(),
  slack: z.any().optional(),
  whatsapp: z.any().optional(),
  matrix: MatrixPlatformConfigSchema.optional(),
});

type PlatformsConfig = z.infer<typeof PlatformsConfigSchema>;
```

## Binding Configuration

```typescript
export const BindingConfigSchema = z.object({
  channelId: z.string(),
  senderId: z.string().optional(),
  agent: z.string(),
  mode: SessionMode.default('default'),
  autoApprove: z.boolean().default(false),
  mentionRequired: z.boolean().default(true),
  rateLimit: z.number().int().positive().optional(),
  maxTokens: z.number().int().positive().optional(),
  tools: z.array(ToolName).optional(),
});

type BindingConfig = z.infer<typeof BindingConfigSchema>;

export const BindingsConfigSchema = z.array(BindingConfigSchema).default([]);
type BindingsConfig = z.infer<typeof BindingsConfigSchema>;
```

## Allowlist Configuration

```typescript
export const AllowlistConfigSchema = z.object({
  users: z.array(z.string()).default([]),
  channels: z.array(z.string()).default([]),
  ips: z.array(z.string()).default([]),
  admins: z.array(z.string()).default([]),
  blockedUsers: z.array(z.string()).default([]),
  blockedChannels: z.array(z.string()).default([]),
  blockedIps: z.array(z.string()).default([]),
});

type AllowlistConfig = z.infer<typeof AllowlistConfigSchema>;
```

## Full Configuration Schema

```typescript
export const FullConfigSchema = z.object({
  gateway: GatewayConfigSchema,
  security: SecurityConfigSchema,
  storage: StorageConfigSchema,
  providers: ProvidersConfigSchema,
  defaultAgent: DefaultAgentConfigSchema,
  tools: ToolsConfigSchema,
  platforms: PlatformsConfigSchema,
  bindings: BindingsConfigSchema,
  allowlist: AllowlistConfigSchema,
});

type FullConfig = z.infer<typeof FullConfigSchema>;
```

## Configuration Loader

```typescript
// src/config/loader.ts
import fs from 'fs/promises';
import path from 'path';
import { FullConfigSchema, FullConfig } from './schema';

export class ConfigLoader {
  private config: FullConfig | null = null;
  private configPath: string;
  
  constructor(configPath: string = './config') {
    this.configPath = configPath;
  }
  
  async load(environment: string = process.env.NODE_ENV || 'development'): Promise<FullConfig> {
    // Load base config
    let config = await this.loadFile('default.json');
    
    // Load environment-specific config
    const envConfig = await this.loadFile(`${environment}.json`);
    if (envConfig) {
      config = this.deepMerge(config, envConfig);
    }
    
    // Load local config (if exists, overrides all)
    const localConfig = await this.loadFile('local.json');
    if (localConfig) {
      config = this.deepMerge(config, localConfig);
    }
    
    // Load from environment variables
    config = this.loadFromEnv(config);
    
    // Validate with Zod
    this.config = FullConfigSchema.parse(config);
    
    return this.config;
  }
  
  get(): FullConfig {
    if (!this.config) {
      throw new Error('Config not loaded. Call load() first.');
    }
    return this.config;
  }
  
  getByPath<T>(path: string): T {
    const config = this.get();
    return path.split('.').reduce((obj: any, key) => {
      if (obj === undefined || obj === null) {
        throw new Error(`Config path ${path} not found`);
      }
      return obj[key];
    }, config as any);
  }
  
  private async loadFile(filename: string): Promise<Record<string, any> | null> {
    const filePath = path.join(this.configPath, filename);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // File doesn't exist
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
  
  private deepMerge<T>(target: T, source: Partial<T>): T {
    if (!source) return target;
    
    for (const key in source) {
      if (source[key] === null || source[key] === undefined) {
        continue;
      }
      
      if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
          (target as any)[key] = this.deepMerge((target as any)[key], source[key]);
        } else {
          (target as any)[key] = source[key];
        }
      } else {
        (target as any)[key] = source[key];
      }
    }
    
    return target;
  }
  
  private loadFromEnv(config: any): any {
    // Map environment variables to config paths
    const envMappings: Record<string, string> = {
      PORT: 'gateway.port',
      WS_PORT: 'gateway.wsPort',
      HOST: 'gateway.host',
      PUBLIC_URL: 'gateway.publicUrl',
      SECURITY_MODE: 'security.mode',
      LOG_LEVEL: 'security.logLevel',
      TELEGRAM_TOKEN: 'platforms.telegram.token',
      OPENAI_API_KEY: 'providers.openai.apiKey',
    };
    
    for (const [envVar, configPath] of Object.entries(envMappings)) {
      const value = process.env[envVar];
      if (value !== undefined) {
        // Set nested property
        const parts = configPath.split('.');
        let current = config;
        for (let i = 0; i < parts.length - 1; i++) {
          current = current[parts[i]] = current[parts[i]] || {};
        }
        current[parts[parts.length - 1]] = this.parseEnvValue(value);
      }
    }
    
    return config;
  }
  
  private parseEnvValue(value: string): any {
    // Try to parse as JSON
    try {
      return JSON.parse(value);
    } catch {
      // Return as string
      return value;
    }
  }
  
  async save(config: FullConfig, filename: string = 'local.json'): Promise<void> {
    const filePath = path.join(this.configPath, filename);
    await fs.mkdir(this.configPath, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(config, null, 2));
  }
  
  async reload(): Promise<FullConfig> {
    return this.load();
  }
}

// Singleton instance
export const configLoader = new ConfigLoader();

// Convenience function
export async function loadConfig(): Promise<FullConfig> {
  return configLoader.load();
}
```

## Configuration Validation

### Custom Validators

```typescript
// Add custom validation to Zod schemas
import { z } from 'zod';

// Validate that at least one provider is configured
function atLeastOneProvider(providers: any): boolean {
  return Object.keys(providers || {}).length > 0;
}

// Validate that security mode is compatible with tool settings
function validateSecurityMode(security: any, tools: any): boolean {
  if (security.mode === 'yolo') {
    // In yolo mode, dangerous tools should still require approval or sandbox
    const dangerousTools = ['bash', 'cron'];
    for (const tool of dangerousTools) {
      if (tools[tool]?.enabled && !tools[tool]?.requireApproval && !security.sandboxEnabled) {
        return false;
      }
    }
  }
  return true;
}

// Enhanced schema with custom validation
export const EnhancedFullConfigSchema = FullConfigSchema
  .refine((data) => atLeastOneProvider(data.providers), {
    message: 'At least one LLM provider must be configured',
    path: ['providers'],
  })
  .refine((data) => validateSecurityMode(data.security, data.tools), {
    message: 'In yolo mode, dangerous tools must have approval or sandbox enabled',
    path: ['security'],
  });
```

## Environment Configuration

### Development Configuration (config/development.json)

```json
{
  "gateway": {
    "name": "agent-gateway-dev",
    "port": 3000,
    "wsPort": 3001,
    "host": "localhost",
    "corsOrigins": ["http://localhost:5173", "http://127.0.0.1:5173"]
  },
  "security": {
    "mode": "yolo",
    "pairingTimeout": 600,
    "tokenExpiry": 86400,
    "rotateTokensOnConnect": false,
    "sandboxEnabled": false,
    "requireMention": false,
    "logLevel": "debug"
  },
  "storage": {
    "baseDir": "./data-dev",
    "retentionDays": 7,
    "compactionInterval": 3600
  },
  "defaultAgent": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "systemPrompt": "You are a helpful AI assistant in development mode."
  },
  "providers": {
    "openai": {
      "type": "openai",
      "apiKey": "${OPENAI_API_KEY}",
      "model": "gpt-4o-mini",
      "timeout": 120000
    }
  },
  "tools": {
    "bash": {
      "enabled": true,
      "requireApproval": false,
      "timeout": 30000
    },
    "browser": {
      "enabled": true,
      "requireApproval": false
    },
    "canvas": {
      "enabled": true,
      "requireApproval": false
    },
    "cron": {
      "enabled": true,
      "requireApproval": false
    },
    "image": {
      "enabled": true,
      "requireApproval": false
    },
    "file": {
      "enabled": true,
      "requireApproval": false
    }
  },
  "platforms": {
    "telegram": {
      "enabled": true,
      "token": "${TELEGRAM_TOKEN}",
      "useWebhook": false
    }
  },
  "bindings": [],
  "allowlist": {
    "users": ["user:dev"],
    "channels": [],
    "ips": ["127.0.0.1"]
  }
}
```

### Production Configuration (config/production.json)

```json
{
  "gateway": {
    "name": "agent-gateway",
    "port": 3000,
    "wsPort": 3001,
    "host": "0.0.0.0",
    "publicUrl": "https://agents.yourdomain.com",
    "maxConnections": 10000,
    "rateLimit": 1000,
    "corsOrigins": ["https://ui.yourdomain.com"]
  },
  "security": {
    "mode": "always-require-approval",
    "pairingTimeout": 300,
    "tokenExpiry": 3600,
    "rotateTokensOnConnect": true,
    "sandboxEnabled": true,
    "requireMention": true,
    "logLevel": "info",
    "auditLog": true
  },
  "storage": {
    "baseDir": "/var/data/agent-gateway",
    "retentionDays": 30,
    "maxSessionSize": 10485760,
    "compactionInterval": 3600,
    "backupEnabled": true,
    "backupDir": "/var/backups/agent-gateway",
    "maxBackups": 7
  },
  "defaultAgent": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "systemPrompt": "You are a helpful AI assistant. Always ask for approval before executing dangerous tools. Be cautious and verify information.",
    "maxTokens": 4096,
    "temperature": 0.7
  },
  "providers": {
    "anthropic": {
      "type": "anthropic",
      "apiKey": "${ANTHROPIC_API_KEY}",
      "model": "claude-3-5-sonnet-20241022",
      "timeout": 120000,
      "maxTokens": 4096
    },
    "openai": {
      "type": "openai",
      "apiKey": "${OPENAI_API_KEY}",
      "model": "gpt-4o",
      "timeout": 120000,
      "maxTokens": 4096
    },
    "local": {
      "type": "local",
      "baseUrl": "http://localhost:1234/v1",
      "model": "llama-3-8b-instruct",
      "timeout": 300000,
      "maxTokens": 4096
    }
  },
  "tools": {
    "bash": {
      "enabled": true,
      "requireApproval": true,
      "allowedUsers": ["user:admin"],
      "timeout": 30000,
      "maxOutput": 10000
    },
    "browser": {
      "enabled": true,
      "requireApproval": false,
      "allowedUrls": ["https://*.github.com", "https://*.wikipedia.org"],
      "blockedUrls": ["https://*.google.com/recaptcha"],
      "timeout": 60000
    },
    "canvas": {
      "enabled": true,
      "requireApproval": false,
      "maxCommands": 1000,
      "timeout": 10000
    },
    "cron": {
      "enabled": true,
      "requireApproval": true,
      "allowedUsers": ["user:admin"],
      "timeout": 60000
    },
    "image": {
      "enabled": true,
      "requireApproval": false,
      "maxSize": 2048,
      "timeout": 30000
    },
    "file": {
      "enabled": true,
      "requireApproval": false,
      "allowedPaths": ["/tmp/gateway/*", "/home/user/documents/*"],
      "blockedPaths": ["/etc/*", "/root/*", "/usr/*"],
      "timeout": 10000
    }
  },
  "platforms": {
    "telegram": {
      "enabled": true,
      "token": "${TELEGRAM_TOKEN}",
      "webhookUrl": "https://agents.yourdomain.com/gateway/webhook/telegram",
      "webhookSecret": "${WEBHOOK_SECRET}",
      "useWebhook": true,
      "allowedChats": ["12345", "67890"]
    },
    "matrix": {
      "enabled": true,
      "homeserver": "https://matrix.yourdomain.com",
      "username": "${MATRIX_USERNAME}",
      "password": "${MATRIX_PASSWORD}",
      "storePath": "/var/data/agent-gateway/matrix-store",
      "encryption": {
        "enabled": true,
        "keyBackup": true
      }
    }
  },
  "bindings": [
    {
      "channelId": "telegram:12345",
      "senderId": "user:admin",
      "agent": "anthropic",
      "mode": "default",
      "autoApprove": true,
      "mentionRequired": false
    },
    {
      "channelId": "telegram:12345",
      "agent": "openai",
      "mode": "strict",
      "autoApprove": false,
      "mentionRequired": true
    }
  ],
  "allowlist": {
    "users": ["user:admin", "user:trusted"],
    "channels": ["telegram:12345", "telegram:67890"],
    "ips": ["192.168.1.0/24", "10.0.0.0/8"],
    "admins": ["user:admin"],
    "blockedUsers": ["user:spam"],
    "blockedChannels": ["telegram:spam"],
    "blockedIps": ["1.2.3.4"]
  }
}
```

## Configuration Management

### Hot Reloading

```typescript
// src/config/hot-reload.ts
import chokidar from 'chokidar';
import { ConfigLoader } from './loader';

export class ConfigWatcher {
  private loader: ConfigLoader;
  private watcher: chokidar.FSWatcher;
  private callbacks: Array<() => void> = [];
  
  constructor(loader: ConfigLoader, configDir: string = './config') {
    this.loader = loader;
    
    this.watcher = chokidar.watch(path.join(configDir, '*.json'), {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });
    
    this.watcher.on('change', async (filePath) => {
      try {
        await this.loader.reload();
        this.notifyCallbacks();
      } catch (error) {
        console.error(`Error reloading config from ${filePath}:`, error);
      }
    });
  }
  
  onChange(callback: () => void) {
    this.callbacks.push(callback);
  }
  
  private notifyCallbacks() {
    for (const callback of this.callbacks) {
      try {
        callback();
      } catch (error) {
        console.error('Error in config change callback:', error);
      }
    }
  }
  
  close() {
    this.watcher.close();
  }
}
```

### Configuration Migration

```typescript
// src/config/migration.ts
import { FullConfig } from './schema';

export class ConfigMigrator {
  static migrate(config: any): FullConfig {
    // Migration 1: Add missing default values
    if (!config.security) {
      config.security = {};
    }
    if (config.security.mode === undefined) {
      config.security.mode = 'owner-only';
    }
    
    // Migration 2: Convert old tool config format
    if (config.tools?.bash?.dangerous !== undefined) {
      delete config.tools.bash.dangerous;
    }
    
    // Migration 3: Rename providers to llm
    if (config.providers && !config.llm) {
      config.llm = config.providers;
      delete config.providers;
    }
    
    // Migration 4: Add new fields with defaults
    if (!config.storage?.baseDir) {
      config.storage = { baseDir: './data', ...config.storage };
    }
    
    return config;
  }
  
  static async migrateFile(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');
    const config = JSON.parse(content);
    const migrated = this.migrate(config);
    await fs.writeFile(filePath, JSON.stringify(migrated, null, 2));
  }
}
```

## Usage Examples

### Basic Usage

```typescript
import { loadConfig } from './config/loader';

async function main() {
  // Load configuration
  const config = await loadConfig();
  
  // Access configuration
  console.log(`Gateway name: ${config.gateway.name}`);
  console.log(`Security mode: ${config.security.mode}`);
  console.log(`Default agent: ${config.defaultAgent.provider}`);
  
  // Access nested values safely
  const telegramToken = config.platforms?.telegram?.token;
  console.log(`Telegram enabled: ${telegramToken ? 'Yes' : 'No'}`);
}
```

### Type-Safe Access

```typescript
import { configLoader } from './config/loader';

// Load config
const config = await configLoader.load();

// Type-safe access
const port: number = config.gateway.port;
const securityMode: SecurityMode = config.security.mode;
const providers: ProvidersConfig = config.providers;

// Get specific provider
const openaiConfig = providers.openai;
if (openaiConfig) {
  console.log(`OpenAI model: ${openaiConfig.model}`);
}
```

### Runtime Overrides

```typescript
// Override specific values at runtime
configLoader.get().gateway.port = 4000;
configLoader.get().security.logLevel = 'debug';

// Or create a new config with overrides
const customConfig = {
  ...configLoader.get(),
  gateway: {
    ...configLoader.get().gateway,
    port: 4000,
  },
};
```

### Environment Variable Override

```bash
# Start with environment variables
PORT=5000 SECURITY_MODE=always-require-approval node dist/index.js

# Or use .env file
cat .env
PORT=5000
SECURITY_MODE=always-require-approval
TELEGRAM_TOKEN=12345:abc
```

## Validation Examples

### Validate Partial Config

```typescript
import { GatewayConfigSchema } from './schema';

// Validate just the gateway part
const gatewayConfig = GatewayConfigSchema.parse({
  port: 8080,
  wsPort: 8081,
  host: '0.0.0.0',
});

// Validate with custom error messages
try {
  const invalidConfig = GatewayConfigSchema.parse({
    port: -1, // Invalid: must be positive
  });
} catch (error) {
  console.error(error.errors);
  // [ { code: 'invalid_type', expected: 'number', received: 'negative' } ]
}
```

### Custom Validation

```typescript
import { z } from 'zod';

// Validate that a port is not a well-known port
const safePort = z.number().refine((port) => {
  return port > 1024; // Not a well-known port
}, {
  message: 'Port must be greater than 1024',
});

// Use in schema
const GatewayConfigWithSafePort = GatewayConfigSchema.extend({
  port: safePort,
  wsPort: safePort,
});
```

## Testing Configuration

### Unit Tests

```typescript
import { FullConfigSchema } from './schema';

describe('Configuration Schema', () => {
  it('accepts valid config', () => {
    const config = FullConfigSchema.parse({
      gateway: { port: 3000 },
      security: { mode: 'owner-only' },
      providers: { openai: { type: 'openai', model: 'gpt-4o' } },
    });
    
    expect(config.gateway.port).toBe(3000);
    expect(config.security.mode).toBe('owner-only');
  });
  
  it('rejects invalid port', () => {
    expect(() => {
      FullConfigSchema.parse({
        gateway: { port: -1 },
        security: { mode: 'owner-only' },
        providers: {},
      });
    }).toThrow();
  });
  
  it('applies defaults', () => {
    const config = FullConfigSchema.parse({
      gateway: {},
      security: {},
      providers: {},
    });
    
    expect(config.gateway.port).toBe(3000);
    expect(config.security.mode).toBe('owner-only');
  });
});
```

### Integration Tests

```typescript
import { ConfigLoader } from './loader';
import fs from 'fs/promises';
import path from 'path';

describe('ConfigLoader', () => {
  const testConfigDir = path.join(__dirname, 'test-configs');
  
  beforeAll(async () => {
    await fs.mkdir(testConfigDir, { recursive: true });
    await fs.writeFile(
      path.join(testConfigDir, 'default.json'),
      JSON.stringify({
        gateway: { port: 3000 },
        security: { mode: 'owner-only' },
        providers: {},
      })
    );
    
    await fs.writeFile(
      path.join(testConfigDir, 'development.json'),
      JSON.stringify({
        gateway: { port: 4000 },
      })
    );
  });
  
  afterAll(async () => {
    await fs.rm(testConfigDir, { recursive: true, force: true });
  });
  
  it('loads and merges configs', async () => {
    const loader = new ConfigLoader(testConfigDir);
    const config = await loader.load('development');
    
    expect(config.gateway.port).toBe(4000); // Overridden by dev
    expect(config.security.mode).toBe('owner-only'); // From default
  });
  
  it('loads from environment variables', async () => {
    process.env.PORT = '5000';
    
    const loader = new ConfigLoader(testConfigDir);
    const config = await loader.load();
    
    expect(config.gateway.port).toBe(5000);
    
    delete process.env.PORT;
  });
});
```

## Best Practices

### Configuration Tips

1. **Environment Separation**: Use separate files for each environment
2. **Sensitive Data**: Never commit secrets to version control
3. **Defaults**: Provide sensible defaults for all options
4. **Validation**: Validate early and fail fast
5. **Hot Reload**: Enable config watching in development
6. **Backup**: Backup config files regularly
7. **Documentation**: Document each configuration option
8. **Versioning**: Version your configuration schema

### Security Best Practices

1. **Never store secrets in config files**: Use environment variables
2. **Validate all inputs**: Zod ensures type safety
3. **Restrict permissions**: Set proper file permissions
4. **Audit changes**: Log configuration changes
5. **Secure defaults**: Default to secure settings
6. **Sandbox testing**: Test config changes in isolated environment

### Performance Considerations

1. **Cache config**: Don't reload on every request
2. **Lazy loading**: Load only what's needed
3. **Avoid deep nesting**: Flatter configs are easier to manage
4. **Use references**: Reference common values to avoid duplication

## Configuration File Template

```json
{
  "$schema": "https://yourdomain.com/schemas/config.json",
  "_comment": "AI Agent Gateway Configuration",
  
  "gateway": {
    "name": "my-agent-gateway",
    "port": 3000,
    "wsPort": 3001,
    "host": "0.0.0.0",
    "publicUrl": "https://agents.example.com",
    "maxConnections": 1000,
    "rateLimit": 100,
    "corsOrigins": ["http://localhost:5173"]
  },
  
  "security": {
    "mode": "owner-only",
    "pairingTimeout": 300,
    "tokenExpiry": 86400,
    "rotateTokensOnConnect": true,
    "sandboxEnabled": true,
    "requireMention": true,
    "logLevel": "info",
    "auditLog": true
  },
  
  "storage": {
    "baseDir": "./data",
    "sessionsDir": "./data/sessions",
    "lancedbPath": "./data/lancedb",
    "sqlitePath": "./data/transcripts.db",
    "uploadsDir": "./data/uploads",
    "retentionDays": 90,
    "compactionInterval": 86400,
    "compactionThreshold": 100
  },
  
  "providers": {
    "openai": {
      "type": "openai",
      "apiKey": "${OPENAI_API_KEY}",
      "model": "gpt-4o",
      "timeout": 60000,
      "maxTokens": 4096
    }
  },
  
  "defaultAgent": {
    "provider": "openai",
    "model": "gpt-4o",
    "systemPrompt": "You are a helpful AI assistant."
  },
  
  "tools": {
    "bash": { "enabled": true, "requireApproval": true },
    "browser": { "enabled": true, "requireApproval": false },
    "canvas": { "enabled": true, "requireApproval": false },
    "cron": { "enabled": true, "requireApproval": true },
    "image": { "enabled": true, "requireApproval": false },
    "file": { "enabled": true, "requireApproval": false }
  },
  
  "platforms": {
    "telegram": {
      "enabled": true,
      "token": "${TELEGRAM_TOKEN}"
    }
  },
  
  "bindings": [],
  "allowlist": { "users": [], "channels": [], "ips": [] }
}
```

## Resources

- [Zod Documentation](https://zod.dev/)
- [12 Factor App Config](https://12factor.net/config)
- [JSON Schema](https://json-schema.org/)
- [dotenv](https://github.com/motdotla/dotenv) - Environment variable loading

## Principles

1. **Type Safety**: Use Zod for runtime type validation
2. **Separation of Concerns**: Separate config from code
3. **Environment Awareness**: Different configs for different environments
4. **Security**: Never expose sensitive data
5. **Maintainability**: Document and organize configuration
6. **Flexibility**: Support multiple formats and sources
7. **Reliability**: Validate and fail fast
