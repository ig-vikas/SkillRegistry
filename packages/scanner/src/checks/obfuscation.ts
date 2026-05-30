import { OBFUSCATION_PATTERNS } from '../patterns.js';
import { scanPatterns } from './utils.js';
import type { CheckFunction } from './prompt-injection.js';

/** Detect obfuscated or encoded content */
const checkObfuscation: CheckFunction = (content, _metadata) => {
  void _metadata;
  return scanPatterns(
    content,
    OBFUSCATION_PATTERNS,
    'OBFUSCATION',
    'medium',
    'Obfuscated or encoded content detected',
  );
};

export default checkObfuscation;
