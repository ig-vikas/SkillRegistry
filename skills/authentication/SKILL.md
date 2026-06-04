---
name: authentication
type: skill
description: Comprehensive authentication system for AI agent gateway with JWT tokens, session management, and multi-factor authentication.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [security, backend, authentication]
tags: [authentication, jwt, tokens, sessions, security, oauth, multi-factor, passwordless]
---

# Authentication Expert

Implement a comprehensive authentication system for AI agent gateway with JWT tokens, session management, device pairing, and multi-factor authentication options.

## Architecture

```
Authentication Flow
     │
     ├── Device Pairing (First-time)
     │   ├── Generate Pairing Code
     │   ├── Display QR Code
     │   ├── User Scans with Mobile
     │   └── Exchange for JWT Token
     │
     ├── Token Authentication
     │   ├── JWT Validation
     │   ├── Token Rotation
     │   ├── Device Fingerprinting
     │   └── Rate Limiting
     │
     ├── Session Management
     │   ├── Session Creation
     │   ├── Session Validation
     │   ├── Session Refresh
     │   └── Session Revocation
     │
     └── Multi-Factor Authentication (Optional)
         ├── TOTP (Time-based OTP)
         ├── WebAuthn (FIDO2)
         └── Backup Codes
```

## Core Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| TokenService | JWT generation, validation, rotation | jsonwebtoken, jose |
| PairingService | Device pairing with codes | Crypto, QR code |
| SessionService | Session lifecycle management | Redis, SQLite |
| AuthMiddleware | Request authentication | Express middleware |
| RateLimiter | Prevent brute force attacks | rate-limiter-flexible |
| MFAService | Multi-factor auth | speakeasy, webauthn |

## Quick Start

```bash
# Install dependencies
pnpm add jsonwebtoken jose @panva/jose speakeasy qrcode
pnpm add -D @types/jsonwebtoken @types/qrcode
```

## Configuration Schema

```typescript
// src/auth/config.ts
import { z } from 'zod';

export const TokenConfigSchema = z.object({
  // JWT Settings
  jwt: z.object({
    algorithm: z.enum(['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512']).default('HS256'),
    secret: z.string().min(32),
    publicKey: z.string().optional(),
    privateKey: z.string().optional(),
    expiresIn: z.string().default('24h'),
    refreshExpiresIn: z.string().default('7d'),
    issuer: z.string().default('agent-gateway'),
    audience: z.string().default('agent-gateway-client'),
  }),

  // Token settings
  tokens: z.object({
    pairingTimeout: z.number().default(300), // seconds
    deviceTokenExpiresIn: z.number().default(86400), // seconds
    rotateOnUse: z.boolean().default(true),
    maxActiveTokensPerDevice: z.number().default(5),
    maxActiveTokensPerUser: z.number().default(10),
  }).default({}),

  // Pairing settings
  pairing: z.object({
    codeLength: z.number().min(4).max(12).default(6),
    codeChars: z.string().default('ABCDEFGHJKLMNPQRSTUVWXYZ23456789'),
    qrCode: z.boolean().default(true),
    fallbackCodes: z.array(z.string()).default([]),
  }).default({}),

  // Session settings
  session: z.object({
    store: z.enum(['redis', 'sqlite', 'memory']).default('sqlite'),
    redisUrl: z.string().optional(),
    sqlitePath: z.string().default('./data/sessions.db'),
    maxSessionsPerUser: z.number().default(10),
    sessionTimeout: z.number().default(86400), // seconds
    rollingSessions: z.boolean().default(true),
  }).default({}),

  // MFA settings
  mfa: z.object({
    enabled: z.boolean().default(false),
    defaultMethod: z.enum(['totp', 'webauthn', 'backup']).default('totp'),
    required: z.boolean().default(false),
    backupCodesCount: z.number().default(10),
    backupCodesLength: z.number().default(10),
  }).default({}),

  // Rate limiting
  rateLimit: z.object({
    maxAttempts: z.number().default(5),
    windowMs: z.number().default(900000), // 15 minutes
    lockoutMs: z.number().default(3600000), // 1 hour
    trustedIps: z.array(z.string()).default([]),
  }).default({}),
});

export type AuthConfig = z.infer<typeof TokenConfigSchema>;

export const DefaultAuthConfig: AuthConfig = {
  jwt: {
    algorithm: 'HS256',
    secret: 'change-me-to-a-strong-secret-at-least-32-characters',
    expiresIn: '24h',
    refreshExpiresIn: '7d',
    issuer: 'agent-gateway',
    audience: 'agent-gateway-client',
  },
  tokens: {
    pairingTimeout: 300,
    deviceTokenExpiresIn: 86400,
    rotateOnUse: true,
    maxActiveTokensPerDevice: 5,
    maxActiveTokensPerUser: 10,
  },
  pairing: {
    codeLength: 6,
    codeChars: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
    qrCode: true,
  },
  session: {
    store: 'sqlite',
    sqlitePath: './data/sessions.db',
    maxSessionsPerUser: 10,
    sessionTimeout: 86400,
    rollingSessions: true,
  },
  mfa: {
    enabled: false,
    defaultMethod: 'totp',
    required: false,
  },
  rateLimit: {
    maxAttempts: 5,
    windowMs: 900000,
    lockoutMs: 3600000,
  },
};
```

## Token Service

```typescript
// src/auth/token-service.ts
import { jwtVerify, SignJWT, JWTPayload } from 'jose';
import { createHash, randomBytes } from 'crypto';
import { AuthConfig } from './config';

interface TokenPayload extends JWTPayload {
  sub: string; // userId or deviceId
  deviceId?: string;
  deviceName?: string;
  ipAddress?: string;
  userAgent?: string;
  permissions?: string[];
  jti: string; // JWT ID
}

interface DeviceToken {
  token: string;
  refreshToken: string;
  deviceId: string;
  userId: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
  createdAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export class TokenService {
  private config: AuthConfig;
  private usedTokens: Set<string> = new Set(); // For one-time use tokens

  constructor(config: AuthConfig) {
    this.config = config;
  }

  // Generate access token
  async generateAccessToken(payload: TokenPayload, expiresIn?: string): Promise<string> {
    const secret = new TextEncoder().encode(this.config.jwt.secret);
    
    const jwt = await new SignJWT({
      ...payload,
      iss: this.config.jwt.issuer,
      aud: this.config.jwt.audience,
      jti: randomBytes(16).toString('hex'),
    })
      .setProtectedHeader({ alg: this.config.jwt.algorithm })
      .setIssuedAt()
      .setExpirationTime(expiresIn || this.config.jwt.expiresIn);

    return jwt.sign(secret);
  }

  // Generate device token pair
  async generateDeviceTokens(userId: string, deviceId: string, payload: Omit<TokenPayload, 'sub' | 'jti'> = {}): Promise<DeviceToken> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.tokens.deviceTokenExpiresIn * 1000);
    const refreshExpiresAt = new Date(now.getTime() + this.parseDuration(this.config.jwt.refreshExpiresIn) * 1000);

    // Generate access token
    const accessToken = await this.generateAccessToken({
      sub: userId,
      deviceId,
      ...payload,
      jti: randomBytes(16).toString('hex'),
    });

    // Generate refresh token
    const refreshToken = await this.generateAccessToken({
      sub: userId,
      deviceId,
      ...payload,
      jti: randomBytes(16).toString('hex'),
    }, this.config.jwt.refreshExpiresIn);

    return {
      token: accessToken,
      refreshToken,
      deviceId,
      userId,
      expiresAt,
      refreshExpiresAt,
      createdAt: now,
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent,
    };
  }

  // Validate token
  async validateToken(token: string): Promise<TokenPayload & { deviceId?: string }> {
    try {
      const secret = new TextEncoder().encode(this.config.jwt.secret);
      const { payload } = await jwtVerify(token, secret, {
        issuer: this.config.jwt.issuer,
        audience: this.config.jwt.audience,
      });

      // Check if token was already used (one-time use)
      if (this.usedTokens.has(payload.jti!)) {
        throw new Error('Token already used');
      }

      return payload as TokenPayload & { deviceId?: string };
    } catch (error) {
      throw new Error(`Invalid token: ${error.message}`);
    }
  }

  // Mark token as used (for one-time use tokens)
  markTokenAsUsed(jti: string): void {
    this.usedTokens.add(jti);
    // Clean up old used tokens periodically
    if (this.usedTokens.size > 1000) {
      this.usedTokens.clear();
    }
  }

  // Rotate token (generate new token, invalidate old)
  async rotateToken(oldToken: string, payload: TokenPayload): Promise<{ token: string; refreshToken: string }> {
    // Invalidate old token
    const oldPayload = await this.validateToken(oldToken);
    this.markTokenAsUsed(oldPayload.jti!);

    // Generate new tokens
    const newToken = await this.generateAccessToken({
      ...payload,
      jti: randomBytes(16).toString('hex'),
    });

    const newRefreshToken = await this.generateAccessToken({
      ...payload,
      jti: randomBytes(16).toString('hex'),
    }, this.config.jwt.refreshExpiresIn);

    return { token: newToken, refreshToken: newRefreshToken };
  }

  // Generate pairing code
  generatePairingCode(): { code: string; expiresAt: Date } {
    const code = this.generateRandomCode(this.config.pairing.codeLength, this.config.pairing.codeChars);
    const expiresAt = new Date(Date.now() + this.config.tokens.pairingTimeout * 1000);
    return { code, expiresAt };
  }

  // Generate device ID
  generateDeviceId(): string {
    return `dev_${randomBytes(8).toString('hex')}`;
  }

  // Generate session ID
  generateSessionId(userId: string, deviceId: string): string {
    const hash = createHash('sha256')
      .update(userId)
      .update(deviceId)
      .update(Date.now().toString())
      .digest('hex');
    return `sess_${hash.substring(0, 16)}`;
  }

  // Generate fingerprint from device info
  generateFingerprint(ipAddress: string, userAgent: string): string {
    const hash = createHash('sha256')
      .update(ipAddress)
      .update(userAgent || '')
      .digest('hex');
    return hash.substring(0, 16);
  }

  // Helper to parse duration strings
  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 0;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 0;
    }
  }

  // Helper to generate random code
  private generateRandomCode(length: number, chars: string): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Validate pairing code format
  validatePairingCode(code: string): boolean {
    if (code.length !== this.config.pairing.codeLength) return false;
    for (const char of code) {
      if (!this.config.pairing.codeChars.includes(char)) return false;
    }
    return true;
  }
}
```

## Pairing Service

```typescript
// src/auth/pairing-service.ts
import { TokenService } from './token-service';
import { AuthConfig } from './config';
import QRCode from 'qrcode';

interface PairingRequest {
  code: string;
  userId: string;
  deviceId?: string;
  deviceName?: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
  createdAt: Date;
  used: boolean;
}

interface PairingResult {
  code: string;
  qrCode?: string;
  url: string;
  expiresAt: Date;
  deviceId: string;
}

export class PairingService {
  private config: AuthConfig;
  private tokenService: TokenService;
  private requests: Map<string, PairingRequest> = new Map();
  private usedCodes: Set<string> = new Set();

  constructor(config: AuthConfig, tokenService: TokenService) {
    this.config = config;
    this.tokenService = tokenService;
    
    // Cleanup expired requests periodically
    setInterval(() => this.cleanup(), 60000);
  }

  // Create new pairing request
  async createPairingRequest(userId: string, ipAddress: string, userAgent: string, deviceName?: string): Promise<PairingResult> {
    // Generate device ID
    const deviceId = this.tokenService.generateDeviceId();
    
    // Generate pairing code
    const { code, expiresAt } = this.tokenService.generatePairingCode();
    
    // Create request
    const request: PairingRequest = {
      code,
      userId,
      deviceId,
      deviceName,
      ipAddress,
      userAgent,
      expiresAt,
      createdAt: new Date(),
      used: false,
    };
    
    this.requests.set(code, request);
    
    // Generate QR code URL
    const url = this.generatePairingUrl(code, userId);
    
    // Generate QR code data URL
    let qrCode: string | undefined;
    if (this.config.pairing.qrCode) {
      try {
        qrCode = await QRCode.toDataURL(url, {
          width: 300,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        });
      } catch {
        // QR code generation failed
      }
    }
    
    return { code, qrCode, url, expiresAt, deviceId };
  }

  // Validate and complete pairing
  async validatePairing(code: string, ipAddress: string, userAgent: string): Promise<DeviceToken | null> {
    // Check if code was already used
    if (this.usedCodes.has(code)) {
      return null;
    }
    
    // Get request
    const request = this.requests.get(code);
    if (!request) {
      return null;
    }
    
    // Check if expired
    if (new Date() > request.expiresAt) {
      this.requests.delete(code);
      return null;
    }
    
    // Check IP address match (optional)
    if (request.ipAddress !== ipAddress) {
      console.warn(`Pairing IP mismatch: expected ${request.ipAddress}, got ${ipAddress}`);
    }
    
    // Generate tokens
    const deviceToken = await this.tokenService.generateDeviceTokens(
      request.userId,
      request.deviceId || this.tokenService.generateDeviceId(),
      {
        deviceName: request.deviceName,
        ipAddress,
        userAgent,
      }
    );
    
    // Mark code as used
    this.usedCodes.add(code);
    request.used = true;
    
    // Clean up request
    this.requests.delete(code);
    
    return deviceToken;
  }

  // Generate pairing URL
  private generatePairingUrl(code: string, userId: string): string {
    return `agent-gateway://pair/${code}?user=${encodeURIComponent(userId)}`;
  }

  // Get pairing request by code
  getPairingRequest(code: string): PairingRequest | null {
    return this.requests.get(code) || null;
  }

  // List active pairing requests for user
  listPairingRequests(userId: string): PairingRequest[] {
    return Array.from(this.requests.values())
      .filter(r => r.userId === userId && !r.used && new Date() <= r.expiresAt);
  }

  // Revoke pairing request
  revokePairingRequest(code: string): boolean {
    if (this.requests.has(code)) {
      this.requests.delete(code);
      this.usedCodes.add(code);
      return true;
    }
    return false;
  }

  // Cleanup expired requests
  private cleanup(): void {
    const now = new Date();
    for (const [code, request] of this.requests) {
      if (now > request.expiresAt) {
        this.requests.delete(code);
      }
    }
    
    // Clean up old used codes
    if (this.usedCodes.size > 1000) {
      this.usedCodes.clear();
    }
  }
}
```

## Session Service

```typescript
// src/auth/session-service.ts
import { AuthConfig } from './config';
import { TokenService } from './token-service';
import { createHash } from 'crypto';
import Database from 'better-sqlite3';

interface Session {
  id: string;
  userId: string;
  deviceId: string;
  deviceName?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
  lastUsedAt: Date;
  token: string;
  refreshToken: string;
  valid: boolean;
}

export class SessionService {
  private config: AuthConfig;
  private tokenService: TokenService;
  private db: Database.Database;
  private sessions: Map<string, Session> = new Map();

  constructor(config: AuthConfig, tokenService: TokenService) {
    this.config = config;
    this.tokenService = tokenService;
    
    // Initialize database
    if (config.session.store === 'sqlite') {
      this.db = new Database(config.session.sqlitePath);
      this.initializeDatabase();
    }
  }

  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        deviceId TEXT NOT NULL,
        deviceName TEXT,
        ipAddress TEXT,
        userAgent TEXT,
        createdAt INTEGER NOT NULL,
        expiresAt INTEGER NOT NULL,
        lastUsedAt INTEGER NOT NULL,
        token TEXT NOT NULL,
        refreshToken TEXT NOT NULL,
        valid INTEGER DEFAULT 1
      )
    `);
    
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions(userId)
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_deviceId ON sessions(deviceId)
    `);
    
    // Load existing sessions
    this.loadSessions();
  }

  private loadSessions(): void {
    if (this.config.session.store !== 'sqlite') return;
    
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE valid = 1');
    const rows = stmt.all() as any[];
    
    for (const row of rows) {
      this.sessions.set(row.id, {
        id: row.id,
        userId: row.userId,
        deviceId: row.deviceId,
        deviceName: row.deviceName,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: new Date(row.createdAt),
        expiresAt: new Date(row.expiresAt),
        lastUsedAt: new Date(row.lastUsedAt),
        token: row.token,
        refreshToken: row.refreshToken,
        valid: row.valid === 1,
      });
    }
  }

  // Create new session
  async createSession(userId: string, deviceId: string, deviceToken: any, ipAddress?: string, userAgent?: string): Promise<Session> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.tokens.deviceTokenExpiresIn * 1000);
    
    const session: Session = {
      id: this.tokenService.generateSessionId(userId, deviceId),
      userId,
      deviceId,
      deviceName: deviceToken.deviceName,
      ipAddress,
      userAgent,
      createdAt: now,
      expiresAt,
      lastUsedAt: now,
      token: deviceToken.token,
      refreshToken: deviceToken.refreshToken,
      valid: true,
    };
    
    // Enforce max sessions per user
    const userSessions = this.getSessionsByUser(userId);
    if (userSessions.length >= this.config.session.maxSessionsPerUser) {
      // Remove oldest session
      const oldest = userSessions.sort((a, b) => a.lastUsedAt.getTime() - b.lastUsedAt.getTime())[0];
      await this.invalidateSession(oldest.id);
    }
    
    this.sessions.set(session.id, session);
    await this.saveSession(session);
    
    return session;
  }

  // Validate session
  async validateSession(sessionId: string, token: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    // Check if expired
    if (new Date() > session.expiresAt) {
      await this.invalidateSession(sessionId);
      return null;
    }
    
    // Check token match
    if (session.token !== token) {
      return null;
    }
    
    // Update last used
    if (this.config.session.rollingSessions) {
      session.lastUsedAt = new Date();
      await this.updateSession(session);
    }
    
    // Rotate token if configured
    if (this.config.tokens.rotateOnUse) {
      const deviceToken = await this.tokenService.rotateToken(session.token, {
        sub: session.userId,
        deviceId: session.deviceId,
      });
      session.token = deviceToken.token;
      session.refreshToken = deviceToken.refreshToken;
      await this.updateSession(session);
    }
    
    return session;
  }

  // Refresh session
  async refreshSession(sessionId: string, refreshToken: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    // Check refresh token
    if (session.refreshToken !== refreshToken) {
      return null;
    }
    
    // Generate new tokens
    const deviceToken = await this.tokenService.generateDeviceTokens(
      session.userId,
      session.deviceId,
      { deviceName: session.deviceName, ipAddress: session.ipAddress, userAgent: session.userAgent }
    );
    
    // Update session
    session.token = deviceToken.token;
    session.refreshToken = deviceToken.refreshToken;
    session.expiresAt = new Date(Date.now() + this.config.tokens.deviceTokenExpiresIn * 1000);
    session.lastUsedAt = new Date();
    
    await this.updateSession(session);
    
    return session;
  }

  // Invalidate session
  async invalidateSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    session.valid = false;
    
    if (this.config.session.store === 'sqlite') {
      const stmt = this.db.prepare('UPDATE sessions SET valid = 0 WHERE id = ?');
      stmt.run(sessionId);
    }
    
    this.sessions.delete(sessionId);
    return true;
  }

  // Invalidate all sessions for user
  async invalidateSessionsForUser(userId: string): Promise<number> {
    const userSessions = this.getSessionsByUser(userId);
    let count = 0;
    
    for (const session of userSessions) {
      await this.invalidateSession(session.id);
      count++;
    }
    
    return count;
  }

  // Invalidate all sessions for device
  async invalidateSessionsForDevice(deviceId: string): Promise<number> {
    const deviceSessions = this.getSessionsByDevice(deviceId);
    let count = 0;
    
    for (const session of deviceSessions) {
      await this.invalidateSession(session.id);
      count++;
    }
    
    return count;
  }

  // Get session by ID
  getSession(sessionId: string): Session | null {
    return this.sessions.get(sessionId) || null;
  }

  // Get sessions by user
  getSessionsByUser(userId: string): Session[] {
    return Array.from(this.sessions.values())
      .filter(s => s.userId === userId && s.valid);
  }

  // Get sessions by device
  getSessionsByDevice(deviceId: string): Session[] {
    return Array.from(this.sessions.values())
      .filter(s => s.deviceId === deviceId && s.valid);
  }

  // Get all active sessions
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values())
      .filter(s => s.valid);
  }

  // Private: Save session to database
  private async saveSession(session: Session): Promise<void> {
    if (this.config.session.store !== 'sqlite') return;
    
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, userId, deviceId, deviceName, ipAddress, userAgent, createdAt, expiresAt, lastUsedAt, token, refreshToken, valid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(id) DO UPDATE SET 
        deviceName = excluded.deviceName,
        ipAddress = excluded.ipAddress,
        userAgent = excluded.userAgent,
        expiresAt = excluded.expiresAt,
        lastUsedAt = excluded.lastUsedAt,
        token = excluded.token,
        refreshToken = excluded.refreshToken,
        valid = 1
    `);
    
    stmt.run(
      session.id,
      session.userId,
      session.deviceId,
      session.deviceName,
      session.ipAddress,
      session.userAgent,
      session.createdAt.getTime(),
      session.expiresAt.getTime(),
      session.lastUsedAt.getTime(),
      session.token,
      session.refreshToken
    );
  }

  // Private: Update session in database
  private async updateSession(session: Session): Promise<void> {
    if (this.config.session.store !== 'sqlite') return;
    
    const stmt = this.db.prepare(`
      UPDATE sessions SET 
        deviceName = ?,
        ipAddress = ?,
        userAgent = ?,
        expiresAt = ?,
        lastUsedAt = ?,
        token = ?,
        refreshToken = ?,
        valid = ?
      WHERE id = ?
    `);
    
    stmt.run(
      session.deviceName,
      session.ipAddress,
      session.userAgent,
      session.expiresAt.getTime(),
      session.lastUsedAt.getTime(),
      session.token,
      session.refreshToken,
      session.valid ? 1 : 0,
      session.id
    );
  }
}
```

## Rate Limiter

```typescript
// src/auth/rate-limiter.ts
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { AuthConfig } from './config';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  exceeded: boolean;
}

export class AuthRateLimiter {
  private config: AuthConfig;
  private ipLimiter: RateLimiterMemory;
  private userLimiter: RateLimiterMemory;
  private deviceLimiter: RateLimiterMemory;
  private lockouts: Map<string, { until: Date; reason: string }> = new Map();

  constructor(config: AuthConfig) {
    this.config = config;
    
    this.ipLimiter = new RateLimiterMemory({
      points: config.rateLimit.maxAttempts,
      duration: config.rateLimit.windowMs / 1000,
    });
    
    this.userLimiter = new RateLimiterMemory({
      points: config.rateLimit.maxAttempts * 2,
      duration: config.rateLimit.windowMs / 1000,
    });
    
    this.deviceLimiter = new RateLimiterMemory({
      points: config.rateLimit.maxAttempts,
      duration: config.rateLimit.windowMs / 1000,
    });
  }

  // Check rate limit for IP
  async checkIp(ip: string): Promise<RateLimitResult> {
    // Check if IP is trusted
    if (this.config.rateLimit.trustedIps.includes(ip)) {
      return { allowed: true, remaining: Infinity, resetAt: new Date(), exceeded: false };
    }
    
    // Check lockout
    const lockout = this.lockouts.get(`ip:${ip}`);
    if (lockout && new Date() < lockout.until) {
      return { allowed: false, remaining: 0, resetAt: lockout.until, exceeded: true };
    }
    
    // Remove expired lockout
    if (lockout) {
      this.lockouts.delete(`ip:${ip}`);
    }
    
    try {
      const res = await this.ipLimiter.consume(ip);
      return {
        allowed: true,
        remaining: res.remainingPoints,
        resetAt: new Date(Date.now() + res.msBeforeNext / 10), // Convert ms to seconds
        exceeded: false,
      };
    } catch {
      // Rate limit exceeded
      this.lockouts.set(`ip:${ip}`, {
        until: new Date(Date.now() + this.config.rateLimit.lockoutMs),
        reason: 'Too many authentication attempts',
      });
      
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + this.config.rateLimit.lockoutMs),
        exceeded: true,
      };
    }
  }

  // Check rate limit for user
  async checkUser(userId: string): Promise<RateLimitResult> {
    try {
      const res = await this.userLimiter.consume(userId);
      return {
        allowed: true,
        remaining: res.remainingPoints,
        resetAt: new Date(Date.now() + res.msBeforeNext / 10),
        exceeded: false,
      };
    } catch {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + this.config.rateLimit.windowMs),
        exceeded: true,
      };
    }
  }

  // Check rate limit for device
  async checkDevice(deviceId: string): Promise<RateLimitResult> {
    try {
      const res = await this.deviceLimiter.consume(deviceId);
      return {
        allowed: true,
        remaining: res.remainingPoints,
        resetAt: new Date(Date.now() + res.msBeforeNext / 10),
        exceeded: false,
      };
    } catch {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + this.config.rateLimit.windowMs),
        exceeded: true,
      };
    }
  }

  // Check if locked out
  isLockedOut(identifier: string, type: 'ip' | 'user' | 'device' = 'ip'): boolean {
    const lockout = this.lockouts.get(`${type}:${identifier}`);
    if (lockout && new Date() < lockout.until) {
      return true;
    }
    return false;
  }

  // Get lockout info
  getLockoutInfo(identifier: string, type: 'ip' | 'user' | 'device' = 'ip'): { until: Date; reason: string } | null {
    const lockout = this.lockouts.get(`${type}:${identifier}`);
    if (lockout && new Date() < lockout.until) {
      return lockout;
    }
    return null;
  }

  // Clear lockout
  clearLockout(identifier: string, type: 'ip' | 'user' | 'device' = 'ip'): boolean {
    return this.lockouts.delete(`${type}:${identifier}`);
  }

  // Cleanup expired lockouts
  cleanup(): void {
    const now = new Date();
    for (const [key, lockout] of this.lockouts) {
      if (now >= lockout.until) {
        this.lockouts.delete(key);
      }
    }
  }
}
```

## MFA Service

```typescript
// src/auth/mfa-service.ts
import { AuthConfig } from './config';
import { createHash, randomBytes } from 'crypto';
import speakeasy from 'speakeasy';

interface TOTPSecret {
  secret: string;
  otpauthUrl: string;
  qrCode: string;
}

interface BackupCode {
  code: string;
  used: boolean;
  createdAt: Date;
}

interface WebAuthnCredential {
  id: string;
  publicKey: string;
  counter: number;
  deviceType: string;
  backedUp: boolean;
  transports: string[];
}

interface MFAMethod {
  type: 'totp' | 'webauthn' | 'backup';
  enabled: boolean;
  verified: boolean;
  default: boolean;
}

interface UserMFA {
  userId: string;
  methods: Record<string, any>;
  backupCodes: BackupCode[];
  enabledAt: Date;
  lastUsedAt?: Date;
}

export class MFAService {
  private config: AuthConfig;
  private userMFA: Map<string, UserMFA> = new Map();

  constructor(config: AuthConfig) {
    this.config = config;
  }

  // Generate TOTP secret
  async generateTOTPSecret(userId: string, userEmail: string, issuer: string = 'AgentGateway'): Promise<TOTPSecret> {
    const secret = speakeasy.generateSecret({
      name: `${issuer}:${userEmail}`,
      issuer,
      length: 20,
    });
    
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    
    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      qrCode,
    };
  }

  // Verify TOTP code
  verifyTOTPCode(secret: string, code: string, window: number = 1): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      code,
      window,
    });
  }

  // Generate backup codes
  generateBackupCodes(count: number = this.config.mfa.backupCodesCount, length: number = this.config.mfa.backupCodesLength): BackupCode[] {
    const codes: BackupCode[] = [];
    const usedCodes = new Set<string>();
    
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    
    for (let i = 0; i < count; i++) {
      let code: string;
      do {
        code = '';
        for (let j = 0; j < length; j++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
      } while (usedCodes.has(code) || code.length !== length);
      
      usedCodes.add(code);
      codes.push({
        code,
        used: false,
        createdAt: new Date(),
      });
    }
    
    return codes;
  }

  // Verify backup code
  verifyBackupCode(userId: string, code: string): boolean {
    const mfa = this.userMFA.get(userId);
    if (!mfa) return false;
    
    for (const backupCode of mfa.backupCodes) {
      if (backupCode.code === code && !backupCode.used) {
        backupCode.used = true;
        return true;
      }
    }
    
    return false;
  }

  // Enable MFA for user
  async enableMFA(userId: string, method: 'totp' | 'webauthn' | 'backup', secret: string): Promise<UserMFA> {
    const now = new Date();
    
    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    
    const userMfa: UserMFA = {
      userId,
      methods: {
        totp: {
          type: 'totp',
          secret,
          enabled: method === 'totp',
          verified: method === 'totp',
          default: method === 'totp',
        },
      },
      backupCodes,
      enabledAt: now,
    };
    
    this.userMFA.set(userId, userMfa);
    return userMfa;
  }

  // Verify MFA code
  async verifyMFACode(userId: string, code: string): Promise<boolean> {
    const mfa = this.userMFA.get(userId);
    if (!mfa) return false;
    
    // Try TOTP
    if (mfa.methods.totp?.enabled) {
      const verified = this.verifyTOTPCode(mfa.methods.totp.secret, code);
      if (verified) {
        mfa.lastUsedAt = new Date();
        if (!mfa.methods.totp.verified) {
          mfa.methods.totp.verified = true;
        }
        return true;
      }
    }
    
    // Try backup code
    const backupVerified = this.verifyBackupCode(userId, code);
    if (backupVerified) {
      mfa.lastUsedAt = new Date();
      return true;
    }
    
    return false;
  }

  // Check if MFA is enabled for user
  isMFAEnabled(userId: string): boolean {
    const mfa = this.userMFA.get(userId);
    if (!mfa) return false;
    
    return Object.values(mfa.methods).some(m => m.enabled && m.verified);
  }

  // Check if MFA is required for user
  isMFARequired(userId: string): boolean {
    if (!this.config.mfa.required) return false;
    return this.isMFAEnabled(userId);
  }

  // Get MFA methods for user
  getMFAMethods(userId: string): MFAMethod[] {
    const mfa = this.userMFA.get(userId);
    if (!mfa) return [];
    
    return Object.values(mfa.methods) as MFAMethod[];
  }

  // Get backup codes
  getBackupCodes(userId: string): { codes: string[]; used: number; total: number } {
    const mfa = this.userMFA.get(userId);
    if (!mfa) return { codes: [], used: 0, total: 0 };
    
    const codes = mfa.backupCodes.map(c => c.code);
    const used = mfa.backupCodes.filter(c => c.used).length;
    
    return { codes, used, total: mfa.backupCodes.length };
  }

  // Regenerate backup codes
  regenerateBackupCodes(userId: string, count: number = this.config.mfa.backupCodesCount): BackupCode[] {
    const mfa = this.userMFA.get(userId);
    if (!mfa) throw new Error('User not found');
    
    const newCodes = this.generateBackupCodes(count);
    mfa.backupCodes = newCodes;
    
    return newCodes;
  }

  // Disable MFA for user
  disableMFA(userId: string): boolean {
    return this.userMFA.delete(userId);
  }
}
```

## Authentication Middleware

```typescript
// src/auth/middleware.ts
import { Request, Response, NextFunction } from 'express';
import { TokenService } from './token-service';
import { AuthRateLimiter } from './rate-limiter';
import { AuthConfig } from './config';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    deviceId?: string;
    deviceName?: string;
    permissions?: string[];
    mfaVerified?: boolean;
  };
  session?: any;
}

export class AuthMiddleware {
  private tokenService: TokenService;
  private rateLimiter: AuthRateLimiter;
  private config: AuthConfig;

  constructor(tokenService: TokenService, rateLimiter: AuthRateLimiter, config: AuthConfig) {
    this.tokenService = tokenService;
    this.rateLimiter = rateLimiter;
    this.config = config;
  }

  // Token authentication middleware
  tokenAuth() {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            error: 'UNAUTHORIZED',
            message: 'Authorization header required',
          });
        }
        
        const token = authHeader.substring(7);
        
        // Rate limit by IP
        const ip = req.ip || req.connection.remoteAddress || '';
        const rateLimitResult = await this.rateLimiter.checkIp(ip);
        if (!rateLimitResult.allowed) {
          return res.status(429).json({
            error: 'RATE_LIMITED',
            message: 'Too many requests',
            retryAfter: Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000),
          });
        }
        
        // Validate token
        const payload = await this.tokenService.validateToken(token);
        
        // Mark token as used if one-time use
        if (this.config.tokens.rotateOnUse) {
          this.tokenService.markTokenAsUsed(payload.jti!);
        }
        
        // Attach user to request
        req.user = {
          id: payload.sub,
          deviceId: payload.deviceId,
          deviceName: payload.deviceName,
          permissions: payload.permissions,
        };
        
        next();
      } catch (error) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: error.message,
        });
      }
    };
  }

  // Optional token authentication
  optionalTokenAuth() {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return next();
        }
        
        const token = authHeader.substring(7);
        const payload = await this.tokenService.validateToken(token);
        
        req.user = {
          id: payload.sub,
          deviceId: payload.deviceId,
          deviceName: payload.deviceName,
          permissions: payload.permissions,
        };
        
        next();
      } catch (error) {
        next();
      }
    };
  }

  // MFA verification middleware
  requireMFA() {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }
      
      // Check if MFA is required
      if (!req.user.mfaVerified) {
        return res.status(403).json({
          error: 'MFA_REQUIRED',
          message: 'Multi-factor authentication required',
        });
      }
      
      next();
    };
  }

  // Permission middleware
  requirePermission(...permissions: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }
      
      if (!req.user.permissions) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Insufficient permissions',
        });
      }
      
      const hasPermission = permissions.some(p => req.user!.permissions!.includes(p));
      
      if (!hasPermission) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Insufficient permissions',
          required: permissions,
          has: req.user.permissions,
        });
      }
      
      next();
    };
  }

  // Device authentication middleware
  deviceAuth() {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const deviceToken = req.headers['x-device-token'] as string;
        const deviceId = req.headers['x-device-id'] as string;
        
        if (!deviceToken || !deviceId) {
          return res.status(401).json({
            error: 'UNAUTHORIZED',
            message: 'Device authentication required',
          });
        }
        
        // Validate device token (implementation depends on your token storage)
        const isValid = await this.validateDeviceToken(deviceId, deviceToken);
        
        if (!isValid) {
          return res.status(401).json({
            error: 'UNAUTHORIZED',
            message: 'Invalid device token',
          });
        }
        
        req.user = { id: deviceId, deviceId };
        next();
      } catch (error) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: error.message,
        });
      }
    };
  }

  // Pairing authentication middleware (for WebSocket connections)
  pairingAuth(pairingService: any) {
    return async (req: any, next: (err?: any) => void) => {
      try {
        const token = req.headers['sec-websocket-protocol'] || req.headers.authorization;
        
        if (!token) {
          throw new Error('Pairing token required');
        }
        
        // Extract pairing code from token
        const code = token.replace('Bearer ', '');
        
        // Validate pairing code
        const request = pairingService.getPairingRequest(code);
        if (!request || request.used || new Date() > request.expiresAt) {
          throw new Error('Invalid or expired pairing code');
        }
        
        // Attach pairing info to request
        req.pairing = request;
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  private async validateDeviceToken(deviceId: string, token: string): Promise<boolean> {
    // Implementation depends on how you store device tokens
    // This is a placeholder
    return true;
  }
}
```

## Integration with Gateway

```typescript
// src/auth/service.ts
import { TokenService } from './token-service';
import { PairingService } from './pairing-service';
import { SessionService } from './session-service';
import { AuthRateLimiter } from './rate-limiter';
import { MFAService } from './mfa-service';
import { AuthMiddleware } from './middleware';
import { AuthConfig, DefaultAuthConfig } from './config';

export class AuthService {
  public tokenService: TokenService;
  public pairingService: PairingService;
  public sessionService: SessionService;
  public rateLimiter: AuthRateLimiter;
  public mfaService: MFAService;
  public middleware: AuthMiddleware;
  
  private config: AuthConfig;

  constructor(config: Partial<AuthConfig> = {}) {
    this.config = { ...DefaultAuthConfig, ...config };
    
    this.tokenService = new TokenService(this.config);
    this.rateLimiter = new AuthRateLimiter(this.config);
    this.pairingService = new PairingService(this.config, this.tokenService);
    this.sessionService = new SessionService(this.config, this.tokenService);
    this.mfaService = new MFAService(this.config);
    this.middleware = new AuthMiddleware(this.tokenService, this.rateLimiter, this.config);
  }

  // Initialize auth service
  async initialize(): Promise<void> {
    // Load existing sessions from database
    await this.sessionService.initializeDatabase();
  }

  // Create new pairing request
  async createPairing(userId: string, ipAddress: string, userAgent: string, deviceName?: string) {
    return this.pairingService.createPairingRequest(userId, ipAddress, userAgent, deviceName);
  }

  // Validate pairing code
  async validatePairing(code: string, ipAddress: string, userAgent: string) {
    return this.pairingService.validatePairing(code, ipAddress, userAgent);
  }

  // Create session from device token
  async createSession(userId: string, deviceToken: any, ipAddress: string, userAgent: string) {
    return this.sessionService.createSession(userId, deviceToken.deviceId, deviceToken, ipAddress, userAgent);
  }

  // Validate token
  async validateToken(token: string) {
    return this.tokenService.validateToken(token);
  }

  // Refresh token
  async refreshToken(refreshToken: string) {
    const payload = await this.tokenService.validateToken(refreshToken);
    return this.tokenService.rotateToken(refreshToken, payload);
  }

  // Invalidate session
  async invalidateSession(sessionId: string) {
    return this.sessionService.invalidateSession(sessionId);
  }

  // Check MFA
  async checkMFA(userId: string, code: string) {
    return this.mfaService.verifyMFACode(userId, code);
  }

  // Enable MFA
  async enableMFA(userId: string, method: 'totp' | 'webauthn', secret: string) {
    return this.mfaService.enableMFA(userId, method, secret);
  }

  // Check if MFA is required
  isMFARequired(userId: string) {
    return this.mfaService.isMFARequired(userId);
  }
}

// Integration with AgentGateway
// In src/core/gateway.ts
import { AuthService } from '../auth/service';

export class AgentGateway {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async initialize() {
    await this.authService.initialize();
    this.setupAuthRoutes();
    this.setupWebSocketAuth();
  }

  private setupAuthRoutes() {
    const router = express.Router();
    const auth = this.authService;
    
    // Pairing endpoint
    router.post('/api/pair', async (req, res) => {
      const { userId, deviceName } = req.body;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];
      
      const pairing = await auth.createPairing(userId, ip, userAgent, deviceName);
      res.json(pairing);
    });
    
    // Validate pairing endpoint
    router.post('/api/pair/validate', async (req, res) => {
      const { code } = req.body;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];
      
      const deviceToken = await auth.validatePairing(code, ip, userAgent);
      if (!deviceToken) {
        return res.status(401).json({ error: 'Invalid pairing code' });
      }
      
      // Create session
      const session = await auth.createSession(
        deviceToken.userId,
        deviceToken,
        ip,
        userAgent
      );
      
      res.json({ 
        session,
        token: deviceToken.token,
        refreshToken: deviceToken.refreshToken,
      });
    });
    
    // Token validation endpoint
    router.get('/api/auth/validate', auth.middleware.tokenAuth(), (req, res) => {
      res.json({ valid: true, user: req.user });
    });
    
    // Token refresh endpoint
    router.post('/api/auth/refresh', async (req, res) => {
      const { refreshToken } = req.body;
      try {
        const tokens = await auth.refreshToken(refreshToken);
        res.json(tokens);
      } catch (error) {
        res.status(401).json({ error: 'Invalid refresh token' });
      }
    });
    
    // Session invalidation endpoint
    router.post('/api/auth/invalidate', auth.middleware.tokenAuth(), async (req, res) => {
      const sessionId = req.headers['x-session-id'] as string;
      await auth.invalidateSession(sessionId);
      res.json({ success: true });
    });
    
    // MFA endpoints
    router.post('/api/mfa/setup', auth.middleware.tokenAuth(), async (req, res) => {
      const userId = req.user!.id;
      const { method } = req.body;
      
      if (method === 'totp') {
        const userEmail = this.getUserEmail(userId);
        const totp = await auth.mfaService.generateTOTPSecret(userId, userEmail);
        res.json(totp);
      }
    });
    
    router.post('/api/mfa/verify', auth.middleware.tokenAuth(), async (req, res) => {
      const userId = req.user!.id;
      const { code } = req.body;
      
      const verified = await auth.checkMFA(userId, code);
      if (verified) {
        // Mark MFA as verified for this session
        req.user!.mfaVerified = true;
        res.json({ success: true });
      } else {
        res.status(401).json({ error: 'Invalid MFA code' });
      }
    });
    
    this.app.use('/api', router);
  }

  private setupWebSocketAuth() {
    this.wsGateway.on('connection', (ws, req) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        // Try pairing flow
        const code = req.headers['sec-websocket-protocol'];
        if (code) {
          this.handleWebSocketPairing(ws, code, req);
        } else {
          ws.close(1008, 'Authentication required');
        }
        return;
      }
      
      const token = authHeader.substring(7);
      this.handleWebSocketTokenAuth(ws, token, req);
    });
  }

  private async handleWebSocketPairing(ws: any, code: string, req: any) {
    const ip = req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    try {
      const deviceToken = await this.authService.validatePairing(code, ip, userAgent);
      if (!deviceToken) {
        ws.close(1008, 'Invalid pairing code');
        return;
      }
      
      // Create session
      const session = await this.authService.createSession(
        deviceToken.userId,
        deviceToken,
        ip,
        userAgent
      );
      
      // Send paired response
      ws.send(JSON.stringify({
        type: 'paired',
        userId: deviceToken.userId,
        deviceId: deviceToken.deviceId,
        token: deviceToken.token,
        sessionId: session.id,
      }));
      
      // Store auth info on WebSocket
      (ws as any).userId = deviceToken.userId;
      (ws as any).deviceId = deviceToken.deviceId;
      (ws as any).sessionId = session.id;
      
    } catch (error) {
      ws.close(1008, 'Pairing failed');
    }
  }

  private async handleWebSocketTokenAuth(ws: any, token: string, req: any) {
    try {
      const payload = await this.authService.validateToken(token);
      
      // Get or create session
      let session = await this.sessionService.getSessionByToken(token);
      if (!session) {
        session = await this.sessionService.createSessionFromToken(token, req);
      }
      
      // Send paired response
      ws.send(JSON.stringify({
        type: 'paired',
        userId: payload.sub,
        deviceId: payload.deviceId,
        sessionId: session.id,
      }));
      
      // Store auth info on WebSocket
      ws.userId = payload.sub;
      ws.deviceId = payload.deviceId;
      ws.sessionId = session.id;
      
    } catch (error) {
      ws.close(1008, 'Authentication failed');
    }
  }
}
```

## Passwordless Authentication

```typescript
// src/auth/passwordless.ts
import { TokenService } from './token-service';
import { AuthConfig } from './config';

interface MagicLink {
  token: string;
  url: string;
  expiresAt: Date;
}

interface EmailAuthRequest {
  email: string;
  redirectUrl?: string;
  expiresAt: Date;
  used: boolean;
}

export class PasswordlessAuth {
  private tokenService: TokenService;
  private config: AuthConfig;
  private requests: Map<string, EmailAuthRequest> = new Map();

  constructor(tokenService: TokenService, config: AuthConfig) {
    this.tokenService = tokenService;
    this.config = config;
    
    // Cleanup expired requests
    setInterval(() => this.cleanup(), 60000);
  }

  // Generate magic link
  async generateMagicLink(email: string, redirectUrl?: string): Promise<MagicLink> {
    // Generate short-lived token
    const token = await this.tokenService.generateAccessToken({
      sub: email,
      type: 'magic_link',
      jti: randomBytes(16).toString('hex'),
    }, '15m'); // 15 minutes expiry
    
    // Generate URL
    const url = this.generateMagicLinkUrl(token, redirectUrl);
    
    // Store request
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    this.requests.set(email, {
      email,
      redirectUrl,
      expiresAt,
      used: false,
    });
    
    return { token, url, expiresAt };
  }

  // Validate magic link token
  async validateMagicLink(token: string): Promise<{ email: string; redirectUrl?: string } | null> {
    try {
      const payload = await this.tokenService.validateToken(token);
      
      if (payload.type !== 'magic_link') {
        return null;
      }
      
      // Get request
      const request = this.requests.get(payload.sub);
      if (!request || request.used || new Date() > request.expiresAt) {
        return null;
      }
      
      // Mark as used
      request.used = true;
      
      return {
        email: request.email,
        redirectUrl: request.redirectUrl,
      };
    } catch {
      return null;
    }
  }

  // Generate magic link URL
  private generateMagicLinkUrl(token: string, redirectUrl?: string): string {
    const baseUrl = redirectUrl || `${this.config.baseUrl || 'http://localhost:3000'}/auth/callback`;
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}token=${token}`;
  }

  // Cleanup expired requests
  private cleanup(): void {
    const now = new Date();
    for (const [email, request] of this.requests) {
      if (now > request.expiresAt) {
        this.requests.delete(email);
      }
    }
  }
}
```

## Directory Structure

```
authentication/
├── src/
│   ├── config.ts (Configuration schemas)
│   ├── token-service.ts (JWT token management)
│   ├── pairing-service.ts (Device pairing)
│   ├── session-service.ts (Session management)
│   ├── rate-limiter.ts (Rate limiting)
│   ├── mfa-service.ts (Multi-factor auth)
│   ├── middleware.ts (Express middleware)
│   ├── passwordless.ts (Passwordless auth)
│   ├── service.ts (Main auth service)
│   └── types.ts (Type definitions)
├── package.json
└── README.md
```

## Security Best Practices

1. **Use Strong Secrets**: JWT secrets should be at least 32 characters, randomly generated
2. **Token Rotation**: Rotate tokens on use to prevent replay attacks
3. **Short Expiry**: Set appropriate token expiry times (24h for access, 7d for refresh)
4. **HTTPS Only**: Always use HTTPS to prevent token interception
5. **Rate Limiting**: Implement rate limiting to prevent brute force attacks
6. **Secure Storage**: Store secrets in environment variables, not in code
7. **Input Validation**: Validate all inputs to prevent injection attacks
8. **CORS**: Configure CORS properly to restrict which origins can access the API
9. **Logging**: Log authentication events for auditing
10. **Monitoring**: Monitor for unusual authentication patterns

## Configuration Examples

### Production Configuration

```typescript
const productionConfig: AuthConfig = {
  jwt: {
    algorithm: 'RS256',
    secret: '', // Not used for RS256
    publicKey: process.env.JWT_PUBLIC_KEY || '',
    privateKey: process.env.JWT_PRIVATE_KEY || '',
    expiresIn: '15m', // Shorter expiry for production
    refreshExpiresIn: '7d',
    issuer: 'agent-gateway',
    audience: 'agent-gateway-client',
  },
  tokens: {
    pairingTimeout: 180, // 3 minutes
    deviceTokenExpiresIn: 86400, // 24 hours
    rotateOnUse: true,
    maxActiveTokensPerDevice: 3,
    maxActiveTokensPerUser: 5,
  },
  pairing: {
    codeLength: 8,
    codeChars: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
    qrCode: true,
  },
  session: {
    store: 'redis',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    maxSessionsPerUser: 5,
    sessionTimeout: 86400,
    rollingSessions: true,
  },
  mfa: {
    enabled: true,
    defaultMethod: 'totp',
    required: true,
    backupCodesCount: 10,
    backupCodesLength: 12,
  },
  rateLimit: {
    maxAttempts: 3,
    windowMs: 300000, // 5 minutes
    lockoutMs: 3600000, // 1 hour
    trustedIps: process.env.TRUSTED_IPS?.split(',') || [],
  },
};
```

## Testing

```typescript
// src/auth/service.test.ts
import { AuthService } from './service';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('AuthService', () => {
  let authService: AuthService;

  beforeAll(() => {
    authService = new AuthService({
      jwt: {
        secret: 'test-secret-at-least-32-characters-long-12345',
        expiresIn: '1h',
      },
    });
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should create and validate pairing code', async () => {
    const pairing = await authService.createPairing('user-123', '192.168.1.1', 'Test Browser');
    
    expect(pairing.code).toHaveLength(6);
    expect(pairing.deviceId).toBeDefined();
    expect(pairing.url).toContain(pairing.code);
    
    // Validate pairing (simulate mobile device connecting)
    const deviceToken = await authService.validatePairing(pairing.code, '192.168.1.1', 'Mobile App');
    
    expect(deviceToken).toBeDefined();
    expect(deviceToken!.userId).toBe('user-123');
    expect(deviceToken!.deviceId).toBe(pairing.deviceId);
  });

  it('should generate and validate JWT tokens', async () => {
    const tokens = await authService.tokenService.generateDeviceTokens('user-123', 'dev-123');
    
    expect(tokens.token).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    
    // Validate token
    const payload = await authService.validateToken(tokens.token);
    expect(payload.sub).toBe('user-123');
    expect(payload.deviceId).toBe('dev-123');
  });

  it('should rotate tokens', async () => {
    const tokens = await authService.tokenService.generateDeviceTokens('user-123', 'dev-123');
    
    // Use old token
    const payload1 = await authService.validateToken(tokens.token);
    
    // Rotate token
    const newTokens = await authService.tokenService.rotateToken(tokens.token, payload1);
    
    expect(newTokens.token).not.toBe(tokens.token);
    expect(newTokens.refreshToken).not.toBe(tokens.refreshToken);
    
    // Old token should be invalid (if rotateOnUse is true)
    try {
      await authService.validateToken(tokens.token);
      // If we get here, tokens are not one-time use
    } catch {
      // Token was marked as used
    }
  });

  it('should enforce rate limiting', async () => {
    const ip = '192.168.1.100';
    
    // First few requests should be allowed
    for (let i = 0; i < 3; i++) {
      const result = await authService.rateLimiter.checkIp(ip);
      expect(result.allowed).toBe(true);
    }
    
    // Next requests should be rate limited
    const result = await authService.rateLimiter.checkIp(ip);
    expect(result.allowed).toBe(false);
  });
});
```

## Resources

- [JSON Web Tokens (JWT)](https://jwt.io/) - JWT specification and libraries
- [jose](https://github.com/panva/jose) - JWT, JWS, JWE implementation for Node.js
- [Speakeasy](https://github.com/speakeasyjs/speakeasy) - TOTP generation and verification
- [WebAuthn](https://webauthn.io/) - FIDO2/WebAuthn specification
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) - Security best practices
- [Rate Limiter Flexible](https://github.com/animir/node-rate-limiter-flexible) - Rate limiting library

## Principles

1. **Security First**: All authentication flows prioritize security
2. **User Experience**: Make authentication as seamless as possible
3. **Defense in Depth**: Multiple layers of security (tokens, sessions, MFA, rate limiting)
4. **Least Privilege**: Grant only necessary permissions
5. **Auditability**: Log all authentication events for auditing
6. **Revocation**: Support token and session revocation
7. **Standard Compliance**: Follow industry standards (JWT, OWASP)
8. **Flexibility**: Support multiple authentication methods
