import { SECRET_PATTERNS } from '../patterns.js';
import { scanPatterns } from './utils.js';
import type { CheckFunction } from './prompt-injection.js';

/** Detect secrets and credentials in skill content */
const checkSecretDetection: CheckFunction = (content, _metadata) => {
  void _metadata;
  const issues = scanPatterns(
    content,
    SECRET_PATTERNS,
    'SECRET_DETECTED',
    'critical',
    'Potential secret or credential detected',
  );
  return issues.map((issue) =>
    issue.evidence ? { ...issue, evidence: '[REDACTED]' } : issue,
  );
};

export default checkSecretDetection;
