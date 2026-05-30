import { SkillCard } from '../../components/skill-card';
import { getSkills } from '../../lib/api';

export default async function SkillsPage() {
  let skills: Awaited<ReturnType<typeof getSkills>> = {};
  try {
    skills = await getSkills();
  } catch {
    /* empty */
  }

  const list = Object.values(skills);

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">All skills</h1>
      {list.length === 0 ? (
        <p className="text-zinc-400">No skills found. Start the API or check registry.json.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((skill) => (
            <SkillCard key={skill.name} skill={skill} />
          ))}
        </div>
      )}
    </div>
  );
}
