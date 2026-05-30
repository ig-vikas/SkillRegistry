import type { SecurityIssue } from '@skillregistry/core';

/**
 * Get 1-based line number for a character index.
 * @param content - Full content
 * @param index - Character index
 * @returns Line number
 */
export function lineNumber(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

/**
 * Extract a snippet around a line.
 * @param content - Full content
 * @param line - 1-based line number
 * @returns Snippet string
 */
export function snippet(content: string, line: number): string {
  const lines = content.split('\n');
  const idx = line - 1;
  if (idx < 0 || idx >= lines.length) return '';
  return lines[idx]?.trim().slice(0, 120) ?? '';
}

/**
 * Deduplicate issues by code and line.
 * @param issues - Raw issues
 * @returns Deduplicated issues
 */
export function dedupeIssues(issues: SecurityIssue[]): SecurityIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.line ?? 0}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Scan content with regex patterns.
 * @param content - Content to scan
 * @param patterns - Patterns to match
 * @param code - Issue code
 * @param severity - Issue severity
 * @param message - Issue message template
 * @returns Found issues
 */
export function scanPatterns(
  content: string,
  patterns: RegExp[],
  code: string,
  severity: SecurityIssue['severity'],
  message: string,
): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  for (const pattern of patterns) {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
    const re = new RegExp(pattern.source, flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      const line = lineNumber(content, match.index);
      issues.push({
        severity,
        code,
        message,
        line,
        evidence: snippet(content, line),
      });
    }
  }
  return dedupeIssues(issues);
}
