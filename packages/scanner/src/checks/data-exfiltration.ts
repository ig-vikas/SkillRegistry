import { DATA_EXFIL_PATTERNS } from '../patterns.js';
import { scanPatterns } from './utils.js';
import type { CheckFunction } from './prompt-injection.js';

/** Detect data exfiltration patterns */
const checkDataExfiltration: CheckFunction = (content, _metadata) => {
  void _metadata;
  return scanPatterns(
    content,
    DATA_EXFIL_PATTERNS,
    'DATA_EXFILTRATION',
    'high',
    'Potential data exfiltration pattern detected',
  );
};

export default checkDataExfiltration;
