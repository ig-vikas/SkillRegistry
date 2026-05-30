import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AgentBadge } from '../../../components/agent-badge';
import { InstallCommand } from '../../../components/install-command';
import { SecurityBadge } from '../../../components/security-badge';
import { SkillReadme } from '../../../components/skill-readme';
import { getSkill } from '../../../lib/api';

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;

  let skill: Awaited<ReturnType<typeof getSkill>> | null = null;
  try {
    skill = await getSkill(name);
  } catch {
    notFound();
  }

  if (!skill) notFound();

  const content = (skill as { content?: string }).content ?? `# ${skill.name}\n\nNo content available.`;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{skill.name}</h1>
          <p className="text-zinc-400">v{skill.version} · @{skill.author}</p>
        </div>
        <SecurityBadge score={skill.security_score} />
      </div>

      <p className="text-lg text-zinc-300">{skill.description}</p>

      <div className="flex flex-wrap gap-2">
        {(skill.agents ?? []).map((a: string) => (
          <AgentBadge key={a} agent={a} />
        ))}
      </div>

      <InstallCommand name={skill.name} />

      <Link
        href={`/skills/${name}/security`}
        className="inline-block text-sm text-blue-400 hover:underline"
      >
        View security report →
      </Link>

      <SkillReadme content={content} />
    </div>
  );
}
