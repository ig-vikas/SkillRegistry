---
name: file-system
type: skill
description: File read/write operations for AI agent gateway with security controls, path validation, and resource limits.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [backend, tools, storage]
tags: [file, filesystem, read, write, security, storage, io]
---

# File System Expert

Implement secure file system operations for AI agents with comprehensive path validation, access controls, and resource limits.

## Architecture

AI Agent Request -> Path Validation -> Access Control -> File Operation -> Result Return

## Core Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| Path Validator | Validate file paths | Custom, regex |
| Access Control | Check read/write permissions | Custom |
| File Reader | Read files with limits | Node.js FS |
| File Writer | Write files with limits | Node.js FS |
| Directory Manager | Create/list/delete directories | Node.js FS |
| File Metadata | Get file stats | Node.js FS |
| Sandbox | Isolated file operations | Custom |

## Implementation

```bash
# Node.js FS is built-in
# pnpm add -D @types/node
```

### File Service

```typescript
// src/services/tools/file/file-service.ts
import { promises as fs, stats, Stats } from 'fs';
import { join, resolve, normalize, isAbsolute } from 'path';
import { tmpdir, homedir } from 'os';
import { z } from 'zod';
import { createHash } from 'crypto';

interface FileConfig {
  // Root directory (default: tmpdir)
  rootDir: string;
  // Allowed base directories
  allowedPaths: string[];
  // Blocked paths
  blockedPaths: string[];
  // Max file size for reads
  maxReadSize: number;
  // Max file size for writes
  maxWriteSize: number;
  // Max directory depth
  maxDepth: number;
  // Allowed file extensions
  allowedExtensions: string[];
  // Blocked file extensions
  blockedExtensions: string[];
  // Sandbox mode
  sandbox: boolean;
  // Sandbox directory
  sandboxDir: string;
  // File operation timeout
  timeout: number;
}

interface FileStats {
  name: string;
  path: string;
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  isSymlink: boolean;
  createdAt: number;
  modifiedAt: number;
  accessedAt: number;
  permissions: number;
  owner?: number;
  group?: number;
  mimeType?: string;
}

interface FileListResult {
  path: string;
  files: FileStats[];
  directories: FileStats[];
}

interface FileReadResult {
  success: boolean;
  path: string;
  content?: string | Buffer;
  stats?: FileStats;
  error?: string;
  truncated?: boolean;
  mimeType?: string;
}

interface FileWriteResult {
  success: boolean;
  path: string;
  stats?: FileStats;
  error?: string;
  writtenBytes?: number;
}

export class FileService {
  private config: FileConfig;
  private allowedExtensionsSet: Set<string>;
  private blockedExtensionsSet: Set<string>;
  private allowedPathsSet: Set<string>;
  private blockedPathsSet: Set<string>;
  
  constructor(config: Partial<FileConfig> = {}) {
    this.config = {
      rootDir: tmpdir(),
      allowedPaths: [tmpdir(), homedir()],
      blockedPaths: ['/etc', '/usr', '/var', '/root', '/bin', '/sbin', '/dev', '/proc', '/sys'],
      maxReadSize: 100 * 1024 * 1024, // 100MB
      maxWriteSize: 50 * 1024 * 1024, // 50MB
      maxDepth: 20,
      allowedExtensions: ['.txt', '.json', '.md', '.csv', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.pdf'],
      blockedExtensions: ['.js', '.ts', '.mjs', '.cjs', '.node', '.exe', '.dll', '.so', '.bat', '.cmd', '.sh', '.ps1', '.com', '.msi'],
      sandbox: true,
      sandboxDir: join(tmpdir(), 'agent-sandbox'),
      timeout: 30000,
      ...config,
    };
    
    this.allowedExtensionsSet = new Set(this.config.allowedExtensions.map(e => e.toLowerCase()));
    this.blockedExtensionsSet = new Set(this.config.blockedExtensions.map(e => e.toLowerCase()));
    this.allowedPathsSet = new Set(this.config.allowedPaths.map(p => resolve(p)));
    this.blockedPathsSet = new Set(this.config.blockedPaths.map(p => resolve(p)));
    
    // Ensure sandbox directory exists
    this.ensureSandboxDir().catch(() => {});
  }
  
  // Ensure sandbox directory exists
  private async ensureSandboxDir(): Promise<void> {
    try {
      await fs.mkdir(this.config.sandboxDir, { recursive: true });
    } catch (error) {
      console.error('Error creating sandbox directory:', error);
    }
  }
  
  // Validate path
  validatePath(path: string, operation: 'read' | 'write' | 'list' | 'delete'): { valid: boolean; error?: string; resolvedPath?: string } {
    // Normalize path
    let resolvedPath: string;
    
    try {
      // Resolve relative to root or sandbox
      if (isAbsolute(path)) {
        resolvedPath = resolve(path);
      } else {
        resolvedPath = this.config.sandbox && operation === 'write' 
          ? resolve(this.config.sandboxDir, path)
          : resolve(this.config.rootDir, path);
      }
      
      // Normalize to remove .. and .
      resolvedPath = normalize(resolvedPath);
    } catch (error) {
      return { valid: false, error: 'Invalid path' };
    }
    
    // Check for null bytes (path traversal attack)
    if (path.includes('\0') || resolvedPath.includes('\0')) {
      return { valid: false, error: 'Path contains null bytes' };
    }
    
    // Check for path traversal (..)
    if (path.includes('..') || resolvedPath.includes('..')) {
      return { valid: false, error: 'Path traversal not allowed' };
    }
    
    // Check if path is absolute (for writes in sandbox mode)
    if (this.config.sandbox && operation === 'write' && isAbsolute(path)) {
      return { valid: false, error: 'Absolute paths not allowed in sandbox mode' };
    }
    
    // Check against blocked paths
    for (const blockedPath of this.blockedPathsSet) {
      if (resolvedPath.startsWith(blockedPath + '/') || resolvedPath === blockedPath) {
        return { valid: false, error: `Path not allowed: ${blockedPath}` };
      }
    }
    
    // Check if path is in allowed paths (for reads)
    if (operation === 'read' || operation === 'list' || operation === 'delete') {
      let isAllowed = false;
      for (const allowedPath of this.allowedPathsSet) {
        if (resolvedPath.startsWith(allowedPath + '/') || resolvedPath === allowedPath) {
          isAllowed = true;
          break;
        }
      }
      
      if (!isAllowed) {
        return { valid: false, error: `Path not in allowed directories` };
      }
    }
    
    // Check directory depth
    const relativePath = resolvedPath.replace(this.config.rootDir, '');
    const depth = relativePath.split(join.sep).filter(Boolean).length;
    if (depth > this.config.maxDepth) {
      return { valid: false, error: `Path depth exceeds maximum of ${this.config.maxDepth}` };
    }
    
    // Check extension
    const ext = this.getExtension(resolvedPath);
    if (ext && this.blockedExtensionsSet.has(ext)) {
      return { valid: false, error: `File extension not allowed: ${ext}` };
    }
    
    // For writes, check allowed extensions (if configured)
    if (operation === 'write' && this.allowedExtensionsSet.size > 0) {
      if (ext && !this.allowedExtensionsSet.has(ext)) {
        return { valid: false, error: `File extension not in allowed list: ${ext}` };
      }
    }
    
    // Check if path exists (for reads)
    if (operation === 'read' || operation === 'list' || operation === 'delete') {
      try {
        // Check if we can access the path
        if (operation !== 'write') {
          await fs.access(resolvedPath);
        }
      } catch (error) {
        // Path doesn't exist or not accessible
        if (operation === 'read' || operation === 'list' || operation === 'delete') {
          return { valid: false, error: 'Path does not exist or not accessible' };
        }
      }
    }
    
    return { valid: true, resolvedPath };
  }
  
  // Get file extension
  private getExtension(path: string): string {
    const parts = path.split('/');
    const filename = parts[parts.length - 1];
    const dotIndex = filename.lastIndexOf('.');
    return dotIndex >= 0 ? filename.substring(dotIndex) : '';
  }
  
  // Read file
  async readFile(path: string, options?: { encoding?: 'utf8' | 'base64' | null; offset?: number; length?: number }): Promise<FileReadResult> {
    const validation = this.validatePath(path, 'read');
    if (!validation.valid) {
      return { success: false, path, error: validation.error };
    }
    
    const resolvedPath = validation.resolvedPath!;
    const encoding = options?.encoding || 'utf8';
    const offset = options?.offset || 0;
    const length = options?.length || this.config.maxReadSize;
    
    try {
      // Get file stats first
      const stat = await fs.stat(resolvedPath);
      
      if (!stat.isFile()) {
        return { success: false, path: resolvedPath, error: 'Path is not a file' };
      }
      
      // Check file size
      if (stat.size > this.config.maxReadSize) {
        return { success: false, path: resolvedPath, error: `File too large (max ${this.config.maxReadSize} bytes)` };
      }
      
      // Read file
      const buffer = Buffer.alloc(Math.min(length, stat.size - offset));
      const { bytesRead } = await fs.read(
        await fs.open(resolvedPath, 'r'),
        buffer,
        0,
        buffer.length,
        offset
      );
      
      let content: string | Buffer = encoding ? buffer.toString(encoding) : buffer;
      
      // Check if truncated
      const truncated = offset + bytesRead < stat.size;
      
      // Get MIME type
      const mimeType = this.getMimeType(resolvedPath);
      
      // Get file stats
      const fileStats: FileStats = this.createFileStats(stat, resolvedPath, mimeType);
      
      return {
        success: true,
        path: resolvedPath,
        content,
        stats: fileStats,
        truncated,
        mimeType,
      };
    } catch (error) {
      return {
        success: false,
        path: resolvedPath,
        error: error instanceof Error ? error.message : 'Read failed',
      };
    }
  }
  
  // Read file as stream
  async readFileStream(path: string): Promise<{ success: boolean; stream?: NodeJS.ReadableStream; error?: string; stats?: FileStats }> {
    const validation = this.validatePath(path, 'read');
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    const resolvedPath = validation.resolvedPath!;
    
    try {
      const stat = await fs.stat(resolvedPath);
      
      if (!stat.isFile()) {
        return { success: false, error: 'Path is not a file' };
      }
      
      if (stat.size > this.config.maxReadSize) {
        return { success: false, error: `File too large (max ${this.config.maxReadSize} bytes)` };
      }
      
      const stream = fs.createReadStream(resolvedPath, { highWaterMark: 16 * 1024 });
      const mimeType = this.getMimeType(resolvedPath);
      const fileStats = this.createFileStats(stat, resolvedPath, mimeType);
      
      return {
        success: true,
        stream,
        stats: fileStats,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Stream creation failed',
      };
    }
  }
  
  // Write file
  async writeFile(path: string, content: string | Buffer, options?: { encoding?: string; append?: boolean; mode?: number }): Promise<FileWriteResult> {
    const validation = this.validatePath(path, 'write');
    if (!validation.valid) {
      return { success: false, path, error: validation.error };
    }
    
    const resolvedPath = validation.resolvedPath!;
    const append = options?.append || false;
    const encoding = options?.encoding || 'utf8';
    const mode = options?.mode || 0o644;
    
    // Check content size
    const contentSize = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content, encoding);
    if (contentSize > this.config.maxWriteSize) {
      return { success: false, path: resolvedPath, error: `Content too large (max ${this.config.maxWriteSize} bytes)` };
    }
    
    try {
      // Ensure parent directory exists
      const dir = resolvedPath.substring(0, resolvedPath.lastIndexOf('/'));
      if (dir && dir !== this.config.sandboxDir) {
        await fs.mkdir(dir, { recursive: true });
      }
      
      // Write file
      const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, encoding);
      const flag = append ? 'a' : 'w';
      
      await fs.writeFile(resolvedPath, buffer, { flag, mode });
      
      // Get file stats
      const stat = await fs.stat(resolvedPath);
      const mimeType = this.getMimeType(resolvedPath);
      const fileStats = this.createFileStats(stat, resolvedPath, mimeType);
      
      return {
        success: true,
        path: resolvedPath,
        stats: fileStats,
        writtenBytes: contentSize,
      };
    } catch (error) {
      return {
        success: false,
        path: resolvedPath,
        error: error instanceof Error ? error.message : 'Write failed',
      };
    }
  }
  
  // Delete file
  async deleteFile(path: string): Promise<FileWriteResult> {
    const validation = this.validatePath(path, 'delete');
    if (!validation.valid) {
      return { success: false, path, error: validation.error };
    }
    
    const resolvedPath = validation.resolvedPath!;
    
    try {
      const stat = await fs.stat(resolvedPath);
      
      if (!stat.isFile()) {
        return { success: false, path: resolvedPath, error: 'Path is not a file' };
      }
      
      await fs.unlink(resolvedPath);
      
      const mimeType = this.getMimeType(resolvedPath);
      const fileStats = this.createFileStats(stat, resolvedPath, mimeType);
      
      return {
        success: true,
        path: resolvedPath,
        stats: fileStats,
      };
    } catch (error) {
      return {
        success: false,
        path: resolvedPath,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }
  
  // List directory
  async listDirectory(path: string, options?: { recursive?: boolean; includeFiles?: boolean; includeDirectories?: boolean }): Promise<FileListResult | { success: boolean; error?: string }> {
    const validation = this.validatePath(path, 'list');
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    const resolvedPath = validation.resolvedPath!;
    const recursive = options?.recursive || false;
    const includeFiles = options?.includeFiles !== false;
    const includeDirectories = options?.includeDirectories !== false;
    
    try {
      const stat = await fs.stat(resolvedPath);
      
      if (!stat.isDirectory()) {
        return { success: false, error: 'Path is not a directory' };
      }
      
      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      const files: FileStats[] = [];
      const directories: FileStats[] = [];
      
      for (const entry of entries) {
        if (entry.isFile() && includeFiles) {
          const fullPath = join(resolvedPath, entry.name);
          try {
            const fileStat = await fs.stat(fullPath);
            const mimeType = this.getMimeType(fullPath);
            files.push(this.createFileStats(fileStat, fullPath, mimeType));
          } catch {}
        } else if (entry.isDirectory() && includeDirectories) {
          const fullPath = join(resolvedPath, entry.name);
          try {
            const dirStat = await fs.stat(fullPath);
            directories.push(this.createFileStats(dirStat, fullPath, undefined));
          } catch {}
        }
      }
      
      return {
        path: resolvedPath,
        files,
        directories,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Directory listing failed',
      };
    }
  }
  
  // Create directory
  async createDirectory(path: string, options?: { recursive?: boolean; mode?: number }): Promise<FileWriteResult> {
    const validation = this.validatePath(path, 'write');
    if (!validation.valid) {
      return { success: false, path, error: validation.error };
    }
    
    const resolvedPath = validation.resolvedPath!;
    const recursive = options?.recursive || true;
    const mode = options?.mode || 0o755;
    
    try {
      await fs.mkdir(resolvedPath, { recursive, mode });
      
      const stat = await fs.stat(resolvedPath);
      const fileStats = this.createFileStats(stat, resolvedPath, undefined);
      
      return {
        success: true,
        path: resolvedPath,
        stats: fileStats,
      };
    } catch (error) {
      return {
        success: false,
        path: resolvedPath,
        error: error instanceof Error ? error.message : 'Directory creation failed',
      };
    }
  }
  
  // Delete directory
  async deleteDirectory(path: string, options?: { recursive?: boolean }): Promise<FileWriteResult> {
    const validation = this.validatePath(path, 'delete');
    if (!validation.valid) {
      return { success: false, path, error: validation.error };
    }
    
    const resolvedPath = validation.resolvedPath!;
    const recursive = options?.recursive || false;
    
    try {
      const stat = await fs.stat(resolvedPath);
      
      if (!stat.isDirectory()) {
        return { success: false, path: resolvedPath, error: 'Path is not a directory' };
      }
      
      if (recursive) {
        await fs.rm(resolvedPath, { recursive: true, force: true });
      } else {
        await fs.rmdir(resolvedPath);
      }
      
      const fileStats = this.createFileStats(stat, resolvedPath, undefined);
      
      return {
        success: true,
        path: resolvedPath,
        stats: fileStats,
      };
    } catch (error) {
      return {
        success: false,
        path: resolvedPath,
        error: error instanceof Error ? error.message : 'Directory deletion failed',
      };
    }
  }
  
  // Get file stats
  async getStats(path: string): Promise<{ success: boolean; stats?: FileStats; error?: string }> {
    const validation = this.validatePath(path, 'read');
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    const resolvedPath = validation.resolvedPath!;
    
    try {
      const stat = await fs.stat(resolvedPath);
      const mimeType = this.getMimeType(resolvedPath);
      const fileStats = this.createFileStats(stat, resolvedPath, mimeType);
      
      return {
        success: true,
        stats: fileStats,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Stats retrieval failed',
      };
    }
  }
  
  // Check if file exists
  async exists(path: string): Promise<boolean> {
    const validation = this.validatePath(path, 'read');
    if (!validation.valid) {
      return false;
    }
    
    try {
      await fs.access(validation.resolvedPath!);
      return true;
    } catch {
      return false;
    }
  }
  
  // Copy file
  async copyFile(src: string, dest: string): Promise<FileWriteResult> {
    const srcValidation = this.validatePath(src, 'read');
    if (!srcValidation.valid) {
      return { success: false, path: dest, error: srcValidation.error };
    }
    
    const destValidation = this.validatePath(dest, 'write');
    if (!destValidation.valid) {
      return { success: false, path: dest, error: destValidation.error };
    }
    
    const resolvedSrc = srcValidation.resolvedPath!;
    const resolvedDest = destValidation.resolvedPath!;
    
    try {
      const srcStat = await fs.stat(resolvedSrc);
      
      if (!srcStat.isFile()) {
        return { success: false, path: resolvedDest, error: 'Source is not a file' };
      }
      
      if (srcStat.size > this.config.maxWriteSize) {
        return { success: false, path: resolvedDest, error: 'Source file too large' };
      }
      
      // Ensure parent directory exists
      const destDir = resolvedDest.substring(0, resolvedDest.lastIndexOf('/'));
      if (destDir) {
        await fs.mkdir(destDir, { recursive: true });
      }
      
      await fs.copyFile(resolvedSrc, resolvedDest);
      
      const destStat = await fs.stat(resolvedDest);
      const mimeType = this.getMimeType(resolvedDest);
      const fileStats = this.createFileStats(destStat, resolvedDest, mimeType);
      
      return {
        success: true,
        path: resolvedDest,
        stats: fileStats,
        writtenBytes: srcStat.size,
      };
    } catch (error) {
      return {
        success: false,
        path: resolvedDest,
        error: error instanceof Error ? error.message : 'Copy failed',
      };
    }
  }
  
  // Move file
  async moveFile(src: string, dest: string): Promise<FileWriteResult> {
    const srcValidation = this.validatePath(src, 'read');
    if (!srcValidation.valid) {
      return { success: false, path: dest, error: srcValidation.error };
    }
    
    const destValidation = this.validatePath(dest, 'write');
    if (!destValidation.valid) {
      return { success: false, path: dest, error: destValidation.error };
    }
    
    const resolvedSrc = srcValidation.resolvedPath!;
    const resolvedDest = destValidation.resolvedPath!;
    
    try {
      const srcStat = await fs.stat(resolvedSrc);
      
      if (!srcStat.isFile()) {
        return { success: false, path: resolvedDest, error: 'Source is not a file' };
      }
      
      // Ensure parent directory exists
      const destDir = resolvedDest.substring(0, resolvedDest.lastIndexOf('/'));
      if (destDir) {
        await fs.mkdir(destDir, { recursive: true });
      }
      
      await fs.rename(resolvedSrc, resolvedDest);
      
      const destStat = await fs.stat(resolvedDest);
      const mimeType = this.getMimeType(resolvedDest);
      const fileStats = this.createFileStats(destStat, resolvedDest, mimeType);
      
      return {
        success: true,
        path: resolvedDest,
        stats: fileStats,
        writtenBytes: srcStat.size,
      };
    } catch (error) {
      return {
        success: false,
        path: resolvedDest,
        error: error instanceof Error ? error.message : 'Move failed',
      };
    }
  }
  
  // Create file stats object
  private createFileStats(stat: Stats, path: string, mimeType?: string): FileStats {
    return {
      name: path.substring(path.lastIndexOf('/') + 1),
      path,
      size: stat.size,
      isFile: stat.isFile(),
      isDirectory: stat.isDirectory(),
      isSymlink: stat.isSymbolicLink(),
      createdAt: stat.birthtimeMs || stat.ctimeMs,
      modifiedAt: stat.mtimeMs,
      accessedAt: stat.atimeMs,
      permissions: stat.mode,
      owner: stat.uid,
      group: stat.gid,
      mimeType,
    };
  }
  
  // Get MIME type from path
  private getMimeType(path: string): string | undefined {
    const ext = this.getExtension(path).toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.htm': 'text/html',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.csv': 'text/csv',
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.css': 'text/css',
      '.md': 'text/markdown',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.pdf': 'application/pdf',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.otf': 'font/otf',
      '.zip': 'application/zip',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
    };
    
    return mimeTypes[ext];
  }
  
  // Compute file hash
  async computeHash(path: string, algorithm: string = 'sha256'): Promise<{ success: boolean; hash?: string; error?: string }> {
    const validation = this.validatePath(path, 'read');
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    const resolvedPath = validation.resolvedPath!;
    
    try {
      const stat = await fs.stat(resolvedPath);
      
      if (!stat.isFile()) {
        return { success: false, error: 'Path is not a file' };
      }
      
      if (stat.size > this.config.maxReadSize) {
        return { success: false, error: 'File too large for hashing' };
      }
      
      const hash = createHash(algorithm);
      const stream = fs.createReadStream(resolvedPath);
      
      stream.pipe(hash);
      
      const digest = await new Promise<string>((resolve, reject) => {
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
      });
      
      return {
        success: true,
        hash: digest,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Hash computation failed',
      };
    }
  }
  
  // Get disk usage
  async getDiskUsage(path?: string): Promise<{ success: boolean; total?: number; used?: number; available?: number; usagePercent?: number; error?: string }> {
    try {
      // Use platform-specific method
      if (process.platform === 'win32') {
        // Windows: use wmic or similar
        return { success: false, error: 'Disk usage not supported on Windows' };
      } else {
        // Unix: use df
        const { execSync } = require('child_process');
        const target = path || this.config.rootDir;
        const output = execSync(`df -k "${target}"`).toString();
        const lines = output.trim().split('\n');
        const dataLine = lines[1];
        const parts = dataLine.trim().split(/\s+/);
        
        const total = parseInt(parts[1]) * 1024;
        const used = parseInt(parts[2]) * 1024;
        const available = parseInt(parts[3]) * 1024;
        const usagePercent = Math.round((used / total) * 100);
        
        return {
          success: true,
          total,
          used,
          available,
          usagePercent,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Disk usage retrieval failed',
      };
    }
  }
}
```

## Configuration Schema

```typescript
// src/config/file-config.ts
import { z } from 'zod';

export const FileToolConfigSchema = z.object({
  file: z.object({
    enabled: z.boolean().default(true),
    requireApproval: z.boolean().default(false),
    rootDir: z.string().default(process.env.TMP || '/tmp'),
    sandbox: z.boolean().default(true),
    sandboxDir: z.string().optional(),
    allowedPaths: z.array(z.string()).default([process.env.TMP || '/tmp', process.env.HOME || '/home/user']),
    blockedPaths: z.array(z.string()).default(['/etc', '/usr', '/var', '/root', '/bin', '/sbin', '/dev', '/proc', '/sys']),
    maxReadSize: z.number().int().positive().default(100 * 1024 * 1024), // 100MB
    maxWriteSize: z.number().int().positive().default(50 * 1024 * 1024), // 50MB
    maxDepth: z.number().int().positive().default(20),
    allowedExtensions: z.array(z.string()).default(['.txt', '.json', '.md', '.csv', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.pdf']),
    blockedExtensions: z.array(z.string()).default(['.js', '.ts', '.mjs', '.cjs', '.node', '.exe', '.dll', '.so', '.bat', '.cmd', '.sh', '.ps1']),
    timeout: z.number().int().positive().default(30000),
  }).default({}),
});
```

## HTTP API Endpoints

```typescript
// src/api/routes/file.ts
import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';

const router = Router();
const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } });

// POST /api/file/read - Read file
router.post('/read', async (req, res) => {
  try {
    const { path, encoding, offset, length } = z.object({
      path: z.string().min(1),
      encoding: z.enum(['utf8', 'base64', 'hex', 'latin1']).optional(),
      offset: z.number().int().nonnegative().optional(),
      length: z.number().int().positive().max(100 * 1024 * 1024).optional(),
    }).parse(req.body);
    
    const gateway: AgentGateway = req.app.get('gateway');
    const userId = req.user?.id || 'anonymous';
    const result = await gateway.readFile(path, { encoding, offset, length }, userId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error, path: result.path });
    }
    
    if (encoding === 'base64' && Buffer.isBuffer(result.content)) {
      res.json({
        success: true,
        path: result.path,
        content: result.content.toString('base64'),
        stats: result.stats,
        truncated: result.truncated,
        mimeType: result.mimeType,
      });
    } else {
      res.json({
        success: true,
        path: result.path,
        content: result.content,
        stats: result.stats,
        truncated: result.truncated,
        mimeType: result.mimeType,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// POST /api/file/write - Write file
router.post('/write', async (req, res) => {
  try {
    const { path, content, encoding, append, mode } = z.object({
      path: z.string().min(1),
      content: z.string().or(z.instanceof(Buffer)).or(z.any()),
      encoding: z.enum(['utf8', 'base64', 'hex', 'latin1']).optional(),
      append: z.boolean().optional(),
      mode: z.number().int().min(0).max(0o777).optional(),
    }).parse(req.body);
    
    const gateway: AgentGateway = req.app.get('gateway');
    const userId = req.user?.id || 'anonymous';
    
    let actualContent: string | Buffer = content;
    if (typeof content === 'string' && encoding === 'base64') {
      actualContent = Buffer.from(content, 'base64');
    }
    
    const result = await gateway.writeFile(path, actualContent, { encoding, append, mode }, userId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error, path: result.path });
    }
    
    res.json({
      success: true,
      path: result.path,
      stats: result.stats,
      writtenBytes: result.writtenBytes,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// POST /api/file/upload - Upload file
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { path, overwrite } = z.object({
      path: z.string().min(1),
      overwrite: z.boolean().optional(),
    }).parse(req.body);
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const gateway: AgentGateway = req.app.get('gateway');
    const userId = req.user?.id || 'anonymous';
    
    // Get full destination path
    const fullPath = path.endsWith('/') ? join(path, file.originalname) : path;
    
    // Check if file exists and overwrite is false
    const exists = await gateway.fileExists(fullPath, userId);
    if (exists && !overwrite) {
      return res.status(409).json({ error: 'File already exists' });
    }
    
    const result = await gateway.writeFile(fullPath, file.buffer, {}, userId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error, path: result.path });
    }
    
    res.json({
      success: true,
      path: result.path,
      stats: result.stats,
      writtenBytes: result.writtenBytes,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /api/file/download - Download file
router.get('/download', async (req, res) => {
  try {
    const { path } = z.object({ path: z.string().min(1) }).parse(req.query);
    
    const gateway: AgentGateway = req.app.get('gateway');
    const userId = req.user?.id || 'anonymous';
    const result = await gateway.readFile(path, {}, userId);
    
    if (!result.success) {
      return res.status(404).json({ error: result.error, path: result.path });
    }
    
    if (!result.stats) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.setHeader('Content-Type', result.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', result.stats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${result.stats.name}"`);
    
    if (Buffer.isBuffer(result.content)) {
      res.send(result.content);
    } else {
      res.send(result.content);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(404).json({ error: error instanceof Error ? error.message : 'File not found' });
  }
});

// DELETE /api/file - Delete file
router.delete('/', async (req, res) => {
  try {
    const { path } = z.object({ path: z.string().min(1) }).parse(req.query);
    
    const gateway: AgentGateway = req.app.get('gateway');
    const userId = req.user?.id || 'anonymous';
    const result = await gateway.deleteFile(path, userId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error, path: result.path });
    }
    
    res.json({ success: true, path: result.path, stats: result.stats });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /api/file/list - List directory
router.get('/list', async (req, res) => {
  try {
    const { path, recursive, includeFiles, includeDirectories } = z.object({
      path: z.string().min(1),
      recursive: z.boolean().optional(),
      includeFiles: z.boolean().optional(),
      includeDirectories: z.boolean().optional(),
    }).parse(req.query);
    
    const gateway: AgentGateway = req.app.get('gateway');
    const userId = req.user?.id || 'anonymous';
    const result = await gateway.listDirectory(path, { recursive, includeFiles, includeDirectories }, userId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// POST /api/file/mkdir - Create directory
router.post('/mkdir', async (req, res) => {
  try {
    const { path, recursive, mode } = z.object({
      path: z.string().min(1),
      recursive: z.boolean().optional(),
      mode: z.number().int().min(0).max(0o777).optional(),
    }).parse(req.body);
    
    const gateway: AgentGateway = req.app.get('gateway');
    const userId = req.user?.id || 'anonymous';
    const result = await gateway.createDirectory(path, { recursive, mode }, userId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error, path: result.path });
    }
    
    res.json({ success: true, path: result.path, stats: result.stats });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// DELETE /api/file/rmdir - Delete directory
router.delete('/rmdir', async (req, res) => {
  try {
    const { path, recursive } = z.object({
      path: z.string().min(1),
      recursive: z.boolean().optional(),
    }).parse(req.query);
    
    const gateway: AgentGateway = req.app.get('gateway');
    const userId = req.user?.id || 'anonymous';
    const result = await gateway.deleteDirectory(path, { recursive }, userId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error, path: result.path });
    }
    
    res.json({ success: true, path: result.path, stats: result.stats });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// POST /api/file/copy - Copy file
router.post('/copy', async (req, res) => {
  try {
    const { src, dest } = z.object({
      src: z.string().min(1),
      dest: z.string().min(1),
    }).parse(req.body);
    
    const gateway: AgentGateway = req.app.get('gateway');
    const userId = req.user?.id || 'anonymous';
    const result = await gateway.copyFile(src, dest, userId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error, path: result.path });
    }
    
    res.json({ success: true, path: result.path, stats: result.stats, writtenBytes: result.writtenBytes });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// POST /api/file/move - Move file
router.post('/move', async (req, res) => {
  try {
    const { src, dest } = z.object({
      src: z.string().min(1),
      dest: z.string().min(1),
    }).parse(req.body);
    
    const gateway: AgentGateway = req.app.get('gateway');
    const userId = req.user?.id || 'anonymous';
    const result = await gateway.moveFile(src, dest, userId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error, path: result.path });
    }
    
    res.json({ success: true, path: result.path, stats: result.stats, writtenBytes: result.writtenBytes });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /api/file/stats - Get file stats
router.get('/stats', async (req, res) => {
  try {
    const { path } = z.object({ path: z.string().min(1) }).parse(req.query);
    
    const gateway: AgentGateway = req.app.get('gateway');
    const userId = req.user?.id || 'anonymous';
    const result = await gateway.getFileStats(path, userId);
    
    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }
    
    res.json(result.stats);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(404).json({ error: error instanceof Error ? error.message : 'File not found' });
  }
});

// GET /api/file/exists - Check if file exists
router.get('/exists', async (req, res) => {
  try {
    const { path } = z.object({ path: z.string().min(1) }).parse(req.query);
    
    const gateway: AgentGateway = req.app.get('gateway');
    const userId = req.user?.id || 'anonymous';
    const exists = await gateway.fileExists(path, userId);
    
    res.json({ exists });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /api/file/hash - Compute file hash
router.get('/hash', async (req, res) => {
  try {
    const { path, algorithm } = z.object({
      path: z.string().min(1),
      algorithm: z.enum(['md5', 'sha1', 'sha256', 'sha512']).optional(),
    }).parse(req.query);
    
    const gateway: AgentGateway = req.app.get('gateway');
    const userId = req.user?.id || 'anonymous';
    const result = await gateway.computeFileHash(path, algorithm, userId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({ hash: result.hash, algorithm: algorithm || 'sha256' });
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
import { FileService } from '../services/tools/file/file-service';

export class AgentGateway {
  private fileService: FileService;
  
  async initialize() {
    this.fileService = new FileService(this.config.file);
  }
  
  async readFile(path: string, options: any, userId?: string): Promise<any> {
    return this.fileService.readFile(path, options);
  }
  
  async writeFile(path: string, content: string | Buffer, options: any, userId?: string): Promise<any> {
    return this.fileService.writeFile(path, content, options);
  }
  
  async deleteFile(path: string, userId?: string): Promise<any> {
    return this.fileService.deleteFile(path);
  }
  
  async listDirectory(path: string, options: any, userId?: string): Promise<any> {
    return this.fileService.listDirectory(path, options);
  }
  
  async createDirectory(path: string, options: any, userId?: string): Promise<any> {
    return this.fileService.createDirectory(path, options);
  }
  
  async deleteDirectory(path: string, options: any, userId?: string): Promise<any> {
    return this.fileService.deleteDirectory(path, options);
  }
  
  async getFileStats(path: string, userId?: string): Promise<any> {
    return this.fileService.getStats(path);
  }
  
  async fileExists(path: string, userId?: string): Promise<boolean> {
    return this.fileService.exists(path);
  }
  
  async copyFile(src: string, dest: string, userId?: string): Promise<any> {
    return this.fileService.copyFile(src, dest);
  }
  
  async moveFile(src: string, dest: string, userId?: string): Promise<any> {
    return this.fileService.moveFile(src, dest);
  }
  
  async computeFileHash(path: string, algorithm?: string, userId?: string): Promise<any> {
    return this.fileService.computeHash(path, algorithm);
  }
}
```

## Security Best Practices

1. **Validate All Paths** - Prevent path traversal attacks
2. **Use Sandbox Mode** - Restrict writes to sandbox directory
3. **Limit File Sizes** - Prevent DoS with large files
4. **Block Dangerous Extensions** - Prevent execution of scripts
5. **Block Sensitive Paths** - Prevent access to system files
6. **Limit Directory Depth** - Prevent deep traversal attacks
7. **Check File Types** - Validate MIME types
8. **Limit Concurrent Operations** - Prevent resource exhaustion
9. **Validate Permissions** - Check read/write permissions
10. **Use Safe Encoding** - Handle file content safely

## Testing

```typescript
// tests/services/tools/file-service.test.ts
describe('FileService', () => {
  let service: FileService;
  let tempDir: string;
  
  beforeAll(async () => {
    tempDir = require('os').tmpdir();
    service = new FileService({
      rootDir: tempDir,
      sandbox: false,
      maxReadSize: 1024 * 1024,
      maxWriteSize: 1024 * 1024,
    });
  });
  
  it('validates paths', () => {
    const result1 = service.validatePath('/etc/passwd', 'read');
    expect(result1.valid).toBe(false);
    
    const result2 = service.validatePath('../etc/passwd', 'read');
    expect(result2.valid).toBe(false);
    
    const result3 = service.validatePath('test.txt', 'read');
    expect(result3.valid).toBe(true);
  });
  
  it('blocks blocked extensions', () => {
    const result = service.validatePath('test.js', 'write');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('File extension not allowed');
  });
  
  it('blocks path traversal', () => {
    const result = service.validatePath('../../../etc/passwd', 'read');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Path traversal');
  });
  
  it('reads and writes files', async () => {
    const testPath = join(tempDir, `test-file-${Date.now()}.txt`);
    
    // Write file
    const writeResult = await service.writeFile(testPath, 'Hello, World!', { encoding: 'utf8' });
    expect(writeResult.success).toBe(true);
    expect(writeResult.path).toBe(testPath);
    
    // Read file
    const readResult = await service.readFile(testPath, { encoding: 'utf8' });
    expect(readResult.success).toBe(true);
    expect(readResult.content).toBe('Hello, World!');
    
    // Clean up
    await service.deleteFile(testPath);
  });
  
  it('lists directory', async () => {
    const testDir = join(tempDir, `test-dir-${Date.now()}`);
    await service.createDirectory(testDir);
    
    // Create some files
    await service.writeFile(join(testDir, 'file1.txt'), 'Content 1');
    await service.writeFile(join(testDir, 'file2.txt'), 'Content 2');
    
    const result = await service.listDirectory(testDir);
    expect(result.success).toBe(true);
    expect(result.files).toHaveLength(2);
    
    // Clean up
    await service.deleteDirectory(testDir, { recursive: true });
  });
  
  it('gets file stats', async () => {
    const testPath = join(tempDir, `test-stats-${Date.now()}.txt`);
    await service.writeFile(testPath, 'Test content');
    
    const result = await service.getStats(testPath);
    expect(result.success).toBe(true);
    expect(result.stats).toBeDefined();
    expect(result.stats?.isFile).toBe(true);
    expect(result.stats?.size).toBe(12);
    
    // Clean up
    await service.deleteFile(testPath);
  });
  
  it('enforces read size limit', async () => {
    // Create a large file
    const testPath = join(tempDir, `large-file-${Date.now()}.txt`);
    const largeContent = 'x'.repeat(2 * 1024 * 1024); // 2MB
    await service.writeFile(testPath, largeContent);
    
    // Service configured with 1MB limit
    const limitedService = new FileService({
      rootDir: tempDir,
      maxReadSize: 1024 * 1024,
    });
    
    const result = await limitedService.readFile(testPath);
    expect(result.success).toBe(false);
    expect(result.error).toContain('too large');
    
    // Clean up
    await service.deleteFile(testPath);
  });
});
```

## Resources

- [Node.js File System](https://nodejs.org/api/fs.html)
- [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- [File System Security](https://nodejs.org/en/docs/guides/security/checklist/#file-system)

## Principles

1. Security First
2. Least Privilege
3. Sandbox Isolation
4. Validate All Inputs
5. Limit Resources
6. Prevent Information Disclosure
7. Fail Safely
