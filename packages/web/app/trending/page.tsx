import { SkillCard } from '../../components/skill-card';
import { getSkills, getTrending } from '../../lib/api';
import type { RegistryEntry } from '@skillregistry/core';

export default async function TrendingPage() {
  let items: RegistryEntry[] = [];
  try {
    const [trending, skills] = await Promise.all([getTrending(20), getSkills()]);
    items = trending.map((t) => skills[t.name]).filter(Boolean) as RegistryEntry[];
  } catch {
    /* empty */
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Trending skills</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((skill) => (
          <SkillCard key={skill.name} skill={skill} />
        ))}
      </div>
    </div>
  );
}
