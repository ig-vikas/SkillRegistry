---
name: react-ui
type: skill
description: React/Vite control UI for AI agent gateway with TypeScript, Tailwind CSS, and responsive design.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [frontend, ui, react]
tags: [react, vite, typescript, tailwind, ui, control-panel, frontend]
---

# React UI Expert

Build a responsive control UI for AI agent gateway using React 18, Vite, TypeScript, and Tailwind CSS.

## Quick Start

```bash
pnpm create vite agent-gateway-ui --template react-ts
cd agent-gateway-ui
pnpm add tailwindcss postcss autoprefixer @tanstack/react-router zustand lucide-react recharts
pnpm add -D @types/node vite-tsconfig-paths tailwind-merge clsx @tailwindcss/typography
```

## Project Structure

```
agent-gateway-ui/
├── public/
├── src/
│   ├── api/           # API client
│   │   └── client.ts  # Centralized API client
│   ├── components/
│   │   ├── ui/        # Radix UI components
│   │   ├── Layout.tsx # Main layout
│   │   └── ProtectedRoute.tsx
│   ├── hooks/          # Custom hooks
│   │   └── useWebSocket.ts
│   ├── lib/            # Utilities
│   │   └── utils.ts
│   ├── pages/          # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Chat.tsx
│   │   └── ...
│   ├── stores/         # Zustand stores
│   │   ├── auth-store.ts
│   │   └── chat-store.ts
│   ├── styles/         # CSS
│   │   └── globals.css
│   ├── types/          # TypeScript types
│   ├── App.tsx
│   └── main.tsx
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## Core Setup

### Vite Config

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@api': path.resolve(__dirname, './src/api'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': { target: 'ws://localhost:3001', ws: true },
    },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
        },
      },
    },
  },
});
```

### Tailwind Config

```javascript
// tailwind.config.js
import { fontFamily } from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
      },
      fontFamily: { sans: ['Inter', ...fontFamily.sans] },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
};
```

## API Client

```typescript
// src/api/client.ts
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private async request<T>(method: string, endpoint: string, data?: any, params?: Record<string, any>): Promise<T> {
    const url = new URL(endpoint, API_BASE);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, String(v)));
    
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const options: RequestInit = { method, headers };
    if (data) options.body = JSON.stringify(data);
    
    const response = await fetch(url.toString(), options);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(JSON.stringify(error));
    }
    return await response.json();
  }
  
  async getStats(): Promise<any> { return this.request('GET', '/stats'); }
  async sendMessage(channelId: string, message: string): Promise<any> { 
    return this.request('POST', '/chat', { channelId, message }); 
  }
  async executeBrowser(commands: any[]): Promise<any> { 
    return this.request('POST', '/browser/execute', { commands }); 
  }
  async executeBash(command: string): Promise<any> { 
    return this.request('POST', '/bash/execute', { command }); 
  }
  async listFiles(path: string): Promise<any> { 
    return this.request('GET', '/file/list', undefined, { path }); 
  }
}

export const api = new ApiClient();
```

## WebSocket Hook

```typescript
// src/hooks/useWebSocket.ts
import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket(url?: string) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messageHandlers = useRef<Map<string, (msg: any) => void>>(new Map());
  const wsUrl = url || `ws://${window.location.hostname}:3001/ws`;
  
  const connect = useCallback(() => {
    const socket = new WebSocket(wsUrl);
    setWs(socket);
    socket.onopen = () => setIsConnected(true);
    socket.onclose = () => setIsConnected(false);
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        messageHandlers.current.forEach((handler, key) => {
          try { handler(message); } catch {}
        });
      } catch {}
    };
  }, [wsUrl]);
  
  const disconnect = useCallback(() => { ws?.close(); setWs(null); }, [ws]);
  const send = useCallback((message: any) => { 
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message)); 
  }, [ws]);
  
  const onMessage = useCallback((type: string, handler: (msg: any) => void) => {
    messageHandlers.current.set(type, handler);
    return () => messageHandlers.current.delete(type);
  }, []);
  
  useEffect(() => { connect(); return () => disconnect(); }, [connect, disconnect]);
  
  return { ws, isConnected, connect, disconnect, send, onMessage };
}
```

## Layout Component

```typescript
// src/components/Layout.tsx
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, MessageSquare, Globe, Image, Terminal, Clock, File, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'Browser', href: '/browser', icon: Globe },
  { name: 'Canvas', href: '/canvas', icon: Image },
  { name: 'Terminal', href: '/terminal', icon: Terminal },
  { name: 'Cron', href: '/cron', icon: Clock },
  { name: 'Files', href: '/files', icon: File },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  
  return (
    <div className="flex h-screen bg-background">
      <aside className={cn('fixed left-0 top-0 z-50 h-full w-64 bg-card border-r transition-all', collapsed ? '-translate-x-full' : 'translate-x-0')}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <span className={cn('font-semibold', collapsed ? 'hidden' : 'block')}>Agent Gateway</span>
            <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
          <nav className="flex-1 p-2">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href} className={cn('flex items-center gap-3 px-3 py-2 rounded transition-colors', 
                location.pathname === item.href ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50')}>
                <item.icon className="h-5 w-5" />
                <span className={cn(collapsed ? 'hidden' : 'block')}>{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>
      </aside>
      <main className={cn('flex-1 transition-all', collapsed ? 'md:pl-0' : 'md:pl-64')}>
        <Outlet />
      </main>
    </div>
  );
}
```

## Stores

```typescript
// src/stores/auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User { id: string; deviceId?: string; token?: string; }

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null, token: null, isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' }
  )
);

// src/stores/chat-store.ts
import { create } from 'zustand';

interface ChatState {
  activeChannel: string | null;
  channels: any[];
  messages: Record<string, any[]>;
  setActiveChannel: (channel: string | null) => void;
  addMessage: (channelId: string, message: any) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeChannel: null, channels: [], messages: {},
  setActiveChannel: (channel) => set({ activeChannel: channel }),
  addMessage: (channelId, message) => set((state) => ({
    messages: { ...state.messages, [channelId]: [...(state.messages[channelId] || []), message] }
  })),
}));
```

## Pages

### Dashboard

```typescript
// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/api/client';
import { MessageSquare, Globe, Image, Terminal, Clock, Users } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  
  useEffect(() => {
    api.getStats().then(setStats).catch(console.error);
  }, []);
  
  const statCards = [
    { title: 'Messages', value: stats?.totalMessages || 0, icon: <MessageSquare className="h-4 w-4" /> },
    { title: 'Sessions', value: stats?.activeSessions || 0, icon: <Users className="h-4 w-4" /> },
    { title: 'Browser', value: stats?.activeBrowsers || 0, icon: <Globe className="h-4 w-4" /> },
    { title: 'Cron Jobs', value: stats?.totalJobs || 0, icon: <Clock className="h-4 w-4" /> },
  ];
  
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Agent Gateway Overview</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### Chat Page

```typescript
// src/pages/Chat.tsx
import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, User, Send } from 'lucide-react';
import { api } from '@/api/client';

export default function Chat() {
  const ws = useWebSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    ws.onMessage('message', (msg) => {
      if (msg.type === 'message' || msg.type === 'chunk') {
        setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: msg.text || msg.delta, completed: msg.done }]);
      }
    });
  }, [ws]);
  
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  
  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now(), role: 'user' as const, content: input, completed: true };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    ws.send({ type: 'message', channelId: 'default', text: input });
    api.sendMessage('default', input).catch(console.error);
  };
  
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Card className="flex-1">
        <CardContent className="h-full p-0">
          <div className="h-full overflow-auto p-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={cn('flex gap-3 max-w-[80%]', msg.role === 'user' ? 'ml-auto flex-row-reverse' : '')}>
                  <div className={cn('p-3 rounded-lg', msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Type message..." />
        <Button onClick={sendMessage} disabled={!input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
```

## Utilities

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function formatDate(date: Date | string): string { return new Date(date).toLocaleDateString(); }
export function truncate(text: string, length: number): string { 
  return text.length <= length ? text : text.substring(0, length) + '...'; 
}
export function generateId(): string { return crypto.randomUUID(); }
```

## Testing

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => { cleanup(); });

// Mock WebSocket
global.WebSocket = class { onopen = null; onclose = null; onmessage = null; send = () => {}; close = () => {}; } as any;
// Mock fetch
global.fetch = async () => ({ ok: true, json: async () => ({}), text: async () => '', blob: async () => new Blob() });
// Mock localStorage
const localStorageMock = (() => { let store: Record<string, string> = {}; return {
  getItem: (k: string) => store[k] || null, setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; }, clear: () => { store = {}; } };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
```

## Package.json

```json
{
  "name": "agent-gateway-ui",
  "private": true,
  "scripts": { "dev": "vite", "build": "tsc && vite build", "test": "vitest" },
  "dependencies": {
    "react": "^19.2.0", "react-dom": "^19.2.0",
    "@tanstack/react-router": "^1.0.0", "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.4.7", "socket.io-client": "^4.7.2",
    "lucide-react": "^0.294.0", "recharts": "^2.10.3",
    "@radix-ui/react-dropdown-menu": "^2.0.6", "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-toast": "^1.1.5"
  },
  "devDependencies": {
    "@types/react": "^19.2.0", "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^5.0.0", "typescript": "^5.9.0",
    "vite": "^7.0.0", "tailwindcss": "^4.0.0", "postcss": "^8.5.0",
    "autoprefixer": "^10.4.16", "@types/node": "^20.10.6",
    "tailwindcss-animate": "^1.0.7", "vite-tsconfig-paths": "^4.2.1",
    "clsx": "^2.0.0", "tailwind-merge": "^2.2.0",
    "vitest": "^1.1.0", "jsdom": "^23.0.1"
  }
}
```

## Deployment

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Resources

- [React Docs](https://react.dev/) - Current React 19 documentation and API reference.
- [React Versions](https://react.dev/versions) - Official React release history and current version information.
- [Vite Guide](https://vite.dev/guide/) - Current Vite setup and Node.js support requirements.
- [TanStack Query Docs](https://tanstack.com/query/latest) - Server-state fetching and caching patterns.
- [Radix UI Docs](https://www.radix-ui.com/primitives/docs/overview/introduction) - Accessible unstyled component primitives.

## Principles

1. User-First Design
2. Responsive & Accessible
3. Type-Safe
4. Performance Optimized
5. Maintainable Code
6. Testable Components
7. Modern Stack
8. Extensible Architecture
