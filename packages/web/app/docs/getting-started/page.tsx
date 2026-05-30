export default function GettingStartedPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1>Getting started</h1>
      <pre className="rounded bg-zinc-900 p-4">npx skillregistry add react-expert</pre>
      <p>Install skills for Cursor, Claude Code, Codex, and more. Every install is scanned first.</p>
      <h2>Initialize a project</h2>
      <pre className="rounded bg-zinc-900 p-4">npx skillregistry init</pre>
      <h2>Search the registry</h2>
      <pre className="rounded bg-zinc-900 p-4">npx skillregistry search react</pre>
    </article>
  );
}
