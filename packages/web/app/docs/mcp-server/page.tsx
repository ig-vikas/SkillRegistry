export default function McpDocsPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1>MCP server</h1>
      <p>Add to your Cursor MCP config:</p>
      <pre className="rounded bg-zinc-900 p-4">{`{
  "mcpServers": {
    "skillregistry": {
      "command": "npx",
      "args": ["@skillregistry/mcp-server"]
    }
  }
}`}</pre>
    </article>
  );
}
