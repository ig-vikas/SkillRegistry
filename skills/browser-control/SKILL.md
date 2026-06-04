---
name: browser-control
type: skill
description: Browser automation and control via Chrome DevTools Protocol (CDP) for AI agent gateway, enabling secure web browsing, form filling, and DOM manipulation.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [backend, tools, web]
tags: [browser, chrome, cdp, devtools, automation, web, scraping]
---

# Browser Control Expert

Implement Chrome DevTools Protocol (CDP) based browser automation for AI agents, enabling secure web browsing, form interaction, and DOM manipulation with full isolation.

## Architecture

AI Agent Request -> URL Whitelist Check -> Session Pool -> CDP Connection -> Command Executor (Navigation/DOM/Network/Input) -> Result Processing

## Core Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| Session Manager | Manage browser instances and tabs | CDP, WebSocket |
| URL Whitelist | Validate allowed URLs/domains | Custom, regex |
| Command Router | Route commands to CDP domains | Custom |
| DOM Extractor | Extract structured data | CDP DOM methods |
| Screenshot | Capture page screenshots | CDP Page.captureScreenshot |
| PDF Generator | Generate PDFs | CDP Page.printToPDF |
| Form Filler | Automate form interactions | CDP DOM/Input |

## Implementation

```bash
pnpm add chrome-remote-interface
# OR
pnpm add puppeteer-core
```

### CDP Client Service

```typescript
// src/services/tools/browser/cdp-client.ts
import CDP from 'chrome-remote-interface';

export class CDPClient {
  private client: CDP.Client | null = null;
  private config: { host: string; port: number };
  
  constructor(config: { host?: string; port?: number } = {}) {
    this.config = { host: '127.0.0.1', port: 9222, ...config };
  }
  
  async connect(): Promise<void> {
    this.client = await CDP({ port: this.config.port });
  }
  
  async createContext(): Promise<string> {
    const { result } = await this.client!.send('Target.createBrowserContext');
    return result.browserContextId;
  }
  
  async createPage(contextId?: string, url?: string): Promise<string> {
    const params: any = { url };
    if (contextId) params.browserContextId = contextId;
    const { result } = await this.client!.send('Target.createTarget', params);
    return result.targetId;
  }
  
  async navigate(targetId: string, url: string, waitUntil: string = 'load'): Promise<void> {
    const client = await CDP({ port: this.config.port, target: targetId });
    await client.send('Page.navigate', { url });
    if (waitUntil) await client.send('Page.loadEventFired');
    await client.close();
  }
  
  async captureScreenshot(targetId: string, options?: { format?: 'jpeg'|'png'|'webp'; fullPage?: boolean }): Promise<string> {
    const client = await CDP({ port: this.config.port, target: targetId });
    const screenshotOptions: any = { format: 'png', ...options };
    if (options?.fullPage) {
      const { result: metrics } = await client.send('Page.getLayoutMetrics');
      screenshotOptions.clip = { x: 0, y: 0, width: Math.ceil(metrics.contentSize.width), height: Math.ceil(metrics.contentSize.height), scale: 1 };
    }
    const { result } = await client.send('Page.captureScreenshot', screenshotOptions);
    await client.close();
    return result.data;
  }
  
  async getContent(targetId: string): Promise<{ html: string; title: string; url: string }> {
    const client = await CDP({ port: this.config.port, target: targetId });
    const [htmlResult, titleResult, urlResult] = await Promise.all([
      client.send('DOM.getDocument', { depth: -1, pierce: true }),
      client.send('Runtime.evaluate', { expression: 'document.title' }),
      client.send('Runtime.evaluate', { expression: 'document.location.href' }),
    ]);
    await client.close();
    return { html: '<html>...</html>', title: titleResult.result.value, url: urlResult.result.value };
  }
  
  async click(targetId: string, selector: string): Promise<void> {
    const client = await CDP({ port: this.config.port, target: targetId });
    const { result: nodeIds } = await client.send('DOM.querySelectorAll', { selector, inActiveDocument: true });
    if (nodeIds.nodeIds.length === 0) throw new Error(`Element not found: ${selector}`);
    const { result: box } = await client.send('DOM.getBoxModel', { nodeId: nodeIds.nodeIds[0] });
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: (box.model.border[0] + box.model.border[2]) / 2, y: (box.model.border[1] + box.model.border[3]) / 2, button: 'left', clickCount: 1 });
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: (box.model.border[0] + box.model.border[2]) / 2, y: (box.model.border[1] + box.model.border[3]) / 2, button: 'left', clickCount: 1 });
    await client.close();
  }
  
  async typeText(targetId: string, selector: string, text: string): Promise<void> {
    const client = await CDP({ port: this.config.port, target: targetId });
    const { result: nodeIds } = await client.send('DOM.querySelectorAll', { selector, inActiveDocument: true });
    if (nodeIds.nodeIds.length === 0) throw new Error(`Element not found: ${selector}`);
    await client.send('DOM.focus', { nodeId: nodeIds.nodeIds[0] });
    for (const char of text) {
      await client.send('Input.dispatchKeyEvent', { type: 'keyDown', text: char, unmodifiedText: char, keyIdentifier: char, code: char, key: char, windowsVirtualKeyCode: char.charCodeAt(0) });
      await client.send('Input.dispatchKeyEvent', { type: 'keyUp', text: char, unmodifiedText: char, keyIdentifier: char, code: char, key: char, windowsVirtualKeyCode: char.charCodeAt(0) });
    }
    await client.close();
  }
  
  async evaluate(targetId: string, expression: string): Promise<any> {
    const client = await CDP({ port: this.config.port, target: targetId });
    const { result } = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    await client.close();
    return result;
  }
}
```

### Browser Service with Security

```typescript
// src/services/tools/browser/browser-service.ts
import { z } from 'zod';

export class BrowserService {
  private cdpClient: CDPClient;
  private config: any;
  private sessions = new Map<string, any>();
  
  constructor(config: any = {}) {
    this.config = {
      chrome: { host: '127.0.0.1', port: 9222 },
      security: { allowedUrls: ['http://localhost:*'], blockedUrls: ['file:', 'about:'] },
      ...config
    };
    this.cdpClient = new CDPClient(this.config.chrome);
  }
  
  isUrlAllowed(url: string): boolean {
    const parsed = new URL(url);
    for (const blocked of this.config.security.blockedUrls) {
      if (url.startsWith(blocked) || parsed.protocol === blocked.replace(':', '')) return false;
    }
    if (this.config.security.allowedUrls.length > 0) {
      for (const allowedUrl of this.config.security.allowedUrls) {
        const pattern = new RegExp(`^${allowedUrl.replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
        if (pattern.test(url)) return true;
      }
      return false;
    }
    return true;
  }
  
  sanitizeExpression(expression: string): boolean {
    const dangerousPatterns = ['window\\.location', 'eval', 'Function', 'fetch', 'XMLHttpRequest', 'setTimeout', 'innerHTML'];
    for (const pattern of dangerousPatterns) {
      if (new RegExp(pattern, 'i').test(expression)) return false;
    }
    return expression.length <= 1000;
  }
  
  async createSession(userId: string): Promise<any> {
    const sessionId = `bsess_${Date.now()}`;
    const contextId = await this.cdpClient.createContext();
    const session = { id: sessionId, contextId, userId, createdAt: Date.now(), tabs: new Set() };
    this.sessions.set(sessionId, session);
    return session;
  }
  
  async execute(commands: any[], userId: string): Promise<any> {
    const session = await this.createSession(userId);
    const results: any[] = [];
    let currentTargetId: string | undefined;
    
    for (const cmd of commands) {
      switch (cmd.type) {
        case 'navigate':
          if (!this.isUrlAllowed(cmd.url)) throw new Error(`URL blocked: ${cmd.url}`);
          if (!currentTargetId) currentTargetId = await this.cdpClient.createPage(session.contextId);
          await this.cdpClient.navigate(currentTargetId, cmd.url, cmd.waitUntil || 'load');
          results.push({ type: 'navigate', url: cmd.url });
          break;
        case 'screenshot':
          if (!currentTargetId) currentTargetId = await this.cdpClient.createPage(session.contextId);
          const screenshot = await this.cdpClient.captureScreenshot(currentTargetId, cmd);
          results.push({ type: 'screenshot', data: screenshot });
          break;
        case 'content':
          if (!currentTargetId) currentTargetId = await this.cdpClient.createPage(session.contextId);
          const content = await this.cdpClient.getContent(currentTargetId);
          results.push({ type: 'content', ...content });
          break;
        case 'click':
          if (!currentTargetId) throw new Error('No page open');
          await this.cdpClient.click(currentTargetId, cmd.selector);
          results.push({ type: 'click', selector: cmd.selector });
          break;
        case 'type':
          if (!currentTargetId) throw new Error('No page open');
          await this.cdpClient.typeText(currentTargetId, cmd.selector, cmd.text);
          results.push({ type: 'type', selector: cmd.selector, text: cmd.text });
          break;
        case 'evaluate':
          if (!currentTargetId) throw new Error('No page open');
          if (!this.sanitizeExpression(cmd.expression)) throw new Error('Expression not allowed');
          const result = await this.cdpClient.evaluate(currentTargetId, cmd.expression);
          results.push({ type: 'evaluate', result: result.result.value });
          break;
      }
    }
    
    return { success: true, results, sessionId: session.id };
  }
}
```

### Chrome Launcher

```typescript
// src/services/tools/browser/chrome-launcher.ts
import { spawn, ChildProcess } from 'child_process';

export class ChromeLauncher {
  private process: ChildProcess | null = null;
  
  async start(port: number = 9222): Promise<void> {
    const executablePath = this.getExecutablePath();
    const args = [
      `--remote-debugging-port=${port}`,
      '--headless=new',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-popup-blocking',
      '--disable-notifications',
      '--disable-infobars',
      '--disable-default-apps',
      '--disable-translate',
      '--window-size=1280,800',
    ];
    
    this.process = spawn(executablePath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Chrome startup timeout')), 10000);
      const check = setInterval(async () => {
        try {
          const portCheck = await this.checkPort(port);
          if (portCheck) { clearTimeout(timeout); clearInterval(check); resolve(); }
        } catch {}
      }, 500);
    });
  }
  
  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 5000));
      if (this.process && !this.process.killed) this.process.kill('SIGKILL');
      this.process = null;
    }
  }
  
  private getExecutablePath(): string {
    if (process.platform === 'win32') return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    if (process.platform === 'darwin') return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    return 'google-chrome';
  }
  
  private async checkPort(port: number): Promise<boolean> {
    return new Promise(resolve => {
      const net = require('net');
      const server = net.createServer();
      server.once('error', (err: any) => resolve(err.code === 'EADDRINUSE'));
      server.once('listening', () => { server.close(); resolve(false); });
      server.listen(port);
    });
  }
}
```

## Configuration Schema

```typescript
// src/config/browser-config.ts
import { z } from 'zod';

export const BrowserToolConfigSchema = z.object({
  browser: z.object({
    enabled: z.boolean().default(true),
    requireApproval: z.boolean().default(false),
    chrome: z.object({
      port: z.number().int().positive().default(9222),
      headless: z.boolean().default(true),
    }).default({}),
    security: z.object({
      allowedUrls: z.array(z.string()).default(['http://localhost:*']),
      blockedUrls: z.array(z.string()).default(['file:', 'about:', 'chrome:']),
      maxSessions: z.number().int().positive().default(10),
      sessionTimeout: z.number().int().positive().default(300000),
    }).default({}),
  }).default({}),
});
```

## HTTP API Endpoints

```typescript
// POST /api/browser/execute
router.post('/execute', async (req, res) => {
  const commands = z.array(z.object({
    type: z.enum(['navigate', 'screenshot', 'content', 'click', 'type', 'evaluate']),
    url: z.string().url().optional(),
    selector: z.string().optional(),
    text: z.string().optional(),
    expression: z.string().optional(),
  })).parse(req.body.commands);
  
  const gateway: AgentGateway = req.app.get('gateway');
  const result = await gateway.executeBrowser(commands, { userId: req.user?.id || 'anonymous' });
  
  if (result.approvalRequested) return res.status(403).json({ error: 'Approval required', approvalId: result.approvalId });
  if (!result.success) return res.status(400).json({ error: result.error });
  
  res.json({ success: true, results: result.results, sessionId: result.sessionId });
});

// POST /api/browser/session
router.post('/session', async (req, res) => {
  const gateway: AgentGateway = req.app.get('gateway');
  const { sessionId, viewport } = z.object({ sessionId: z.string().optional(), viewport: z.enum(['mobile', 'tablet', 'desktop']).optional() }).parse(req.body);
  const result = await gateway.createBrowserSession({ userId: req.user?.id || 'anonymous', viewport });
  res.json({ sessionId: result.sessionId, contextId: result.contextId });
});

// DELETE /api/browser/session/:sessionId
router.delete('/session/:sessionId', async (req, res) => {
  const gateway: AgentGateway = req.app.get('gateway');
  await gateway.closeBrowserSession(req.params.sessionId);
  res.json({ success: true });
});
```

## Security Best Practices

1. **URL Whitelisting** - Validate all URLs against allowed list
2. **JavaScript Sanitization** - Block dangerous expressions
3. **Session Isolation** - Each user gets isolated browser context
4. **Resource Limits** - Enforce timeouts and session limits
5. **Content Sanitization** - Clean HTML before returning
6. **Network Security** - Use HTTPS, disable insecure features

## Testing

```typescript
// tests/services/tools/browser-service.test.ts
describe('BrowserService', () => {
  let service: BrowserService;
  beforeEach(() => { service = new BrowserService({ security: { allowedUrls: ['https://example.com/*'] } }); });
  
  it('validates URLs', () => {
    expect(service.isUrlAllowed('https://example.com/page')).toBe(true);
    expect(service.isUrlAllowed('https://other.com/page')).toBe(false);
    expect(service.isUrlAllowed('file:///etc/passwd')).toBe(false);
  });
  
  it('sanitizes JavaScript', () => {
    expect(service.sanitizeExpression('1 + 1')).toBe(true);
    expect(service.sanitizeExpression('window.location.href = "evil.com"')).toBe(false);
    expect(service.sanitizeExpression('eval("alert(1)")')).toBe(false);
  });
});
```

## Resources

- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Puppeteer](https://pptr.dev/)
- [chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface)

## Principles

1. Security First
2. Isolation
3. Efficiency
4. Reliability
5. Transparency
