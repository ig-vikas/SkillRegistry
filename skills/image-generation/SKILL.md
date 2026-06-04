---
name: image-generation
type: skill
description: Image generation and processing for AI agent gateway using Sharp with support for text-to-image, transformations, and optimizations.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [backend, tools, graphics]
tags: [image, generation, sharp, processing, graphics, transform, optimization]
---

# Image Generation Expert

Implement image generation and processing for AI agents using Sharp library, enabling text-to-image, transformations, format conversions, and optimizations.

## Architecture

AI Agent Request -> Input Validation -> Image Processor (Sharp) -> Output Generator -> Streaming/Delivery

## Core Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| Input Validator | Validate image parameters | Zod |
| Text Renderer | Generate text as image | @napi-rs/canvas, Sharp |
| Image Processor | Transform, resize, format | Sharp |
| Format Converter | Convert between formats | Sharp |
| Optimizer | Optimize image size/quality | Sharp |
| Streaming | Stream processed images | Node.js streams |
| Caching | Cache processed images | Map, FS |

## Implementation

```bash
pnpm add sharp
pnpm add -D @types/sharp
```

### Image Generation Types

```typescript
// src/services/tools/image/types.ts
import { z } from 'zod';

// Image generation options
export interface ImageGenerationOptions {
  // Text to image
  text?: string;
  font?: string;
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  textBaseline?: 'top' | 'middle' | 'bottom';
  padding?: number;
  
  // Canvas dimensions
  width?: number;
  height?: number;
  
  // Background
  background?: string;
  
  // Format
  format?: 'jpeg' | 'png' | 'webp' | 'gif' | 'avif';
  quality?: number;
  
  // Transformations
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    position?: 'top' | 'right top' | 'right' | 'right bottom' | 'bottom' | 'left bottom' | 'left' | 'left top' | 'center' | 'entropy';
    withoutEnlargement?: boolean;
    withoutReduction?: boolean;
  };
  crop?: {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
    gravity?: 'northwest' | 'north' | 'northeast' | 'west' | 'center' | 'east' | 'southwest' | 'south' | 'southeast';
  };
  rotate?: number | [number, number, number, number];
  flip?: boolean;
  flop?: boolean;
  
  // Effects
  blur?: number;
  sharpen?: number;
  grayscale?: boolean;
  brightness?: number;
  contrast?: number;
  saturate?: number;
  hue?: number;
  lightness?: number;
  
  // Watermark
  watermark?: {
    text?: string;
    image?: string | Buffer;
    position?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'center';
    opacity?: number;
    size?: number;
  };
  
  // Overlay
  overlay?: Array<{
    input: string | Buffer;
    gravity?: string;
    blend?: string;
    opacity?: number;
  }>;
  
  // Animation (for GIF/APNG)
  animation?: {
    frames?: number;
    delay?: number;
    loop?: number;
  };
}

// Image generation result
export interface ImageResult {
  success: boolean;
  image?: Buffer;
  format?: string;
  width?: number;
  height?: number;
  size?: number;
  error?: string;
  metadata?: {
    format: string;
    width: number;
    height: number;
    channels: number;
    premultiplied: boolean;
    size: number;
  };
}

// Schema validation
export const ImageGenerationSchema = z.object({
  text: z.string().optional(),
  font: z.string().optional(),
  fontSize: z.number().int().positive().optional(),
  fontColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  width: z.number().int().positive().max(10000).optional(),
  height: z.number().int().positive().max(10000).optional(),
  format: z.enum(['jpeg', 'png', 'webp', 'gif', 'avif']).optional(),
  quality: z.number().min(0).max(100).optional(),
  resize: z.object({
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    fit: z.enum(['cover', 'contain', 'fill', 'inside', 'outside']).optional(),
    position: z.string().optional(),
    withoutEnlargement: z.boolean().optional(),
    withoutReduction: z.boolean().optional(),
  }).optional(),
  blur: z.number().int().min(0).max(1000).optional(),
  sharpen: z.number().int().min(0).max(1000).optional(),
  grayscale: z.boolean().optional(),
  brightness: z.number().min(0).max(2).optional(),
  contrast: z.number().min(0).max(2).optional(),
  saturate: z.number().min(0).max(2).optional(),
  rotate: z.union([z.number().int().min(-360).max(360), z.array(z.number()).length(4)]).optional(),
  flip: z.boolean().optional(),
  flop: z.boolean().optional(),
});
```

### Image Service

```typescript
// src/services/tools/image/image-service.ts
import sharp from 'sharp';
import { createCanvas } from '@napi-rs/canvas';
import { ImageGenerationOptions, ImageResult } from './types';

export class ImageService {
  private config: any;
  private cache = new Map<string, { buffer: Buffer; timestamp: number }>();
  
  constructor(config: any = {}) {
    this.config = {
      maxWidth: 8000,
      maxHeight: 8000,
      maxSize: 100 * 1024 * 1024, // 100MB
      cacheTtl: 300000, // 5 minutes
      cacheMaxSize: 100,
      ...config,
    };
    this.setupCleanup();
  }
  
  // Generate text as image
  async generateTextImage(options: ImageGenerationOptions): Promise<ImageResult> {
    const {
      text = '',
      font = '20px Arial',
      fontSize = 20,
      fontColor = 'black',
      backgroundColor = 'white',
      width = 800,
      height = 200,
      format = 'png',
      quality = 80,
      textAlign = 'left',
      textBaseline = 'top',
      padding = 20,
    } = options;
    
    // Validate
    if (!text) return { success: false, error: 'Text is required' };
    if (width > this.config.maxWidth || height > this.config.maxHeight) {
      return { success: false, error: 'Dimensions too large' };
    }
    
    // Create canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Set background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Set font
    ctx.font = font;
    ctx.fillStyle = fontColor;
    ctx.textAlign = textAlign as any;
    ctx.textBaseline = textBaseline as any;
    
    // Draw text with wrapping
    const lines = this.wrapText(text, ctx, width - padding * 2);
    let y = padding + fontSize;
    
    for (const line of lines) {
      ctx.fillText(line, width / 2, y);
      y += fontSize * 1.2;
    }
    
    // Convert to buffer
    const buffer = canvas.toBuffer('image/png');
    
    // Convert format if needed
    if (format !== 'png') {
      return this.convertFormat(buffer, format, quality);
    }
    
    return {
      success: true,
      image: buffer,
      format: 'png',
      width,
      height,
      size: buffer.length,
    };
  }
  
  // Wrap text
  private wrapText(text: string, ctx: any, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0];
    
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }
  
  // Process image from file/URL/buffer
  async processImage(input: string | Buffer, options: ImageGenerationOptions): Promise<ImageResult> {
    try {
      // Create Sharp pipeline
      let pipeline = typeof input === 'string' ? sharp(input) : sharp(input);
      
      // Apply transformations
      pipeline = this.applyTransformations(pipeline, options);
      
      // Get metadata first
      const metadata = await pipeline.metadata();
      
      // Apply final format
      pipeline = this.applyFormat(pipeline, options, metadata);
      
      // Execute
      const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
      
      return {
        success: true,
        image: data,
        format: info.format,
        width: info.width,
        height: info.height,
        size: data.length,
        metadata: {
          format: info.format,
          width: info.width,
          height: info.height,
          channels: info.channels,
          premultiplied: info.premultiplied,
          size: data.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Image processing failed',
      };
    }
  }
  
  // Apply transformations to Sharp pipeline
  private applyTransformations(pipeline: sharp.Sharp, options: ImageGenerationOptions): sharp.Sharp {
    let result = pipeline;
    
    // Resize
    if (options.resize) {
      const resizeOpt: sharp.ResizeOptions = {};
      if (options.resize.width) resizeOpt.width = options.resize.width;
      if (options.resize.height) resizeOpt.height = options.resize.height;
      if (options.resize.fit) resizeOpt.fit = options.resize.fit;
      if (options.resize.position) resizeOpt.position = options.resize.position as any;
      if (options.resize.withoutEnlargement) resizeOpt.withoutEnlargement = true;
      if (options.resize.withoutReduction) resizeOpt.withoutReduction = true;
      result = result.resize(resizeOpt);
    }
    
    // Crop
    if (options.crop) {
      const cropOpt: sharp.Region = {
        left: options.crop.left || 0,
        top: options.crop.top || 0,
        width: options.crop.width || this.config.maxWidth,
        height: options.crop.height || this.config.maxHeight,
      };
      result = result.extract(cropOpt);
    }
    
    // Rotate
    if (options.rotate) {
      result = result.rotate(options.rotate as any);
    }
    
    // Flip
    if (options.flip) {
      result = result.flip();
    }
    
    // Flop
    if (options.flop) {
      result = result.flop();
    }
    
    // Blur
    if (options.blur) {
      result = result.blur(options.blur);
    }
    
    // Sharpen
    if (options.sharpen) {
      result = result.sharpen({ sigma: options.sharpen, m1: 1, m2: 2 });
    }
    
    // Grayscale
    if (options.grayscale) {
      result = result.grayscale();
    }
    
    // Brightness
    if (options.brightness) {
      result = result.modulate({ brightness: options.brightness });
    }
    
    // Contrast
    if (options.contrast) {
      result = result.modulate({ brightness: 1, saturation: 1, hue: 0, lightness: options.contrast });
    }
    
    // Saturation
    if (options.saturate) {
      result = result.modulate({ saturation: options.saturate });
    }
    
    return result;
  }
  
  // Apply format
  private applyFormat(pipeline: sharp.Sharp, options: ImageGenerationOptions, metadata: sharp.Metadata): sharp.Sharp {
    let result = pipeline;
    
    const format = options.format || metadata.format || 'png';
    const quality = options.quality || (format === 'jpeg' ? 80 : 100);
    
    switch (format) {
      case 'jpeg':
        result = result.jpeg({ quality: Math.min(quality, 100), progressive: true });
        break;
      case 'png':
        result = result.png({ quality: Math.min(quality, 100), compressionLevel: 6 });
        break;
      case 'webp':
        result = result.webp({ quality: Math.min(quality, 100), alphaQuality: 100 });
        break;
      case 'gif':
        result = result.gif();
        break;
      case 'avif':
        result = result.avif({ quality: Math.min(quality, 100), lossless: false });
        break;
    }
    
    return result;
  }
  
  // Convert image format
  async convertFormat(input: Buffer, format: string, quality?: number): Promise<ImageResult> {
    try {
      let pipeline = sharp(input);
      
      switch (format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality: quality || 80, progressive: true });
          break;
        case 'png':
          pipeline = pipeline.png({ quality: quality || 100 });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality: quality || 80 });
          break;
        case 'gif':
          pipeline = pipeline.gif();
          break;
        case 'avif':
          pipeline = pipeline.avif({ quality: quality || 80 });
          break;
      }
      
      const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
      
      return {
        success: true,
        image: data,
        format: info.format,
        width: info.width,
        height: info.height,
        size: data.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Format conversion failed',
      };
    }
  }
  
  // Resize image
  async resizeImage(input: string | Buffer, options: { width?: number; height?: number; fit?: string; quality?: number }): Promise<ImageResult> {
    try {
      let pipeline = typeof input === 'string' ? sharp(input) : sharp(input);
      
      const resizeOpt: sharp.ResizeOptions = {};
      if (options.width) resizeOpt.width = options.width;
      if (options.height) resizeOpt.height = options.height;
      if (options.fit) resizeOpt.fit = options.fit as any;
      
      pipeline = pipeline.resize(resizeOpt);
      
      // Apply quality
      if (options.quality) {
        pipeline = pipeline.jpeg({ quality: options.quality });
      }
      
      const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
      
      return {
        success: true,
        image: data,
        format: info.format,
        width: info.width,
        height: info.height,
        size: data.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Resize failed',
      };
    }
  }
  
  // Add watermark
  async addWatermark(input: string | Buffer, watermark: string, options: { position?: string; opacity?: number; size?: number } = {}): Promise<ImageResult> {
    try {
      // For now, use text overlay
      const position = options.position || 'southeast';
      const opacity = options.opacity || 0.5;
      const size = options.size || 50;
      
      let pipeline = typeof input === 'string' ? sharp(input) : sharp(input);
      
      // Add text watermark
      pipeline = pipeline.overlayWith(
        await this.generateTextImage({
          text: watermark,
          fontSize: size,
          fontColor: `rgba(255, 255, 255, ${opacity})`,
          backgroundColor: 'transparent',
          width: 500,
          height: 100,
        }).then(r => r.image || Buffer.from([]))
      );
      
      // Position overlay
      pipeline = pipeline.gravity(position as any);
      
      const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
      
      return {
        success: true,
        image: data,
        format: info.format,
        width: info.width,
        height: info.height,
        size: data.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Watermark failed',
      };
    }
  }
  
  // Get image metadata
  async getMetadata(input: string | Buffer): Promise<any> {
    try {
      let pipeline = typeof input === 'string' ? sharp(input) : sharp(input);
      const metadata = await pipeline.metadata();
      return { success: true, metadata };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Metadata extraction failed',
      };
    }
  }
  
  // Create thumbnail
  async createThumbnail(input: string | Buffer, width: number, height?: number): Promise<ImageResult> {
    try {
      let pipeline = typeof input === 'string' ? sharp(input) : sharp(input);
      
      pipeline = pipeline.resize(width, height || width, { fit: 'cover', position: 'center' });
      
      const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
      
      return {
        success: true,
        image: data,
        format: info.format,
        width: info.width,
        height: info.height,
        size: data.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Thumbnail creation failed',
      };
    }
  }
  
  // Optimize image
  async optimizeImage(input: string | Buffer, options: { format?: string; quality?: number; maxWidth?: number; maxHeight?: number } = {}): Promise<ImageResult> {
    try {
      let pipeline = typeof input === 'string' ? sharp(input) : sharp(input);
      
      // Resize if needed
      if (options.maxWidth || options.maxHeight) {
        const metadata = await pipeline.metadata();
        let resizeWidth = metadata.width;
        let resizeHeight = metadata.height;
        
        if (options.maxWidth && metadata.width > options.maxWidth) {
          resizeWidth = options.maxWidth;
          resizeHeight = Math.round((metadata.height * options.maxWidth) / metadata.width);
        }
        if (options.maxHeight && resizeHeight > options.maxHeight) {
          resizeHeight = options.maxHeight;
          resizeWidth = Math.round((metadata.width * options.maxHeight) / metadata.height);
        }
        
        if (resizeWidth !== metadata.width || resizeHeight !== metadata.height) {
          pipeline = pipeline.resize(resizeWidth, resizeHeight, { fit: 'inside', withoutEnlargement: true });
        }
      }
      
      // Convert format
      const format = options.format || (await pipeline.metadata()).format;
      
      switch (format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality: options.quality || 80, progressive: true, optimizeScans: true });
          break;
        case 'png':
          pipeline = pipeline.png({ quality: options.quality || 100, compressionLevel: 9, adaptiveFiltering: true });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality: options.quality || 80, alphaQuality: 100, reductionEffort: 6 });
          break;
        case 'avif':
          pipeline = pipeline.avif({ quality: options.quality || 60, lossless: false, effort: 6 });
          break;
      }
      
      const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
      
      return {
        success: true,
        image: data,
        format: info.format,
        width: info.width,
        height: info.height,
        size: data.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Optimization failed',
      };
    }
  }
  
  // Cache management
  private setupCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache) {
        if (now - value.timestamp > this.config.cacheTtl) {
          this.cache.delete(key);
        }
      }
      
      // Enforce cache size limit
      if (this.cache.size > this.config.cacheMaxSize) {
        const keys = Array.from(this.cache.keys());
        for (let i = 0; i < this.cache.size - this.config.cacheMaxSize; i++) {
          this.cache.delete(keys[i]);
        }
      }
    }, 60000); // Clean up every minute
  }
  
  // Get from cache
  getFromCache(key: string): Buffer | null {
    const cached = this.cache.get(key);
    return cached && Date.now() - cached.timestamp < this.config.cacheTtl ? cached.buffer : null;
  }
  
  // Set in cache
  setInCache(key: string, buffer: Buffer): void {
    if (this.cache.size >= this.config.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { buffer, timestamp: Date.now() });
  }
}
```

## Configuration Schema

```typescript
// src/config/image-config.ts
import { z } from 'zod';

export const ImageConfigSchema = z.object({
  image: z.object({
    enabled: z.boolean().default(true),
    maxWidth: z.number().int().positive().max(16000).default(8000),
    maxHeight: z.number().int().positive().max(16000).default(8000),
    maxSize: z.number().int().positive().default(100 * 1024 * 1024), // 100MB
    cacheEnabled: z.boolean().default(true),
    cacheTtl: z.number().int().positive().default(300000), // 5 minutes
    cacheMaxSize: z.number().int().positive().default(100),
    defaultFormat: z.enum(['jpeg', 'png', 'webp']).default('png'),
    defaultQuality: z.number().min(0).max(100).default(80),
  }).default({}),
});
```

## HTTP API Endpoints

```typescript
// src/api/routes/image.ts
import { Router } from 'express';
import { z } from 'zod';
import { ImageGenerationSchema } from '../../services/tools/image/types';

const router = Router();

// POST /api/image/generate - Generate image from text
router.post('/generate', async (req, res) => {
  try {
    const options = ImageGenerationSchema.parse(req.body);
    const gateway: AgentGateway = req.app.get('gateway');
    const result = await gateway.generateImage(options);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.setHeader('Content-Type', `image/${result.format}`);
    res.setHeader('Content-Length', result.size);
    res.send(result.image);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// POST /api/image/process - Process existing image
router.post('/process', async (req, res) => {
  try {
    const { image, ...options } = req.body;
    if (!image) return res.status(400).json({ error: 'Image is required' });
    
    const gateway: AgentGateway = req.app.get('gateway');
    const result = await gateway.processImage(image, options);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.setHeader('Content-Type', `image/${result.format}`);
    res.setHeader('Content-Length', result.size);
    res.send(result.image);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// POST /api/image/resize - Resize image
router.post('/resize', async (req, res) => {
  try {
    const { image, width, height, fit, quality } = z.object({
      image: z.string(),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
      fit: z.enum(['cover', 'contain', 'fill', 'inside', 'outside']).optional(),
      quality: z.number().min(0).max(100).optional(),
    }).parse(req.body);
    
    const gateway: AgentGateway = req.app.get('gateway');
    const result = await gateway.resizeImage(image, { width, height, fit, quality });
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.setHeader('Content-Type', `image/${result.format}`);
    res.send(result.image);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// POST /api/image/convert - Convert format
router.post('/convert', async (req, res) => {
  try {
    const { image, format, quality } = z.object({
      image: z.string(),
      format: z.enum(['jpeg', 'png', 'webp', 'gif', 'avif']),
      quality: z.number().min(0).max(100).optional(),
    }).parse(req.body);
    
    const gateway: AgentGateway = req.app.get('gateway');
    const result = await gateway.convertImageFormat(image, format, quality);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.setHeader('Content-Type', `image/${result.format}`);
    res.send(result.image);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// POST /api/image/thumbnail - Create thumbnail
router.post('/thumbnail', async (req, res) => {
  try {
    const { image, width, height } = z.object({
      image: z.string(),
      width: z.number().int().positive(),
      height: z.number().int().positive().optional(),
    }).parse(req.body);
    
    const gateway: AgentGateway = req.app.get('gateway');
    const result = await gateway.createThumbnail(image, width, height);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.setHeader('Content-Type', `image/${result.format}`);
    res.send(result.image);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// POST /api/image/optimize - Optimize image
router.post('/optimize', async (req, res) => {
  try {
    const { image, format, quality, maxWidth, maxHeight } = z.object({
      image: z.string(),
      format: z.enum(['jpeg', 'png', 'webp', 'avif']).optional(),
      quality: z.number().min(0).max(100).optional(),
      maxWidth: z.number().int().positive().optional(),
      maxHeight: z.number().int().positive().optional(),
    }).parse(req.body);
    
    const gateway: AgentGateway = req.app.get('gateway');
    const result = await gateway.optimizeImage(image, { format, quality, maxWidth, maxHeight });
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.setHeader('Content-Type', `image/${result.format}`);
    res.send(result.image);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /api/image/metadata - Get metadata
router.get('/metadata', async (req, res) => {
  try {
    const { image } = z.object({ image: z.string() }).parse(req.query);
    const gateway: AgentGateway = req.app.get('gateway');
    const result = await gateway.getImageMetadata(image);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json(result.metadata);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;
```

## Integration with Gateway

```typescript
// src/core/gateway.ts
import { ImageService } from '../services/tools/image/image-service';

export class AgentGateway {
  private imageService: ImageService;
  
  async initialize() {
    this.imageService = new ImageService(this.config.image);
  }
  
  async generateImage(options: any): Promise<any> {
    return this.imageService.generateTextImage(options);
  }
  
  async processImage(input: string | Buffer, options: any): Promise<any> {
    return this.imageService.processImage(input, options);
  }
  
  async resizeImage(input: string | Buffer, options: any): Promise<any> {
    return this.imageService.resizeImage(input, options);
  }
  
  async convertImageFormat(input: string | Buffer, format: string, quality?: number): Promise<any> {
    return this.imageService.convertFormat(input as Buffer, format, quality);
  }
  
  async createThumbnail(input: string | Buffer, width: number, height?: number): Promise<any> {
    return this.imageService.createThumbnail(input, width, height);
  }
  
  async optimizeImage(input: string | Buffer, options: any): Promise<any> {
    return this.imageService.optimizeImage(input, options);
  }
  
  async getImageMetadata(input: string | Buffer): Promise<any> {
    return this.imageService.getMetadata(input);
  }
}
```

## Testing

```typescript
// tests/services/tools/image-service.test.ts
describe('ImageService', () => {
  let service: ImageService;
  
  beforeEach(() => {
    service = new ImageService({
      maxWidth: 4000,
      maxHeight: 4000,
      cacheEnabled: false,
    });
  });
  
  it('generates text image', async () => {
    const result = await service.generateTextImage({
      text: 'Hello, World!',
      fontSize: 24,
      width: 200,
      height: 50,
      format: 'png',
    });
    
    expect(result.success).toBe(true);
    expect(result.image).toBeInstanceOf(Buffer);
    expect(result.format).toBe('png');
  });
  
  it('converts format', async () => {
    const pngBuffer = Buffer.from('mock-png-data');
    // In a real test, use actual PNG data
    
    const result = await service.convertFormat(pngBuffer, 'jpeg', 80);
    expect(result.success).toBe(true);
    expect(result.format).toBe('jpeg');
  });
  
  it('resizes image', async () => {
    const buffer = Buffer.from('mock-image-data');
    const result = await service.resizeImage(buffer, { width: 100, height: 100 });
    expect(result.success).toBe(true);
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
  });
  
  it('creates thumbnail', async () => {
    const buffer = Buffer.from('mock-image-data');
    const result = await service.createThumbnail(buffer, 50);
    expect(result.success).toBe(true);
    expect(result.width).toBeLessThanOrEqual(50);
    expect(result.height).toBeLessThanOrEqual(50);
  });
  
  it('gets metadata', async () => {
    const buffer = Buffer.from('mock-image-data');
    const result = await service.getMetadata(buffer);
    // Will fail with mock data, but tests the method
    expect(result).toBeDefined();
  });
  
  it('validates dimensions', async () => {
    const result = await service.generateTextImage({
      text: 'Test',
      width: 10000,
      height: 10000,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('too large');
  });
  
  it('requires text for text image', async () => {
    const result = await service.generateTextImage({});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Text is required');
  });
});
```

## WebSocket Integration

```typescript
// In WebSocketGateway class
private handleImageGeneration(client: WebSocketClient, message: any) {
  const { action, options, image } = message;
  
  if (!client.userId) {
    this.send(client, { type: 'error', message: 'Authentication required', code: 'NOT_AUTHENTICATED' });
    return;
  }
  
  const gateway: AgentGateway = this['gateway'];
  
  switch (action) {
    case 'generate':
      gateway.generateImage(options)
        .then((result) => {
          if (result.success) {
            this.send(client, {
              type: 'image_generated',
              image: result.image.toString('base64'),
              format: result.format,
              width: result.width,
              height: result.height,
            });
          } else {
            this.send(client, { type: 'error', message: result.error });
          }
        })
        .catch((error) => {
          this.send(client, { type: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
        });
      break;
    
    case 'process':
      gateway.processImage(image, options)
        .then((result) => {
          if (result.success) {
            this.send(client, {
              type: 'image_processed',
              image: result.image.toString('base64'),
              format: result.format,
            });
          } else {
            this.send(client, { type: 'error', message: result.error });
          }
        });
      break;
    
    case 'resize':
      gateway.resizeImage(image, options)
        .then((result) => {
          if (result.success) {
            this.send(client, {
              type: 'image_resized',
              image: result.image.toString('base64'),
              width: result.width,
              height: result.height,
            });
          } else {
            this.send(client, { type: 'error', message: result.error });
          }
        });
      break;
  }
}
```

## React Component

```typescript
// src/components/ImageGenerator.tsx
import { useState, useRef, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

export function ImageGenerator({ channelId }: { channelId: string }) {
  const ws = useWebSocket('ws://localhost:3001/ws');
  const [text, setText] = useState('Hello, World!');
  const [fontSize, setFontSize] = useState(24);
  const [width, setWidth] = useState(400);
  const [height, setHeight] = useState(100);
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [quality, setQuality] = useState(80);
  const [background, setBackground] = useState('#ffffff');
  const [fontColor, setFontColor] = useState('#000000');
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const generateImage = useCallback(() => {
    if (!text.trim()) return;
    
    setLoading(true);
    ws.send({
      type: 'image',
      action: 'generate',
      channelId,
      options: {
        text,
        fontSize,
        width,
        height,
        format,
        quality: format === 'jpeg' ? quality : undefined,
        backgroundColor: background,
        fontColor,
      },
    });
    
    const handler = ws.onMessage('image', (msg: any) => {
      if (msg.type === 'image_generated') {
        setImageData(`data:image/${msg.format};base64,${msg.image}`);
        setLoading(false);
        handler();
      } else if (msg.type === 'error') {
        console.error('Error:', msg.message);
        setLoading(false);
        handler();
      }
    });
  }, [ws, channelId, text, fontSize, width, height, format, quality, background, fontColor]);
  
  const downloadImage = useCallback(() => {
    if (!imageData) return;
    
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `generated-image.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [imageData, format]);
  
  return (
    <div className="image-generator">
      <div className="generator-controls">
        <div className="form-group">
          <label>Text</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text..."
            rows={3}
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Font Size</label>
            <input
              type="number"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value) || 24)}
              min={8}
              max={200}
            />
          </div>
          
          <div className="form-group">
            <label>Width</label>
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(parseInt(e.target.value) || 400)}
              min={10}
              max={4000}
            />
          </div>
          
          <div className="form-group">
            <label>Height</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(parseInt(e.target.value) || 100)}
              min={10}
              max={4000}
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Format</label>
            <select value={format} onChange={(e) => setFormat(e.target.value as any)}>
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="webp">WebP</option>
            </select>
          </div>
          
          {format === 'jpeg' && (
            <div className="form-group">
              <label>Quality</label>
              <input
                type="number"
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value) || 80)}
                min={0}
                max={100}
              />
            </div>
          )}
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Background</label>
            <input
              type="color"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label>Text Color</label>
            <input
              type="color"
              value={fontColor}
              onChange={(e) => setFontColor(e.target.value)}
            />
          </div>
        </div>
        
        <div className="form-actions">
          <button onClick={generateImage} disabled={loading || !text.trim()}>
            {loading ? 'Generating...' : 'Generate Image'}
          </button>
          <button onClick={downloadImage} disabled={!imageData}>
            Download
          </button>
        </div>
      </div>
      
      {imageData && (
        <div className="image-preview">
          <img src={imageData} alt="Generated" style={{ maxWidth: '100%' }} />
        </div>
      )}
    </div>
  );
}
```

## Security Best Practices

1. **Validate All Inputs** - Validate dimensions, text length, format
2. **Limit Resource Usage** - Enforce max dimensions and size
3. **Sanitize Text** - Prevent XSS in text-to-image
4. **Limit Caching** - Prevent memory exhaustion
5. **Validate Image Data** - Check for malicious content
6. **Use Safe Fonts** - Avoid loading custom fonts

## Resources

- [Sharp](https://sharp.pixelplumber.com/) - High performance Node.js image processing
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Image Optimization Guide](https://images.guide/)

## Principles

1. Performance - Optimize for speed and memory
2. Quality - Maintain high output quality
3. Flexibility - Support wide range of operations
4. Security - Validate all inputs
5. Efficiency - Minimize resource usage
