import { Hono } from 'hono';
import { CATEGORIES } from '@skillregistry/core';
import { ok } from '../lib/envelope.js';

/**
 * Create categories routes.
 */
export function createCategoriesRoutes() {
  const app = new Hono();

  app.get('/', (c) => c.json(ok([...CATEGORIES])));

  return app;
}
