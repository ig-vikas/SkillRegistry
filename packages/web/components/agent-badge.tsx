interface AgentBadgeProps {
  agent: string;
}

const LABELS: Record<string, string> = {
  'claude-code': 'Claude',
  cursor: 'Cursor',
  codex: 'Codex',
  copilot: 'Copilot',
  'gemini-cli': 'Gemini',
  openclaw: 'OpenClaw',
  windsurf: 'Windsurf',
};

export function AgentBadge({ agent }: AgentBadgeProps) {
  return (
    <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
      {LABELS[agent] ?? agent}
    </span>
  );
}
