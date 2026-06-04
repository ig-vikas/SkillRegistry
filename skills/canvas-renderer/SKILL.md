---
name: canvas-renderer
type: skill
description: Server-side canvas rendering service for AI agent gateway using @napi-rs/canvas for image generation, drawing commands, and visual output.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [backend, graphics, rendering]
tags: [canvas, rendering, images, drawing, graphics, 2d, napi-rs, sharp, image-generation]
---

# Canvas Renderer Expert

Implement server-side canvas rendering for AI agent gateway to generate images from drawing commands, render visual outputs, and process image data using high-performance native libraries.

## Architecture

```
AI Agent Request
     │
     ▼ (Drawing Commands / Image Request)
┌─────────────────────────────────┐
│      Canvas Renderer            │
├─────────────────────────────────┤
│                                     │
│  ┌─────────────────┐              │
│  │  Command Parser  │              │
│  │  - A2UI JSON     │              │
│  │  - Custom format │              │
│  └────────┬────────┘              │
│           │                        │
│           ▼                        │
│  ┌─────────────────┐              │
│  │  Canvas Manager  │              │
│  │  - Pool canvases │              │
│  │  - Reuse resources│             │
│  └────────┬────────┘              │
│           │                        │
│           ▼                        │
│  ┌─────────────────┐              │
│  │  Render Engine   │◄─────────────┤
│  │  - @napi-rs/canvas│   (Native)
│  │  - Sharp         │              │
│  └────────┬────────┘              │
│           │                        │
│           ▼                        │
│  ┌─────────────────┐              │
│  │  Output Formatter│              │
│  │  - PNG, JPEG     │              │
│  │  - WebP, SVG    │              │
│  └────────┬────────┘              │
│           │                        │
│           ▼                        │
└───────────┼────────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│       Image Output               │
│  - Base64 encoded                │
│  - File stream                   │
│  - WebSocket chunks              │
└─────────────────────────────────┘
```

## Core Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| CommandParser | Parse A2UI JSON and custom drawing commands | Custom parser |
| CanvasManager | Pool and manage canvas instances | @napi-rs/canvas |
| RenderEngine | Execute drawing operations | @napi-rs/canvas, Sharp |
| OutputFormatter | Convert to various image formats | Sharp, custom |
| ImageCache | Cache frequently used images | LRU cache |
| WebSocketStreamer | Stream image chunks | WebSocket |

## Quick Start

```bash
# Install dependencies
pnpm add @napi-rs/canvas sharp

# For Windows, may need additional setup
# See: https://github.com/napi-rs/canvas#windows

# Basic usage
import { createCanvas, loadImage } from '@napi-rs/canvas';
import sharp from 'sharp';

const canvas = createCanvas(800, 600);
const ctx = canvas.getContext('2d');

// Draw something
ctx.fillStyle = '#ff0000';
ctx.fillRect(100, 100, 200, 200);

// Get image buffer
const buffer = canvas.toBuffer('image/png');
```

## Configuration Schema (Zod)

```typescript
// src/services/canvas/config.ts
import { z } from 'zod';

export const CanvasConfigSchema = z.object({
  // Canvas settings
  canvas: z.object({
    maxWidth: z.number().int().positive().default(4096),
    maxHeight: z.number().int().positive().default(4096),
    defaultWidth: z.number().int().positive().default(800),
    defaultHeight: z.number().int().positive().default(600),
    maxPoolSize: z.number().int().positive().default(10),
    poolTimeout: z.number().int().positive().default(30000),
  }).default({}),

  // Image format settings
  formats: z.object({
    png: z.object({
      enabled: z.boolean().default(true),
      quality: z.number().min(0).max(1).default(1),
      compressionLevel: z.number().min(0).max(9).default(6),
    }).default({}),
    jpeg: z.object({
      enabled: z.boolean().default(true),
      quality: z.number().min(0).max(100).default(80),
    }).default({}),
    webp: z.object({
      enabled: z.boolean().default(true),
      quality: z.number().min(0).max(100).default(80),
      lossless: z.boolean().default(false),
    }).default({}),
    svg: z.object({
      enabled: z.boolean().default(true),
      pretty: z.boolean().default(false),
    }).default({}),
  }).default({}),

  // Performance settings
  performance: z.object({
    maxMemory: z.number().int().positive().default(512), // MB
    maxOperationsPerSecond: z.number().int().positive().default(100),
    timeout: z.number().int().positive().default(30000),
    concurrentRenders: z.number().int().positive().default(4),
  }).default({}),

  // Cache settings
  cache: z.object({
    enabled: z.boolean().default(true),
    maxSize: z.number().int().positive().default(100),
    ttl: z.number().int().positive().default(300), // seconds
    path: z.string().default('./data/canvas-cache'),
  }).default({}),
});

export type CanvasConfig = z.infer<typeof CanvasConfigSchema>;

export const DefaultCanvasConfig: CanvasConfig = {
  canvas: {
    maxWidth: 4096,
    maxHeight: 4096,
    defaultWidth: 800,
    defaultHeight: 600,
    maxPoolSize: 10,
    poolTimeout: 30000,
  },
  formats: {
    png: { enabled: true, quality: 1, compressionLevel: 6 },
    jpeg: { enabled: true, quality: 80 },
    webp: { enabled: true, quality: 80, lossless: false },
    svg: { enabled: true, pretty: false },
  },
  performance: {
    maxMemory: 512,
    maxOperationsPerSecond: 100,
    timeout: 30000,
    concurrentRenders: 4,
  },
  cache: {
    enabled: true,
    maxSize: 100,
    ttl: 300,
    path: './data/canvas-cache',
  },
};
```

## Command Parser

### A2UI JSON Format

```typescript
// A2UI JSON command format from Canvas Drawing skill
interface A2UICanvasCommand {
  type: 'draw' | 'clear' | 'background' | 'stroke' | 'fill' | 'line' | 'rect' | 'circle' | 'ellipse' | 'polygon' | 'text' | 'image' | 'transform';
  // Common properties
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  // Style properties
  color?: string;
  opacity?: number;
  lineWidth?: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  font?: string;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  textBaseline?: 'top' | 'middle' | 'bottom';
  // Transform properties
  translateX?: number;
  translateY?: number;
  rotate?: number;
  scaleX?: number;
  scaleY?: number;
  // Image properties
  imageUrl?: string;
  imageData?: string; // base64
  // Path properties
  points?: Array<{ x: number; y: number }>;
  // Text properties
  text?: string;
}

interface A2UICanvasCommands {
  version: string;
  width: number;
  height: number;
  background?: string;
  commands: A2UICanvasCommand[];
}

// src/services/canvas/parser.ts
export class A2UIParser {
  static parse(commands: A2UICanvasCommands | A2UICanvasCommand[]): CanvasCommand[] {
    // Normalize input
    if (Array.isArray(commands) && commands.length > 0 && 'type' in commands[0]) {
      return commands.map(cmd => this.parseCommand(cmd));
    }
    
    if (typeof commands === 'object' && 'commands' in commands) {
      const canvasCommands = commands as A2UICanvasCommands;
      const parsed: CanvasCommand[] = [];
      
      // Set canvas size
      if (canvasCommands.width && canvasCommands.height) {
        parsed.push({ type: 'setSize', width: canvasCommands.width, height: canvasCommands.height });
      }
      
      // Set background
      if (canvasCommands.background) {
        parsed.push({ type: 'background', color: canvasCommands.background });
      }
      
      // Parse each command
      for (const cmd of canvasCommands.commands) {
        parsed.push(this.parseCommand(cmd));
      }
      
      return parsed;
    }
    
    throw new Error('Invalid command format');
  }
  
  private static parseCommand(cmd: A2UICanvasCommand): CanvasCommand {
    switch (cmd.type) {
      case 'clear':
        return { type: 'clear' };
      
      case 'background':
        return { type: 'background', color: cmd.color || '#ffffff' };
      
      case 'stroke':
        return {
          type: 'stroke',
          color: cmd.color,
          lineWidth: cmd.lineWidth,
          lineCap: cmd.lineCap,
          lineJoin: cmd.lineJoin,
        };
      
      case 'fill':
        return {
          type: 'fill',
          color: cmd.color,
          opacity: cmd.opacity,
        };
      
      case 'line':
        return {
          type: 'line',
          x1: cmd.x || 0,
          y1: cmd.y || 0,
          x2: (cmd as any).x2 || 0,
          y2: (cmd as any).y2 || 0,
        };
      
      case 'rect':
        return {
          type: 'rect',
          x: cmd.x || 0,
          y: cmd.y || 0,
          width: cmd.width || 0,
          height: cmd.height || 0,
        };
      
      case 'circle':
        return {
          type: 'circle',
          x: cmd.x || 0,
          y: cmd.y || 0,
          radius: (cmd as any).radius || 0,
        };
      
      case 'ellipse':
        return {
          type: 'ellipse',
          x: cmd.x || 0,
          y: cmd.y || 0,
          radiusX: (cmd as any).radiusX || 0,
          radiusY: (cmd as any).radiusY || 0,
          rotation: (cmd as any).rotation || 0,
        };
      
      case 'polygon':
        return {
          type: 'polygon',
          points: cmd.points || [],
        };
      
      case 'text':
        return {
          type: 'text',
          text: cmd.text || '',
          x: cmd.x || 0,
          y: cmd.y || 0,
          font: cmd.font,
          fontSize: cmd.fontSize,
          color: cmd.color,
          align: cmd.textAlign,
          baseline: cmd.textBaseline,
        };
      
      case 'image':
        return {
          type: 'image',
          imageUrl: cmd.imageUrl,
          imageData: cmd.imageData,
          x: cmd.x || 0,
          y: cmd.y || 0,
          width: cmd.width,
          height: cmd.height,
        };
      
      case 'draw':
        return {
          type: 'path',
          commands: (cmd as any).commands || [],
        };
      
      case 'transform':
        return {
          type: 'transform',
          translateX: cmd.translateX || 0,
          translateY: cmd.translateY || 0,
          rotate: cmd.rotate || 0,
          scaleX: cmd.scaleX || 1,
          scaleY: cmd.scaleY || 1,
        };
      
      default:
        console.warn(`Unknown command type: ${cmd.type}`);
        return { type: 'noop' };
    }
  }
}

type CanvasCommand = 
  | { type: 'clear' }
  | { type: 'setSize', width: number, height: number }
  | { type: 'background', color: string }
  | { type: 'stroke', color?: string, lineWidth?: number, lineCap?: string, lineJoin?: string }
  | { type: 'fill', color?: string, opacity?: number }
  | { type: 'line', x1: number, y1: number, x2: number, y2: number }
  | { type: 'rect', x: number, y: number, width: number, height: number }
  | { type: 'circle', x: number, y: number, radius: number }
  | { type: 'ellipse', x: number, y: number, radiusX: number, radiusY: number, rotation?: number }
  | { type: 'polygon', points: Array<{ x: number; y: number }> }
  | { type: 'text', text: string, x: number, y: number, font?: string, fontSize?: number, color?: string, align?: string, baseline?: string }
  | { type: 'image', imageUrl?: string, imageData?: string, x: number, y: number, width?: number, height?: number }
  | { type: 'path', commands: any[] }
  | { type: 'transform', translateX?: number, translateY?: number, rotate?: number, scaleX?: number, scaleY?: number }
  | { type: 'noop' };
```

## Canvas Manager with Pooling

```typescript
// src/services/canvas/manager.ts
import { createCanvas, Canvas, CanvasRenderingContext2D, Image } from '@napi-rs/canvas';

interface PooledCanvas {
  canvas: Canvas;
  ctx: CanvasRenderingContext2D;
  lastUsed: number;
  inUse: boolean;
}

export class CanvasManager {
  private pool: PooledCanvas[] = [];
  private config: CanvasConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: CanvasConfig) {
    this.config = config;
    
    // Cleanup stale canvases periodically
    this.cleanupInterval = setInterval(() => this.cleanup(), 10000);
  }

  async acquireCanvas(width: number, height: number): Promise<{ canvas: Canvas; ctx: CanvasRenderingContext2D }> {
    // Validate dimensions
    if (width > this.config.canvas.maxWidth) {
      throw new Error(`Width ${width} exceeds maximum ${this.config.canvas.maxWidth}`);
    }
    if (height > this.config.canvas.maxHeight) {
      throw new Error(`Height ${height} exceeds maximum ${this.config.canvas.maxHeight}`);
    }

    // Try to find available canvas from pool
    const now = Date.now();
    for (const pooled of this.pool) {
      if (!pooled.inUse && now - pooled.lastUsed < this.config.canvas.poolTimeout) {
        // Clear and resize existing canvas
        pooled.ctx.clearRect(0, 0, pooled.canvas.width, pooled.canvas.height);
        pooled.canvas.width = width;
        pooled.canvas.height = height;
        pooled.inUse = true;
        pooled.lastUsed = now;
        return { canvas: pooled.canvas, ctx: pooled.ctx };
      }
    }

    // Create new canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    const pooled: PooledCanvas = {
      canvas,
      ctx: ctx!,
      lastUsed: now,
      inUse: true,
    };
    
    this.pool.push(pooled);
    
    // Limit pool size
    if (this.pool.length > this.config.canvas.maxPoolSize) {
      this.cleanup();
    }

    return { canvas, ctx: ctx! };
  }

  releaseCanvas(canvas: Canvas): void {
    for (const pooled of this.pool) {
      if (pooled.canvas === canvas) {
        pooled.inUse = false;
        pooled.lastUsed = Date.now();
        break;
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const timeout = this.config.canvas.poolTimeout;
    
    this.pool = this.pool.filter(pooled => {
      if (!pooled.inUse && now - pooled.lastUsed > timeout) {
        // Cleanup resources
        return false;
      }
      return true;
    });
  }

  getPoolStats(): { total: number; inUse: number; available: number } {
    const inUse = this.pool.filter(p => p.inUse).length;
    return {
      total: this.pool.length,
      inUse,
      available: this.pool.length - inUse,
    };
  }

  async destroy(): Promise<void> {
    clearInterval(this.cleanupInterval);
    this.pool = [];
  }
}
```

## Render Engine

```typescript
// src/services/canvas/engine.ts
import { Canvas, CanvasRenderingContext2D, Image, loadImage } from '@napi-rs/canvas';
import { createHash } from 'crypto';
import sharp from 'sharp';
import { CanvasManager } from './manager';
import { A2UIParser } from './parser';

export interface RenderOptions {
  format?: 'png' | 'jpeg' | 'webp' | 'svg';
  quality?: number;
  compressionLevel?: number;
  lossless?: boolean;
  width?: number;
  height?: number;
  background?: string;
}

export interface RenderResult {
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  size: number;
}

export class CanvasRenderEngine {
  private manager: CanvasManager;
  private config: CanvasConfig;
  private imageCache: Map<string, Image> = new Map();

  constructor(config: CanvasConfig) {
    this.config = config;
    this.manager = new CanvasManager(config);
  }

  async render(commands: A2UICanvasCommands | A2UICanvasCommand[], options: RenderOptions = {}): Promise<RenderResult> {
    const parsedCommands = A2UIParser.parse(commands);
    
    // Extract canvas size from commands or use defaults
    let width = this.config.canvas.defaultWidth;
    let height = this.config.canvas.defaultHeight;
    
    for (const cmd of parsedCommands) {
      if (cmd.type === 'setSize') {
        width = cmd.width;
        height = cmd.height;
        break;
      }
    }
    
    // Override with options
    width = options.width || width;
    height = options.height || height;
    
    // Acquire canvas from pool
    const { canvas, ctx } = await this.manager.acquireCanvas(width, height);
    
    try {
      // Apply background if specified
      if (options.background) {
        ctx.fillStyle = options.background;
        ctx.fillRect(0, 0, width, height);
      }
      
      // Execute all commands
      for (const cmd of parsedCommands) {
        await this.executeCommand(ctx, canvas, cmd);
      }
      
      // Convert to requested format
      const result = await this.toBuffer(canvas, options);
      return result;
    } finally {
      // Release canvas back to pool
      this.manager.releaseCanvas(canvas);
    }
  }

  private async executeCommand(ctx: CanvasRenderingContext2D, canvas: Canvas, cmd: CanvasCommand): Promise<void> {
    switch (cmd.type) {
      case 'clear':
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        break;
        
      case 'setSize':
        // Handled during canvas acquisition
        break;
        
      case 'background':
        ctx.fillStyle = cmd.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        break;
        
      case 'stroke':
        if (cmd.color) ctx.strokeStyle = cmd.color;
        if (cmd.lineWidth !== undefined) ctx.lineWidth = cmd.lineWidth;
        if (cmd.lineCap) ctx.lineCap = cmd.lineCap as any;
        if (cmd.lineJoin) ctx.lineJoin = cmd.lineJoin as any;
        break;
        
      case 'fill':
        if (cmd.color) ctx.fillStyle = cmd.color;
        if (cmd.opacity !== undefined) ctx.globalAlpha = cmd.opacity;
        else ctx.globalAlpha = 1;
        break;
        
      case 'line':
        ctx.beginPath();
        ctx.moveTo(cmd.x1, cmd.y1);
        ctx.lineTo(cmd.x2, cmd.y2);
        ctx.stroke();
        break;
        
      case 'rect':
        ctx.beginPath();
        ctx.rect(cmd.x, cmd.y, cmd.width, cmd.height);
        ctx.fill();
        ctx.stroke();
        break;
        
      case 'circle':
        ctx.beginPath();
        ctx.arc(cmd.x, cmd.y, cmd.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
        
      case 'ellipse':
        ctx.beginPath();
        ctx.ellipse(
          cmd.x, cmd.y,
          cmd.radiusX, cmd.radiusY,
          cmd.rotation || 0,
          0, Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
        break;
        
      case 'polygon':
        if (cmd.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(cmd.points[0].x, cmd.points[0].y);
          for (let i = 1; i < cmd.points.length; i++) {
            ctx.lineTo(cmd.points[i].x, cmd.points[i].y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        break;
        
      case 'text':
        if (cmd.font) ctx.font = cmd.font;
        else if (cmd.fontSize) ctx.font = `${cmd.fontSize}px sans-serif`;
        if (cmd.color) ctx.fillStyle = cmd.color;
        if (cmd.align) ctx.textAlign = cmd.align as any;
        if (cmd.baseline) ctx.textBaseline = cmd.baseline as any;
        ctx.fillText(cmd.text, cmd.x, cmd.y);
        break;
        
      case 'image':
        await this.drawImage(ctx, cmd);
        break;
        
      case 'path':
        await this.executePath(ctx, cmd.commands);
        break;
        
      case 'transform':
        ctx.save();
        if (cmd.translateX !== undefined || cmd.translateY !== undefined) {
          ctx.translate(cmd.translateX || 0, cmd.translateY || 0);
        }
        if (cmd.rotate !== undefined) {
          ctx.rotate(cmd.rotate * Math.PI / 180);
        }
        if (cmd.scaleX !== undefined || cmd.scaleY !== undefined) {
          ctx.scale(cmd.scaleX || 1, cmd.scaleY || 1);
        }
        ctx.restore();
        break;
        
      case 'noop':
        break;
    }
  }

  private async drawImage(ctx: CanvasRenderingContext2D, cmd: Extract<CanvasCommand, { type: 'image' }>): Promise<void> {
    let image: Image | null = null;
    
    if (cmd.imageData) {
      // Base64 data
      const cacheKey = `data:${cmd.imageData.substring(0, 50)}`;
      image = this.imageCache.get(cacheKey) || null;
      
      if (!image) {
        const buffer = Buffer.from(cmd.imageData.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        image = await loadImage(buffer);
        this.imageCache.set(cacheKey, image);
      }
    } else if (cmd.imageUrl) {
      // URL - fetch and cache
      const cacheKey = createHash('md5').update(cmd.imageUrl).digest('hex');
      image = this.imageCache.get(cacheKey) || null;
      
      if (!image) {
        // Fetch image from URL
        const response = await fetch(cmd.imageUrl);
        if (!response.ok) {
          console.error(`Failed to fetch image: ${cmd.imageUrl}`);
          return;
        }
        const buffer = await response.buffer();
        image = await loadImage(buffer);
        this.imageCache.set(cacheKey, image);
      }
    }
    
    if (image && ctx) {
      const targetWidth = cmd.width || image.width;
      const targetHeight = cmd.height || image.height;
      ctx.drawImage(image, cmd.x, cmd.y, targetWidth, targetHeight);
    }
  }

  private async executePath(ctx: CanvasRenderingContext2D, commands: any[]): Promise<void> {
    ctx.beginPath();
    
    for (const pathCmd of commands) {
      switch (pathCmd.type || pathCmd.command) {
        case 'moveTo':
          ctx.moveTo(pathCmd.x, pathCmd.y);
          break;
        case 'lineTo':
          ctx.lineTo(pathCmd.x, pathCmd.y);
          break;
        case 'quadraticCurveTo':
          ctx.quadraticCurveTo(pathCmd.cpx, pathCmd.cpy, pathCmd.x, pathCmd.y);
          break;
        case 'bezierCurveTo':
          ctx.bezierCurveTo(
            pathCmd.cp1x, pathCmd.cp1y,
            pathCmd.cp2x, pathCmd.cp2y,
            pathCmd.x, pathCmd.y
          );
          break;
        case 'arc':
          ctx.arc(
            pathCmd.x, pathCmd.y,
            pathCmd.radius,
            pathCmd.startAngle,
            pathCmd.endAngle,
            pathCmd.counterClockwise
          );
          break;
        case 'arcTo':
          ctx.arcTo(pathCmd.x1, pathCmd.y1, pathCmd.x2, pathCmd.y2, pathCmd.radius);
          break;
        case 'closePath':
          ctx.closePath();
          break;
      }
    }
    
    ctx.fill();
    ctx.stroke();
  }

  private async toBuffer(canvas: Canvas, options: RenderOptions): Promise<RenderResult> {
    const format = options.format || 'png';
    const mimeType = this.getMimeType(format);
    
    switch (format) {
      case 'png':
        const pngBuffer = canvas.toBuffer('image/png', {
          compressionLevel: options.compressionLevel || this.config.formats.png.compressionLevel,
        });
        return { buffer: pngBuffer, mimeType, width: canvas.width, height: canvas.height, size: pngBuffer.length };
        
      case 'jpeg':
        const jpegBuffer = canvas.toBuffer('image/jpeg', {
          quality: (options.quality || this.config.formats.jpeg.quality) / 100,
        });
        return { buffer: jpegBuffer, mimeType, width: canvas.width, height: canvas.height, size: jpegBuffer.length };
        
      case 'webp':
        const webpBuffer = canvas.toBuffer('image/webp', {
          quality: (options.quality || this.config.formats.webp.quality) / 100,
          lossless: options.lossless || this.config.formats.webp.lossless,
        });
        return { buffer: webpBuffer, mimeType, width: canvas.width, height: canvas.height, size: webpBuffer.length };
        
      case 'svg':
        // For SVG, use sharp for conversion
        const pngBuffer = canvas.toBuffer('image/png');
        const svgBuffer = await sharp(pngBuffer)
          .toFormat('svg')
          .toBuffer();
        return { buffer: svgBuffer, mimeType: 'image/svg+xml', width: canvas.width, height: canvas.height, size: svgBuffer.length };
        
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private getMimeType(format: string): string {
    switch (format) {
      case 'png': return 'image/png';
      case 'jpeg': return 'image/jpeg';
      case 'webp': return 'image/webp';
      case 'svg': return 'image/svg+xml';
      default: return 'image/png';
    }
  }

  getStats(): { rendered: number; cacheSize: number; poolStats: { total: number; inUse: number; available: number } } {
    return {
      rendered: 0, // Would track this
      cacheSize: this.imageCache.size,
      poolStats: this.manager.getPoolStats(),
    };
  }

  async destroy(): Promise<void> {
    this.imageCache.clear();
    await this.manager.destroy();
  }
}
```

## Image Processing with Sharp

```typescript
// src/services/canvas/processor.ts
import sharp from 'sharp';
import { tmpdir } from 'os';
import { join } from 'path';
import { promises as fs } from 'fs';

export interface ImageProcessOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: string | number;
  background?: string | { r: number; g: number; b: number; alpha?: number };
  blur?: number;
  grayscale?: boolean;
  brightness?: number;
  contrast?: number;
  saturate?: number;
  hue?: number;
  negate?: boolean;
  flip?: boolean;
  flop?: boolean;
  rotate?: number;
  trim?: boolean | sharp.TrimOptions;
  extend?: sharp.ExtendOptions;
  format?: string;
  quality?: number;
  compressionLevel?: number;
}

export class ImageProcessor {
  constructor() {}

  async process(buffer: Buffer, options: ImageProcessOptions = {}): Promise<Buffer> {
    let processor = sharp(buffer);
    
    // Resize
    if (options.width || options.height) {
      processor = processor.resize({
        width: options.width,
        height: options.height,
        fit: options.fit || 'contain',
        position: options.position,
        background: options.background,
      });
    }
    
    // Blur
    if (options.blur !== undefined) {
      processor = processor.blur(options.blur);
    }
    
    // Color adjustments
    if (options.grayscale) processor = processor.grayscale();
    if (options.brightness !== undefined) processor = processor.modulate({ brightness: options.brightness });
    if (options.contrast !== undefined) processor = processor.modulate({ saturation: options.contrast });
    if (options.saturate !== undefined) processor = processor.modulate({ saturation: options.saturate });
    if (options.hue !== undefined) processor = processor.modulate({ hue: options.hue });
    if (options.negate) processor = processor.negate();
    
    // Transformations
    if (options.flip) processor = processor.flip();
    if (options.flop) processor = processor.flop();
    if (options.rotate !== undefined) processor = processor.rotate(options.rotate);
    
    // Trim
    if (options.trim) processor = processor.trim(options.trim === true ? {} : options.trim);
    
    // Extend
    if (options.extend) processor = processor.extend(options.extend);
    
    // Format conversion
    if (options.format) {
      processor = processor.toFormat(options.format, {
        quality: options.quality,
        compressionLevel: options.compressionLevel,
      });
    }
    
    return await processor.toBuffer();
  }

  async processFile(inputPath: string, outputPath: string, options: ImageProcessOptions = {}): Promise<void> {
    const buffer = await this.process(await fs.readFile(inputPath), options);
    await fs.writeFile(outputPath, buffer);
  }

  async getMetadata(buffer: Buffer): Promise<sharp.Metadata> {
    return await sharp(buffer).metadata();
  }

  async createThumbnail(buffer: Buffer, width: number, height?: number): Promise<Buffer> {
    return this.process(buffer, { width, height, fit: 'cover' });
  }

  async convertFormat(buffer: Buffer, format: string, quality?: number): Promise<Buffer> {
    return this.process(buffer, { format, quality });
  }

  async createCollage(images: Buffer[], layout: { cols: number; rows: number }, options?: { width?: number; height?: number; spacing?: number; background?: string }): Promise<Buffer> {
    const spacing = options?.spacing || 0;
    const background = options?.background || '#ffffff';
    
    // Calculate grid dimensions
    const cols = layout.cols;
    const rows = layout.rows;
    
    // Load all images and get dimensions
    const imageData = await Promise.all(images.map(async img => {
      const metadata = await sharp(img).metadata();
      return { buffer: img, width: metadata.width || 0, height: metadata.height || 0 };
    }));
    
    // Calculate cell dimensions
    let cellWidth = 0;
    let cellHeight = 0;
    
    if (options?.width && options?.height) {
      cellWidth = (options.width - spacing * (cols - 1)) / cols;
      cellHeight = (options.height - spacing * (rows - 1)) / rows;
    } else {
      // Use maximum image dimensions
      const maxWidth = Math.max(...imageData.map(img => img.width));
      const maxHeight = Math.max(...imageData.map(img => img.height));
      cellWidth = Math.max(maxWidth, 100);
      cellHeight = Math.max(maxHeight, 100);
    }
    
    const totalWidth = cellWidth * cols + spacing * (cols - 1);
    const totalHeight = cellHeight * rows + spacing * (rows - 1);
    
    // Create canvas with sharp
    const { data: bgData, info: bgInfo } = await sharp({
      create: {
        width: totalWidth,
        height: totalHeight,
        channels: 4,
        background,
      }
    }).raw().toBuffer({ resolveWithObject: true });
    
    const composite: sharp.OverlayOptions[] = [];
    
    for (let i = 0; i < Math.min(imageData.length, cols * rows); i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = col * (cellWidth + spacing);
      const y = row * (cellHeight + spacing);
      
      composite.push({
        input: imageData[i].buffer,
        top: y,
        left: x,
      });
    }
    
    const result = await sharp(bgData, {
      raw: bgInfo,
    })
      .composite(composite)
      .toBuffer();
    
    return result;
  }

  async addTextToImage(buffer: Buffer, text: string, options?: { fontSize?: number; fontColor?: string; position?: { x: number; y: number }; background?: string }): Promise<Buffer> {
    const fontSize = options?.fontSize || 24;
    const fontColor = options?.fontColor || '#ffffff';
    const position = options?.position || { x: 10, y: 30 };
    const background = options?.background || 'rgba(0,0,0,0.5)';
    
    // Get image metadata
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;
    
    // Create text overlay using canvas
    const { createCanvas } = await import('@napi-rs/canvas');
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Draw original image
    const image = await sharp(buffer).toBuffer();
    const img = await loadImage(image);
    ctx.drawImage(img, 0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = background;
    const textWidth = ctx.measureText(text).width;
    const padding = 10;
    ctx.fillRect(position.x - padding, position.y - fontSize - padding, textWidth + padding * 2, fontSize + padding * 2);
    
    // Draw text
    ctx.fillStyle = fontColor;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillText(text, position.x, position.y);
    
    return canvas.toBuffer('image/png');
  }
}
```

## WebSocket Streaming

```typescript
// src/services/canvas/streamer.ts
import { WebSocket } from 'ws';
import { CanvasRenderEngine, RenderOptions, RenderResult } from './engine';
import { A2UICanvasCommands } from './parser';

interface CanvasStreamOptions {
  chunkSize?: number;
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
}

export class CanvasStreamer {
  private engine: CanvasRenderEngine;
  private config: CanvasConfig;

  constructor(engine: CanvasRenderEngine, config: CanvasConfig) {
    this.engine = engine;
    this.config = config;
  }

  async streamToWebSocket(ws: WebSocket, commands: A2UICanvasCommands | any[], options: CanvasStreamOptions = {}): Promise<void> {
    const chunkSize = options.chunkSize || 16384; // 16KB default
    const format = options.format || 'png';
    const quality = options.quality || 80;

    try {
      // Render image
      const result = await this.engine.render(commands, { format, quality } as RenderOptions);
      
      // Send metadata
      ws.send(JSON.stringify({
        type: 'canvas_start',
        width: result.width,
        height: result.height,
        format,
        size: result.size,
      }));
      
      // Stream in chunks
      const chunkCount = Math.ceil(result.buffer.length / chunkSize);
      
      for (let i = 0; i < chunkCount; i++) {
        const start = i * chunkSize;
        const end = Math.min((i + 1) * chunkSize, result.buffer.length);
        const chunk = result.buffer.slice(start, end);
        
        ws.send(JSON.stringify({
          type: 'canvas_chunk',
          index: i,
          total: chunkCount,
          data: chunk.toString('base64'),
        }));
        
        // Flow control - wait for acknowledgment if needed
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      // Send completion
      ws.send(JSON.stringify({
        type: 'canvas_end',
        complete: true,
      }));
      
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'canvas_error',
        error: error.message,
      }));
    }
  }

  async *generateStream(commands: A2UICanvasCommands | any[], options: CanvasStreamOptions = {}): AsyncIterable<string> {
    const result = await this.engine.render(commands, { format: options.format, quality: options.quality } as RenderOptions);
    const chunkSize = options.chunkSize || 16384;
    const chunkCount = Math.ceil(result.buffer.length / chunkSize);
    
    // Send metadata
    yield JSON.stringify({
      type: 'canvas_start',
      width: result.width,
      height: result.height,
      format: options.format || 'png',
      size: result.size,
    });
    
    // Send chunks
    for (let i = 0; i < chunkCount; i++) {
      const start = i * chunkSize;
      const end = Math.min((i + 1) * chunkSize, result.buffer.length);
      const chunk = result.buffer.slice(start, end);
      
      yield JSON.stringify({
        type: 'canvas_chunk',
        index: i,
        total: chunkCount,
        data: chunk.toString('base64'),
      });
    }
    
    // Send completion
    yield JSON.stringify({
      type: 'canvas_end',
      complete: true,
    });
  }
}
```

## Integration with Gateway

```typescript
// src/services/canvas/service.ts
import { CanvasRenderEngine } from './engine';
import { CanvasStreamer } from './streamer';
import { CanvasManager } from './manager';
import { CanvasConfig, DefaultCanvasConfig } from './config';

export class CanvasService {
  private engine: CanvasRenderEngine;
  private streamer: CanvasStreamer;
  private config: CanvasConfig;

  constructor(config: Partial<CanvasConfig> = {}) {
    this.config = { ...DefaultCanvasConfig, ...config };
    this.engine = new CanvasRenderEngine(this.config);
    this.streamer = new CanvasStreamer(this.engine, this.config);
  }

  async renderImage(commands: any, options?: RenderOptions): Promise<RenderResult> {
    return this.engine.render(commands, options);
  }

  async renderToBase64(commands: any, options?: RenderOptions): Promise<string> {
    const result = await this.engine.render(commands, options);
    return result.buffer.toString('base64');
  }

  async streamToWebSocket(ws: WebSocket, commands: any, options?: CanvasStreamOptions): Promise<void> {
    await this.streamer.streamToWebSocket(ws, commands, options);
  }

  async *generateStream(commands: any, options?: CanvasStreamOptions): AsyncIterable<string> {
    yield* this.streamer.generateStream(commands, options);
  }

  getStats() {
    return this.engine.getStats();
  }

  async destroy() {
    await this.engine.destroy();
  }
}

// Integration with AgentGateway
// In src/core/gateway.ts
export class AgentGateway {
  private canvasService: CanvasService;

  constructor() {
    this.canvasService = new CanvasService();
  }

  async handleCanvasCommand(commands: any, options?: any) {
    try {
      const result = await this.canvasService.renderImage(commands, options);
      return {
        type: 'canvas_result',
        success: true,
        image: result.buffer.toString('base64'),
        mimeType: result.mimeType,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      return {
        type: 'canvas_error',
        success: false,
        error: error.message,
      };
    }
  }

  async streamCanvasToWebSocket(ws: WebSocket, commands: any, options?: any) {
    await this.canvasService.streamToWebSocket(ws, commands, options);
  }
}
```

## Performance Optimization

### Canvas Pooling

- **Reuse canvas instances** to avoid frequent allocation/deallocation
- **Limit pool size** based on available memory
- **Automatic cleanup** of stale canvases
- **Timeout-based eviction** for idle canvases

### Image Caching

- **In-memory cache** for frequently used images (Base64, URLs)
- **LRU eviction** when cache reaches maximum size
- **TTL-based expiration** for cached images
- **Memory-aware** cache limits

### Batch Processing

- **Queue rendering requests** to avoid overwhelming the system
- **Concurrency limits** based on configuration
- **Priority-based scheduling** for important requests
- **Timeout protection** for long-running renders

### Memory Management

- **Track memory usage** of canvas instances
- **Set maximum dimensions** to prevent OOM errors
- **Clean up resources** after rendering
- **Monitor system memory** and adjust accordingly

## Configuration Examples

### Production Configuration

```typescript
// High-performance production config
const productionConfig: CanvasConfig = {
  canvas: {
    maxWidth: 4096,
    maxHeight: 4096,
    defaultWidth: 1024,
    defaultHeight: 768,
    maxPoolSize: 20,
    poolTimeout: 60000, // 1 minute
  },
  formats: {
    png: { enabled: true, compressionLevel: 9 },
    jpeg: { enabled: true, quality: 75 },
    webp: { enabled: true, quality: 75, lossless: false },
    svg: { enabled: false }, // Disable SVG in production
  },
  performance: {
    maxMemory: 1024, // 1GB
    maxOperationsPerSecond: 50,
    timeout: 15000, // 15 seconds
    concurrentRenders: 8,
  },
  cache: {
    enabled: true,
    maxSize: 500,
    ttl: 600, // 10 minutes
    path: './data/canvas-cache',
  },
};
```

### Development Configuration

```typescript
// Development-friendly config
const devConfig: CanvasConfig = {
  canvas: {
    maxWidth: 2048,
    maxHeight: 2048,
    defaultWidth: 800,
    defaultHeight: 600,
    maxPoolSize: 5,
    poolTimeout: 30000,
  },
  formats: {
    png: { enabled: true, compressionLevel: 0 }, // Fast, no compression
    jpeg: { enabled: true, quality: 90 },
    webp: { enabled: true, quality: 90 },
    svg: { enabled: true, pretty: true },
  },
  performance: {
    maxMemory: 256,
    maxOperationsPerSecond: 10,
    timeout: 60000,
    concurrentRenders: 2,
  },
  cache: {
    enabled: false, // Disable cache in dev for easier debugging
    maxSize: 100,
    ttl: 300,
  },
};
```

## Error Handling

```typescript
// Custom error classes
class CanvasError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: any) {
    super(message);
    this.name = 'CanvasError';
  }
}

class CanvasRenderError extends CanvasError {
  constructor(message: string, details?: any) {
    super(message, 'RENDER_ERROR', details);
  }
}

class CanvasTimeoutError extends CanvasError {
  constructor(timeout: number) {
    super(`Render timeout after ${timeout}ms`, 'TIMEOUT_ERROR');
  }
}

class CanvasMemoryError extends CanvasError {
  constructor(required: number, available: number) {
    super(`Insufficient memory: need ${required}MB, have ${available}MB`, 'MEMORY_ERROR');
  }
}

class CanvasSizeError extends CanvasError {
  constructor(width: number, height: number, maxWidth: number, maxHeight: number) {
    super(`Canvas size ${width}x${height} exceeds maximum ${maxWidth}x${maxHeight}`, 'SIZE_ERROR');
  }
}

// Error middleware for Express
function canvasErrorHandler(err: Error, req: any, res: any, next: any) {
  if (err instanceof CanvasError) {
    return res.status(400).json({
      error: err.code,
      message: err.message,
      details: err.details,
    });
  }
  
  if (err.name === 'TimeoutError') {
    return res.status(408).json({
      error: 'TIMEOUT_ERROR',
      message: 'Canvas rendering timed out',
    });
  }
  
  next(err);
}
```

## Testing

```typescript
// src/services/canvas/engine.test.ts
import { CanvasRenderEngine } from './engine';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('CanvasRenderEngine', () => {
  let engine: CanvasRenderEngine;

  beforeAll(() => {
    engine = new CanvasRenderEngine({} as any);
  });

  afterAll(async () => {
    await engine.destroy();
  });

  it('should render simple commands', async () => {
    const commands = [
      { type: 'setSize', width: 200, height: 200 },
      { type: 'background', color: '#ffffff' },
      { type: 'rect', x: 50, y: 50, width: 100, height: 100, color: '#ff0000' },
    ];
    
    const result = await engine.render(commands as any);
    
    expect(result.width).toBe(200);
    expect(result.height).toBe(200);
    expect(result.mimeType).toBe('image/png');
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it('should render A2UI JSON', async () => {
    const a2uiCommands = {
      version: '1.0',
      width: 300,
      height: 200,
      background: '#f0f0f0',
      commands: [
        { type: 'rect', x: 10, y: 10, width: 100, height: 50, color: '#3b82f6' },
        { type: 'text', text: 'Hello', x: 150, y: 100, fontSize: 24, color: '#000000' },
      ],
    };
    
    const result = await engine.render(a2uiCommands);
    
    expect(result.width).toBe(300);
    expect(result.height).toBe(200);
  });

  it('should render different formats', async () => {
    const commands = [{ type: 'rect', x: 0, y: 0, width: 100, height: 100, color: '#ff0000' }];
    
    for (const format of ['png', 'jpeg', 'webp'] as const) {
      const result = await engine.render(commands as any, { format });
      expect(result.mimeType).toBe(`image/${format}`);
    }
  });

  it('should respect size limits', async () => {
    await expect(engine.render([
      { type: 'setSize', width: 10000, height: 10000 },
    ] as any)).rejects.toThrow();
  });
});

// src/services/canvas/processor.test.ts
describe('ImageProcessor', () => {
  const processor = new ImageProcessor();

  it('should resize images', async () => {
    const buffer = await processor.process(
      await fs.readFile('test/fixtures/test.png'),
      { width: 100, height: 100 }
    );
    const metadata = await processor.getMetadata(buffer);
    expect(metadata.width).toBe(100);
    expect(metadata.height).toBe(100);
  });

  it('should convert formats', async () => {
    const buffer = await fs.readFile('test/fixtures/test.png');
    const result = await processor.convertFormat(buffer, 'jpeg');
    const metadata = await processor.getMetadata(result);
    expect(metadata.format).toBe('jpeg');
  });
});
```

## Performance Metrics

```typescript
// src/services/canvas/metrics.ts
import { performance } from 'perf_hooks';

export interface RenderMetrics {
  renderCount: number;
  totalRenderTime: number;
  avgRenderTime: number;
  minRenderTime: number;
  maxRenderTime: number;
  lastRenderTime: number;
  memoryUsed: number;
  cacheHits: number;
  cacheMisses: number;
  errorCount: number;
  timeoutCount: number;
}

export class CanvasMetrics {
  private data: RenderMetrics = {
    renderCount: 0,
    totalRenderTime: 0,
    avgRenderTime: 0,
    minRenderTime: Infinity,
    maxRenderTime: 0,
    lastRenderTime: 0,
    memoryUsed: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errorCount: 0,
    timeoutCount: 0,
  };

  recordRender(time: number): void {
    this.data.renderCount++;
    this.data.totalRenderTime += time;
    this.data.avgRenderTime = this.data.totalRenderTime / this.data.renderCount;
    this.data.minRenderTime = Math.min(this.data.minRenderTime, time);
    this.data.maxRenderTime = Math.max(this.data.maxRenderTime, time);
    this.data.lastRenderTime = time;
  }

  recordCacheHit(): void {
    this.data.cacheHits++;
  }

  recordCacheMiss(): void {
    this.data.cacheMisses++;
  }

  recordError(): void {
    this.data.errorCount++;
  }

  recordTimeout(): void {
    this.data.timeoutCount++;
  }

  updateMemory(used: number): void {
    this.data.memoryUsed = used;
  }

  getMetrics(): RenderMetrics {
    return { ...this.data };
  }

  getSummary(): { rendersPerSecond: number; avgTime: number; cacheHitRate: number; errorRate: number } {
    const now = performance.now();
    const uptime = now / 1000; // seconds
    return {
      rendersPerSecond: this.data.renderCount / uptime,
      avgTime: this.data.avgRenderTime,
      cacheHitRate: this.data.cacheHits / (this.data.cacheHits + this.data.cacheMisses) || 0,
      errorRate: this.data.errorCount / this.data.renderCount || 0,
    };
  }

  reset(): void {
    this.data = {
      renderCount: 0,
      totalRenderTime: 0,
      avgRenderTime: 0,
      minRenderTime: Infinity,
      maxRenderTime: 0,
      lastRenderTime: 0,
      memoryUsed: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errorCount: 0,
      timeoutCount: 0,
    };
  }
}
```

## Security Considerations

1. **Input Validation**: Validate all command inputs to prevent malicious operations
2. **Size Limits**: Enforce maximum canvas dimensions to prevent memory exhaustion
3. **Timeout**: Set reasonable timeouts for rendering operations
4. **Resource Limits**: Limit concurrent renders based on available resources
5. **URL Restrictions**: Restrict image URL loading to trusted sources
6. **Memory Monitoring**: Monitor memory usage and terminate runaway renders
7. **Sandbox**: Consider running canvas rendering in a sandboxed environment

## Best Practices

1. **Reuse Canvases**: Use pooling to reuse canvas instances
2. **Async Operations**: Use async/await for non-blocking rendering
3. **Error Handling**: Provide meaningful error messages
4. **Memory Management**: Clean up resources after use
5. **Validation**: Validate all inputs before processing
6. **Caching**: Cache frequently used images
7. **Monitoring**: Track performance metrics
8. **Testing**: Test with various image formats and sizes

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Out of memory | Canvas too large | Reduce maxWidth/maxHeight |
| Slow rendering | Complex commands | Simplify commands, reduce resolution |
| Image not rendering | Invalid commands | Validate command format |
| Font not found | Missing font | Install required fonts |
| Native module error | Missing dependencies | Install @napi-rs/canvas dependencies |
| Format not supported | Invalid format | Use supported formats (png, jpeg, webp) |

### Debug Commands

```bash
# Check native module installation
node -e "const { createCanvas } = require('@napi-rs/canvas'); const canvas = createCanvas(200, 200); console.log('Canvas created:', canvas.width, canvas.height);"

# Test basic rendering
node -e "const { createCanvas } = require('@napi-rs/canvas'); const canvas = createCanvas(200, 200); const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ff0000'; ctx.fillRect(50, 50, 100, 100); console.log('Buffer length:', canvas.toBuffer().length);"

# Test with sharp
node -e "const sharp = require('sharp'); sharp({ create: { width: 100, height: 100, channels: 4, background: '#ff0000' } }).toBuffer().then(buf => console.log('Sharp buffer:', buf.length))"

# Check memory usage
node -e "console.log(process.memoryUsage())"

# Test image loading
node -e "const { loadImage } = require('@napi-rs/canvas'); const { createReadStream } = require('fs'); loadImage(createReadStream('test.png')).then(img => console.log('Image loaded:', img.width, img.height))"
```

## Resources

- [@napi-rs/canvas](https://github.com/napi-rs/canvas) - High-performance canvas library
- [Sharp](https://sharp.pixelplumber.com/) - Image processing library
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) - Browser Canvas API
- [Node Canvas](https://github.com/Automattic/node-canvas) - Original Node.js canvas library
- [Image Processing](https://en.wikipedia.org/wiki/Digital_image_processing) - Wikipedia

## Principles

1. **Performance**: Optimize rendering speed and memory usage
2. **Reliability**: Handle errors gracefully and provide fallback options
3. **Security**: Validate all inputs and limit resource usage
4. **Flexibility**: Support multiple input formats and output options
5. **Maintainability**: Write clean, well-documented code
6. **Scalability**: Design for horizontal scaling
7. **Compatibility**: Support various image formats and platforms
8. **Observability**: Provide metrics and monitoring for debugging
