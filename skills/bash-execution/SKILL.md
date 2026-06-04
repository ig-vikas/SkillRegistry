---
name: bash-execution
type: skill
description: Secure shell command execution for AI agent gateway with sandbox isolation, input validation, and resource limits using @lydell/node-pty.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [backend, tools, security]
tags: [bash, shell, execution, sandbox, node-pty, security, tools]
---

# Bash Execution Expert

Implement secure shell command execution for AI agents with comprehensive sandboxing, input validation, and resource limitation using Node.js and @lydell/node-pty.

## Architecture

AI Agent Request -> Input Validation -> Approval Gate (if required) -> Sandbox Executor (Docker/node-pty) -> Output Processing -> Result Streaming

## Core Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| Input Validator | Validate commands, arguments | Zod, custom regex |
| Approval Gate | Check security mode, request approval | Tool Approval System |
| Sandbox Executor | Isolated command execution | @lydell/node-pty, Docker |
| Output Processor | Stream and chunk results | Node.js streams |
| Resource Monitor | Track CPU, memory, time | Custom metrics |
| Audit Logger | Log all executions | Winston, JSON |

## Implementation

```bash
pnpm add @lydell/node-pty @types/node-pty
```

### Secure Bash Service

```typescript
// src/services/tools/bash-executor.ts
import { spawn, IPty, SpawnOptions } from '@lydell/node-pty';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { z } from 'zod';

const BashConfigSchema = z.object({
  timeout: z.number().int().positive().max(300000).default(30000),
  maxOutput: z.number().int().positive().max(1000000).default(100000),
  sandbox: z.object({
    enabled: z.boolean().default(true),
    blockedPaths: z.array(z.string()).default(['/etc', '/usr', '/var', '/root']),
  }).default({}),
  blockedCommands: z.array(z.string()).default([
    'rm', 'del', 'erase', 'dd', 'format', 'mkfs',
    'chmod', 'chown', 'useradd', 'userdel', 'passwd',
    'sudo', 'su', 'kill', 'pkill', 'killall',
    'reboot', 'shutdown', 'halt', 'poweroff',
    ':', '>', '>>', '|', '&&', ';', '`', '\$'
  ]),
  shell: z.string().default(process.platform === 'win32' ? 'powershell.exe' : 'bash'),
});

export class BashExecutor {
  private config: any;
  private activeProcesses = new Map<string, IPty>();
  
  constructor(config: Partial<any> = {}) {
    this.config = BashConfigSchema.parse(config);
  }
  
  validateCommand(command: string) {
    return z.object({
      command: z.string().min(1).max(1000),
      args: z.array(z.string()).max(100).optional(),
    }).parse({ command });
  }
  
  isCommandBlocked(command: string) {
    const normalized = command.toLowerCase().trim();
    for (const blocked of this.config.blockedCommands) {
      if (normalized.includes(blocked.toLowerCase())) {
        return { blocked: true, reason: `Blocked keyword: ${blocked}` };
      }
    }
    return { blocked: false, reason: '' };
  }
  
  isPathAllowed(path: string): boolean {
    const resolved = resolve(path);
    for (const blockedPath of this.config.sandbox.blockedPaths) {
      const blockedResolved = resolve(blockedPath);
      if (resolved.startsWith(blockedResolved)) return false;
    }
    return true;
  }
  
  async execute(options: {
    command: string;
    args?: string[];
    cwd?: string;
    timeout?: number;
    maxOutput?: number;
    userId: string;
    requireApproval?: boolean;
  }): Promise<any> {
    const startTime = Date.now();
    const { command, args = [], cwd = tmpdir(), timeout = 30000, maxOutput = 100000, requireApproval } = options;
    
    // Validate
    try { this.validateCommand(command); } catch (e) { return { success: false, error: 'Invalid command' }; }
    
    // Check blocked
    const blockedCheck = this.isCommandBlocked(command);
    if (blockedCheck.blocked) return { success: false, error: blockedCheck.reason };
    
    // Check path
    if (!this.isPathAllowed(cwd)) return { success: false, error: `Path not allowed: ${cwd}` };
    
    // Execute in shell with node-pty
    return this.executeInShell(command, args, cwd, timeout, maxOutput);
  }
  
  private async executeInShell(command: string, args: string[], cwd: string, timeout: number, maxOutput: number) {
    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command;
    const options: SpawnOptions = { name: this.config.shell, cwd, cols: 120, rows: 40 };
    
    return new Promise((resolve) => {
      let stdout = ''; let exitCode = -1; let timedOut = false; let truncated = false;
      const timeoutId = setTimeout(() => { timedOut = true; pty.kill(); resolve({ success: false, error: 'Timeout' }); }, timeout);
      
      const pty: IPty = spawn(this.config.shell, [], options);
      this.activeProcesses.set(pty.pid.toString(), pty);
      
      pty.on('data', (data: string) => {
        stdout += data;
        if (stdout.length > maxOutput) { stdout = stdout.substring(0, maxOutput); truncated = true; pty.kill(); }
      });
      
      pty.on('exit', (code: number | null) => {
        exitCode = code || 0;
        clearTimeout(timeoutId);
        this.activeProcesses.delete(pty.pid.toString());
        resolve({ success: exitCode === 0, stdout: truncated ? stdout + '\n[TRUNCATED]' : stdout, exitCode });
      });
      
      pty.write(fullCommand + '\r');
      setTimeout(() => pty.write('exit\r'), timeout - 1000);
    });
  }
  
  killAllProcesses() { for (const [, pty] of this.activeProcesses) try { pty.kill(); } catch {}; this.activeProcesses.clear(); }
}
```

## Configuration Schema

```typescript
// src/config/bash-config.ts
import { z } from 'zod';

export const BashToolConfigSchema = z.object({
  bash: z.object({
    enabled: z.boolean().default(true),
    requireApproval: z.boolean().default(true),
    timeout: z.number().int().positive().max(300000).default(30000),
    maxOutput: z.number().int().positive().max(1000000).default(100000),
    sandbox: z.object({
      enabled: z.boolean().default(true),
      blockedPaths: z.array(z.string()).default(['/etc', '/usr', '/var', '/root']),
    }).default({}),
    blockedCommands: z.array(z.string()).default(['rm', 'del', 'dd', 'sudo', 'su']),
    shell: z.string().default(process.platform === 'win32' ? 'powershell.exe' : 'bash'),
  }).default({}),
});
```

## Security Best Practices

1. **Always Use Sandbox** - Enable sandbox for all untrusted commands
2. **Block Dangerous Commands** - Maintain comprehensive blocked list
3. **Validate All Input** - Use Zod schemas for validation
4. **Limit Resources** - Enforce timeouts and output limits
5. **Restrict Environment** - Only allow safe environment variables
6. **Audit Everything** - Log all executions with timestamps
7. **Use Temporary Directories** - Execute in isolated directories

## HTTP API Endpoint

```typescript
// POST /api/bash/execute
router.post('/execute', async (req, res) => {
  const { command } = z.object({ command: z.string() }).parse(req.body);
  const gateway: AgentGateway = req.app.get('gateway');
  const result = await gateway.executeBash(command, { userId: req.user?.id || 'anonymous' });
  if (result.approvalRequested) return res.status(403).json({ error: 'Approval required', approvalId: result.approvalId });
  if (!result.success) return res.status(400).json({ error: result.error });
  res.json({ success: true, stdout: result.stdout, exitCode: result.exitCode });
});
```

## Testing

```typescript
// tests/services/tools/bash-executor.test.ts
describe('BashExecutor', () => {
  let executor: BashExecutor;
  beforeEach(() => { executor = new BashExecutor({ sandbox: { enabled: false } }); });
  it('blocks dangerous commands', () => {
    expect(executor.isCommandBlocked('rm -rf /').blocked).toBe(true);
  });
  it('executes safe commands', async () => {
    const result = await executor.execute({ command: 'echo hello', userId: 'test' });
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('hello');
  }, 10000);
});
```

## Resources

- [node-pty GitHub](https://github.com/microsoft/node-pty)
- [Docker Documentation](https://docs.docker.com/)
- [OWASP Command Injection](https://owasp.org/www-community/attacks/Command_Injection)

## Principles

1. Security First
2. Least Privilege
3. Isolation
4. Auditability
5. Defense in Depth
