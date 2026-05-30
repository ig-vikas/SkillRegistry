import type { SecurityIssue } from '@skillregistry/core';
import { ALLOWED_DOMAINS, EXTERNAL_URL_PATTERNS } from '../patterns.js';
import { dedupeIssues, lineNumber, snippet } from './utils.js';
import type { CheckFunction } from './prompt-injection.js';

const URL_REGEX = /https?:\/\/[^\s)\]"'<>]+/gi;

/** Detect suspicious external URLs */
const checkExternalFetches: CheckFunction = (content, _metadata) => {
  void _metadata;
  const issues: SecurityIssue[] = [];

  for (const pattern of EXTERNAL_URL_PATTERNS) {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
    const re = new RegExp(pattern.source, flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      issues.push({
        severity: 'medium',
        code: 'EXTERNAL_FETCH',
        message: 'Suspicious URL pattern detected',
        line: lineNumber(content, match.index),
        evidence: snippet(content, lineNumber(content, match.index)),
      });
    }
  }

  let urlMatch: RegExpExecArray | null;
  const urlRe = new RegExp(URL_REGEX.source, URL_REGEX.flags);
  while ((urlMatch = urlRe.exec(content)) !== null) {
    const url = urlMatch[0];
    const isAllowed = ALLOWED_DOMAINS.some((d) => url.includes(d));
    if (!isAllowed && /https?:\/\//.test(url)) {
      const unknownCdn = /\.(xyz|top|buzz|click)\//i.test(url);
      if (unknownCdn) {
        issues.push({
          severity: 'low',
          code: 'EXTERNAL_FETCH',
          message: 'Unknown external URL reference',
          line: lineNumber(content, urlMatch.index),
          evidence: url.slice(0, 80),
        });
      }
    }
  }

  return dedupeIssues(issues);
};

export default checkExternalFetches;
