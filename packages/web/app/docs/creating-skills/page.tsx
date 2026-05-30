export default function CreatingSkillsPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1>Creating skills</h1>
      <pre className="rounded bg-zinc-900 p-4">npx skillregistry create my-skill</pre>
      <p>Skills are SKILL.md files with YAML frontmatter. See SKILL_SPEC.md in the repository.</p>
    </article>
  );
}
