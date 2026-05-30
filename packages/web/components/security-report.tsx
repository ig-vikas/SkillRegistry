import { SecurityBadge } from './security-badge';

interface Issue {
  severity: string;
  code: string;
  message: string;
  line?: number;
}

interface SecurityReportProps {
  report: {
    score: number;
    passed: boolean;
    blocked: boolean;
    issues: Issue[];
  };
}

export function SecurityReportView({ report }: SecurityReportProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <SecurityBadge score={report.score} />
        <span className={report.passed ? 'text-green-400' : 'text-red-400'}>
          {report.passed ? 'Passed' : 'Failed'}
        </span>
        {report.blocked && <span className="text-red-500 font-medium">Blocked</span>}
      </div>
      <ul className="space-y-2">
        {report.issues.map((issue, i) => (
          <li key={i} className="rounded border border-zinc-800 p-3 text-sm">
            <span className="font-mono text-xs text-zinc-500">
              [{issue.severity}] {issue.code}
            </span>
            <p className="mt-1">{issue.message}</p>
            {issue.line && <p className="text-zinc-500">Line {issue.line}</p>}
          </li>
        ))}
      </ul>
      {report.issues.length === 0 && (
        <p className="text-zinc-400">No issues found. This skill looks clean.</p>
      )}
    </div>
  );
}
