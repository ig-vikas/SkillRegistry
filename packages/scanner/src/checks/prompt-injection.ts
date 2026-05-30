import type { Skill, SecurityIssue } from '@skillregistry/core';
import { PROMPT_INJECTION_PATTERNS } from '../patterns.js';
import { scanPatterns } from './utils.js';

export type CheckFunction = (content: string, metadata: Skill) => SecurityIssue[];

/** Detect prompt injection patterns in skill content */
const checkPromptInjection: CheckFunction = (content, _metadata) => {
  void _metadata;
  return scanPatterns(
    content,
    PROMPT_INJECTION_PATTERNS,
    'PROMPT_INJECTION',
    'critical',
    'Potential prompt injection pattern detected',
  );
};

export default checkPromptInjection;
