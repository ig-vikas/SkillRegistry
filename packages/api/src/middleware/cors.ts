import type { MiddlewareHandler } from 'hono';

/**
 * CORS middleware for API.
 * @param origin - Allowed origin
 * @returns Hono middleware
 */
export function corsMiddleware(origin = '*'): MiddlewareHandler {
  return async (c, next) => {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    c.header('Access-Control-Allow-Credentials', 'true');

    if (c.req.method === 'OPTIONS') {
      return c.body(null, 204);
    }

    await next();
  };
}
