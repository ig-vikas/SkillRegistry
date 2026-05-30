import type { Context } from 'hono';
import type { z } from 'zod';

/**
 * Validate JSON body with Zod schema.
 * @param schema - Zod schema
 * @returns Hono middleware
 */
export function validateBody<T extends z.ZodType>(schema: T) {
  return async (c: Context, next: () => Promise<void>) => {
    const body: unknown = await c.req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return c.json(
        {
          success: false,
          data: null,
          error: { code: 'VALIDATION_ERROR', message: result.error.message },
          meta: null,
        },
        400,
      );
    }
    c.set('validatedBody', result.data);
    await next();
  };
}
