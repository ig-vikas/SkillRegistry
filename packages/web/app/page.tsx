import Link from 'next/link';
import { SkillCard } from '../components/skill-card';
import { getSkills, getStats, getTrending } from '../lib/api';
import type { RegistryEntry } from '@skillregistry/core';

export default async function HomePage() {
  let stats = { skills: 0, authors: 0, downloads: 0 };
  let trending: RegistryEntry[] = [];
  let skills: Record<string, RegistryEntry> = {};

  try {
    stats = await getStats();
    const trendingData = await getTrending(6);
    skills = await getSkills();
    trending = trendingData.map((t) => skills[t.name]).filter(Boolean) as RegistryEntry[];
  } catch {
    /* API offline — show static marketing */
  }

  const featured = Object.values(skills).slice(0, 6);

  return (
    <div className="space-y-12">
      <section className="text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          npm for <span className="text-blue-400">AI agent skills</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-zinc-400">
          Discover, install, and publish reusable skills for Cursor, Claude Code, Codex, and more —
          with an 8-point security scanner that blocks unsafe skills before installation.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link
            href="/skills"
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-500"
          >
            Browse skills
          </Link>
          <Link
            href="/docs/getting-started"
            className="rounded-lg border border-zinc-700 px-6 py-3 hover:bg-zinc-900"
          >
            Get started
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-4 text-center">
        <div className="rounded-lg border border-zinc-800 p-4">
          <div className="text-3xl font-bold text-blue-400">{stats.skills}</div>
          <div className="text-sm text-zinc-500">Skills</div>
        </div>
        <div className="rounded-lg border border-zinc-800 p-4">
          <div className="text-3xl font-bold text-blue-400">{stats.authors}</div>
          <div className="text-sm text-zinc-500">Authors</div>
        </div>
        <div className="rounded-lg border border-zinc-800 p-4">
          <div className="text-3xl font-bold text-blue-400">{stats.downloads}</div>
          <div className="text-sm text-zinc-500">Downloads</div>
        </div>
      </section>

      {featured.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-semibold">Featured skills</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((skill) => (
              <SkillCard key={skill.name} skill={skill} />
            ))}
          </div>
        </section>
      )}

      {trending.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-semibold">Trending</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trending.map((skill) => (
              <SkillCard key={skill.name} skill={skill} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
