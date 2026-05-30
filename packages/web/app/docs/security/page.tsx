export default function SecurityDocsPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1>Security scanner</h1>
      <p>SkillRegistry runs 8 security checks on every skill:</p>
      <ol>
        <li>Prompt injection detection</li>
        <li>Data exfiltration patterns</li>
        <li>Secret / credential detection</li>
        <li>Dangerous shell commands</li>
        <li>Obfuscation detection</li>
        <li>Privilege escalation</li>
        <li>External fetch analysis</li>
        <li>Schema validation</li>
      </ol>
      <pre className="rounded bg-zinc-900 p-4">npx skillregistry scan ./my-skill</pre>
    </article>
  );
}
