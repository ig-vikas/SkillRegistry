import type { SecurityIssue } from '@skillregistry/core';

const DEDUCTIONS: Record<SecurityIssue['severity'], number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 0,
};

/**
 * Calculate security score from issues (starts at 100).
 * @param issues - List of security issues
 * @returns Score 0-100
 */
export function calculateScore(issues: SecurityIssue[]): number {
  let score = 100;
  for (const issue of issues) {
    score -= DEDUCTIONS[issue.severity];
  }
  return Math.max(0, score);
}

/**
 * Whether scan passed minimum threshold.
 * @param score - Security score
 * @returns True if score >= 50
 */
export function passed(score: number): boolean {
  return score >= 50;
}

/**
 * Whether skill should be blocked from install.
 * @param issues - Security issues
 * @param score - Computed score
 * @returns True if blocked
 */
export function isBlocked(issues: SecurityIssue[], score: number): boolean {
  const hasCritical = issues.some((i) => i.severity === 'critical');
  return hasCritical || score < 30;
}
