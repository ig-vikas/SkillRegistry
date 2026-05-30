import Link from 'next/link';
import type { RegistryEntry } from '@skillregistry/core';
import { AgentBadge } from './agent-badge';
import { SecurityBadge } from './security-badge';
import { InstallCommand } from './install-command';

interface SkillCardProps {
  skill: RegistryEntry;
}

export function SkillCard({ skill }: SkillCardProps) {
  return (
    <article className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-600">
      <div className="mb-2 flex items-start justify-between gap-2">
        <Link href={`/skills/${skill.name}`} className="text-lg font-semibold hover:text-blue-400">
          {skill.name}
        </Link>
        <SecurityBadge score={skill.security_score} />
      </div>
      <p className="mb-3 text-sm text-zinc-400 line-clamp-2">{skill.description}</p>
      <div className="mb-3 flex flex-wrap gap-1">
        {skill.agents.slice(0, 4).map((a) => (
          <AgentBadge key={a} agent={a} />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>@{skill.author}</span>
        <span>{skill.downloads.toLocaleString()} downloads</span>
      </div>
      <div className="mt-3">
        <InstallCommand name={skill.name} />
      </div>
    </article>
  );
}
