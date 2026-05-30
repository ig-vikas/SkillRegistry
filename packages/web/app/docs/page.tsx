import Link from 'next/link';

export default function DocsPage() {
  const links = [
    { href: '/docs/getting-started', title: 'Getting started' },
    { href: '/docs/creating-skills', title: 'Creating skills' },
    { href: '/docs/security', title: 'Security scanner' },
    { href: '/docs/mcp-server', title: 'MCP server' },
  ];

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Documentation</h1>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-blue-400 hover:underline">
              {l.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
