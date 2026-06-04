---
name: tool-approval
type: skill
description: Approval system for dangerous tools with configurable modes (always-require-approval, owner-only, yolo) and sandbox execution.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [security, backend, ai-ml]
tags: [approval, security, tools, bash, sandbox, permissions]
---

# Tool Approval System Expert

Implement a comprehensive approval system for AI agent gateway tools with configurable security modes, owner-only access, and sandbox execution for dangerous operations.

## Security Modes

### Mode Comparison

| Mode | Description | Bash | Browser | Canvas | Cron | Image | File |
|------|-------------|------|---------|--------|------|-------|------|
| `always-require-approval` | All dangerous tools require explicit approval | ✅ Require | ❌ No | ❌ No | ✅ Require | ❌ No | ❌ No |
| `owner-only` | Only owner can use dangerous tools without approval | ✅ Owner | ❌ No | ❌ No | ✅ Owner | ❌ No | ❌ No |
| `yolo` | No restrictions (DANGEROUS) | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |

### Dangerous vs Safe Tools

**Dangerous (require approval in strict modes):**
- `bash` - Shell execution, file system access, process management
- `cron` - Scheduled job creation, system persistence

**Safe (no approval required):**
- `browser` - Web browsing (can still be dangerous with certain URLs)
- `canvas` - Drawing commands (rendered in isolated context)
- `image` - Image generation (limited to configured sizes)
- `file` - File read/write (limited to allowed paths)

## Configuration

```typescript
// config-system.ts (extended)
export const SecurityMode = z.enum(['always-require-approval', 'owner-only', 'yolo']);

export const ToolSecurityConfigSchema = z.object({
  // Global mode
  mode: SecurityMode.default('owner-only'),
  
  // Per-tool overrides
  toolOverrides: z.object({
    bash: SecurityMode.optional(),
    browser: SecurityMode.optional(),
    canvas: SecurityMode.optional(),
    cron: SecurityMode.optional(),
    image: SecurityMode.optional(),
    file: SecurityMode.optional(),
  }).default({}),
  
  // Owner user ID
  ownerId: z.string().optional(),
  
  // Sandbox settings
  sandbox: z.object({
    enabled: z.boolean().default(true),
    timeout: z.number().default(30000),
    maxOutput: z.number().default(10000),
    allowedCommands: z.array(z.string()).default([]),
    blockedCommands: z.array(z.string()).default([
      'rm', 'del', 'erase', 'dd', 'format', 'mkfs', 'chmod', 'chown',
      'useradd', 'userdel', 'passwd', 'sudo', 'su', 'kill', 'pkill',
      'reboot', 'shutdown', 'halt', 'poweroff',
    ]),
    container: z.object({
      enabled: z.boolean().default(true),
      image: z.string().default('alpine:latest'),
      timeout: z.number().default(60000),
    }).default({}),
  }).default({}),
  
  // Approval settings
  approval: z.object({
    timeout: z.number().default(300), // 5 minutes
    requireConfirmation: z.boolean().default(true),
    autoApprovePatterns: z.array(z.string()).default([]),
  }).default({}),
});

type ToolSecurityConfig = z.infer<typeof ToolSecurityConfigSchema>;
```

## Approval Flow

```
Tool Call Request
     │
     ▼
┌─────────────────┐
│ Check Tool      │
│ - Is dangerous? │
│ - Mode allows?  │
└────────┬────────┘
         │
         ├── YES (dangerous + mode requires approval)
         │         ▼
         │   ┌─────────────────┐
         │   │ Request Approval │
         │   │ - Notify owner   │
         │   │ - Wait for       │
         │   │   response      │
         │   └────────┬────────┘
         │            │
         │   ┌────────▼────────┐
         │   │                  │
         │   ├── Approved ─────▶ Execute in sandbox
         │   │
         │   └── Rejected ─────▶ Return error to user
         │
         ▼ NO
┌─────────────────┐
│ Execute Tool    │
│ - Direct        │
│ - Or sandbox    │
└─────────────────┘
```

## Approval Manager Implementation

```typescript
// src/services/tools/approval.ts
import { EventEmitter } from 'events';

interface ApprovalRequest {
  id: string;
  tool: string;
  arguments: any;
  requestedBy: string;
  requestedAt: number;
  channelId: string;
  messageId: string;
}

interface ApprovalResponse {
  requestId: string;
  approved: boolean;
  approvedBy?: string;
  reason?: string;
}

export class ApprovalManager extends EventEmitter {
  private pending = new Map<string, ApprovalRequest>();
  private config: ToolSecurityConfig;
  private owners = new Set<string>();
  
  constructor(config: ToolSecurityConfig) {
    super();
    this.config = config;
    if (config.ownerId) {
      this.owners.add(config.ownerId);
    }
  }
  
  // Check if tool requires approval
  requiresApproval(tool: string, userId: string): boolean {
    // Get effective mode for this tool
    const mode = this.getEffectiveMode(tool);
    
    // Check if user is owner
    const isOwner = this.owners.has(userId);
    
    // In yolo mode, never require approval
    if (mode === 'yolo') {
      return false;
    }
    
    // Check if tool is dangerous
    const dangerousTools = ['bash', 'cron'];
    const isDangerous = dangerousTools.includes(tool);
    
    // In always-require-approval mode, dangerous tools always require approval
    if (mode === 'always-require-approval' && isDangerous) {
      return true;
    }
    
    // In owner-only mode, only owner can use dangerous tools without approval
    if (mode === 'owner-only' && isDangerous && !isOwner) {
      return true;
    }
    
    // Tool-specific override
    if (this.config.toolOverrides[tool as keyof typeof this.config.toolOverrides]) {
      const toolMode = this.config.toolOverrides[tool as keyof typeof this.config.toolOverrides]!;
      if (toolMode === 'always-require-approval' && isDangerous) {
        return true;
      }
      if (toolMode === 'owner-only' && isDangerous && !isOwner) {
        return true;
      }
    }
    
    // Auto-approve patterns
    if (this.config.approval.autoApprovePatterns.length > 0) {
      const argsStr = JSON.stringify(message.arguments || {});
      for (const pattern of this.config.approval.autoApprovePatterns) {
        if (argsStr.includes(pattern)) {
          return false;
        }
      }
    }
    
    return false;
  }
  
  // Get effective security mode for tool
  private getEffectiveMode(tool: string): SecurityMode {
    // Check tool-specific override first
    if (this.config.toolOverrides[tool as keyof typeof this.config.toolOverrides]) {
      return this.config.toolOverrides[tool as keyof typeof this.config.toolOverrides]!;
    }
    
    // Fall back to global mode
    return this.config.mode;
  }
  
  // Request approval for a tool
  async requestApproval(
    tool: string,
    args: any,
    requestedBy: string,
    channelId: string,
    messageId: string
  ): Promise<ApprovalResponse> {
    const requestId = this.generateRequestId();
    
    const request: ApprovalRequest = {
      id: requestId,
      tool,
      arguments: args,
      requestedBy,
      requestedAt: Date.now(),
      channelId,
      messageId,
    };
    
    this.pending.set(requestId, request);
    
    // Set timeout
    const timeoutId = setTimeout(() => {
      this.pending.delete(requestId);
      this.emit('timeout', request);
    }, this.config.approval.timeout * 1000);
    
    // Store timeout ID with request
    (request as any).timeoutId = timeoutId;
    
    // Notify owners
    await this.notifyOwners(request);
    
    // Wait for response
    return new Promise((resolve) => {
      const handler = (response: ApprovalResponse) => {
        if (response.requestId === requestId) {
          this.pending.delete(requestId);
          clearTimeout((request as any).timeoutId);
          this.off('response', handler);
          resolve(response);
        }
      };
      
      this.on('response', handler);
    });
  }
  
  // Approve a request
  approveRequest(requestId: string, approvedBy: string, reason?: string): ApprovalResponse {
    const request = this.pending.get(requestId);
    if (!request) {
      throw new Error('Request not found');
    }
    
    const response: ApprovalResponse = {
      requestId,
      approved: true,
      approvedBy,
      reason,
    };
    
    this.emit('response', response);
    return response;
  }
  
  // Reject a request
  rejectRequest(requestId: string, rejectedBy: string, reason?: string): ApprovalResponse {
    const request = this.pending.get(requestId);
    if (!request) {
      throw new Error('Request not found');
    }
    
    const response: ApprovalResponse = {
      requestId,
      approved: false,
      approvedBy: rejectedBy,
      reason,
    };
    
    this.emit('response', response);
    return response;
  }
  
  // List pending approvals
  listPending(): ApprovalRequest[] {
    return Array.from(this.pending.values());
  }
  
  // Get pending approval for user
  getPendingForUser(userId: string): ApprovalRequest[] {
    return Array.from(this.pending.values())
      .filter(r => r.requestedBy === userId);
  }
  
  // Notify owners about approval request
  private async notifyOwners(request: ApprovalRequest) {
    for (const owner of this.owners) {
      try {
        // Send notification via WebSocket, email, etc.
        this.emit('notification', {
          owner,
          type: 'approval_request',
          request,
        });
      } catch (error) {
        console.error(`Error notifying owner ${owner}:`, error);
      }
    }
  }
  
  private generateRequestId(): string {
    return `approval_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
  
  // Add owner
  addOwner(userId: string) {
    this.owners.add(userId);
  }
  
  // Remove owner
  removeOwner(userId: string) {
    this.owners.delete(userId);
  }
  
  // Check if user is owner
  isOwner(userId: string): boolean {
    return this.owners.has(userId);
  }
}
```

## Sandbox Execution

### Bash Sandbox

```typescript
// src/services/tools/bash-sandbox.ts
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { promises as fs } from 'fs';

export interface BashExecutionOptions {
  command: string;
  timeout?: number;
  maxOutput?: number;
  cwd?: string;
  env?: Record<string, string>;
  sandbox?: boolean;
}

export interface BashExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  error?: string;
}

export class BashSandbox {
  private config: ToolSecurityConfig;
  
  constructor(config: ToolSecurityConfig) {
    this.config = config;
  }
  
  async execute(options: BashExecutionOptions): Promise<BashExecutionResult> {
    const config = this.config;
    const command = options.command;
    const timeout = options.timeout || config.sandbox.timeout;
    const maxOutput = options.maxOutput || config.sandbox.maxOutput;
    
    // Check if command is blocked
    for (const blocked of config.sandbox.blockedCommands) {
      if (command.toLowerCase().includes(blocked.toLowerCase())) {
        throw new Error(`Command contains blocked keyword: ${blocked}`);
      }
    }
    
    // Use sandbox if enabled
    if (config.sandbox.enabled && options.sandbox !== false) {
      return this.executeInSandbox(command, timeout, maxOutput);
    }
    
    // Direct execution (less safe)
    return this.executeDirect(command, timeout, maxOutput);
  }
  
  private async executeInSandbox(command: string, timeout: number, maxOutput: number): Promise<BashExecutionResult> {
    // Create temporary directory
    const tempDir = await fs.mkdtemp(join(tmpdir(), 'bash-sandbox-'));
    
    try {
      // Use Docker for maximum isolation (if available)
      if (this.config.sandbox.container.enabled) {
        return this.executeInDocker(command, timeout, maxOutput, tempDir);
      }
      
      // Use shell with restricted environment
      return this.executeInShell(command, timeout, maxOutput, tempDir);
    } finally {
      // Clean up temp directory
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
  
  private async executeInDocker(command: string, timeout: number, maxOutput: number, tempDir: string): Promise<BashExecutionResult> {
    const containerImage = this.config.sandbox.container.image;
    const containerTimeout = this.config.sandbox.container.timeout;
    
    // Escape command for Docker
    const escapedCommand = command.replace(/"/g, '\\"');
    
    const dockerArgs = [
      'run',
      '--rm',
      '-i',
      '-v', `${tempDir}:/workdir`,
      '-w', '/workdir',
      containerImage,
      'sh', '-c', `"${escapedCommand}"`,
    ];
    
    return new Promise((resolve) => {
      const child = spawn('docker', dockerArgs, {
        timeout: Math.min(timeout, containerTimeout),
      });
      
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      
      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill();
        resolve({
          stdout,
          stderr,
          exitCode: -1,
          timedOut: true,
          error: 'Execution timed out',
        });
      }, timeout);
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
        if (stdout.length > maxOutput) {
          stdout = stdout.substring(0, maxOutput);
          child.kill();
        }
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
        if (stderr.length > maxOutput) {
          stderr = stderr.substring(0, maxOutput);
          child.kill();
        }
      });
      
      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
          timedOut: false,
        });
      });
      
      child.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          stdout,
          stderr: error.message,
          exitCode: -1,
          timedOut: false,
          error: error.message,
        });
      });
    });
  }
  
  private async executeInShell(command: string, timeout: number, maxOutput: number, tempDir: string): Promise<BashExecutionResult> {
    // Create restricted environment
    const restrictedEnv: Record<string, string> = {
      ...process.env,
      PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      HOME: tempDir,
      SHELL: '/bin/sh',
      TERM: 'dumb',
      // Clear potentially dangerous variables
      LD_PRELOAD: '',
      LD_LIBRARY_PATH: '',
    };
    
    // Remove access to current directory
    delete restrictedEnv.PWD;
    
    return new Promise((resolve) => {
      const child = spawn('/bin/sh', ['-c', command], {
        cwd: tempDir,
        env: restrictedEnv,
        timeout,
      });
      
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      
      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill();
        resolve({
          stdout,
          stderr,
          exitCode: -1,
          timedOut: true,
          error: 'Execution timed out',
        });
      }, timeout);
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
        if (stdout.length > maxOutput) {
          stdout = stdout.substring(0, maxOutput);
          child.kill();
        }
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
        if (stderr.length > maxOutput) {
          stderr = stderr.substring(0, maxOutput);
          child.kill();
        }
      });
      
      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
          timedOut: false,
        });
      });
      
      child.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          stdout,
          stderr: error.message,
          exitCode: -1,
          timedOut: false,
          error: error.message,
        });
      });
    });
  }
  
  private async executeDirect(command: string, timeout: number, maxOutput: number): Promise<BashExecutionResult> {
    return new Promise((resolve) => {
      const child = spawn('/bin/sh', ['-c', command], {
        timeout,
      });
      
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      
      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill();
        resolve({
          stdout,
          stderr,
          exitCode: -1,
          timedOut: true,
          error: 'Execution timed out',
        });
      }, timeout);
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
        if (stdout.length > maxOutput) {
          stdout = stdout.substring(0, maxOutput);
          child.kill();
        }
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
        if (stderr.length > maxOutput) {
          stderr = stderr.substring(0, maxOutput);
          child.kill();
        }
      });
      
      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
          timedOut: false,
        });
      });
      
      child.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          stdout,
          stderr: error.message,
          exitCode: -1,
          timedOut: false,
          error: error.message,
        });
      });
    });
  }
}
```

## Tool Wrapper with Approval

```typescript
// src/services/tools/wrapper.ts
import { ApprovalManager } from './approval';
import { BashSandbox } from './bash-sandbox';

export interface ToolExecutionContext {
  userId: string;
  channelId: string;
  messageId: string;
  tool: string;
  args: any;
}

export interface ToolResult {
  success: boolean;
  result?: any;
  error?: string;
  approvalRequested?: boolean;
  approvalId?: string;
}

export class ToolWrapper {
  private approvalManager: ApprovalManager;
  private bashSandbox: BashSandbox;
  
  constructor(approvalManager: ApprovalManager, config: ToolSecurityConfig) {
    this.approvalManager = approvalManager;
    this.bashSandbox = new BashSandbox(config);
  }
  
  async execute(context: ToolExecutionContext): Promise<ToolResult> {
    const { tool, args, userId, channelId, messageId } = context;
    
    // Check if approval is required
    if (this.approvalManager.requiresApproval(tool, userId)) {
      // Request approval
      const response = await this.approvalManager.requestApproval(
        tool, args, userId, channelId, messageId
      );
      
      if (!response.approved) {
        return {
          success: false,
          error: `Tool execution rejected: ${response.reason || 'No reason given'}`,
          approvalRequested: true,
          approvalId: response.requestId,
        };
      }
    }
    
    // Execute tool
    try {
      switch (tool) {
        case 'bash':
          return this.executeBash(args, userId);
        case 'cron':
          return this.executeCron(args, userId);
        case 'browser':
          return this.executeBrowser(args, userId);
        case 'canvas':
          return this.executeCanvas(args, userId);
        case 'image':
          return this.executeImage(args, userId);
        case 'file':
          return this.executeFile(args, userId);
        default:
          return { success: false, error: `Unknown tool: ${tool}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  private async executeBash(args: any, userId: string): Promise<ToolResult> {
    const command = args.command || args.cmd || args._.join(' ');
    
    if (!command) {
      return { success: false, error: 'No command provided' };
    }
    
    const result = await this.bashSandbox.execute({
      command,
      timeout: args.timeout,
      maxOutput: args.maxOutput,
      cwd: args.cwd,
      env: args.env,
      sandbox: true, // Always use sandbox for bash
    });
    
    if (result.timedOut) {
      return { success: false, error: 'Command timed out' };
    }
    
    if (result.exitCode !== 0) {
      return {
        success: false,
        result: {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
        },
        error: `Command failed with exit code ${result.exitCode}`,
      };
    }
    
    return {
      success: true,
      result: {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      },
    };
  }
  
  private async executeCron(args: any, userId: string): Promise<ToolResult> {
    // Implement cron job scheduling
    // This would typically use a library like 'node-cron'
    return { success: false, error: 'Cron execution not yet implemented' };
  }
  
  private async executeBrowser(args: any, userId: string): Promise<ToolResult> {
    // Implement browser control via Chrome CDP
    return { success: false, error: 'Browser execution not yet implemented' };
  }
  
  private async executeCanvas(args: any, userId: string): Promise<ToolResult> {
    // Canvas drawing commands (A2UI JSON)
    return { success: true, result: { commands: args.commands } };
  }
  
  private async executeImage(args: any, userId: string): Promise<ToolResult> {
    // Image generation with Sharp
    return { success: false, error: 'Image generation not yet implemented' };
  }
  
  private async executeFile(args: any, userId: string): Promise<ToolResult> {
    // File read/write operations
    return { success: false, error: 'File operations not yet implemented' };
  }
}
```

## Approval UI Component

```typescript
// src/components/ApprovalPanel.tsx
import { useEffect, useState } from 'react';
import { useWebSocket } from './useWebSocket';

interface ApprovalRequest {
  id: string;
  tool: string;
  arguments: any;
  requestedBy: string;
  requestedAt: number;
  channelId: string;
  messageId: string;
}

export function ApprovalPanel({ userId }: { userId: string }) {
  const ws = useWebSocket();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  
  useEffect(() => {
    // Listen for approval requests
    const handler = ws.onMessage('approval', (msg: any) => {
      if (msg.type === 'notification' && msg.request?.tool) {
        setRequests(prev => [msg.request, ...prev]);
      }
    });
    
    return () => handler();
  }, [ws, userId]);
  
  const handleApprove = async (requestId: string) => {
    try {
      await ws.send({
        type: 'approval_response',
        requestId,
        approved: true,
      });
      
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };
  
  const handleReject = async (requestId: string, reason: string) => {
    try {
      await ws.send({
        type: 'approval_response',
        requestId,
        approved: false,
        reason,
      });
      
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };
  
  const formatRequest = (req: ApprovalRequest) => {
    switch (req.tool) {
      case 'bash':
        return {
          title: 'Execute Shell Command',
          description: req.arguments.command || 'Unknown command',
          details: `Requested by ${req.requestedBy} in ${req.channelId}`,
        };
      case 'cron':
        return {
          title: 'Schedule Cron Job',
          description: req.arguments.schedule || 'Unknown schedule',
          details: `Command: ${req.arguments.command || 'Unknown'}`,
        };
      default:
        return {
          title: `Use ${req.tool}`,
          description: JSON.stringify(req.arguments),
          details: `Requested by ${req.requestedBy}`,
        };
    }
  };
  
  return (
    <div className="approval-panel">
      <h2>Pending Approvals ({requests.length})</h2>
      
      {requests.length === 0 ? (
        <p>No pending approval requests</p>
      ) : (
        <div className="approval-requests">
          {requests.map(req => {
            const { title, description, details } = formatRequest(req);
            const [rejectReason, setRejectReason] = useState('');
            const [showReject, setShowReject] = useState(false);
            
            return (
              <div key={req.id} className="approval-request">
                <div className="request-header">
                  <h3>{title}</h3>
                  <span className="timestamp">
                    {new Date(req.requestedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="request-description">
                  <pre>{description}</pre>
                  <p>{details}</p>
                </div>
                <div className="request-actions">
                  <button onClick={() => handleApprove(req.id)}>Approve</button>
                  <button onClick={() => setShowReject(true)}>Reject</button>
                  
                  {showReject && (
                    <div className="reject-form">
                      <input
                        type="text"
                        placeholder="Reason for rejection"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                      <button onClick={() => {
                        handleReject(req.id, rejectReason);
                        setShowReject(false);
                        setRejectReason('');
                      }}>
                        Confirm Reject
                      </button>
                      <button onClick={() => setShowReject(false)}>Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

## Integration with Gateway

```typescript
// src/core/gateway.ts
import { ApprovalManager } from '../services/tools/approval';
import { ToolWrapper } from '../services/tools/wrapper';
import { ToolSecurityConfigSchema } from '../config/schema';

export class AgentGateway {
  private approvalManager: ApprovalManager;
  private toolWrapper: ToolWrapper;
  
  async initialize() {
    const config = this.getConfig();
    
    // Parse tool security config
    const toolSecurityConfig = ToolSecurityConfigSchema.parse({
      mode: config.security.mode,
      ownerId: config.allowlist.admins[0], // First admin is owner
      sandbox: config.tools.sandbox,
      approval: config.security.approval,
    });
    
    // Initialize approval manager
    this.approvalManager = new ApprovalManager(toolSecurityConfig);
    
    // Initialize tool wrapper
    this.toolWrapper = new ToolWrapper(this.approvalManager, toolSecurityConfig);
    
    // Set up event listeners
    this.approvalManager.on('notification', this.handleApprovalNotification.bind(this));
  }
  
  private async handleApprovalNotification(notification: any) {
    // Send notification to owners via WebSocket
    if (notification.type === 'approval_request') {
      for (const owner of this.approvalManager['owners']) {
        await this.sendToUser(owner, {
          type: 'approval_notification',
          request: notification.request,
        });
      }
    }
  }
  
  async executeTool(
    tool: string,
    args: any,
    userId: string,
    channelId: string,
    messageId: string
  ): Promise<any> {
    const result = await this.toolWrapper.execute({
      tool,
      args,
      userId,
      channelId,
      messageId,
    });
    
    if (result.approvalRequested) {
      return {
        type: 'approval_required',
        tool,
        requestId: result.approvalId,
      };
    }
    
    if (!result.success) {
      throw new Error(result.error || 'Tool execution failed');
    }
    
    return result.result;
  }
  
  // Handle approval response from WebSocket
  async handleApprovalResponse(
    requestId: string,
    approved: boolean,
    userId: string,
    reason?: string
  ) {
    const response = approved
      ? this.approvalManager.approveRequest(requestId, userId, reason)
      : this.approvalManager.rejectRequest(requestId, userId, reason);
    
    // If approved, the original tool execution will resume
    // If rejected, the caller needs to handle the rejection
    
    return response;
  }
  
  // List pending approvals
  listPendingApprovals(userId?: string) {
    if (userId) {
      return this.approvalManager.getPendingForUser(userId);
    }
    return this.approvalManager.listPending();
  }
  
  // Add owner
  addOwner(userId: string) {
    this.approvalManager.addOwner(userId);
  }
  
  // Remove owner
  removeOwner(userId: string) {
    this.approvalManager.removeOwner(userId);
  }
  
  // Check if user is owner
  isOwner(userId: string): boolean {
    return this.approvalManager.isOwner(userId);
  }
}
```

## Security Best Practices

### 1. Always Use Sandbox for Bash

```typescript
// Never do this for untrusted input
spawn('bash', ['-c', userInput]); // DANGEROUS!

// Always use sandbox
const sandbox = new BashSandbox(config);
await sandbox.execute({ command: userInput, sandbox: true });
```

### 2. Limit Execution Resources

```typescript
// Set reasonable limits
const result = await bashSandbox.execute({
  command: userInput,
  timeout: 30000, // 30 seconds
  maxOutput: 10000, // 10KB output
});
```

### 3. Block Dangerous Commands

```typescript
// In config
sandbox: {
  blockedCommands: [
    'rm', 'del', 'erase', 'dd', 'format', 'mkfs', 'chmod', 'chown',
    'useradd', 'userdel', 'passwd', 'sudo', 'su', 'kill', 'pkill',
    'reboot', 'shutdown', 'halt', 'poweroff', ':', '>', '>>', '|',
  ],
}
```

### 4. Restrict File System Access

```typescript
// Use Docker with read-only filesystems
const dockerArgs = [
  'run',
  '--rm',
  '-i',
  '-v', `${tempDir}:/workdir:ro`, // Read-only
  '-w', '/workdir',
  'alpine:latest',
  'sh', '-c', command,
];
```

### 5. Limit Network Access

```typescript
// Docker with no network
const dockerArgs = [
  'run',
  '--rm',
  '-i',
  '--network', 'none', // No network access
  'alpine:latest',
  'sh', '-c', command,
];
```

### 6. Use User Namespaces

```typescript
// Docker with user namespace for permission isolation
const dockerArgs = [
  'run',
  '--rm',
  '-i',
  '--user', '1000:1000', // Run as non-root
  'alpine:latest',
  'sh', '-c', command,
];
```

### 7. Validate Input

```typescript
import { z } from 'zod';

const BashCommandSchema = z.object({
  command: z.string().max(1000), // Limit length
  timeout: z.number().int().positive().max(60000), // Max 60 seconds
  maxOutput: z.number().int().positive().max(100000), // Max 100KB
});

// Validate before execution
const validation = BashCommandSchema.safeParse(args);
if (!validation.success) {
  throw new Error(`Invalid bash command: ${validation.error.message}`);
}
```

### 8. Rate Limit Tool Usage

```typescript
// src/services/tools/rate-limiter.ts
class ToolRateLimiter {
  private limits = new Map<string, { count: number; resetAt: number }>();
  
  constructor(
    private limit: number = 10, // 10 executions
    private windowMs: number = 60000 // per minute
  ) {}
  
  check(userId: string, tool: string): boolean {
    const key = `${userId}:${tool}`;
    const now = Date.now();
    
    const entry = this.limits.get(key);
    
    if (!entry || now > entry.resetAt) {
      this.limits.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    
    if (entry.count >= this.limit) {
      return false;
    }
    
    entry.count++;
    return true;
  }
  
  getRemaining(userId: string, tool: string): number {
    const key = `${userId}:${tool}`;
    const entry = this.limits.get(key);
    
    if (!entry) return this.limit;
    
    const now = Date.now();
    if (now > entry.resetAt) return this.limit;
    
    return Math.max(0, this.limit - entry.count);
  }
}
```

## Configuration Examples

### Strict Mode (Production)

```json
{
  "security": {
    "mode": "always-require-approval",
    "ownerId": "user:admin",
    "sandbox": {
      "enabled": true,
      "timeout": 30000,
      "maxOutput": 10000,
      "blockedCommands": [
        "rm", "del", "erase", "dd", "format", "mkfs",
        "chmod", "chown", "useradd", "userdel", "passwd",
        "sudo", "su", "kill", "pkill", ":", ">", ">>", "|",
        "reboot", "shutdown", "halt", "poweroff"
      ],
      "container": {
        "enabled": true,
        "image": "alpine:latest",
        "timeout": 60000
      }
    },
    "approval": {
      "timeout": 300,
      "requireConfirmation": true,
      "autoApprovePatterns": []
    }
  },
  "toolOverrides": {
    "bash": "always-require-approval",
    "cron": "always-require-approval"
  }
}
```

### Owner-Only Mode

```json
{
  "security": {
    "mode": "owner-only",
    "ownerId": "user:admin",
    "sandbox": {
      "enabled": true,
      "timeout": 30000,
      "maxOutput": 10000
    },
    "approval": {
      "timeout": 600,
      "requireConfirmation": false
    }
  },
  "toolOverrides": {}
}
```

### YOLO Mode (DANGEROUS - Not Recommended)

```json
{
  "security": {
    "mode": "yolo",
    "sandbox": {
      "enabled": true,
      "timeout": 30000,
      "maxOutput": 10000
    }
  },
  "toolOverrides": {}
}
```

## Testing

### Unit Tests

```typescript
describe('ApprovalManager', () => {
  let manager: ApprovalManager;
  
  beforeEach(() => {
    manager = new ApprovalManager({
      mode: 'owner-only',
      ownerId: 'user:admin',
      sandbox: { enabled: true, timeout: 30000, maxOutput: 10000 },
      approval: { timeout: 300, requireConfirmation: true },
    });
  });
  
  it('requires approval for bash in always-require-approval mode', () => {
    manager = new ApprovalManager({
      ...manager['config'],
      mode: 'always-require-approval',
    });
    
    expect(manager.requiresApproval('bash', 'user:1')).toBe(true);
    expect(manager.requiresApproval('bash', 'user:admin')).toBe(true);
  });
  
  it('allows owner to use bash in owner-only mode', () => {
    expect(manager.requiresApproval('bash', 'user:admin')).toBe(false);
    expect(manager.requiresApproval('bash', 'user:1')).toBe(true);
  });
  
  it('never requires approval in yolo mode', () => {
    manager = new ApprovalManager({
      ...manager['config'],
      mode: 'yolo',
    });
    
    expect(manager.requiresApproval('bash', 'user:1')).toBe(false);
    expect(manager.requiresApproval('cron', 'user:1')).toBe(false);
  });
  
  it('allows safe tools without approval', () => {
    expect(manager.requiresApproval('browser', 'user:1')).toBe(false);
    expect(manager.requiresApproval('canvas', 'user:1')).toBe(false);
  });
  
  it('requests and handles approval', async () => {
    const promise = manager.requestApproval('bash', { command: 'ls' }, 'user:1', 'channel:1', 'msg:1');
    
    // Approve the request
    manager.approveRequest('approval_0', 'user:admin');
    
    const response = await promise;
    expect(response.approved).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('ToolWrapper', () => {
  let wrapper: ToolWrapper;
  let approvalManager: ApprovalManager;
  
  beforeEach(() => {
    approvalManager = new ApprovalManager({
      mode: 'always-require-approval',
      sandbox: { enabled: true },
      approval: { timeout: 300 },
    });
    
    wrapper = new ToolWrapper(approvalManager, approvalManager['config']);
  });
  
  it('requires approval for bash', async () => {
    const result = await wrapper.execute({
      tool: 'bash',
      args: { command: 'echo hello' },
      userId: 'user:1',
      channelId: 'channel:1',
      messageId: 'msg:1',
    });
    
    expect(result.approvalRequested).toBe(true);
    expect(result.success).toBe(false);
  });
  
  it('executes after approval', async () => {
    // First, request approval
    const executePromise = wrapper.execute({
      tool: 'bash',
      args: { command: 'echo hello' },
      userId: 'user:1',
      channelId: 'channel:1',
      messageId: 'msg:1',
    });
    
    // Get the approval request
    const requests = approvalManager.listPending();
    expect(requests.length).toBe(1);
    
    // Approve it
    approvalManager.approveRequest(requests[0].id, 'user:admin');
    
    // Wait for execution
    const result = await executePromise;
    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
  });
});
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Approval not requested | Wrong mode | Check security.mode in config |
| Approval timeout | Owner not online | Extend timeout or notify differently |
| Sandbox not working | Docker not installed | Install Docker or use shell sandbox |
| Command blocked | In blocked list | Remove from blockedCommands or use different command |
| Permission denied | Filesystem restrictions | Check sandbox permissions |
| Memory limit exceeded | Output too large | Reduce maxOutput or split command |

### Debug Commands

```bash
# Check Docker is running
docker info

# Test sandbox locally
docker run --rm -i alpine:latest sh -c "echo hello"

# Check blocked commands
grep -i "rm\|del\|dd" config.json

# Test bash execution
node -e "const {spawn} = require('child_process'); spawn('echo', ['hello']).stdout.on('data', console.log)"
```

## Resources

- [Node-pty](https://github.com/microsoft/node-pty) - Terminal emulation
- [Docker SDK](https://docs.docker.com/engine/api/sdk/) - Docker container management
- [BullMQ](https://docs.bullmq.io/) - Job queue for cron
- [Puppeteer](https://pptr.dev/) - Browser automation
- [Sharp](https://sharp.pixelplumber.com/) - Image processing
- [Zod](https://zod.dev/) - Schema validation

## Principles

1. **Security First**: Always assume user input is malicious
2. **Least Privilege**: Give tools minimum necessary permissions
3. **Isolation**: Run dangerous tools in isolated environments
4. **Auditability**: Log all tool executions
5. **User Control**: Let owners approve/reject dangerous operations
6. **Fail Safe**: Default to safe behavior on errors
7. **Transparency**: Make security modes clear to users
