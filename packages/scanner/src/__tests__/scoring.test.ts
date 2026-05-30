import type { SecurityIssue } from '@skillregistry/core';
import { describe, expect, it } from 'vitest';
import { calculateScore, isBlocked, passed } from '../scoring.js';

describe('calculateScore', () => {
  it('starts at 100 with no issues', () => {
    expect(calculateScore([])).toBe(100);
  });

  it('deducts for severities', () => {
    const issues: SecurityIssue[] = [
      { severity: 'critical', code: 'X', message: 'a' },
      { severity: 'high', code: 'Y', message: 'b' },
    ];
    expect(calculateScore(issues)).toBe(60);
  });

  it('floors at 0', () => {
    const issues: SecurityIssue[] = Array.from({ length: 10 }, () => ({
      severity: 'critical' as const,
      code: 'X',
      message: 'a',
    }));
    expect(calculateScore(issues)).toBe(0);
  });
});

describe('isBlocked', () => {
  it('blocks on critical', () => {
    expect(isBlocked([{ severity: 'critical', code: 'X', message: 'a' }], 100)).toBe(true);
  });

  it('blocks on low score', () => {
    expect(isBlocked([], 20)).toBe(true);
  });
});

describe('passed', () => {
  it('passes at 50+', () => {
    expect(passed(50)).toBe(true);
    expect(passed(49)).toBe(false);
  });
});
