import React from 'react';
import { cn } from '../lib/utils';

interface SecurityBadgeProps {
  score: number;
  className?: string;
}

export function SecurityBadge({ score, className }: SecurityBadgeProps) {
  const variant =
    score >= 80 ? 'bg-green-500/20 text-green-400' : score >= 50 ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400';

  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', variant, className)}
      aria-label={`Security score ${score} out of 100`}
    >
      {score}
    </span>
  );
}
