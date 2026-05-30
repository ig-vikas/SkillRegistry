import { DANGEROUS_CMD_PATTERNS } from '../patterns.js';
import { scanPatterns } from './utils.js';
import type { CheckFunction } from './prompt-injection.js';

/** Detect dangerous shell commands */
const checkDangerousCommands: CheckFunction = (content, _metadata) => {
  void _metadata;
  return scanPatterns(
    content,
    DANGEROUS_CMD_PATTERNS,
    'DANGEROUS_COMMAND',
    'critical',
    'Dangerous shell command pattern detected',
  );
};

export default checkDangerousCommands;
