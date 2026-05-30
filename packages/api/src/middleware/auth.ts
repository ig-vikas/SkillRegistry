import type { MiddlewareHandler } from 'hono';
import * as jose from 'jose';

export interface AuthUser {
  id: string;
  username: string;
  githubId: string;
}

/**
 * JWT auth middleware.
 * @param secret - JWT secret
 * @returns Hono middleware
 */
export function authMiddleware(secret: string): MiddlewareHandler {
  return async (c, next) => {
    const header = c.req.header('Authorization');
    const cookie = c.req.header('Cookie')?.match(/skr_token=([^;]+)/)?.[1];
    const token = header?.startsWith('Bearer ') ? header.slice(7) : cookie;

    if (!token) {
      return c.json(
        {
          success: false,
          data: null,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          meta: null,
        },
        401,
      );
    }

    try {
      const { payload } = await jose.jwtVerify(
        token,
        new TextEncoder().encode(secret),
      );
      c.set('user', {
        id: String(payload.sub),
        username: String(payload.username),
        githubId: String(payload.githubId),
      } satisfies AuthUser);
      await next();
    } catch {
      return c.json(
        {
          success: false,
          data: null,
          error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
          meta: null,
        },
        401,
      );
    }
  };
}

/**
 * Optional auth — sets user if token present.
 * @param secret - JWT secret
 * @returns Hono middleware
 */
export function optionalAuthMiddleware(secret: string): MiddlewareHandler {
  return async (c, next) => {
    const header = c.req.header('Authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (token) {
      try {
        const { payload } = await jose.jwtVerify(
          token,
          new TextEncoder().encode(secret),
        );
        c.set('user', {
          id: String(payload.sub),
          username: String(payload.username),
          githubId: String(payload.githubId),
        } satisfies AuthUser);
      } catch {
        /* ignore */
      }
    }
    await next();
  };
}
