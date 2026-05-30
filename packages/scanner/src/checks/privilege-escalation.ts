import { PRIVILEGE_PATTERNS } from '../patterns.js';
import { scanPatterns } from './utils.js';
import type { CheckFunction } from './prompt-injection.js';

/** Detect privilege escalation patterns */
const checkPrivilegeEscalation: CheckFunction = (content, _metadata) => {
  void _metadata;
  return scanPatterns(
    content,
    PRIVILEGE_PATTERNS,
    'PRIVILEGE_ESCALATION',
    'high',
    'Privilege escalation pattern detected',
  );
};

export default checkPrivilegeEscalation;
