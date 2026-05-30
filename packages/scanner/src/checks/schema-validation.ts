import { skillFrontmatterSchema } from '@skillregistry/core';
import type { CheckFunction } from './prompt-injection.js';

/** Validate skill metadata against Zod schema */
const checkSchemaValidation: CheckFunction = (_content, metadata) => {
  const result = skillFrontmatterSchema.safeParse(metadata);
  if (result.success) {
    return [];
  }

  return result.error.issues.map((issue) => ({
    severity: 'medium' as const,
    code: 'SCHEMA_VALIDATION',
    message: `Schema validation: ${issue.path.join('.')}: ${issue.message}`,
  }));
};

export default checkSchemaValidation;
