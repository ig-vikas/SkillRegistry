#!/usr/bin/env node
import { resolve, sep } from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { scanSkill } from '@skillregistry/scanner';
import { detectInstalledAgents } from '@skillregistry/cli/agent-detector';
import { installSkill, listInstalled } from '@skillregistry/cli/installer';
import { agentTypeSchema, categorySchema } from '@skillregistry/core';
import type {
  AgentType,
  SkillManifest,
  SkillSearchResult,
  TrendingSkill,
} from '@skillregistry/core';
import { RegistryClient } from './client.js';

export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolError';
  }
}

export interface RegistryClientLike {
  search(
    query: string,
    opts?: { category?: string; agent?: string; limit?: number },
  ): Promise<SkillSearchResult[]>;
  getSkill(name: string): Promise<SkillManifest>;
  getTrending(period?: 'day' | 'week' | 'month', limit?: number): Promise<TrendingSkill[]>;
  getCatalog(): Promise<{ skills: Record<string, unknown> }>;
}

export const toolInputSchemas = {
  search_skills: z.object({
    query: z.string().min(1),
    category: categorySchema.optional(),
    agent: agentTypeSchema.optional(),
    limit: z.number().int().positive().optional(),
  }),
  get_skill: z.object({ name: z.string().min(1), version: z.string().optional() }),
  install_skill: z.object({
    name: z.string().min(1),
    agent: agentTypeSchema.optional(),
    project_dir: z.string().optional(),
  }),
  list_installed: z.object({
    agent: agentTypeSchema.optional(),
    project_dir: z.string().optional(),
  }),
  check_updates: z.object({ project_dir: z.string().optional() }),
  scan_skill: z.object({ content: z.string().min(1) }),
  get_trending: z.object({
    period: z.enum(['day', 'week', 'month']).optional(),
    limit: z.number().int().positive().optional(),
  }),
} as const;

export type ToolName = keyof typeof toolInputSchemas;

export async function callTool(
  name: string,
  args: unknown,
  registryClient: RegistryClientLike = new RegistryClient(),
): Promise<unknown> {
  switch (name) {
    case 'search_skills': {
      const input = toolInputSchemas.search_skills.parse(args);
      return registryClient.search(input.query, {
        ...(input.category ? { category: input.category } : {}),
        ...(input.agent ? { agent: input.agent } : {}),
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
      });
    }
    case 'get_skill': {
      const input = toolInputSchemas.get_skill.parse(args);
      try {
        return await registryClient.getSkill(input.name);
      } catch (err) {
        throw new ToolError(err instanceof Error ? err.message : `Skill not found: ${input.name}`);
      }
    }
    case 'install_skill': {
      const input = toolInputSchemas.install_skill.parse(args);
      const projectDir = input.project_dir ?? process.cwd();
      const manifest = await registryClient.getSkill(input.name);
      const agents: AgentType[] = input.agent
        ? [input.agent]
        : await detectInstalledAgents(projectDir);
      return installSkill({ manifest, agents, projectDir });
    }
    case 'list_installed': {
      const input = toolInputSchemas.list_installed.parse(args ?? {});
      return listInstalled(input.project_dir ?? process.cwd(), input.agent);
    }
    case 'check_updates':
      toolInputSchemas.check_updates.parse(args ?? {});
      return { message: 'Use CLI skillregistry update for full check' };
    case 'scan_skill': {
      const input = toolInputSchemas.scan_skill.parse(args);
      return scanSkill(input.content);
    }
    case 'get_trending': {
      const input = toolInputSchemas.get_trending.parse(args ?? {});
      return registryClient.getTrending(input.period, input.limit);
    }
    default:
      throw new ToolError(`Unknown tool: ${name}`);
  }
}

function textResult(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

export function createSkillRegistryServer(
  registryClient: RegistryClientLike = new RegistryClient(),
) {
  const server = new Server(
    { name: 'skillregistry', version: '0.1.0' },
    { capabilities: { tools: {}, resources: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'search_skills',
        description: 'Search the skill registry',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            category: { type: 'string' },
            agent: { type: 'string' },
            limit: { type: 'number' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_skill',
        description: 'Get a skill manifest by name',
        inputSchema: {
          type: 'object',
          properties: { name: { type: 'string' }, version: { type: 'string' } },
          required: ['name'],
        },
      },
      {
        name: 'install_skill',
        description: 'Install a skill for an agent',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            agent: { type: 'string' },
            project_dir: { type: 'string' },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_installed',
        description: 'List installed skills',
        inputSchema: {
          type: 'object',
          properties: { agent: { type: 'string' }, project_dir: { type: 'string' } },
        },
      },
      {
        name: 'check_updates',
        description: 'Check for skill updates',
        inputSchema: {
          type: 'object',
          properties: { project_dir: { type: 'string' } },
        },
      },
      {
        name: 'scan_skill',
        description: 'Scan skill content for security issues',
        inputSchema: {
          type: 'object',
          properties: { content: { type: 'string' } },
          required: ['content'],
        },
      },
      {
        name: 'get_trending',
        description: 'Get trending skills',
        inputSchema: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['day', 'week', 'month'] },
            limit: { type: 'number' },
          },
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      return textResult(await callTool(name, args, registryClient));
    } catch (err) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
          },
        ],
        isError: true,
      };
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      { uri: 'skillregistry://catalog', name: 'Skill Catalog', mimeType: 'application/json' },
      { uri: 'skillregistry://skill/{name}', name: 'Skill Content', mimeType: 'text/markdown' },
      {
        uri: 'skillregistry://security/{name}',
        name: 'Security Report',
        mimeType: 'application/json',
      },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    if (uri === 'skillregistry://catalog') {
      const catalog = await registryClient.getCatalog();
      return {
        contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(catalog, null, 2) }],
      };
    }

    const skillMatch = uri.match(/^skillregistry:\/\/skill\/(.+)$/);
    if (skillMatch?.[1]) {
      const manifest = await registryClient.getSkill(skillMatch[1]);
      return {
        contents: [{ uri, mimeType: 'text/markdown', text: manifest.content }],
      };
    }

    const secMatch = uri.match(/^skillregistry:\/\/security\/(.+)$/);
    if (secMatch?.[1]) {
      const manifest = await registryClient.getSkill(secMatch[1]);
      const report = scanSkill(manifest.content, manifest);
      return {
        contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(report, null, 2) }],
      };
    }

    throw new Error(`Unknown resource: ${uri}`);
  });

  return server;
}

async function main() {
  const server = createSkillRegistryServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function isExecutableEntrypoint(): boolean {
  const executedPath = process.argv[1] ? resolve(process.argv[1]) : '';
  return executedPath.includes(`${sep}mcp-server${sep}`) && /index\.(c?js)$/.test(executedPath);
}

if (isExecutableEntrypoint()) {
  main().catch(console.error);
}
