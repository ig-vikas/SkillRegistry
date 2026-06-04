---
name: websocket-gateway
type: skill
description: WebSocket server implementation for AI agent gateway with real-time streaming, pairing codes, token rotation, and presence tracking.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [backend, realtime, networking]
tags: [websocket, realtime, streaming, pairing, authentication, presence]
---

# WebSocket Gateway Expert

Build a WebSocket server for AI agent gateway that handles real-time connections from mobile devices and control UI, manages pairing codes, rotates device tokens, and tracks presence.

## Architecture

```
Mobile Apps / Control UI
     │
     ▼ (WebSocket connection)
┌─────────────────────────────────┐
│        WebSocket Gateway        │
├─────────────────────────────────┤
│                                     │
│  ┌─────────────────┐              │
│  │  Connection      │              │
│  │  Manager         │              │
│  └────────┬────────┘              │
│           │                        │
│           ▼                        │
│  ┌─────────────────┐              │
│  │  Authentication  │◄─────────────┤
│  │  - Pairing codes │   (New devices)
│  │  - Token rotation│              │
│  └────────┬────────┘              │
│           │                        │
│           ▼                        │
│  ┌─────────────────┐              │
│  │  Message Handler │              │
│  │  - Route to      │              │
│  │    channels     │              │
│  │  - Stream chunks │              │
│  └────────┬────────┘              │
│           │                        │
│           ▼                        │
│  ┌─────────────────┐              │
│  │  Presence Tracker│              │
│  │  - Online/offline│              │
│  │  - Last seen     │              │
│  └─────────────────┘              │
└─────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│       Session Manager            │
│  - Transcript storage            │
│  - LLM integration               │
│  - Tool execution                │
└─────────────────────────────────┘
```

## WebSocket Server Setup

### Using `ws` Library

```bash
pnpm add ws @types/ws
```

```typescript
// src/platforms/websocket/server.ts
import WebSocket, { WebSocketServer, RawData } from 'ws';
import { IncomingMessage } from 'http';
import { AgentGateway } from '../../core/gateway';

export interface WebSocketClient {
  id: string;
  ws: WebSocket;
  userId?: string;
  deviceId?: string;
  token?: string;
  subscribedChannels: Set<string>;
  connectedAt: number;
  lastPing: number;
  presence: 'online' | 'away' | 'offline';
}

interface WebSocketMessage {
  type: 'pair' | 'subscribe' | 'unsubscribe' | 'message' | 'canvas' | 'ping' | 'pong' | 'set_presence';
  token?: string;
  channelId?: string;
  text?: string;
  commands?: any[];
  presence?: 'online' | 'away' | 'offline';
  [key: string]: any;
}

interface WebSocketResponse {
  type: 'chunk' | 'message' | 'canvas' | 'presence' | 'error' | 'paired' | 'pong';
  channelId?: string;
  delta?: string;
  text?: string;
  commands?: any[];
  userId?: string;
  status?: string;
  code?: string;
  message?: string;
  [key: string]: any;
}

export class WebSocketGateway {
  private wss: WebSocketServer;
  private clients = new Map<string, WebSocketClient>();
  private gateway: AgentGateway;
  private pairingCodes = new Map<string, { clientId: string; expires: number }>();
  private deviceTokens = new Map<string, { userId: string; deviceId: string; createdAt: number }>();
  
  constructor(gateway: AgentGateway, port: number = 3001, path: string = '/ws') {
    this.gateway = gateway;
    
    this.wss = new WebSocketServer({
      port,
      path,
      maxPayload: 16 * 1024 * 1024, // 16MB
      clientTracking: true,
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3,
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        threshold: 1024,
      },
    });
    
    this.setupEventHandlers();
    this.setupPingPong();
  }
  
  private setupEventHandlers() {
    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', this.handleError.bind(this));
  }
  
  private setupPingPong() {
    // Send ping every 30 seconds
    setInterval(() => {
      for (const client of this.clients.values()) {
        if (Date.now() - client.lastPing > 30000) {
          this.send(client, { type: 'ping' });
          client.lastPing = Date.now();
        }
      }
    }, 30000);
  }
  
  private handleConnection(ws: WebSocket, req: IncomingMessage) {
    const clientId = this.generateClientId();
    const client: WebSocketClient = {
      id: clientId,
      ws,
      subscribedChannels: new Set(),
      connectedAt: Date.now(),
      lastPing: Date.now(),
      presence: 'online',
    };
    
    this.clients.set(clientId, client);
    
    ws.on('message', (data: RawData) => {
      this.handleMessage(clientId, data);
    });
    
    ws.on('close', () => {
      this.handleDisconnect(clientId);
    });
    
    ws.on('error', (error) => {
      this.handleClientError(clientId, error);
    });
    
    ws.on('ping', () => {
      client.lastPing = Date.now();
    });
    
    ws.on('pong', () => {
      client.lastPing = Date.now();
    });
    
    console.log(`WebSocket client connected: ${clientId}`);
    this.broadcastPresence(clientId, 'online');
  }
  
  private handleDisconnect(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    this.clients.delete(clientId);
    
    // Clean up device token
    if (client.deviceId) {
      this.deviceTokens.delete(client.deviceId);
    }
    
    // Clean up pairing code
    for (const [code, data] of this.pairingCodes) {
      if (data.clientId === clientId) {
        this.pairingCodes.delete(code);
        break;
      }
    }
    
    console.log(`WebSocket client disconnected: ${clientId}`);
    this.broadcastPresence(clientId, 'offline');
  }
  
  private handleClientError(clientId: string, error: Error) {
    console.error(`WebSocket client error: ${clientId}`, error);
    const client = this.clients.get(clientId);
    if (client) {
      this.send(client, { type: 'error', message: error.message });
    }
  }
  
  private handleError(error: Error) {
    console.error('WebSocket server error:', error);
  }
  
  private handleMessage(clientId: string, data: RawData) {
    try {
      const message: WebSocketMessage = this.parseMessage(data);
      const client = this.clients.get(clientId);
      
      if (!client) {
        console.warn(`Message from unknown client: ${clientId}`);
        return;
      }
      
      switch (message.type) {
        case 'pair':
          this.handlePair(client, message);
          break;
        case 'subscribe':
          this.handleSubscribe(client, message);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(client, message);
          break;
        case 'message':
          this.handleClientMessage(client, message);
          break;
        case 'canvas':
          this.handleCanvas(client, message);
          break;
        case 'ping':
          this.handlePing(client);
          break;
        case 'set_presence':
          this.handleSetPresence(client, message);
          break;
        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }
  
  private parseMessage(data: RawData): WebSocketMessage {
    if (Buffer.isBuffer(data)) {
      return JSON.parse(data.toString('utf-8'));
    }
    if (typeof data === 'string') {
      return JSON.parse(data);
    }
    throw new Error('Unsupported message format');
  }
  
  private generateClientId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
  
  public send(client: WebSocketClient, message: WebSocketResponse) {
    if (client.ws.readyState !== WebSocket.OPEN) {
      console.warn(`Client ${client.id} not ready for message`);
      return;
    }
    
    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Error sending to client ${client.id}:`, error);
    }
  }
  
  public broadcast(message: WebSocketResponse, excludeClientId?: string) {
    for (const client of this.clients.values()) {
      if (client.id !== excludeClientId) {
        this.send(client, message);
      }
    }
  }
  
  public broadcastToChannel(channelId: string, message: WebSocketResponse, excludeClientId?: string) {
    for (const client of this.clients.values()) {
      if (client.id !== excludeClientId && client.subscribedChannels.has(channelId)) {
        this.send(client, message);
      }
    }
  }
  
  // Handle pairing with code
  private handlePair(client: WebSocketClient, message: WebSocketMessage) {
    if (!message.token) {
      this.send(client, { type: 'error', message: 'Pairing code required' });
      return;
    }
    
    // Check if code is valid
    const pairing = this.pairingCodes.get(message.token);
    if (!pairing) {
      this.send(client, { type: 'error', message: 'Invalid pairing code' });
      return;
    }
    
    if (Date.now() > pairing.expires) {
      this.pairingCodes.delete(message.token);
      this.send(client, { type: 'error', message: 'Pairing code expired' });
      return;
    }
    
    // Generate device token
    const deviceId = this.generateDeviceId();
    const token = this.generateToken();
    
    // Get user ID from pairing
    const userId = this.getUserIdFromPairing(pairing.clientId);
    
    // Store device token
    this.deviceTokens.set(token, {
      userId,
      deviceId,
      createdAt: Date.now(),
    });
    
    // Update client
    client.userId = userId;
    client.deviceId = deviceId;
    client.token = token;
    
    // Clean up pairing code
    this.pairingCodes.delete(message.token);
    
    this.send(client, {
      type: 'paired',
      userId,
      deviceId,
      token,
    });
    
    console.log(`Client ${client.id} paired with user ${userId}`);
  }
  
  // Handle channel subscription
  private handleSubscribe(client: WebSocketClient, message: WebSocketMessage) {
    if (!client.userId) {
      this.send(client, { type: 'error', message: 'Not authenticated' });
      return;
    }
    
    if (!message.channelId) {
      this.send(client, { type: 'error', message: 'Channel ID required' });
      return;
    }
    
    client.subscribedChannels.add(message.channelId);
    
    this.send(client, {
      type: 'message',
      text: `Subscribed to ${message.channelId}`,
    });
    
    console.log(`Client ${client.id} subscribed to ${message.channelId}`);
  }
  
  // Handle channel unsubscription
  private handleUnsubscribe(client: WebSocketClient, message: WebSocketMessage) {
    if (!message.channelId) {
      this.send(client, { type: 'error', message: 'Channel ID required' });
      return;
    }
    
    client.subscribedChannels.delete(message.channelId);
    
    this.send(client, {
      type: 'message',
      text: `Unsubscribed from ${message.channelId}`,
    });
    
    console.log(`Client ${client.id} unsubscribed from ${message.channelId}`);
  }
  
  // Handle message from client
  private async handleClientMessage(client: WebSocketClient, message: WebSocketMessage) {
    if (!client.userId) {
      this.send(client, { type: 'error', message: 'Not authenticated' });
      return;
    }
    
    if (!message.channelId) {
      this.send(client, { type: 'error', message: 'Channel ID required' });
      return;
    }
    
    if (!message.text) {
      this.send(client, { type: 'error', message: 'Message text required' });
      return;
    }
    
    // Create gateway message
    const gatewayMessage = {
      platform: 'websocket',
      channelId: message.channelId,
      senderId: client.userId!,
      message: message.text,
      messageId: this.generateMessageId(),
      timestamp: Date.now(),
      metadata: {
        clientId: client.id,
        deviceId: client.deviceId,
      },
    };
    
    // Route through gateway
    const result = await this.gateway.handleIncomingMessage(gatewayMessage);
    
    if (result && result.shouldRespond) {
      // Send response back to client
      if (result.type === 'stream') {
        await this.streamResponse(client, result.stream);
      } else {
        this.send(client, {
          type: 'message',
          text: result.response,
          channelId: message.channelId,
        });
      }
    }
  }
  
  // Handle canvas commands
  private handleCanvas(client: WebSocketClient, message: WebSocketMessage) {
    if (!client.userId) {
      this.send(client, { type: 'error', message: 'Not authenticated' });
      return;
    }
    
    if (!message.channelId || !message.commands) {
      this.send(client, { type: 'error', message: 'Channel ID and commands required' });
      return;
    }
    
    // Broadcast canvas commands to subscribed clients
    this.broadcastToChannel(message.channelId, {
      type: 'canvas',
      channelId: message.channelId,
      commands: message.commands,
    }, client.id);
  }
  
  // Handle ping
  private handlePing(client: WebSocketClient) {
    client.lastPing = Date.now();
    this.send(client, { type: 'pong' });
  }
  
  // Handle presence update
  private handleSetPresence(client: WebSocketClient, message: WebSocketMessage) {
    if (!message.presence) {
      this.send(client, { type: 'error', message: 'Presence status required' });
      return;
    }
    
    const validStatuses = ['online', 'away', 'offline'];
    if (!validStatuses.includes(message.presence)) {
      this.send(client, { type: 'error', message: 'Invalid presence status' });
      return;
    }
    
    client.presence = message.presence as any;
    this.broadcastPresence(client.id, message.presence);
  }
  
  // Broadcast presence updates
  private broadcastPresence(clientId: string, status: string) {
    this.broadcast({
      type: 'presence',
      userId: this.clients.get(clientId)?.userId,
      clientId,
      status,
    }, clientId);
  }
  
  // Stream response to client
  private async streamResponse(client: WebSocketClient, stream: AsyncIterable<string>) {
    for await (const chunk of stream) {
      if (client.ws.readyState !== WebSocket.OPEN) {
        break;
      }
      
      this.send(client, {
        type: 'chunk',
        delta: chunk,
      });
    }
    
    // Send completion marker
    if (client.ws.readyState === WebSocket.OPEN) {
      this.send(client, {
        type: 'chunk',
        delta: '',
        done: true,
      });
    }
  }
  
  private generateDeviceId(): string {
    return `dev_${Math.random().toString(36).substring(2, 16)}`;
  }
  
  private generateToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }
  
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
  
  private getUserIdFromPairing(clientId: string): string {
    // In a real implementation, this would look up the pairing
    // For now, just return a derived user ID
    return `user_${clientId.replace('ws_', '')}`;
  }
  
  // Generate pairing code (called from gateway)
  generatePairingCode(userId: string): string {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expires = Date.now() + (this.gateway.getConfig().security.pairingTimeout * 1000);
    
    this.pairingCodes.set(code, {
      clientId: this.generateClientId(), // Temporary client ID for pairing
      expires,
    });
    
    return code;
  }
  
  // Validate token and rotate (called from gateway)
  validateAndRotateToken(oldToken: string): { userId: string; newToken: string } | null {
    const tokenData = this.deviceTokens.get(oldToken);
    if (!tokenData) return null;
    
    // Check expiration
    const config = this.gateway.getConfig();
    if (Date.now() - tokenData.createdAt > config.security.tokenExpiry * 1000) {
      this.deviceTokens.delete(oldToken);
      return null;
    }
    
    // Generate new token (rotate)
    const newToken = this.generateToken();
    
    // Store new token
    this.deviceTokens.set(newToken, {
      userId: tokenData.userId,
      deviceId: tokenData.deviceId,
      createdAt: Date.now(),
    });
    
    // Remove old token
    this.deviceTokens.delete(oldToken);
    
    // Find and update client
    for (const client of this.clients.values()) {
      if (client.token === oldToken) {
        client.token = newToken;
        break;
      }
    }
    
    return {
      userId: tokenData.userId,
      newToken,
    };
  }
  
  // Get user ID from token
  getUserIdFromToken(token: string): string | null {
    const tokenData = this.deviceTokens.get(token);
    return tokenData?.userId || null;
  }
  
  // Send message to specific user
  async sendToUser(userId: string, message: WebSocketResponse) {
    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        this.send(client, message);
      }
    }
  }
  
  // Send message to specific channel subscribers
  sendToChannel(channelId: string, message: WebSocketResponse, excludeClientId?: string) {
    this.broadcastToChannel(channelId, message, excludeClientId);
  }
  
  // Get stats
  getStats() {
    return {
      totalClients: this.clients.size,
      onlineClients: Array.from(this.clients.values()).filter(c => c.presence === 'online').length,
      awayClients: Array.from(this.clients.values()).filter(c => c.presence === 'away').length,
      pendingPairings: this.pairingCodes.size,
      activeTokens: this.deviceTokens.size,
    };
  }
  
  async close() {
    // Close all client connections
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close(1001, 'Server shutting down');
      }
    }
    
    // Close server
    await new Promise<void>((resolve, reject) => {
      this.wss.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
```

## Client-Side Implementation

### WebSocket Client (React/Vite)

```typescript
// src/hooks/useWebSocket.ts
import { useEffect, useState, useCallback, useRef } from 'react';

interface WebSocketMessage {
  type: 'chunk' | 'message' | 'canvas' | 'presence' | 'error' | 'paired' | 'pong';
  channelId?: string;
  delta?: string;
  text?: string;
  commands?: any[];
  userId?: string;
  clientId?: string;
  status?: string;
  code?: string;
  message?: string;
  done?: boolean;
}

interface WebSocketClient {
  connect: (url: string) => void;
  disconnect: () => void;
  send: (message: any) => void;
  subscribe: (channelId: string) => void;
  unsubscribe: (channelId: string) => void;
  sendMessage: (channelId: string, text: string) => void;
  sendCanvas: (channelId: string, commands: any[]) => void;
  setPresence: (presence: 'online' | 'away' | 'offline') => void;
  pair: (code: string) => Promise<{ userId: string; deviceId: string; token: string }>;
}

export function useWebSocket(url: string): WebSocketClient {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [pairingPromise, setPairingPromise] = useState<{
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  } | null>(null);
  
  const messageHandlers = useRef<Map<string, (msg: WebSocketMessage) => void>>(new Map());
  const pendingPairing = useRef<string | null>(null);
  
  const connect = useCallback((wsUrl: string) => {
    const ws = new WebSocket(wsUrl);
    setSocket(ws);
    
    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      setSocket(null);
      console.log('WebSocket disconnected');
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
  }, []);
  
  const disconnect = useCallback(() => {
    if (socket) {
      socket.close();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);
  
  const send = useCallback((message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, [socket]);
  
  const subscribe = useCallback((channelId: string) => {
    send({ type: 'subscribe', channelId });
  }, [send]);
  
  const unsubscribe = useCallback((channelId: string) => {
    send({ type: 'unsubscribe', channelId });
  }, [send]);
  
  const sendMessage = useCallback((channelId: string, text: string) => {
    send({ type: 'message', channelId, text });
  }, [send]);
  
  const sendCanvas = useCallback((channelId: string, commands: any[]) => {
    send({ type: 'canvas', channelId, commands });
  }, [send]);
  
  const setPresence = useCallback((presence: 'online' | 'away' | 'offline') => {
    send({ type: 'set_presence', presence });
  }, [send]);
  
  const pair = useCallback((code: string) => {
    return new Promise((resolve, reject) => {
      pendingPairing.current = code;
      setPairingPromise({ resolve, reject });
      send({ type: 'pair', token: code });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingPairing.current === code) {
          pendingPairing.current = null;
          reject(new Error('Pairing timeout'));
        }
      }, 30000);
    });
  }, [send]);
  
  const handleMessage = useCallback((message: WebSocketMessage) => {
    // Handle pairing response
    if (message.type === 'paired') {
      if (message.token && message.userId) {
        setUserId(message.userId);
        setDeviceId(message.deviceId);
        setToken(message.token);
        
        if (pendingPairing.current && pairingPromise) {
          pairingPromise.resolve({ userId: message.userId, deviceId: message.deviceId, token: message.token });
          pairingPromise.resolve = null as any;
          pendingPairing.current = null;
        }
      }
      return;
    }
    
    // Handle error
    if (message.type === 'error') {
      console.error('WebSocket error:', message.message);
      if (pendingPairing.current && pairingPromise && message.code === 'INVALID_PAIRING_CODE') {
        pairingPromise.reject(new Error(message.message));
        pairingPromise.reject = null as any;
        pendingPairing.current = null;
      }
      return;
    }
    
    // Handle pong
    if (message.type === 'pong') {
      return;
    }
    
    // Notify handlers
    messageHandlers.current.forEach((handler, key) => {
      try {
        handler(message);
      } catch (error) {
        console.error(`Error in message handler ${key}:`, error);
      }
    });
  }, [pairingPromise]);
  
  const onMessage = useCallback((key: string, handler: (msg: WebSocketMessage) => void) => {
    messageHandlers.current.set(key, handler);
    return () => messageHandlers.current.delete(key);
  }, []);
  
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);
  
  return {
    connect,
    disconnect,
    send,
    subscribe,
    unsubscribe,
    sendMessage,
    sendCanvas,
    setPresence,
    pair,
    onMessage,
    isConnected,
    userId,
    deviceId,
    token,
  };
}
```

### React Hook Usage

```typescript
// src/components/ChatPanel.tsx
import { useWebSocket } from '../hooks/useWebSocket';
import { useEffect, useState } from 'react';

export function ChatPanel({ channelId }: { channelId: string }) {
  const ws = useWebSocket('ws://localhost:3001/ws');
  const [messages, setMessages] = useState<Array<{ text: string; isUser: boolean }>>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  
  useEffect(() => {
    // Connect on mount
    ws.connect('ws://localhost:3001/ws');
    
    // Subscribe to channel
    if (ws.isConnected) {
      ws.subscribe(channelId);
    }
    
    // Handle incoming messages
    const handler = ws.onMessage('chat', (msg) => {
      if (msg.channelId === channelId) {
        if (msg.type === 'chunk') {
          if (msg.delta) {
            setStreamingText(prev => prev + msg.delta);
            setIsStreaming(true);
          }
          if (msg.done) {
            setIsStreaming(false);
            setMessages(prev => [...prev, { text: streamingText, isUser: false }]);
            setStreamingText('');
          }
        } else if (msg.type === 'message' && msg.text) {
          setMessages(prev => [...prev, { text: msg.text, isUser: false }]);
        }
      }
    });
    
    return () => {
      handler();
      ws.unsubscribe(channelId);
      ws.disconnect();
    };
  }, [channelId, ws]);
  
  const sendMessage = () => {
    if (!input.trim()) return;
    
    // Add user message
    setMessages(prev => [...prev, { text: input, isUser: true }]);
    setInput('');
    
    // Send to server
    ws.sendMessage(channelId, input);
  };
  
  return (
    <div className="chat-panel">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.isUser ? 'user' : 'assistant'}`}>
            {msg.text}
          </div>
        ))}
        {isStreaming && (
          <div className="message assistant streaming">
            {streamingText}
            <span className="cursor">|</span>
          </div>
        )}
      </div>
      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
```

## QR Code Pairing

### Generate QR Code

```typescript
// src/utils/qr-code.ts
import QRCode from 'qrcode';

export async function generatePairingQRCode(code: string): Promise<string> {
  try {
    return await QRCode.toDataURL(`agent-gateway://pair/${code}`);
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

export async function generatePairingQRCodeTerminal(code: string): Promise<string> {
  return await QRCode.toString(`agent-gateway://pair/${code}`, {
    type: 'terminal',
    small: true,
  });
}
```

### Pairing Flow

```typescript
// In WebSocketGateway class
import { generatePairingQRCode } from '../utils/qr-code';

// Add to WebSocketGateway
async generatePairingInfo(userId: string): Promise<{ code: string; qrCode: string }> {
  const code = this.generatePairingCode(userId);
  const qrCode = await generatePairingQRCode(code);
  
  return { code, qrCode };
}

// In HTTP API
app.get('/api/pairing/qrcode', async (req, res) => {
  const { userId } = req.query;
  
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId required' });
  }
  
  const { code, qrCode } = await webSocketGateway.generatePairingInfo(userId);
  
  res.json({ code, qrCode });
});
```

## Token Rotation

### Automatic Rotation on Connect

```typescript
// In WebSocketGateway class
private setupTokenRotation() {
  // Rotate token on each connection
  this.wss.on('connection', (ws, req) => {
    const clientId = this.generateClientId();
    const client: WebSocketClient = {
      id: clientId,
      ws,
      subscribedChannels: new Set(),
      connectedAt: Date.now(),
      lastPing: Date.now(),
      presence: 'online',
    };
    
    this.clients.set(clientId, client);
    
    // Check for existing token in headers
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const oldToken = authHeader.substring(7);
      const validation = this.validateAndRotateToken(oldToken);
      
      if (validation) {
        client.userId = validation.userId;
        client.token = validation.newToken;
        
        // Send new token to client
        ws.send(JSON.stringify({
          type: 'paired',
          userId: validation.userId,
          token: validation.newToken,
          rotated: true,
        }));
      }
    }
    
    // ... rest of connection handling
  });
}
```

### Token Validation Middleware

```typescript
// src/api/middleware/websocket-auth.ts
import { NextFunction } from 'express';

export function websocketAuth(webSocketGateway: WebSocketGateway) {
  return (req: any, res: any, next: NextFunction) => {
    // Extract token from header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }
    
    const token = authHeader.substring(7);
    const userId = webSocketGateway.getUserIdFromToken(token);
    
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Attach user to request
    req.user = { id: userId };
    
    next();
  };
}
```

## Presence Tracking

### Presence Manager

```typescript
// src/platforms/websocket/presence.ts
export class PresenceManager {
  private users = new Map<string, {
    userId: string;
    deviceId: string;
    status: 'online' | 'away' | 'offline';
    lastSeen: number;
    channels: Set<string>;
  }>();
  
  private wsGateway: WebSocketGateway;
  
  constructor(wsGateway: WebSocketGateway) {
    this.wsGateway = wsGateway;
  }
  
  updatePresence(userId: string, deviceId: string, status: 'online' | 'away' | 'offline', channelId?: string) {
    const key = `${userId}:${deviceId}`;
    
    if (!this.users.has(key)) {
      this.users.set(key, {
        userId,
        deviceId,
        status,
        lastSeen: Date.now(),
        channels: new Set(channelId ? [channelId] : []),
      });
    } else {
      const user = this.users.get(key)!;
      user.status = status;
      user.lastSeen = Date.now();
      if (channelId) {
        user.channels.add(channelId);
      }
    }
    
    // Broadcast presence update
    this.wsGateway.broadcast({
      type: 'presence',
      userId,
      deviceId,
      status,
      timestamp: Date.now(),
    });
  }
  
  getPresence(userId: string): { deviceId: string; status: string; lastSeen: number }[] {
    const presences: { deviceId: string; status: string; lastSeen: number }[] = [];
    
    for (const [key, data] of this.users) {
      if (data.userId === userId) {
        presences.push({
          deviceId: data.deviceId,
          status: data.status,
          lastSeen: data.lastSeen,
        });
      }
    }
    
    return presences;
  }
  
  getOnlineUsers(channelId?: string): string[] {
    const onlineUsers = new Set<string>();
    
    for (const [key, data] of this.users) {
      if (data.status === 'online' && (!channelId || data.channels.has(channelId))) {
        onlineUsers.add(data.userId);
      }
    }
    
    return Array.from(onlineUsers);
  }
  
  cleanupOfflineUsers(maxAgeMs: number = 300000) {
    // 5 minutes
    const now = Date.now();
    
    for (const [key, data] of this.users) {
      if (data.status === 'offline' && now - data.lastSeen > maxAgeMs) {
        this.users.delete(key);
      }
    }
  }
}
```

## Message Routing

### Channel-Based Routing

```typescript
// src/platforms/websocket/router.ts
export class WebSocketRouter {
  private wsGateway: WebSocketGateway;
  
  constructor(wsGateway: WebSocketGateway) {
    this.wsGateway = wsGateway;
  }
  
  routeToChannel(channelId: string, message: WebSocketResponse, excludeClientId?: string) {
    this.wsGateway.broadcastToChannel(channelId, message, excludeClientId);
  }
  
  routeToUser(userId: string, message: WebSocketResponse) {
    this.wsGateway.sendToUser(userId, message);
  }
  
  routeToUsers(userIds: string[], message: WebSocketResponse) {
    for (const userId of userIds) {
      this.wsGateway.sendToUser(userId, message);
    }
  }
  
  // Handle messages from gateway
  async handleGatewayMessage(message: any) {
    const { channelId, senderId, content, type } = message;
    
    // Create WebSocket response
    const wsMessage: WebSocketResponse = {
      type: 'message',
      channelId,
      text: content,
    };
    
    // Route to channel
    this.routeToChannel(channelId, wsMessage, senderId);
    
    // Also send to sender if they're connected
    if (senderId) {
      this.routeToUser(senderId, wsMessage);
    }
  }
  
  // Handle streams from gateway
  async handleGatewayStream(
    channelId: string,
    senderId: string,
    stream: AsyncIterable<string>
  ) {
    // Find all clients subscribed to this channel
    const clients = Array.from(this.wsGateway['clients'].values())
      .filter(c => c.subscribedChannels.has(channelId));
    
    // Stream to all subscribed clients
    for await (const chunk of stream) {
      const message: WebSocketResponse = {
        type: 'chunk',
        channelId,
        delta: chunk,
      };
      
      for (const client of clients) {
        if (client.id !== senderId) { // Don't echo back to sender
          this.wsGateway.send(client, message);
        }
      }
    }
    
    // Send completion
    const doneMessage: WebSocketResponse = {
      type: 'chunk',
      channelId,
      delta: '',
      done: true,
    };
    
    for (const client of clients) {
      if (client.id !== senderId) {
        this.wsGateway.send(client, doneMessage);
      }
    }
  }
}
```

## Integration with Gateway

```typescript
// src/core/gateway.ts
import { WebSocketGateway } from '../platforms/websocket/server';
import { WebSocketRouter } from '../platforms/websocket/router';

export class AgentGateway {
  private wsGateway: WebSocketGateway;
  private wsRouter: WebSocketRouter;
  
  async initialize() {
    // Initialize WebSocket gateway
    const wsPort = this.config.gateway.wsPort || 3001;
    this.wsGateway = new WebSocketGateway(this, wsPort);
    
    // Initialize router
    this.wsRouter = new WebSocketRouter(this.wsGateway);
    
    // Connect gateway message handling
    this.setupMessageHandling();
  }
  
  private setupMessageHandling() {
    // When gateway receives message from other platforms (Telegram, etc.)
    // route through WebSocket to connected clients
  }
  
  // Generate pairing code for WebSocket clients
  generatePairingCode(userId: string): string {
    return this.wsGateway.generatePairingCode(userId);
  }
  
  // Validate and rotate token
  validateAndRotateToken(oldToken: string): { userId: string; newToken: string } | null {
    return this.wsGateway.validateAndRotateToken(oldToken);
  }
  
  // Get user ID from token
  getUserIdFromToken(token: string): string | null {
    return this.wsGateway.getUserIdFromToken(token);
  }
  
  // Send to WebSocket clients
  async sendToWebSocket(channelId: string, senderId: string, response: any) {
    await this.wsRouter.handleGatewayMessage({
      channelId,
      senderId,
      content: response,
      type: typeof response === 'string' ? 'text' : 'rich',
    });
  }
  
  // Stream to WebSocket clients
  async streamToWebSocket(
    channelId: string,
    senderId: string,
    stream: AsyncIterable<string>
  ) {
    await this.wsRouter.handleGatewayStream(channelId, senderId, stream);
  }
  
  async shutdown() {
    await this.wsGateway.close();
  }
}
```

## Security Considerations

### Token Security

```typescript
// Token generation with crypto
function generateSecureToken(): string {
  return require('crypto').randomBytes(32).toString('hex');
}

// Token validation
function validateTokenFormat(token: string): boolean {
  // Must be hex string of correct length
  return /^[a-f0-9]{64}$/.test(token);
}

// Token expiration
function isTokenExpired(createdAt: number, expiryMs: number): boolean {
  return Date.now() - createdAt > expiryMs;
}
```

### Pairing Code Security

```typescript
// Generate secure pairing code
function generateSecurePairingCode(): string {
  // Use random bytes for better security
  const bytes = require('crypto').randomBytes(4);
  const code = bytes.toString('base64')
    .replace(/\+/g, '')
    .replace(/\//g, '')
    .replace(/=/g, '')
    .substring(0, 6)
    .toUpperCase();
  
  return code;
}

// Pairing code expiration (5-10 minutes typically)
const PAIRING_CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
```

### Device Tracking

```typescript
// Track devices per user
class DeviceTracker {
  private userDevices = new Map<string, Set<string>>();
  
  addDevice(userId: string, deviceId: string) {
    if (!this.userDevices.has(userId)) {
      this.userDevices.set(userId, new Set());
    }
    this.userDevices.get(userId)!.add(deviceId);
  }
  
  removeDevice(userId: string, deviceId: string) {
    const devices = this.userDevices.get(userId);
    if (devices) {
      devices.delete(deviceId);
      if (devices.size === 0) {
        this.userDevices.delete(userId);
      }
    }
  }
  
  getUserDevices(userId: string): string[] {
    return Array.from(this.userDevices.get(userId) || []);
  }
  
  // Revoke all tokens for a user
  revokeUserTokens(userId: string, tokenGateway: WebSocketGateway) {
    const devices = this.getUserDevices(userId);
    
    // In a real implementation, we'd need access to the token store
    // This is a simplified version
    console.log(`Revoked tokens for user ${userId} on devices: ${devices.join(', ')}`);
  }
}
```

## Configuration

```typescript
// src/platforms/websocket/config.ts
export interface WebSocketConfig {
  port: number;
  path: string;
  maxPayload: number;
  pingInterval: number;
  pingTimeout: number;
  maxConnections: number;
  tokenLength: number;
  tokenExpiry: number; // seconds
  pairingCodeLength: number;
  pairingCodeExpiry: number; // seconds
  rotateTokensOnConnect: boolean;
  allowedOrigins: string[];
}

export const DefaultWebSocketConfig: WebSocketConfig = {
  port: 3001,
  path: '/ws',
  maxPayload: 16 * 1024 * 1024, // 16MB
  pingInterval: 30000, // 30 seconds
  pingTimeout: 10000, // 10 seconds
  maxConnections: 1000,
  tokenLength: 64,
  tokenExpiry: 86400, // 24 hours
  pairingCodeLength: 6,
  pairingCodeExpiry: 300, // 5 minutes
  rotateTokensOnConnect: true,
  allowedOrigins: ['*'],
};
```

## Testing

### Unit Tests

```typescript
describe('WebSocketGateway', () => {
  let gateway: WebSocketGateway;
  let mockGateway: any;
  
  beforeAll(() => {
    mockGateway = {
      getConfig: () => ({
        security: {
          pairingTimeout: 300,
          tokenExpiry: 86400,
        },
      }),
    };
    
    gateway = new WebSocketGateway(mockGateway, 0); // Port 0 for testing
  });
  
  afterAll(async () => {
    await gateway.close();
  });
  
  it('generates pairing code', () => {
    const code = gateway.generatePairingCode('user:123');
    expect(code).toHaveLength(6);
    expect(/^[A-Z0-9]+$/.test(code)).toBe(true);
  });
  
  it('validates pairing code', () => {
    const code = gateway.generatePairingCode('user:123');
    expect(gateway['pairingCodes'].has(code)).toBe(true);
  });
  
  it('rotates tokens', () => {
    const token = gateway.generateToken();
    gateway['deviceTokens'].set(token, {
      userId: 'user:123',
      deviceId: 'dev:456',
      createdAt: Date.now(),
    });
    
    const result = gateway.validateAndRotateToken(token);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe('user:123');
    expect(result!.newToken).not.toBe(token);
    expect(gateway['deviceTokens'].has(token)).toBe(false);
  });
  
  it('gets stats', () => {
    const stats = gateway.getStats();
    expect(stats).toHaveProperty('totalClients');
    expect(stats).toHaveProperty('pendingPairings');
    expect(stats).toHaveProperty('activeTokens');
  });
});
```

### Integration Tests

```typescript
describe('WebSocketGateway Integration', () => {
  let gateway: WebSocketGateway;
  let ws: WebSocket;
  
  beforeAll(async () => {
    const mockGateway = { getConfig: () => ({ security: { pairingTimeout: 300, tokenExpiry: 86400 } }) };
    gateway = new WebSocketGateway(mockGateway, 0);
    
    // Connect client
    ws = new WebSocket(`ws://localhost:0`);
    await new Promise(resolve => ws.on('open', resolve));
  });
  
  afterAll(async () => {
    ws.close();
    await gateway.close();
  });
  
  it('handles client connection', (done) => {
    expect(gateway.getStats().totalClients).toBe(1);
    done();
  });
  
  it('handles pairing', (done) => {
    const code = gateway.generatePairingCode('user:123');
    
    ws.send(JSON.stringify({ type: 'pair', token: code }));
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'paired') {
        expect(message.userId).toBe('user:123');
        expect(message.token).toBeDefined();
        done();
      }
    });
  });
  
  it('handles channel subscription', (done) => {
    ws.send(JSON.stringify({ type: 'subscribe', channelId: 'test:channel' }));
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'message' && message.text?.includes('Subscribed')) {
        done();
      }
    });
  });
  
  it('handles ping/pong', (done) => {
    ws.send(JSON.stringify({ type: 'ping' }));
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'pong') {
        done();
      }
    });
  });
});
```

## Deployment Considerations

### Scaling WebSocket Server

```typescript
// Use clustering for multiple CPU cores
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // Start WebSocket server in worker
  const gateway = new AgentGateway(config);
  const wsGateway = new WebSocketGateway(gateway, config.gateway.wsPort);
  
  // ...
}
```

### Load Balancing

```
# With Nginx as WebSocket load balancer
# nginx.conf

upstream websocket {
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
    
    # Enable WebSocket
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Timeouts
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;
}

server {
    listen 80;
    server_name agents.yourdomain.com;
    
    location /ws {
        proxy_pass http://websocket;
    }
    
    location / {
        proxy_pass http://localhost:3000;
    }
}
```

### SSL/TLS

```typescript
// src/platforms/websocket/ssl-server.ts
import https from 'https';
import fs from 'fs';
import { WebSocketServer } from 'ws';

export function createSSLWebSocketServer(
  port: number,
  path: string,
  certPath: string,
  keyPath: string
): WebSocketServer {
  const server = https.createServer({
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
  });
  
  const wss = new WebSocketServer({
    server,
    path,
  });
  
  server.listen(port);
  
  return wss;
}
```

## Best Practices

1. **Connection Management**: Track all connections, handle disconnects gracefully
2. **Message Validation**: Validate all incoming messages before processing
3. **Rate Limiting**: Limit messages per client to prevent abuse
4. **Authentication**: Require authentication for all operations
5. **Token Rotation**: Rotate tokens regularly for security
6. **Presence Tracking**: Track user presence for better UX
7. **Error Handling**: Handle all error cases, don't crash
8. **Logging**: Log connections, messages, errors for debugging
9. **Scalability**: Design for horizontal scaling with load balancing
10. **Security**: Use SSL/TLS, validate inputs, sanitize outputs

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Connection fails | Wrong port | Check server is running on correct port |
| Pairing fails | Invalid code | Verify code, check expiry |
| Token invalid | Expired/rotated | Get new token from pairing |
| Message not received | Not subscribed | Subscribe to channel first |
| High latency | Network issues | Check network, use WebSocket compression |
| Memory leaks | Too many connections | Implement connection limits, cleanup |
| Disconnections | Timeout | Adjust ping/pong intervals |

### Debug Commands

```bash
# Check WebSocket connections
netstat -tulnp | grep LISTEN | grep 3001

# Test WebSocket with wscat
npm install -g wscat
wscat -c ws://localhost:3001/ws

# Send test message
echo '{"type": "ping"}' | wscat -c ws://localhost:3001/ws

# Check memory usage
ps aux | grep node

# Monitor connections
watch -n 1 'netstat -an | grep 3001 | wc -l'
```

## Resources

- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [ws Library](https://github.com/websockets/ws) - Node.js WebSocket
- [Socket.IO](https://socket.io/) - Alternative with fallbacks
- [RFC 6455](https://datatracker.ietf.org/doc/html/rfc6455) - WebSocket protocol
- [WebSocket Security](https://www.owasp.org/www-community/controls/Working_with_WebSockets)

## Principles

1. **Real-time**: Provide instant updates to clients
2. **Reliable**: Handle errors and reconnections gracefully
3. **Secure**: Protect all communications and data
4. **Scalable**: Work with many concurrent connections
5. **Efficient**: Minimize bandwidth and latency
6. **User-Friendly**: Provide good presence and connection status
