---
name: mcp-builder
version: 1.0.0
description: Build Model Context Protocol servers and clients with the TypeScript SDK, tools, resources, prompts, stdio and Streamable HTTP transports, Zod schemas, auth, and security review.
author: skillregistry
license: MIT
agents:
  - cursor
  - claude-code
categories:
  - ai-ml
tags:
  - mcp
  - ai-ml
  - tools
---

# MCP Builder

Build MCP servers that expose narrowly scoped tools, resources, and prompts to agent clients. Treat MCP tools as privileged APIs: validate inputs, minimize permissions, and document side effects.

## Workflow

1. Define the client use case and list only the tools/resources needed.
2. Choose transport: stdio for local desktop/CLI agents, Streamable HTTP for networked clients.
3. Define every tool input with Zod and return structured content.
4. Keep tool handlers small and authorization-aware.
5. Add logging and tests for tool success, validation failure, and permission denial.
6. Review for prompt injection and tool-confusion risks before enabling broad access.

## TypeScript Server Pattern

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "agent-gateway-tools",
  version: "1.0.0",
});

server.registerTool(
  "get_session",
  {
    title: "Get session",
    description: "Read a gateway session by ID.",
    inputSchema: { sessionId: z.string().min(1).max(128) },
  },
  async ({ sessionId }) => {
    const session = await sessionStore.get(sessionId);
    return {
      content: [{ type: "text", text: JSON.stringify(session) }],
    };
  },
);

await server.connect(new StdioServerTransport());
```

## Rules

- Use descriptive tool names; avoid lookalike names that could confuse agents.
- Validate all inputs with Zod and enforce authorization inside handlers.
- Mark destructive tools clearly and require explicit approval outside MCP when appropriate.
- Do not expose raw filesystem, shell, or network access as generic tools unless sandboxed.
- Return bounded output; large data should be exposed as resources or paginated.
- Prefer resources for read-only context and tools for actions.

## Verification

```bash
pnpm test
pnpm exec tsc --noEmit
```

Test with a real MCP client when possible and inspect tool schemas before use.

## Resources

- **[Model Context Protocol Docs](https://modelcontextprotocol.io/)** - Protocol concepts and specification.
- **[MCP SDKs](https://modelcontextprotocol.io/docs/sdk)** - Official SDK list.
- **[MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/)** - TypeScript API reference and examples.
- **[MCP GitHub](https://github.com/modelcontextprotocol)** - SDK repositories.

## Principles

1. Tools are capabilities, not documentation.
2. Validate and authorize every call.
3. Keep tool effects narrow and auditable.
4. Prefer least privilege over convenience.
5. Stdio is local; HTTP needs real auth.
