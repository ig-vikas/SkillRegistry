---
name: control-panel
type: skill
description: React-based control panel and dashboard for AI agent gateway with widget system, real-time monitoring, and configuration UI.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [frontend, ui-ux, react, dashboard]
tags: [control-panel, dashboard, react, typescript, widgets, realtime, monitoring, configuration]
---

# Control Panel Expert

Build a comprehensive React-based control panel for AI agent gateway with modular widget system, real-time monitoring, configuration management, and responsive UI components.

## Architecture

```
Control Panel (React/Vite)
     │
     ├── Dashboard Layout (Responsive grid with DnD)
     │   ├── Header (User info, global controls)
     │   └── Main Area (Widget grid)
     │
     ├── Widget System (8 types)
     │   ├── ChatMonitor (Real-time chat + streaming)
     │   ├── ConnectionStatus (WS/HTTP health)
     │   ├── TokenManager (Device token CRUD)
     │   ├── SessionExplorer (Session table)
     │   ├── LLMDashboard (Provider status + charts)
     │   ├── ToolStats (Execution metrics)
     │   ├── SystemMetrics (CPU/memory/disk)
     │   └── ApprovalPanel (Pending approvals)
     │
     └── Modals
         ├── SettingsPanel (Full config editor)
         └── PairingModal (QR code display)
```

## Core Components

| Component | Purpose | Tech |
|-----------|---------|------|
| DashboardLayout | Grid layout with DnD | React, react-dnd, Tailwind |
| WebSocketProvider | Connection + auth management | React Context, WebSocket API |
| ChatMonitorWidget | Real-time chat + streaming | useWebSocket hook, date-fns |
| ConnectionStatusWidget | Health monitoring | Polling, SWR pattern |
| TokenManagerWidget | Device token CRUD | REST API, clipboard |
| SessionExplorerWidget | Session table | @tanstack/react-table |
| LLMDashboardWidget | Provider status + charts | Recharts |
| ToolStatsWidget | Tool execution metrics | Recharts |
| SystemMetricsWidget | Resource monitoring | Recharts |
| ApprovalPanel | Pending approval UI | WebSocket real-time |
| SettingsPanel | Configuration editor | Zod validation |

## Quick Start

```bash
# Create React app
pnpm create vite control-panel --template react-ts
cd control-panel

# Install dependencies
pnpm add react-router-dom @tanstack/react-table recharts react-dnd react-dnd-html5-backend
pnpm add qrcode lucide-react date-fns clsx tailwind-merge zod
pnpm add -D autoprefixer postcss postcss-nested tailwindcss

# Run development
pnpm dev
```

## Configuration Schemas

```typescript
// src/types/widgets.ts
import { z } from 'zod';

export const WidgetType = z.enum([
  'chat-monitor', 'connection-status', 'token-manager', 
  'session-explorer', 'llm-dashboard', 'tool-stats', 
  'system-metrics', 'approval-panel'
]);

export const WidgetSize = z.enum(['small', 'medium', 'large', 'full']);

export const WidgetConfigSchema = z.object({
  id: z.string().uuid(),
  type: WidgetType,
  title: z.string().optional(),
  size: WidgetSize.default('medium'),
  position: z.object({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    w: z.number().int().positive(),
    h: z.number().int().positive(),
  }),
  props: z.record(z.any()).default({}),
  isMinimized: z.boolean().default(false),
  isVisible: z.boolean().default(true),
});

export const DashboardConfigSchema = z.object({
  version: z.string().default('1.0.0'),
  widgets: z.array(WidgetConfigSchema).default([]),
  theme: z.object({
    mode: z.enum(['light', 'dark', 'system']).default('system'),
    primaryColor: z.string().default('#3b82f6'),
  }).default({}),
  layout: z.object({
    gridGap: z.number().default(16),
    margin: z.number().default(16),
    columns: z.number().default(12),
  }).default({}),
});
```

## Dashboard Layout with DnD

```typescript
// src/components/DashboardLayout.tsx
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const WidgetComponentMap: Record<string, React.ComponentType<any>> = {
  'chat-monitor': ChatMonitorWidget,
  'connection-status': ConnectionStatusWidget,
  'token-manager': TokenManagerWidget,
  'session-explorer': SessionExplorerWidget,
  'llm-dashboard': LLMDashboardWidget,
  'tool-stats': ToolStatsWidget,
  'system-metrics': SystemMetricsWidget,
  'approval-panel': ApprovalPanel,
};

const DraggableWidget = ({ widget, onMove }: any) => {
  const Component = WidgetComponentMap[widget.type];
  const [{ isDragging }, drag] = useDrag({ type: 'widget', item: { id: widget.id } });
  const [, drop] = useDrop({
    accept: 'widget',
    drop: (item: any, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (delta) onMove(widget.id, widget.position.x + Math.round(delta.x), widget.position.y + Math.round(delta.y));
    }
  });
  if (isDragging) return <div ref={drag} className="opacity-50" />;
  return (
    <div ref={node => drag(drop(node))} className={`widget widget-${widget.size}`}
      style={{ gridColumn: `${widget.position.x + 1} / span ${widget.position.w}`, gridRow: `${widget.position.y + 1} / span ${widget.position.h}` }}>
      <div className="widget-header">
        <h3>{widget.title || widget.type}</h3>
        <div className="widget-controls">
          <button onClick={() => widget.onMinimize?.(widget.id)}>{widget.isMinimized ? '⤢' : '⤣'}</button>
          <button onClick={() => widget.onRemove?.(widget.id)}>×</button>
        </div>
      </div>
      {!widget.isMinimized && <div className="widget-content"><Component {...widget.props} /></div>}
    </div>
  );
};

export const DashboardLayout = ({ config, onConfigChange, gatewayUrl }: any) => {
  const [widgets, setWidgets] = useState(config.widgets);
  const handleAddWidget = (type: string) => setWidgets(prev => [...prev, { id: crypto.randomUUID(), type, size: 'medium', position: { x: 0, y: 0, w: 4, h: 4 }, props: {} }]);
  useEffect(() => onConfigChange({ ...config, widgets }), [widgets]);
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="dashboard-layout">
        <div className="dashboard-grid">
          {widgets.map(w => <DraggableWidget key={w.id} widget={w} onMove={(id: string, x: number, y: number) => setWidgets(prev => prev.map(w2 => w2.id === id ? { ...w2, position: { ...w2.position, x, y } } : w2))} />)}
        </div>
        <WidgetPalette onAddWidget={handleAddWidget} />
      </div>
    </DndProvider>
  );
};
```

## WebSocket Context Provider

```typescript
// src/contexts/WebSocketContext.tsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface WebSocketContextType {
  isConnected: boolean;
  userId: string | null;
  token: string | null;
  deviceId: string | null;
  connect: (url: string, authToken?: string) => void;
  disconnect: () => void;
  send: (message: any) => void;
  subscribe: (channelId: string) => void;
  unsubscribe: (channelId: string) => void;
  pair: (code: string) => Promise<{ userId: string; deviceId: string; token: string }>;
  approveRequest: (requestId: string, reason?: string) => void;
  rejectRequest: (requestId: string, reason?: string) => void;
  on: (type: string, handler: (msg: any) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children, url: initialUrl, autoConnect = true }: any) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [messageHandlers] = useState<Map<string, (msg: any) => void>>(new Map());

  const connect = useCallback((wsUrl: string, authToken?: string) => {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => { setIsConnected(true); if (authToken) ws.send(JSON.stringify({ type: 'pair', token: authToken })); };
    ws.onclose = () => { setIsConnected(false); setSocket(null); };
    ws.onmessage = (event) => { try { const msg = JSON.parse(event.data); handleMessage(msg); } catch (e) { console.error(e); } };
    setSocket(ws);
  }, []);
  const send = useCallback((message: any) => { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message)); }, [socket]);
  const subscribe = useCallback((channelId: string) => send({ type: 'subscribe', channelId }), [send]);
  const unsubscribe = useCallback((channelId: string) => send({ type: 'unsubscribe', channelId }), [send]);
  const pair = useCallback((code: string) => new Promise((resolve, reject) => {
    const handler = (msg: any) => { if (msg.type === 'paired') { setUserId(msg.userId); setDeviceId(msg.deviceId); setToken(msg.token); cleanup(); resolve({ userId: msg.userId, deviceId: msg.deviceId, token: msg.token }); } else if (msg.type === 'error') { cleanup(); reject(new Error(msg.message || 'Pairing failed')); } };
    const cleanup = () => messageHandlers.delete('pairing'); messageHandlers.set('pairing', handler); send({ type: 'pair', token: code });
    setTimeout(() => { cleanup(); reject(new Error('Pairing timeout')); }, 30000);
  }, [send, messageHandlers]);
  const approveRequest = useCallback((requestId: string, reason?: string) => send({ type: 'approval_response', requestId, approved: true, reason }), [send]);
  const rejectRequest = useCallback((requestId: string, reason?: string) => send({ type: 'approval_response', requestId, approved: false, reason }), [send]);
  const on = useCallback((type: string, handler: (msg: any) => void) => { messageHandlers.set(type, handler); return () => messageHandlers.delete(type); }, [messageHandlers]);
  const handleMessage = useCallback((msg: any) => { if (msg.type === 'paired') { setUserId(msg.userId); setDeviceId(msg.deviceId); setToken(msg.token); } messageHandlers.forEach(h => { try { h(msg); } catch (e) { console.error(e); } }); }, [messageHandlers]);
  useEffect(() => { if (autoConnect && !socket) connect(initialUrl); return () => disconnect(); }, [autoConnect, connect, initialUrl, socket]);
  const disconnect = useCallback(() => { if (socket) { socket.close(); setSocket(null); setIsConnected(false); } }, [socket]);
  const value = { isConnected, userId, token, deviceId, connect, disconnect, send, subscribe, unsubscribe, pair, approveRequest, rejectRequest, on };
  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket() { const ctx = useContext(WebSocketContext); if (!ctx) throw new Error('useWebSocket must be used within WebSocketProvider'); return ctx; }
```

## Widget Implementations

### Chat Monitor Widget

Real-time chat display with streaming support. Subscribes to channels, displays messages, handles streaming chunks.

```typescript
// src/components/widgets/ChatMonitorWidget.tsx
import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { formatDistanceToNow } from 'date-fns';

export function ChatMonitorWidget({ channelId: initialChannelId = '*', maxMessages = 100 }: any) {
  const ws = useWebSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const [channelId, setChannelId] = useState(initialChannelId);
  const [isStreaming, setIsStreaming] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState('');

  const handleMessage = useCallback((msg: any) => {
    if (msg.type === 'chunk' && msg.channelId === channelId) {
      if (msg.delta) { setIsStreaming(msg.channelId); setStreamingText(prev => prev + msg.delta); }
      if (msg.done) { setIsStreaming(null); if (streamingText) { setMessages(prev => [...prev, { id: `msg_${Date.now()}`, channelId: msg.channelId, senderId: 'assistant', text: streamingText, timestamp: Date.now(), isUser: false }]); setStreamingText(''); } }
      return;
    }
    if (msg.type === 'message' && msg.text && (channelId === '*' || msg.channelId === channelId)) {
      setMessages(prev => [...prev.slice(-maxMessages + 1), { id: msg.messageId || `msg_${Date.now()}`, channelId: msg.channelId, senderId: msg.userId || msg.senderId || 'unknown', text: msg.text, timestamp: msg.timestamp || Date.now(), isUser: !!msg.senderId }]);
    }
  }, [channelId, maxMessages, streamingText]);

  useEffect(() => { const handler = ws.on('chat', handleMessage); ws.subscribe(channelId); return () => { handler(); ws.unsubscribe(channelId); }; }, [channelId, ws, handleMessage]);

  return (
    <div className="chat-monitor-widget">
      <div className="widget-controls">
        <input type="text" value={channelId} onChange={e => setChannelId(e.target.value)} placeholder="Channel (*=all)" />
        <button onClick={() => setMessages([])}>Clear</button>
      </div>
      <div className="messages-container">
        {messages.length === 0 ? <div className="empty-state">No messages</div> : messages.map(msg => (
          <div key={msg.id} className={`message ${msg.isUser ? 'user' : 'assistant'}`}>
            <div className="message-header"><span className="sender">{msg.senderId}</span><span className="timestamp">{formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}</span></div>
            <div className="message-content">{msg.text}</div>
          </div>
        ))}
        {isStreaming && <div className="message assistant streaming"><div className="message-content">{streamingText}<span className="cursor">|</span></div></div>}
      </div>
    </div>
  );
}
```

### Connection Status Widget

Monitors HTTP and WebSocket connection health with polling and real-time updates.

```typescript
// src/components/widgets/ConnectionStatusWidget.tsx
import { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';

export function ConnectionStatusWidget() {
  const ws = useWebSocket();
  const [httpStatus, setHttpStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');

  useEffect(() => {
    const checkHealth = async () => {
      try { const res = await fetch('http://localhost:3000/health', { headers: { 'Authorization': `Bearer ${ws.token || ''}` } }); setHttpStatus(res.ok ? 'connected' : 'error'); }
      catch { setHttpStatus('disconnected'); }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, [ws.token]);

  return (
    <div className="connection-status-widget">
      <h4>Connection Status</h4>
      <div className="status-grid">
        <div className={`status-indicator ${httpStatus}`}>HTTP: {httpStatus}</div>
        <div className={`status-indicator ${ws.isConnected ? 'connected' : 'disconnected'}`}>WS: {ws.isConnected ? 'connected' : 'disconnected'}</div>
        <div className={`status-indicator ${ws.userId ? 'connected' : 'disconnected'}`}>Auth: {ws.userId ? 'Yes' : 'No'}</div>
      </div>
      {ws.userId && <div className="user-info"><p>User: {ws.userId}</p><p>Device: {ws.deviceId || 'N/A'}</p></div>}
    </div>
  );
}
```

### Token Manager Widget

Manages device tokens with CRUD operations via REST API.

```typescript
// src/components/widgets/TokenManagerWidget.tsx
import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';

export function TokenManagerWidget() {
  const ws = useWebSocket();
  const [tokens, setTokens] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTokens = useCallback(async () => {
    try { setIsLoading(true); const res = await fetch('http://localhost:3000/api/tokens', { headers: { 'Authorization': `Bearer ${ws.token || ''}` } }); if (res.ok) setTokens(await res.json()); }
    catch { setTokens([]); } finally { setIsLoading(false); }
  }, [ws.token]);

  const revokeToken = useCallback(async (deviceId: string) => {
    try { const res = await fetch(`http://localhost:3000/api/tokens/${deviceId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${ws.token || ''}` } }); if (res.ok) setTokens(prev => prev.filter(t => t.deviceId !== deviceId)); }
    catch (err) { console.error('Error revoking:', err); }
  }, [ws.token]);

  const generateNewToken = useCallback(async () => {
    try { const res = await fetch('http://localhost:3000/api/tokens', { method: 'POST', headers: { 'Authorization': `Bearer ${ws.token || ''}` } }); if (res.ok) setTokens(prev => [await res.json(), ...prev]); }
    catch (err) { console.error('Error generating:', err); }
  }, [ws.token]);

  useEffect(() => { if (ws.isConnected && ws.token) fetchTokens(); }, [ws.isConnected, ws.token]);

  return (
    <div className="token-manager-widget">
      <div className="widget-header"><h4>Device Tokens</h4><button onClick={generateNewToken}>+ Generate</button></div>
      {isLoading ? <div>Loading...</div> : tokens.length === 0 ? <div>No tokens</div> : (
        <div className="tokens-list">
          {tokens.map(t => (
            <div key={t.deviceId} className="token-item">
              <div className="token-info">
                <div><strong>Device:</strong> {t.deviceId}</div>
                <div><strong>Created:</strong> {new Date(t.createdAt).toLocaleString()}</div>
              </div>
              <div className="token-actions">
                <button onClick={() => navigator.clipboard.writeText(t.token)}>Copy</button>
                <button onClick={() => revokeToken(t.deviceId)}>Revoke</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

### Session Explorer Widget

Displays session history with search, filter, and pagination using TanStack Table.

```typescript
// src/components/widgets/SessionExplorerWidget.tsx
import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useReactTable, getCoreRowModel, getFilteredRowModel, ColumnDef, flexRender } from '@tanstack/react-table';

export function SessionExplorerWidget() {
  const ws = useWebSocket();
  const [sessions, setSessions] = useState<any[]>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns: ColumnDef<any>[] = [
    { accessorKey: 'id', header: 'ID', cell: info => <span className="font-mono">{info.getValue<string>().substring(0, 8)}...</span> },
    { accessorKey: 'channelId', header: 'Channel' },
    { accessorKey: 'senderId', header: 'Sender' },
    { accessorKey: 'agent', header: 'Agent' },
    { accessorKey: 'messageCount', header: 'Messages' },
    { accessorKey: 'tokenCount', header: 'Tokens', cell: info => info.getValue<number>().toLocaleString() },
    { accessorKey: 'updatedAt', header: 'Last Activity', cell: info => new Date(info.getValue<number>()).toLocaleString() },
  ];

  const fetchSessions = useCallback(async () => {
    try { const res = await fetch('http://localhost:3000/api/sessions', { headers: { 'Authorization': `Bearer ${ws.token || ''}` } }); if (res.ok) setSessions(await res.json()); } catch { setSessions([]); }
  }, [ws.token]);

  const table = useReactTable({ data: sessions, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter, getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel() });

  useEffect(() => { if (ws.isConnected && ws.token) fetchSessions(); }, [ws.isConnected, ws.token]);

  return (
    <div className="session-explorer-widget">
      <div className="widget-header"><h4>Sessions</h4><input type="text" value={globalFilter} onChange={e => setGlobalFilter(e.target.value)} placeholder="Search..." /></div>
      {sessions.length === 0 ? <div>No sessions</div> : (
        <div className="table-container">
          <table><thead>{table.getHeaderGroups().map(hg => <tr key={hg.id}>{hg.headers.map(h => <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>)}</tr>)}</thead>
          <tbody>{table.getRowModel().rows.map(row => <tr key={row.id}>{row.getVisibleCells().map(c => <td key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</td>)}</tr>)}</tbody></table>
          <div>Showing {table.getFilteredRowModel().rows.length} of {sessions.length} sessions</div>
        </div>
      )}
    </div>
  );
}
```

### LLM Dashboard Widget

Shows LLM provider status with real-time updates and usage charts.

```typescript
// src/components/widgets/LLMDashboardWidget.tsx
import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export function LLMDashboardWidget() {
  const ws = useWebSocket();
  const [providers, setProviders] = useState<any[]>([]);
  const [usageData, setUsageData] = useState<any[]>([]);
  const [tokenUsage, setTokenUsage] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  const fetchData = useCallback(async () => {
    try { 
      const res = await fetch('http://localhost:3000/api/providers', { headers: { 'Authorization': `Bearer ${ws.token || ''}` } });
      if (res.ok) setProviders(await res.json());
      const res2 = await fetch(`http://localhost:3000/api/stats/llm?range=${timeRange}`, { headers: { 'Authorization': `Bearer ${ws.token || ''}` } });
      if (res2.ok) { const data = await res2.json(); setUsageData(data.dailyUsage || []); setTokenUsage(data.tokenUsage || []); }
    } catch (err) { console.error('Error:', err); }
  }, [ws.token, timeRange]);

  useEffect(() => { if (ws.isConnected && ws.token) fetchData(); }, [ws.isConnected, ws.token]);
  useEffect(() => { fetchData(); }, [timeRange]);
  useEffect(() => { const h = ws.on('provider_update', (msg: any) => { if (msg.provider) setProviders(prev => prev.map(p => p.id === msg.provider.id ? msg.provider : p)); }); return h; }, [ws]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

  return (
    <div className="llm-dashboard-widget">
      <div className="widget-header"><h4>LLM Providers</h4><select value={timeRange} onChange={e => setTimeRange(e.target.value as any)}><option value="24h">24h</option><option value="7d">7d</option><option value="30d">30d</option></select></div>
      {providers.length === 0 ? <div>No providers</div> : (
        <div className="dashboard-grid">
          <div className="provider-cards">
            {providers.map(p => (
              <div key={p.id} className={`provider-card ${p.status}`}>
                <div className="provider-header"><h5>{p.name}</h5><span className={`status-badge ${p.status}`}>{p.status}</span></div>
                <div className="provider-info"><p><strong>Model:</strong> {p.model}</p><p><strong>Type:</strong> {p.type}</p></div>
                <div className="provider-stats">
                  <div className="stat"><span className="stat-value">{p.responseTime}ms</span><span className="stat-label">Avg Response</span></div>
                  <div className="stat"><span className="stat-value">{p.requestCount}</span><span className="stat-label">Requests</span></div>
                  <div className="stat"><span className="stat-value">{p.errorCount}</span><span className="stat-label">Errors</span></div>
                </div>
              </div>
            ))}
          </div>
          <div className="chart-container"><h5>Requests Over Time</h5><ResponsiveContainer width="100%" height={150}>
            <LineChart data={usageData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend />
              <Line type="monotone" dataKey="requests" name="Requests" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="tokens" name="Tokens" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer></div>
          <div className="chart-container"><h5>Token Usage</h5><ResponsiveContainer width="100%" height={150}>
            <PieChart><Pie data={tokenUsage} cx="50%" cy="50%" labelLine={false} outerRadius={50} fill="#8884d8" dataKey="tokens" nameKey="provider" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
              {tokenUsage.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
            </Pie><Tooltip /></PieChart>
          </ResponsiveContainer></div>
        </div>
      )}
    </div>
  );
}
```

### Tool Stats Widget

Displays tool execution statistics with real-time updates.

```typescript
// src/components/widgets/ToolStatsWidget.tsx
import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function ToolStatsWidget() {
  const ws = useWebSocket();
  const [stats, setStats] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  const fetchStats = useCallback(async () => {
    try { const res = await fetch(`http://localhost:3000/api/stats/tools?range=${timeRange}`, { headers: { 'Authorization': `Bearer ${ws.token || ''}` } }); if (res.ok) setStats(await res.json()); } catch (err) { console.error('Error:', err); }
  }, [ws.token, timeRange]);

  useEffect(() => { if (ws.isConnected && ws.token) fetchStats(); }, [ws.isConnected, ws.token]);
  useEffect(() => { fetchStats(); }, [timeRange]);
  useEffect(() => { const h = ws.on('tool_execution', (msg: any) => { if (msg.tool) setStats(prev => prev.map(s => s.name === msg.tool ? { ...s, executions: s.executions + 1, successCount: msg.success ? s.successCount + 1 : s.successCount, errorCount: !msg.success ? s.errorCount + 1 : s.errorCount, lastUsed: Date.now() } : s)); }); return h; }, [ws]);

  return (
    <div className="tool-stats-widget">
      <div className="widget-header"><h4>Tool Usage</h4><select value={timeRange} onChange={e => setTimeRange(e.target.value as any)}><option value="24h">24h</option><option value="7d">7d</option><option value="30d">30d</option></select></div>
      {stats.length === 0 ? <div>No data</div> : (
        <div className="stats-container">
          <div className="tool-cards">
            {stats.map(t => (
              <div key={t.name} className="tool-card">
                <div className="tool-header"><h5>{t.name}</h5><span className={`tool-status ${t.errorCount > 0 ? 'error' : 'success'}`}>{t.errorCount > 0 ? '⚠' : '✓'}</span></div>
                <div className="tool-stats">
                  <div className="stat"><span className="stat-value">{t.executions}</span><span className="stat-label">Executions</span></div>
                  <div className="stat"><span className="stat-value success">{t.successCount}</span><span className="stat-label">Success</span></div>
                  <div className="stat"><span className="stat-value error">{t.errorCount}</span><span className="stat-label">Errors</span></div>
                  <div className="stat"><span className="stat-value">{((t.avgDuration || 0) / 1000).toFixed(1)}s</span><span className="stat-label">Avg Time</span></div>
                </div>
                {t.approvalRequired > 0 && <div className="approval-stats"><span>Approval: </span><span className="approval-approved">{t.approvalApproved}✓</span><span className="approval-rejected">{t.approvalRejected}✗</span></div>}
              </div>
            ))}
          </div>
          <div className="chart-container"><h5>Executions</h5><ResponsiveContainer width="100%" height={150}>
            <BarChart data={stats} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={60} /><Tooltip /><Legend />
              <Bar dataKey="executions" name="Executions" fill="#3b82f6" /><Bar dataKey="successCount" name="Success" fill="#10b981" /><Bar dataKey="errorCount" name="Errors" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer></div>
        </div>
      )}
    </div>
  );
}
```

### System Metrics Widget

Monitors system resources (CPU, memory, disk) with real-time charting.

```typescript
// src/components/widgets/SystemMetricsWidget.tsx
import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function SystemMetricsWidget() {
  const ws = useWebSocket();
  const [metrics, setMetrics] = useState<any[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<any>(null);

  const fetchMetrics = useCallback(async () => {
    try { const res = await fetch('http://localhost:3000/api/metrics', { headers: { 'Authorization': `Bearer ${ws.token || ''}` } }); if (res.ok) { const data = await res.json(); setCurrentMetrics(data.current); setMetrics(data.history || []); } } catch (err) { console.error('Error:', err); }
  }, [ws.token]);

  useEffect(() => { if (ws.isConnected && ws.token) { fetchMetrics(); const interval = setInterval(fetchMetrics, 5000); return () => clearInterval(interval); } }, [ws.isConnected, ws.token]);
  useEffect(() => { const h = ws.on('metrics', (msg: any) => { if (msg.metrics) { setCurrentMetrics(msg.metrics); setMetrics(prev => [...prev.slice(-59), msg.metrics].slice(-60)); } }); return h; }, [ws]);

  const formatBytes = (b: number) => b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : b < 1024 * 1024 * 1024 ? `${(b / (1024 * 1024)).toFixed(1)} MB` : `${(b / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  const formatUptime = (s: number) => { const d = Math.floor(s / (24 * 3600)); const h = Math.floor((s % (24 * 3600)) / 3600); const m = Math.floor((s % 3600) / 60); const sec = Math.floor(s % 60); return `${d > 0 ? d + 'd ' : ''}${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${sec}s`; };

  if (!currentMetrics) return <div className="system-metrics-widget"><div>Loading...</div></div>;

  return (
    <div className="system-metrics-widget">
      <div className="widget-header"><h4>System Metrics</h4></div>
      <div className="metrics-container">
        <div className="metrics-cards">
          <div className="metric-card"><div className="metric-header"><span className="metric-icon">🖥️</span><span className="metric-label">CPU</span></div><div className="metric-value">{(currentMetrics.cpuUsage * 100).toFixed(1)}%</div><div className="metric-bar"><div className="metric-bar-fill cpu" style={{ width: `${currentMetrics.cpuUsage * 100}%` }} /></div></div>
          <div className="metric-card"><div className="metric-header"><span className="metric-icon">💾</span><span className="metric-label">Memory</span></div><div className="metric-value">{formatBytes(currentMetrics.memoryUsage)} / {formatBytes(currentMetrics.memoryTotal)}</div><div className="metric-bar"><div className="metric-bar-fill memory" style={{ width: `${(currentMetrics.memoryUsage / currentMetrics.memoryTotal) * 100}%` }} /></div></div>
          <div className="metric-card"><div className="metric-header"><span className="metric-icon">💽</span><span className="metric-label">Disk</span></div><div className="metric-value">{formatBytes(currentMetrics.diskUsage)} / {formatBytes(currentMetrics.diskTotal)}</div><div className="metric-bar"><div className="metric-bar-fill disk" style={{ width: `${(currentMetrics.diskUsage / currentMetrics.diskTotal) * 100}%` }} /></div></div>
          <div className="metric-card"><div className="metric-header"><span className="metric-icon">⏱️</span><span className="metric-label">Uptime</span></div><div className="metric-value">{formatUptime(currentMetrics.uptime)}</div></div>
          <div className="metric-card"><div className="metric-header"><span className="metric-icon">🔗</span><span className="metric-label">Connections</span></div><div className="metric-value">{currentMetrics.activeConnections}</div></div>
        </div>
        <div className="chart-container"><h5>Usage Over Time</h5><ResponsiveContainer width="100%" height={150}>
          <AreaChart data={metrics}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="timestamp" tickFormatter={(t: number) => new Date(t).toLocaleTimeString()} /><YAxis tickFormatter={v => `${(v * 100).toFixed(0)}%`} /><Tooltip labelFormatter={l => new Date(l).toLocaleString()} formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
            <Area type="monotone" dataKey="cpuUsage" name="CPU" stroke="#3b82f6" fill="#3b82f6" stackId="1" /><Area type="monotone" dataKey="memoryUsage" name="Memory" stroke="#8b5cf6" fill="#8b5cf6" stackId="1" /><Area type="monotone" dataKey="diskUsage" name="Disk" stroke="#ec4899" fill="#ec4899" stackId="1" />
          </AreaChart>
        </ResponsiveContainer></div>
      </div>
    </div>
  );
}
```

### Approval Panel

Handles pending approval requests with real-time WebSocket updates.

```typescript
// src/components/ApprovalPanel.tsx
import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './contexts/WebSocketContext';
import { Check, X, Clock } from 'lucide-react';

export function ApprovalPanel() {
  const ws = useWebSocket();
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchPending = useCallback(async () => {
    try { setIsLoading(true); const res = await fetch('http://localhost:3000/api/approvals/pending', { headers: { 'Authorization': `Bearer ${ws.token || ''}` } }); if (res.ok) setRequests(await res.json()); } catch { } finally { setIsLoading(false); }
  }, [ws.token]);

  useEffect(() => { if (ws.isConnected && ws.token) fetchPending(); }, [ws.isConnected, ws.token]);
  useEffect(() => { const h1 = ws.on('approval_notification', (msg: any) => { if (msg.type === 'approval_request') setRequests(prev => [msg.request, ...prev]); }); const h2 = ws.on('approval_response', (msg: any) => { if (msg.requestId) setRequests(prev => prev.map(r => r.id === msg.requestId ? { ...r, status: msg.approved ? 'approved' : 'rejected' } : r)); }); return () => { h1(); h2(); }; }, [ws]);

  const handleApprove = useCallback(async (requestId: string) => { try { await ws.approveRequest(requestId); setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'approved' } : r)); setSelectedRequest(null); } catch (err) { console.error('Error:', err); } }, [ws]);
  const handleReject = useCallback(async (requestId: string, reason: string) => { try { await ws.rejectRequest(requestId, reason); setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r)); setSelectedRequest(null); setRejectReason(''); } catch (err) { console.error('Error:', err); } }, [ws]);

  const formatRequest = (req: any) => {
    const map: Record<string, any> = { bash: { title: 'Execute Shell Command', desc: req.arguments.command || 'Unknown', danger: true }, cron: { title: 'Schedule Cron Job', desc: req.arguments.schedule || 'Unknown', danger: true }, browser: { title: 'Browser Navigation', desc: req.arguments.url || 'Unknown', danger: false } };
    return map[req.tool] || { title: `Use ${req.tool}`, desc: JSON.stringify(req.arguments), danger: false };
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleString();

  return (
    <div className="approval-panel">
      <div className="panel-header"><h4>Pending Approvals ({requests.filter(r => r.status === 'pending').length})</h4><button onClick={fetchPending}>↻</button></div>
      {isLoading ? <div>Loading...</div> : requests.length === 0 ? <div>No pending requests</div> : (
        <div className="requests-container">
          <div className="requests-list">
            {requests.map(req => { const { title, desc, danger } = formatRequest(req); return (
              <div key={req.id} className={`request-card ${req.status} ${danger ? 'dangerous' : ''} ${selectedRequest?.id === req.id ? 'selected' : ''}`} onClick={() => setSelectedRequest(req)}>
                <div className="request-header"><div className="request-title"><span className={`request-type ${danger ? 'danger' : 'safe'}`}>{danger ? '🔒' : '✓'}</span><span>{title}</span></div><span className="request-time">{formatTime(req.requestedAt)}</span></div>
                <div className="request-preview">{desc.substring(0, 100)}</div>
                <div className="request-status">{req.status === 'approved' ? <Check className="approved" /> : req.status === 'rejected' ? <X className="rejected" /> : <Clock className="pending" />}</div>
              </div>
            ); })}
          </div>
          {selectedRequest && (
            <div className="request-detail">
              <div className="detail-header"><h5>{formatRequest(selectedRequest).title}</h5><button onClick={() => setSelectedRequest(null)}>×</button></div>
              <div className="detail-content">
                <div className="detail-section"><h6>Request Details</h6><p><strong>Tool:</strong> {selectedRequest.tool}</p><p><strong>By:</strong> {selectedRequest.requestedBy}</p><p><strong>Channel:</strong> {selectedRequest.channelId}</p><p><strong>Time:</strong> {formatTime(selectedRequest.requestedAt)}</p></div>
                <div className="detail-section"><h6>Arguments</h6><pre>{JSON.stringify(selectedRequest.arguments, null, 2)}</pre></div>
                {selectedRequest.status === 'pending' && <div className="detail-actions"><h6>Action</h6><div className="action-buttons"><button onClick={() => handleApprove(selectedRequest.id)} className="approve-btn"><Check /> Approve</button><button onClick={() => handleReject(selectedRequest.id, rejectReason || 'No reason')} className="reject-btn"><X /> Reject</button></div><div className="reject-form"><input type="text" placeholder="Reason" value={rejectReason} onChange={e => setRejectReason(e.target.value)} /></div></div>}
                {selectedRequest.status === 'approved' && <div className="detail-status approved"><Check /> Approved</div>}
                {selectedRequest.status === 'rejected' && <div className="detail-status rejected"><X /> Rejected</div>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

### Settings Panel

Full configuration editor with Zod validation for gateway settings.

```typescript
// src/components/SettingsPanel.tsx
import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './contexts/WebSocketContext';
import { z } from 'zod';

const SecurityMode = z.enum(['always-require-approval', 'owner-only', 'yolo']);
const GatewayConfigSchema = z.object({
  gateway: z.object({ port: z.number().int().positive().max(65535).default(3000), wsPort: z.number().int().positive().max(65535).default(3001), maxConnections: z.number().int().positive().default(1000), host: z.string().default('0.0.0.0') }).default({}),
  security: z.object({ mode: SecurityMode.default('owner-only'), pairingTimeout: z.number().int().positive().default(300), tokenExpiry: z.number().int().positive().default(86400), requireMentionInGroups: z.boolean().default(true) }).default({}),
  storage: z.object({ lancedbPath: z.string().default('./data/lancedb'), sqlitePath: z.string().default('./data/app.db'), retentionDays: z.number().int().positive().default(90) }).default({}),
  tools: z.object({
    bash: z.object({ enabled: z.boolean().default(true), requireApproval: z.boolean().default(true), timeout: z.number().int().positive().default(30000), maxOutput: z.number().int().positive().default(10000) }).default({}),
    browser: z.object({ enabled: z.boolean().default(true), requireApproval: z.boolean().default(false), timeout: z.number().int().positive().default(60000) }).default({}),
    cron: z.object({ enabled: z.boolean().default(true), requireApproval: z.boolean().default(true) }).default({}),
    canvas: z.object({ enabled: z.boolean().default(true), requireApproval: z.boolean().default(false) }).default({}),
    image: z.object({ enabled: z.boolean().default(true), requireApproval: z.boolean().default(false) }).default({}),
    file: z.object({ enabled: z.boolean().default(true), requireApproval: z.boolean().default(false) }).default({}),
  }).default({}),
  allowlist: z.object({ users: z.array(z.string()).default([]), channels: z.array(z.string()).default([]), admins: z.array(z.string()).default([]) }).default({}),
});

export function SettingsPanel({ gatewayUrl = 'http://localhost:3000', onClose }: any) {
  const ws = useWebSocket();
  const [config, setConfig] = useState<any>({});
  const [originalConfig, setOriginalConfig] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState<'gateway' | 'security' | 'storage' | 'providers' | 'tools' | 'allowlist'>('gateway');

  const fetchConfig = useCallback(async () => {
    try { setIsLoading(true); const res = await fetch(`${gatewayUrl}/api/config`, { headers: { 'Authorization': `Bearer ${ws.token || ''}` } }); if (res.ok) { const data = await res.json(); const parsed = GatewayConfigSchema.parse(data); setConfig(parsed); setOriginalConfig(parsed); } } catch (err) { console.error('Error:', err); } finally { setIsLoading(false); }
  }, [gatewayUrl, ws.token]);

  const saveConfig = useCallback(async () => {
    try { setIsSaving(true); setErrors({}); const parsed = GatewayConfigSchema.safeParse(config); if (!parsed.success) { const fieldErrors: Record<string, string> = {}; parsed.error.errors.forEach(err => { const path = err.path.join('.'); fieldErrors[path] = err.message; }); setErrors(fieldErrors); return; } const res = await fetch(`${gatewayUrl}/api/config`, { method: 'POST', headers: { 'Authorization': `Bearer ${ws.token || ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data) }); if (res.ok) { setOriginalConfig(parsed.data); onClose(); } else { throw new Error('Failed to save'); } } catch (err) { console.error('Error:', err); setErrors({ form: err.message }); } finally { setIsSaving(false); }
  }, [config, gatewayUrl, ws.token, onClose]);

  useEffect(() => { if (ws.isConnected && ws.token) fetchConfig(); }, [ws.isConnected, ws.token]);
  const handleChange = useCallback((path: string, value: any) => { setConfig(prev => { const keys = path.split('.'); const newConfig = { ...prev }; let current = newConfig; for (let i = 0; i < keys.length - 1; i++) current = current[keys[i]] || {}; current[keys[keys.length - 1]] = value; return newConfig; }); }, []);
  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

  if (isLoading) return <div className="settings-panel"><div>Loading...</div></div>;

  return (
    <div className="settings-panel">
      <div className="panel-header"><h2>Gateway Configuration</h2><div className="panel-actions"><button onClick={onClose}>Cancel</button><button onClick={saveConfig} disabled={!hasChanges || isSaving}>{isSaving ? 'Saving...' : 'Save'}</button></div></div>
      {errors.form && <div className="error-message">{errors.form}</div>}
      <div className="settings-nav">
        {(['gateway', 'security', 'storage', 'providers', 'tools', 'allowlist'] as const).map(section => <button key={section} className={activeSection === section ? 'active' : ''} onClick={() => setActiveSection(section)}>{section}</button>)}
      </div>
      <div className="settings-content">
        {activeSection === 'gateway' && <div className="settings-section"><h3>Gateway Settings</h3><div className="setting-group"><label>HTTP Port<input type="number" value={config.gateway?.port || 3000} onChange={e => handleChange('gateway.port', parseInt(e.target.value))} min="1" max="65535" /></label>{errors['gateway.port'] && <span className="error">{errors['gateway.port']}</span>}</div><div className="setting-group"><label>WebSocket Port<input type="number" value={config.gateway?.wsPort || 3001} onChange={e => handleChange('gateway.wsPort', parseInt(e.target.value))} min="1" max="65535" /></label></div><div className="setting-group"><label>Host<input type="text" value={config.gateway?.host || '0.0.0.0'} onChange={e => handleChange('gateway.host', e.target.value)} /></label></div><div className="setting-group"><label>Max Connections<input type="number" value={config.gateway?.maxConnections || 1000} onChange={e => handleChange('gateway.maxConnections', parseInt(e.target.value))} min="1" /></label></div></div>}
        {activeSection === 'security' && <div className="settings-section"><h3>Security Settings</h3><div className="setting-group"><label>Security Mode<select value={config.security?.mode || 'owner-only'} onChange={e => handleChange('security.mode', e.target.value as any)}><option value="always-require-approval">Always Require Approval</option><option value="owner-only">Owner Only</option><option value="yolo">YOLO</option></select></label></div><div className="setting-group"><label>Pairing Timeout (s)<input type="number" value={config.security?.pairingTimeout || 300} onChange={e => handleChange('security.pairingTimeout', parseInt(e.target.value))} min="10" /></label></div><div className="setting-group"><label>Token Expiry (s)<input type="number" value={config.security?.tokenExpiry || 86400} onChange={e => handleChange('security.tokenExpiry', parseInt(e.target.value))} min="60" /></label></div><div className="setting-group"><label><input type="checkbox" checked={config.security?.requireMentionInGroups || false} onChange={e => handleChange('security.requireMentionInGroups', e.target.checked)} /> Require mention in groups</label></div></div>}
        {activeSection === 'storage' && <div className="settings-section"><h3>Storage Settings</h3><div className="setting-group"><label>LanceDB Path<input type="text" value={config.storage?.lancedbPath || './data/lancedb'} onChange={e => handleChange('storage.lancedbPath', e.target.value)} /></label></div><div className="setting-group"><label>SQLite Path<input type="text" value={config.storage?.sqlitePath || './data/app.db'} onChange={e => handleChange('storage.sqlitePath', e.target.value)} /></label></div><div className="setting-group"><label>Retention Days<input type="number" value={config.storage?.retentionDays || 90} onChange={e => handleChange('storage.retentionDays', parseInt(e.target.value))} min="1" /></label></div></div>}
        {activeSection === 'tools' && <div className="settings-section"><h3>Tools Configuration</h3><div className="tools-grid">{(['bash', 'browser', 'cron', 'canvas', 'image', 'file'] as const).map(toolName => <div key={toolName} className="tool-config"><h4>{toolName.toUpperCase()}</h4><div className="setting-group"><label><input type="checkbox" checked={config.tools?.[toolName]?.enabled || true} onChange={e => handleChange(`tools.${toolName}.enabled`, e.target.checked)} /> Enabled</label></div><div className="setting-group"><label><input type="checkbox" checked={config.tools?.[toolName]?.requireApproval || false} onChange={e => handleChange(`tools.${toolName}.requireApproval`, e.target.checked)} /> Require Approval</label></div>{toolName === 'bash' && <> <div className="setting-group"><label>Timeout (ms)<input type="number" value={config.tools?.bash?.timeout || 30000} onChange={e => handleChange('tools.bash.timeout', parseInt(e.target.value))} min="1000" /></label></div><div className="setting-group"><label>Max Output<input type="number" value={config.tools?.bash?.maxOutput || 10000} onChange={e => handleChange('tools.bash.maxOutput', parseInt(e.target.value))} min="100" /></label></div></>}</div>))}</div></div>}
        {activeSection === 'providers' && <div className="settings-section"><h3>LLM Providers</h3><div className="providers-list">{Object.entries(config.providers || {}).map(([id, provider]: any) => <div key={id} className="provider-config"><h4>{id}</h4><div className="setting-group"><label>Type<select value={provider.type} onChange={e => handleChange(`providers.${id}.type`, e.target.value as any)}><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="local">Local</option></select></label></div><div className="setting-group"><label>Model<input type="text" value={provider.model} onChange={e => handleChange(`providers.${id}.model`, e.target.value)} /></label></div>{provider.type === 'openai' && <div className="setting-group"><label>API Key<input type="password" value={provider.apiKey || ''} onChange={e => handleChange(`providers.${id}.apiKey`, e.target.value)} /></label></div>}{provider.type === 'local' && <div className="setting-group"><label>Base URL<input type="text" value={provider.baseUrl || ''} onChange={e => handleChange(`providers.${id}.baseUrl`, e.target.value)} /></label></div>}<div className="setting-group"><label><input type="checkbox" checked={provider.enabled || true} onChange={e => handleChange(`providers.${id}.enabled`, e.target.checked)} /> Enabled</label></div><button onClick={() => { const newProviders = { ...config.providers }; delete newProviders[id]; handleChange('providers', newProviders); }}>Remove</button></div>)}<button onClick={() => handleChange('providers', { ...config.providers, [`provider-${Date.now()}`]: { type: 'openai', model: 'gpt-3.5-turbo', enabled: true } })}>Add Provider</button></div></div>}
        {activeSection === 'allowlist' && <div className="settings-section"><h3>Allowlist Configuration</h3><div className="allowlist-group"><h4>Admins</h4><div className="string-list">{(config.allowlist?.admins || []).map((admin: string, index: number) => <div key={index} className="list-item"><input type="text" value={admin} onChange={e => { const newAdmins = [...(config.allowlist?.admins || [])]; newAdmins[index] = e.target.value; handleChange('allowlist.admins', newAdmins); }} /><button onClick={() => handleChange('allowlist.admins', (config.allowlist?.admins || []).filter((_, i) => i !== index))}>Remove</button></div>)}<button onClick={() => handleChange('allowlist.admins', [...(config.allowlist?.admins || []), ''])}>Add Admin</button></div></div>}
      </div>
    </div>
  );
}
```

## Configuration Hook & Main App

```typescript
// src/hooks/useDashboardConfig.ts
import { useState, useEffect, useCallback } from 'react';
import { DashboardConfigSchema, DefaultDashboardConfig } from '../types/widgets';

const CONFIG_KEY = 'dashboard-config';

export function useDashboardConfig() {
  const [config, setConfig] = useState(() => {
    try { const saved = localStorage.getItem(CONFIG_KEY); if (saved) { const parsed = JSON.parse(saved); return DashboardConfigSchema.parse(parsed); } } catch { }
    return DefaultDashboardConfig;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { try { const saved = localStorage.getItem(CONFIG_KEY); if (saved) { const parsed = JSON.parse(saved); const validated = DashboardConfigSchema.safeParse(parsed); if (validated.success) setConfig(validated.data); } } catch { } finally { setIsLoading(false); } }, []);

  const saveConfig = useCallback((newConfig: any) => { try { const validated = DashboardConfigSchema.parse(newConfig); localStorage.setItem(CONFIG_KEY, JSON.stringify(validated)); setConfig(validated); } catch (err) { console.error('Error:', err); } }, []);
  const resetConfig = useCallback(() => { localStorage.removeItem(CONFIG_KEY); setConfig(DefaultDashboardConfig); }, []);
  return { config, setConfig: saveConfig, isLoading, resetConfig };
}

// src/App.tsx
import { useState, useCallback } from 'react';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { DashboardLayout } from './components/DashboardLayout';
import { SettingsPanel } from './components/SettingsPanel';
import { useDashboardConfig } from './hooks/useDashboardConfig';

function App() {
  const { config, setConfig, isLoading } = useDashboardConfig();
  const [showSettings, setShowSettings] = useState(false);
  const handleConfigChange = useCallback((newConfig: any) => { setConfig(newConfig); }, [setConfig]);

  if (isLoading) return <div className="loading-screen"><div className="spinner" /><p>Loading dashboard...</p></div>;

  return (
    <WebSocketProvider url="ws://localhost:3001/ws" autoConnect={true}>
      <div className="app-container">
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
        <DashboardLayout config={config} onConfigChange={handleConfigChange} gatewayUrl="http://localhost:3000" />
        <button className="settings-button" onClick={() => setShowSettings(true)}>⚙️ Settings</button>
      </div>
    </WebSocketProvider>
  );
}

export default App;
```

## CSS Styles

```css
/* src/styles/dashboard.css */
:root {
  --bg-primary: #ffffff; --bg-secondary: #f8fafc; --bg-tertiary: #f1f5f9;
  --text-primary: #1e293b; --text-secondary: #475569; --text-muted: #94a3b8;
  --border-color: #e2e8f0; --primary-color: #3b82f6; --danger-color: #ef4444;
  --success-color: #10b981; --warning-color: #f59e0b;
  --user-message-bg: #dbeafe; --assistant-message-bg: #f1f5f9;
}
[data-theme="dark"] {
  --bg-primary: #0f172a; --bg-secondary: #1e293b; --bg-tertiary: #334155;
  --text-primary: #f1f5f9; --text-secondary: #cbd5e1; --text-muted: #64748b;
  --border-color: #334155; --user-message-bg: #1e3a8a; --assistant-message-bg: #334155;
}

.dashboard-layout { display: flex; flex-direction: column; height: 100vh; background: var(--bg-primary); }
.dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; padding: 16px; flex: 1; overflow: auto; }
.widget { background: var(--bg-secondary); border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; display: flex; flex-direction: column; }
.widget-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color); }
.widget-header h3 { margin: 0; font-size: 14px; font-weight: 600; }
.widget-content { padding: 16px; flex: 1; overflow: auto; }
.widget.minimized .widget-content { display: none; }
.widget-small { grid-column: span 3; grid-row: span 2; }
.widget-medium { grid-column: span 4; grid-row: span 3; }
.widget-large { grid-column: span 6; grid-row: span 4; }
.widget-full { grid-column: span 12; grid-row: span 6; }

.messages-container { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; }
.message { padding: 12px 16px; border-radius: 8px; max-width: 80%; }
.message.user { background: var(--user-message-bg); align-self: flex-end; border-top-right-radius: 0; }
.message.assistant { background: var(--assistant-message-bg); align-self: flex-start; border-top-left-radius: 0; }
.message-header { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
.cursor { animation: blink 1s step-end infinite; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

.status-indicator { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg-tertiary); border-radius: 4px; font-size: 12px; }
.status-indicator.connected { color: var(--success-color); }
.status-indicator.disconnected { color: var(--danger-color); }

.metric-card { background: var(--bg-tertiary); border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.metric-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.metric-value { font-size: 24px; font-weight: 700; }
.metric-bar { height: 4px; background: var(--bg-secondary); border-radius: 2px; margin-top: 8px; overflow: hidden; }
.metric-bar-fill { height: 100%; border-radius: 2px; transition: width 0.3s ease; }
.metric-bar-fill.cpu { background: #3b82f6; }
.metric-bar-fill.memory { background: #8b5cf6; }

.request-card { border: 1px solid var(--border-color); border-radius: 8px; padding: 12px 16px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s ease; }
.request-card:hover { background: var(--bg-tertiary); }
.request-card.selected { background: var(--bg-tertiary); border-color: var(--primary-color); }
.request-card.dangerous { border-left: 4px solid var(--danger-color); }
.request-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.request-type { padding: 2px 6px; border-radius: 4px; font-size: 12px; font-weight: 600; }
.request-type.danger { background: var(--danger-color); color: white; }
.request-type.safe { background: var(--success-color); color: white; }

.settings-panel { position: fixed; top: 0; right: 0; width: 500px; height: 100vh; background: var(--bg-primary); box-shadow: -2px 0 16px rgba(0,0,0,0.1); z-index: 1000; display: flex; flex-direction: column; }
.settings-nav { display: flex; border-bottom: 1px solid var(--border-color); padding: 0 16px; background: var(--bg-secondary); }
.settings-nav button { padding: 12px 16px; background: transparent; border: none; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; }
.settings-nav button.active { color: var(--primary-color); border-bottom-color: var(--primary-color); }
.settings-content { flex: 1; overflow-y: auto; padding: 16px; }
.setting-group { margin-bottom: 16px; }
.setting-group label { display: flex; flex-direction: column; gap: 4px; font-size: 14px; color: var(--text-secondary); }
.setting-group input, .setting-group select { padding: 8px 12px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); }
.setting-group input:focus, .setting-group select:focus { outline: none; border-color: var(--primary-color); }
.error { color: var(--danger-color); font-size: 12px; margin-top: 4px; }

.settings-button { position: fixed; bottom: 16px; right: 16px; background: var(--primary-color); color: white; border: none; border-radius: 50%; width: 56px; height: 56px; font-size: 24px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 100; }
.settings-button:hover { background: #2563eb; transform: scale(1.1); }

.tokens-list .token-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 8px; }
.provider-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.provider-card { background: var(--bg-tertiary); border-radius: 8px; padding: 16px; }
.provider-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
.stat { text-align: center; }
.stat-value { display: block; font-size: 18px; font-weight: 700; }
.tools-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; }
.tool-config { background: var(--bg-tertiary); border-radius: 8px; padding: 16px; }
.chart-container { background: var(--bg-tertiary); border-radius: 8px; padding: 16px; margin-top: 12px; }
.widget-controls { display: flex; gap: 8px; }
.widget-controls input { padding: 6px 12px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-secondary); }

@media (max-width: 768px) {
  .dashboard-grid { grid-template-columns: 1fr; }
  .widget-small, .widget-medium, .widget-large, .widget-full { grid-column: span 1; }
  .settings-panel { width: 100%; height: 100%; }
}
```

## Package Configuration

```json
// package.json
{
  "name": "control-panel",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-table": "^8.10.0",
    "recharts": "^2.10.0",
    "react-dnd": "^16.0.1",
    "react-dnd-html5-backend": "^16.0.1",
    "qrcode": "^1.5.3",
    "lucide-react": "^0.294.0",
    "date-fns": "^2.30.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.1.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.55.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.0",
    "postcss": "^8.4.32",
    "postcss-nested": "^6.0.1",
    "tailwindcss": "^3.3.6",
    "typescript": "^5.2.0",
    "vite": "^5.0.0"
  }
}
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true }, '/ws': { target: 'ws://localhost:3001', ws: true } } },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: { outDir: 'dist', sourcemap: true }
});
```

## Directory Structure

```
control-panel/
├── public/
├── src/
│   ├── components/
│   │   ├── widgets/
│   │   │   ├── ChatMonitorWidget.tsx
│   │   │   ├── ConnectionStatusWidget.tsx
│   │   │   ├── TokenManagerWidget.tsx
│   │   │   ├── SessionExplorerWidget.tsx
│   │   │   ├── LLMDashboardWidget.tsx
│   │   │   ├── ToolStatsWidget.tsx
│   │   │   ├── SystemMetricsWidget.tsx
│   │   │   └── ApprovalPanel.tsx
│   │   ├── DashboardLayout.tsx
│   │   ├── SettingsPanel.tsx
│   │   └── WidgetPalette.tsx
│   ├── contexts/
│   │   └── WebSocketContext.tsx
│   ├── hooks/
│   │   └── useDashboardConfig.ts
│   ├── types/
│   │   └── widgets.ts
│   ├── styles/
│   │   └── dashboard.css
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## Integration Points

| Integration | Endpoint | Purpose |
|-------------|----------|---------|
| WebSocket | `ws://localhost:3001/ws` | Real-time messaging, approvals, metrics |
| HTTP API | `http://localhost:3000/health` | Health check |
| HTTP API | `http://localhost:3000/api/config` | Gateway configuration |
| HTTP API | `http://localhost:3000/api/tokens` | Device token management |
| HTTP API | `http://localhost:3000/api/sessions` | Session history |
| HTTP API | `http://localhost:3000/api/providers` | LLM provider status |
| HTTP API | `http://localhost:3000/api/stats/llm` | LLM usage statistics |
| HTTP API | `http://localhost:3000/api/stats/tools` | Tool usage statistics |
| HTTP API | `http://localhost:3000/api/metrics` | System metrics |
| HTTP API | `http://localhost:3000/api/approvals/pending` | Pending approval requests |

## Security Considerations

1. **Authentication Required**: All API endpoints require valid `Authorization: Bearer <token>` header
2. **WebSocket Security**: Uses token-based authentication, rotates tokens on reconnect
3. **Input Validation**: All configuration changes validated with Zod schemas
4. **Approval Gates**: Dangerous operations (bash, cron) require explicit approval
5. **HTTPS/WS**: Always use secure connections in production
6. **CORS**: Configure gateway CORS to allow control panel origin
7. **Rate Limiting**: Implement rate limiting on gateway API endpoints
8. **Audit Logging**: Log all configuration changes and sensitive operations

## Best Practices

1. **Modular Design**: Each widget is self-contained and reusable
2. **Responsive Layout**: Works on desktop and mobile devices
3. **Real-time Updates**: Uses WebSocket for live data streaming
4. **Performance**: Optimizes rendering with React.memo and useMemo
5. **Error Handling**: Graceful error states with user feedback
6. **Type Safety**: Full TypeScript support with Zod validation
7. **Local Storage**: Dashboard configuration persists in browser
8. **Offline Support**: Graceful degradation when connection lost

## Resources

- **[React](https://react.dev/)** - UI Library
- **[Vite](https://vitejs.dev/)** - Build Tool
- **[TypeScript](https://www.typescriptlang.org/)** - Type System
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling Framework
- **[Recharts](https://recharts.org/)** - Chart Library
- **[TanStack Table](https://tanstack.com/table/latest)** - Data Tables
- **[React DnD](https://react-dnd.github.io/react-dnd/)** - Drag and Drop
- **[Zod](https://zod.dev/)** - Schema Validation
- **[WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)** - Real-time communication

## Principles

1. **User-Friendly**: Intuitive interface with clear visual feedback
2. **Real-Time**: Live updates without page refresh using WebSocket
3. **Customizable**: Users can arrange, add, and remove widgets as needed
4. **Secure**: All operations require proper authentication and authorization
5. **Performant**: Optimized rendering and efficient data fetching
6. **Maintainable**: Clean code with proper separation of concerns
7. **Responsive**: Adapts to different screen sizes and devices
8. **Accessible**: Follows WCAG guidelines for web accessibility
9. **Reliable**: Handles connection issues gracefully
10. **Extensible**: Easy to add new widget types and features
```
```
