---
name: canvas-drawing
type: skill
description: Canvas drawing commands (A2UI JSON) rendering and streaming for AI agent gateway with @napi-rs/canvas integration.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [frontend, tools, graphics]
tags: [canvas, a2ui, drawing, graphics, rendering, streaming]
---

# Canvas Drawing Expert

Implement canvas drawing commands (A2UI JSON format) rendering and streaming for AI agent gateway, enabling real-time graphics and visualizations.

## Architecture

AI Agent Request (A2UI JSON) -> Command Parser -> Canvas Renderer (@napi-rs/canvas) -> Image Generator -> WebSocket Streaming -> Client Display

## Core Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| Command Parser | Parse A2UI JSON commands | Custom |
| Canvas Manager | Manage multiple canvases | Map |
| Renderer | Draw on canvas | @napi-rs/canvas |
| Image Encoder | Convert to PNG/JPEG | @napi-rs/canvas |
| Stream Manager | Handle real-time updates | WebSocket |
| Canvas State | Track drawing state | Custom |

## Implementation

```bash
pnpm add @napi-rs/canvas
```

### Canvas Command Types (A2UI JSON)

```typescript
// A2UI Command Types
interface A2UICanvasCommand {
  type: 'clear' | 'fill' | 'stroke' | 'line' | 'rect' | 'circle' | 'ellipse' | 'arc' | 'bezier' | 'quadratic' | 'text' | 'image' | 'path' | 'transform' | 'save' | 'restore';
  // Common properties
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  stroke?: string;
  fill?: string;
  lineWidth?: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  // Type-specific properties
  radius?: number; // circle
  startAngle?: number; // arc
  endAngle?: number; // arc
  text?: string; // text
  font?: string; // text
  fontSize?: number; // text
  textAlign?: 'left' | 'right' | 'center'; // text
  textBaseline?: 'top' | 'middle' | 'bottom'; // text
  points?: [number, number][]; // path, bezier
  imageData?: string; // image (base64 or URL)
  matrix?: [number, number, number, number, number, number]; // transform
}

interface A2UICanvasBatch {
  canvasId: string;
  commands: A2UICanvasCommand[];
  timestamp?: number;
}
```

### Canvas Service

```typescript
// src/services/tools/canvas/canvas-service.ts
import { createCanvas, Canvas, CanvasRenderingContext2D } from '@napi-rs/canvas';
import { z } from 'zod';

interface CanvasConfig {
  defaultWidth: number;
  defaultHeight: number;
  maxWidth: number;
  maxHeight: number;
  maxCommandsPerBatch: number;
  maxCanvasesPerUser: number;
  compressionQuality: number;
  format: 'png' | 'jpeg' | 'webp';
}

interface CanvasState {
  canvas: Canvas;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  lastUpdated: number;
  version: number;
  dirty: boolean;
}

export class CanvasService {
  private canvases = new Map<string, CanvasState>();
  private userCanvases = new Map<string, Set<string>>();
  private config: CanvasConfig;
  
  constructor(config: Partial<CanvasConfig> = {}) {
    this.config = {
      defaultWidth: 800,
      defaultHeight: 600,
      maxWidth: 4000,
      maxHeight: 4000,
      maxCommandsPerBatch: 100,
      maxCanvasesPerUser: 10,
      compressionQuality: 0.8,
      format: 'png',
      ...config,
    };
  }
  
  // Create or get canvas
  getCanvas(canvasId: string, width?: number, height?: number): CanvasState {
    let state = this.canvases.get(canvasId);
    if (!state) {
      const w = Math.min(width || this.config.defaultWidth, this.config.maxWidth);
      const h = Math.min(height || this.config.defaultHeight, this.config.maxHeight);
      const canvas = createCanvas(w, h);
      const ctx = canvas.getContext('2d');
      
      state = {
        canvas,
        ctx: ctx!,
        width: w,
        height: h,
        lastUpdated: Date.now(),
        version: 0,
        dirty: false,
      };
      this.canvases.set(canvasId, state);
    }
    return state;
  }
  
  // Validate canvas ID
  isValidCanvasId(canvasId: string): boolean {
    return /^[a-zA-Z0-9_-]{1,100}$/.test(canvasId);
  }
  
  // Validate command
  validateCommand(command: any): command is A2UICanvasCommand {
    return A2UICanvasCommandSchema.safeParse(command).success;
  }
  
  // Execute single command
  executeCommand(canvasId: string, command: A2UICanvasCommand): void {
    const state = this.getCanvas(canvasId);
    const ctx = state.ctx;
    
    switch (command.type) {
      case 'clear':
        if (command.color) {
          ctx.fillStyle = command.color;
          ctx.fillRect(0, 0, state.width, state.height);
        } else {
          ctx.clearRect(0, 0, state.width, state.height);
        }
        break;
        
      case 'fill':
      case 'stroke':
        if (command.color) {
          if (command.type === 'fill') ctx.fillStyle = command.color;
          else ctx.strokeStyle = command.color;
        }
        break;
        
      case 'line':
        if (command.x !== undefined && command.y !== undefined) {
          ctx.beginPath();
          ctx.moveTo(command.x, command.y);
          if (command.width !== undefined && command.height !== undefined) {
            ctx.lineTo(command.x + command.width, command.y + command.height);
          }
          if (command.stroke) ctx.stroke();
        }
        break;
        
      case 'rect':
        if (command.x !== undefined && command.y !== undefined && command.width !== undefined && command.height !== undefined) {
          if (command.fill) {
            ctx.fillRect(command.x, command.y, command.width, command.height);
          }
          if (command.stroke) {
            ctx.strokeRect(command.x, command.y, command.width, command.height);
          }
        }
        break;
        
      case 'circle':
        if (command.x !== undefined && command.y !== undefined && command.radius !== undefined) {
          ctx.beginPath();
          ctx.arc(command.x, command.y, command.radius, 0, Math.PI * 2);
          if (command.fill) ctx.fill();
          if (command.stroke) ctx.stroke();
        }
        break;
        
      case 'arc':
        if (command.x !== undefined && command.y !== undefined && command.radius !== undefined && command.startAngle !== undefined && command.endAngle !== undefined) {
          ctx.beginPath();
          ctx.arc(command.x, command.y, command.radius, command.startAngle, command.endAngle, command.counterClockwise || false);
          if (command.fill) ctx.fill();
          if (command.stroke) ctx.stroke();
        }
        break;
        
      case 'text':
        if (command.text && command.x !== undefined && command.y !== undefined) {
          if (command.font) ctx.font = command.font;
          if (command.fontSize) ctx.font = `${command.fontSize}px ${ctx.font.split(' ')[1] || 'sans-serif'}`;
          if (command.textAlign) ctx.textAlign = command.textAlign;
          if (command.textBaseline) ctx.textBaseline = command.textBaseline;
          if (command.fill) ctx.fillText(command.text, command.x, command.y);
          if (command.stroke) ctx.strokeText(command.text, command.x, command.y);
        }
        break;
        
      case 'path':
        if (command.points && command.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(command.points[0][0], command.points[0][1]);
          for (let i = 1; i < command.points.length; i++) {
            ctx.lineTo(command.points[i][0], command.points[i][1]);
          }
          if (command.fill) ctx.fill();
          if (command.stroke) ctx.stroke();
        }
        break;
        
      case 'bezier':
        if (command.points && command.points.length >= 4) {
          ctx.beginPath();
          ctx.moveTo(command.points[0][0], command.points[0][1]);
          ctx.bezierCurveTo(
            command.points[1][0], command.points[1][1],
            command.points[2][0], command.points[2][1],
            command.points[3][0], command.points[3][1]
          );
          if (command.fill) ctx.fill();
          if (command.stroke) ctx.stroke();
        }
        break;
        
      case 'image':
        if (command.imageData && command.x !== undefined && command.y !== undefined) {
          this.drawImage(ctx, command.imageData, command.x, command.y, command.width, command.height);
        }
        break;
        
      case 'save':
        ctx.save();
        break;
        
      case 'restore':
        ctx.restore();
        break;
    }
    
    state.version++;
    state.dirty = true;
    state.lastUpdated = Date.now();
    
    // Apply styles if provided
    if (command.lineWidth !== undefined) ctx.lineWidth = command.lineWidth;
    if (command.lineCap) ctx.lineCap = command.lineCap;
    if (command.lineJoin) ctx.lineJoin = command.lineJoin;
  }
  
  // Draw image on canvas
  private async drawImage(ctx: CanvasRenderingContext2D, imageData: string, x: number, y: number, width?: number, height?: number): Promise<void> {
    try {
      if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
        // Fetch image from URL
        const response = await fetch(imageData);
        const buffer = await response.arrayBuffer();
        await this.drawImageBuffer(ctx, buffer, x, y, width, height);
      } else if (imageData.startsWith('data:')) {
        // Base64 encoded image
        const base64Data = imageData.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        await this.drawImageBuffer(ctx, buffer, x, y, width, height);
      }
    } catch (error) {
      console.error('Error drawing image:', error);
    }
  }
  
  // Draw image from buffer
  private async drawImageBuffer(ctx: CanvasRenderingContext2D, buffer: ArrayBuffer, x: number, y: number, width?: number, height?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const { loadImage } = require('@napi-rs/canvas');
      loadImage(Buffer.from(buffer)).then((img: any) => {
        if (width && height) {
          ctx.drawImage(img, x, y, width, height);
        } else {
          ctx.drawImage(img, x, y);
        }
        resolve();
      }).catch(reject);
    });
  }
  
  // Execute batch of commands
  executeBatch(batch: A2UICanvasBatch, userId?: string): { canvasId: string; version: number; commandsProcessed: number } {
    if (!this.isValidCanvasId(batch.canvasId)) {
      throw new Error(`Invalid canvas ID: ${batch.canvasId}`);
    }
    
    // Enforce user canvas limit
    if (userId) {
      if (!this.userCanvases.has(userId)) {
        this.userCanvases.set(userId, new Set());
      }
      const userCanvasSet = this.userCanvases.get(userId)!;
      if (userCanvasSet.size >= this.config.maxCanvasesPerUser) {
        throw new Error(`Maximum canvases per user (${this.config.maxCanvasesPerUser}) exceeded`);
      }
      userCanvasSet.add(batch.canvasId);
    }
    
    // Limit batch size
    const commands = batch.commands.slice(0, this.config.maxCommandsPerBatch);
    
    const state = this.getCanvas(batch.canvasId, batch.width, batch.height);
    const startVersion = state.version;
    
    for (const command of commands) {
      if (this.validateCommand(command)) {
        this.executeCommand(batch.canvasId, command);
      }
    }
    
    return {
      canvasId: batch.canvasId,
      version: state.version,
      commandsProcessed: commands.length,
    };
  }
  
  // Render canvas to image
  renderToImage(canvasId: string, options?: { format?: 'png' | 'jpeg' | 'webp'; quality?: number }): Buffer {
    const state = this.canvases.get(canvasId);
    if (!state) throw new Error(`Canvas not found: ${canvasId}`);
    
    const format = options?.format || this.config.format;
    const quality = options?.quality || this.config.compressionQuality;
    
    if (format === 'jpeg') {
      return state.canvas.toBuffer('image/jpeg', { quality });
    } else if (format === 'webp') {
      return state.canvas.toBuffer('image/webp', { quality });
    } else {
      return state.canvas.toBuffer('image/png');
    }
  }
  
  // Get canvas info
  getCanvasInfo(canvasId: string): { width: number; height: number; version: number; lastUpdated: number } | null {
    const state = this.canvases.get(canvasId);
    if (!state) return null;
    return {
      width: state.width,
      height: state.height,
      version: state.version,
      lastUpdated: state.lastUpdated,
    };
  }
  
  // Resize canvas
  resizeCanvas(canvasId: string, width: number, height: number): void {
    const state = this.canvases.get(canvasId);
    if (!state) throw new Error(`Canvas not found: ${canvasId}`);
    
    const w = Math.min(width, this.config.maxWidth);
    const h = Math.min(height, this.config.maxHeight);
    
    // Create new canvas
    const newCanvas = createCanvas(w, h);
    const newCtx = newCanvas.getContext('2d');
    
    // Copy old content
    newCtx.drawImage(state.canvas, 0, 0);
    
    // Update state
    state.canvas = newCanvas;
    state.ctx = newCtx!;
    state.width = w;
    state.height = h;
    state.version++;
    state.dirty = true;
  }
  
  // Clear canvas
  clearCanvas(canvasId: string, color?: string): void {
    const state = this.canvases.get(canvasId);
    if (!state) throw new Error(`Canvas not found: ${canvasId}`);
    
    const ctx = state.ctx;
    if (color) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, state.width, state.height);
    } else {
      ctx.clearRect(0, 0, state.width, state.height);
    }
    
    state.version++;
    state.dirty = true;
  }
  
  // Delete canvas
  deleteCanvas(canvasId: string): boolean {
    const state = this.canvases.get(canvasId);
    if (!state) return false;
    
    // Remove from user canvases
    for (const [userId, canvasSet] of this.userCanvases) {
      canvasSet.delete(canvasId);
      if (canvasSet.size === 0) {
        this.userCanvases.delete(userId);
      }
    }
    
    this.canvases.delete(canvasId);
    return true;
  }
  
  // Clean up old canvases
  cleanupOldCanvases(maxAgeMs: number = 3600000): number {
    const now = Date.now();
    let deleted = 0;
    
    for (const [canvasId, state] of this.canvases) {
      if (now - state.lastUpdated > maxAgeMs) {
        this.deleteCanvas(canvasId);
        deleted++;
      }
    }
    
    return deleted;
  }
  
  // Get statistics
  getStats(): { totalCanvases: number; activeUsers: number; totalCommands: number } {
    let totalCommands = 0;
    for (const state of this.canvases.values()) {
      totalCommands += state.version;
    }
    
    return {
      totalCanvases: this.canvases.size,
      activeUsers: this.userCanvases.size,
      totalCommands,
    };
  }
}

const A2UICanvasCommandSchema = z.object({
  type: z.enum(['clear', 'fill', 'stroke', 'line', 'rect', 'circle', 'ellipse', 'arc', 'bezier', 'quadratic', 'text', 'image', 'path', 'transform', 'save', 'restore']),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  radius: z.number().optional(),
  startAngle: z.number().optional(),
  endAngle: z.number().optional(),
  color: z.string().optional(),
  stroke: z.string().optional(),
  fill: z.string().optional(),
  lineWidth: z.number().optional(),
  lineCap: z.enum(['butt', 'round', 'square']).optional(),
  lineJoin: z.enum(['miter', 'round', 'bevel']).optional(),
  text: z.string().optional(),
  font: z.string().optional(),
  fontSize: z.number().optional(),
  textAlign: z.enum(['left', 'right', 'center']).optional(),
  textBaseline: z.enum(['top', 'middle', 'bottom']).optional(),
  points: z.array(z.tuple([z.number(), z.number()])).optional(),
  imageData: z.string().optional(),
  counterClockwise: z.boolean().optional(),
  matrix: z.array(z.number()).length(6).optional(),
});
```

## WebSocket Streaming

```typescript
// In WebSocketGateway class
private handleCanvasCommands(client: WebSocketClient, message: any) {
  const { canvasId, commands, format, quality } = message;
  
  if (!canvasId || !commands) {
    this.send(client, { type: 'error', message: 'canvasId and commands required', code: 'INVALID_INPUT' });
    return;
  }
  
  try {
    const canvasService: CanvasService = this['canvasService'];
    const result = canvasService.executeBatch({ canvasId, commands });
    
    // Render to image
    const imageBuffer = canvasService.renderToImage(canvasId, { format, quality });
    const imageData = imageBuffer.toString('base64');
    
    // Broadcast to subscribed clients
    this.broadcastToChannel(canvasId, {
      type: 'canvas_update',
      canvasId,
      version: result.version,
      image: imageData,
      format: format || 'png',
      width: canvasService.getCanvasInfo(canvasId)?.width,
      height: canvasService.getCanvasInfo(canvasId)?.height,
    }, client.id);
    
    // Send acknowledgment
    this.send(client, {
      type: 'canvas_ack',
      canvasId,
      version: result.version,
      commandsProcessed: result.commandsProcessed,
    });
  } catch (error) {
    this.send(client, {
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      canvasId,
    });
  }
}
```

## HTTP API Endpoints

```typescript
// src/api/routes/canvas.ts
import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// POST /api/canvas/:canvasId/commands
router.post('/:canvasId/commands', async (req, res) => {
  try {
    const { canvasId } = req.params;
    const { commands } = z.object({ commands: z.array(A2UICanvasCommandSchema) }).parse(req.body);
    
    const canvasService: CanvasService = req.app.get('canvasService');
    const result = canvasService.executeBatch({ canvasId, commands }, req.user?.id);
    
    res.json({
      success: true,
      canvasId: result.canvasId,
      version: result.version,
      commandsProcessed: result.commandsProcessed,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /api/canvas/:canvasId/image
router.get('/:canvasId/image', async (req, res) => {
  try {
    const { canvasId } = req.params;
    const { format, quality } = z.object({
      format: z.enum(['png', 'jpeg', 'webp']).optional(),
      quality: z.number().min(0).max(1).optional(),
    }).parse(req.query);
    
    const canvasService: CanvasService = req.app.get('canvasService');
    const imageBuffer = canvasService.renderToImage(canvasId, { format, quality });
    
    res.setHeader('Content-Type', `image/${format || 'png'}`);
    res.setHeader('Content-Disposition', 'inline');
    res.send(imageBuffer);
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'Canvas not found' });
  }
});

// GET /api/canvas/:canvasId/info
router.get('/:canvasId/info', async (req, res) => {
  try {
    const { canvasId } = req.params;
    const canvasService: CanvasService = req.app.get('canvasService');
    const info = canvasService.getCanvasInfo(canvasId);
    
    if (!info) {
      return res.status(404).json({ error: 'Canvas not found' });
    }
    
    res.json(info);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// DELETE /api/canvas/:canvasId
router.delete('/:canvasId', async (req, res) => {
  try {
    const { canvasId } = req.params;
    const canvasService: CanvasService = req.app.get('canvasService');
    const deleted = canvasService.deleteCanvas(canvasId);
    
    res.json({ success: deleted });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// POST /api/canvas/:canvasId/resize
router.post('/:canvasId/resize', async (req, res) => {
  try {
    const { canvasId } = req.params;
    const { width, height } = z.object({
      width: z.number().int().positive().max(4000),
      height: z.number().int().positive().max(4000),
    }).parse(req.body);
    
    const canvasService: CanvasService = req.app.get('canvasService');
    canvasService.resizeCanvas(canvasId, width, height);
    
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});
```

## React Canvas Component

```typescript
// src/components/CanvasPanel.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

export function CanvasPanel({ channelId, canvasId: initialCanvasId }: { channelId: string; canvasId?: string }) {
  const ws = useWebSocket('ws://localhost:3001/ws');
  const [canvasId, setCanvasId] = useState(initialCanvasId || `canvas_${Date.now()}`);
  const [imageData, setImageData] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [commands, setCommands] = useState<string>('');
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Subscribe to canvas updates
  useEffect(() => {
    if (!canvasId) return;
    
    ws.subscribe(canvasId);
    
    const handler = ws.onMessage('canvas', (msg: any) => {
      if (msg.type === 'canvas_update' && msg.canvasId === canvasId) {
        setImageData(`data:image/${msg.format};base64,${msg.image}`);
        setVersion(msg.version);
      } else if (msg.type === 'canvas_ack' && msg.canvasId === canvasId) {
        // Acknowledgment received
      }
    });
    
    return () => {
      handler();
      ws.unsubscribe(canvasId);
    };
  }, [canvasId, ws]);
  
  // Execute commands
  const executeCommands = useCallback(() => {
    if (!commands.trim() || !canvasId) return;
    
    try {
      const parsedCommands = JSON.parse(commands);
      if (!Array.isArray(parsedCommands)) {
        throw new Error('Commands must be an array');
      }
      
      ws.send({
        type: 'canvas',
        channelId,
        canvasId,
        commands: parsedCommands,
        format: 'png',
      });
    } catch (error) {
      console.error('Error executing commands:', error);
    }
  }, [canvasId, commands, channelId, ws]);
  
  // Clear canvas
  const clearCanvas = useCallback(() => {
    ws.send({
      type: 'canvas',
      channelId,
      canvasId,
      commands: [{ type: 'clear' }],
    });
  }, [canvasId, channelId, ws]);
  
  // Create new canvas
  const createNewCanvas = useCallback(() => {
    const newCanvasId = `canvas_${Date.now()}`;
    setCanvasId(newCanvasId);
    setImageData(null);
    setVersion(0);
    setCommands('');
  }, []);
  
  // Resize canvas
  const resizeCanvas = useCallback(() => {
    ws.send({
      type: 'canvas_resize',
      channelId,
      canvasId,
      width,
      height,
    });
  }, [canvasId, channelId, width, height, ws]);
  
  return (
    <div className="canvas-panel">
      <div className="canvas-toolbar">
        <select value={canvasId} onChange={(e) => setCanvasId(e.target.value)}>
          <option value={canvasId}>{canvasId}</option>
        </select>
        <button onClick={createNewCanvas}>New Canvas</button>
        <button onClick={clearCanvas}>Clear</button>
        <input type="number" value={width} onChange={(e) => setWidth(parseInt(e.target.value) || 0)} placeholder="Width" />
        <input type="number" value={height} onChange={(e) => setHeight(parseInt(e.target.value) || 0)} placeholder="Height" />
        <button onClick={resizeCanvas}>Resize</button>
      </div>
      
      <div className="canvas-container">
        {imageData ? (
          <img
            src={imageData}
            alt={`Canvas ${canvasId}`}
            style={{ maxWidth: '100%', border: '1px solid #ccc' }}
          />
        ) : (
          <div className="canvas-placeholder">
            <p>Canvas will appear here</p>
            <p>Version: {version}</p>
          </div>
        )}
      </div>
      
      <div className="canvas-commands">
        <h3>Commands (A2UI JSON)</h3>
        <textarea
          value={commands}
          onChange={(e) => setCommands(e.target.value)}
          placeholder='[{"type": "rect", "x": 50, "y": 50, "width": 100, "height": 100, "fill": "blue"}]'
          rows={10}
        />
        <button onClick={executeCommands}>Execute Commands</button>
        
        <div className="command-presets">
          <button onClick={() => setCommands('[{"type": "rect", "x": 50, "y": 50, "width": 100, "height": 100, "fill": "blue"}]')}>
            Blue Rectangle
          </button>
          <button onClick={() => setCommands('[{"type": "circle", "x": 100, "y": 100, "radius": 50, "fill": "red", "stroke": "black"}]')}>
            Red Circle
          </button>
          <button onClick={() => setCommands('[{"type": "text", "x": 100, "y": 100, "text": "Hello, Canvas!", "font": "20px Arial", "fill": "black"}]')}>
            Text
          </button>
          <button onClick={() => setCommands('[{"type": "path", "points": [[50,50],[100,100],[150,50]], "stroke": "green", "lineWidth": 2}]')}>
            Triangle
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Configuration Schema

```typescript
// src/config/canvas-config.ts
import { z } from 'zod';

export const CanvasConfigSchema = z.object({
  canvas: z.object({
    enabled: z.boolean().default(true),
    defaultWidth: z.number().int().positive().max(4000).default(800),
    defaultHeight: z.number().int().positive().max(4000).default(600),
    maxWidth: z.number().int().positive().max(8000).default(4000),
    maxHeight: z.number().int().positive().max(8000).default(4000),
    maxCommandsPerBatch: z.number().int().positive().default(100),
    maxCanvasesPerUser: z.number().int().positive().default(10),
    compressionQuality: z.number().min(0).max(1).default(0.8),
    format: z.enum(['png', 'jpeg', 'webp']).default('png'),
    cleanupInterval: z.number().int().positive().default(300000), // 5 minutes
    maxAge: z.number().int().positive().default(3600000), // 1 hour
  }).default({}),
});
```

## Integration with Gateway

```typescript
// src/core/gateway.ts
import { CanvasService } from '../services/tools/canvas/canvas-service';

export class AgentGateway {
  private canvasService: CanvasService;
  
  async initialize() {
    this.canvasService = new CanvasService(this.config.canvas);
    
    // Set up cleanup
    setInterval(() => {
      const deleted = this.canvasService.cleanupOldCanvases();
      if (deleted > 0) console.log(`Cleaned up ${deleted} old canvases`);
    }, this.config.canvas.cleanupInterval);
  }
  
  async executeCanvas(batch: A2UICanvasBatch, userId?: string): Promise<any> {
    return this.canvasService.executeBatch(batch, userId);
  }
  
  async renderCanvas(canvasId: string, options?: { format?: 'png' | 'jpeg' | 'webp'; quality?: number }): Promise<Buffer> {
    return this.canvasService.renderToImage(canvasId, options);
  }
  
  getCanvasStats(): any {
    return this.canvasService.getStats();
  }
}
```

## Security Best Practices

1. **Validate Canvas IDs** - Prevent injection attacks
2. **Limit Command Batch Size** - Prevent DoS attacks
3. **Enforce User Limits** - Prevent resource exhaustion
4. **Clean Up Old Canvases** - Free memory regularly
5. **Validate Image Data** - Check base64 encoded data
6. **Sanitize Text** - Prevent XSS in text commands

## Testing

```typescript
// tests/services/tools/canvas-service.test.ts
describe('CanvasService', () => {
  let service: CanvasService;
  
  beforeEach(() => {
    service = new CanvasService({
      defaultWidth: 100,
      defaultHeight: 100,
      maxCommandsPerBatch: 10,
      maxCanvasesPerUser: 5,
    });
  });
  
  afterEach(() => {
    service['canvases'].clear();
    service['userCanvases'].clear();
  });
  
  it('creates canvas with default size', () => {
    const canvas = service.getCanvas('test-canvas');
    expect(canvas.width).toBe(100);
    expect(canvas.height).toBe(100);
  });
  
  it('creates canvas with custom size', () => {
    const canvas = service.getCanvas('test-canvas-2', 200, 150);
    expect(canvas.width).toBe(200);
    expect(canvas.height).toBe(150);
  });
  
  it('validates canvas ID', () => {
    expect(service.isValidCanvasId('valid-id')).toBe(true);
    expect(service.isValidCanvasId('valid_id')).toBe(true);
    expect(service.isValidCanvasId('invalid/id')).toBe(false);
    expect(service.isValidCanvasId('')).toBe(false);
  });
  
  it('executes commands', () => {
    const result = service.executeBatch({
      canvasId: 'test-canvas',
      commands: [
        { type: 'clear', color: 'white' },
        { type: 'rect', x: 10, y: 10, width: 50, height: 50, fill: 'blue' },
      ],
    });
    
    expect(result.canvasId).toBe('test-canvas');
    expect(result.commandsProcessed).toBe(2);
    expect(result.version).toBe(2);
  });
  
  it('renders canvas to image', () => {
    service.executeBatch({
      canvasId: 'test-canvas',
      commands: [{ type: 'clear', color: 'red' }],
    });
    
    const buffer = service.renderToImage('test-canvas');
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
  
  it('gets canvas info', () => {
    service.executeBatch({
      canvasId: 'test-canvas',
      commands: [{ type: 'clear' }],
    });
    
    const info = service.getCanvasInfo('test-canvas');
    expect(info).toBeDefined();
    expect(info?.width).toBe(100);
    expect(info?.height).toBe(100);
    expect(info?.version).toBe(1);
  });
  
  it('deletes canvas', () => {
    service.executeBatch({ canvasId: 'test-canvas', commands: [] });
    expect(service.deleteCanvas('test-canvas')).toBe(true);
    expect(service.getCanvasInfo('test-canvas')).toBeNull();
  });
  
  it('enforces user canvas limit', () => {
    for (let i = 0; i < 5; i++) {
      service.executeBatch({ canvasId: `canvas-${i}`, commands: [] }, 'test-user');
    }
    
    expect(() => {
      service.executeBatch({ canvasId: 'canvas-6', commands: [] }, 'test-user');
    }).toThrow('Maximum canvases per user');
  });
  
  it('limits batch size', () => {
    const longBatch = {
      canvasId: 'test-canvas',
      commands: Array.from({ length: 20 }, (_, i) => ({ type: 'rect', x: i * 10, y: 0, width: 10, height: 10, fill: 'black' })),
    };
    
    const result = service.executeBatch(longBatch);
    expect(result.commandsProcessed).toBe(10); // Limited to maxCommandsPerBatch
  });
});
```

## Resources

- [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas) - High-performance canvas library
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) - Browser Canvas documentation
- [A2UI Specification](https://github.com/ai2ui/a2ui) - A2UI JSON format

## Principles

1. Performance - Optimize rendering for real-time use
2. Simplicity - Easy to use API
3. Flexibility - Support wide range of drawing operations
4. Security - Validate all inputs
5. Efficiency - Clean up unused resources
