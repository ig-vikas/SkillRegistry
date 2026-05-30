import { Hono } from 'hono';
import { z } from 'zod';
import { scanSkill } from '@skillregistry/scanner';
import { skillFrontmatterSchema } from '@skillregistry/core';
import { ok } from '../lib/envelope.js';

const scanBodySchema = z.object({
  content: z.string(),
  metadata: skillFrontmatterSchema.optional(),
});

/**
 * Create scan routes.
 */
export function createScanRoutes() {
  const app = new Hono();

  app.post('/', async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json(
        {
          success: false,
          data: null,
          error: { code: 'VALIDATION_ERROR', message: 'Request body must be valid JSON' },
          meta: null,
        },
        400,
      );
    }

    const parsed = scanBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          success: false,
          data: null,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
          meta: null,
        },
        400,
      );
    }

    const metadata = parsed.data.metadata ?? {
      name: 'scan-preview',
      version: '0.0.0',
      description: 'preview',
      author: 'anonymous',
      license: 'MIT',
      agents: ['cursor'] as const,
      categories: ['code-quality'] as const,
      tags: [],
    };

    const report = scanSkill(parsed.data.content, metadata);
    return c.json(ok(report));
  });

  return app;
}
