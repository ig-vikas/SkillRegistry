import type { AgentType } from '@skillregistry/core';
import { listInstalled } from '../utils/installer.js';
import { printTable } from '../utils/display.js';

export interface ListOptions {
  agent?: AgentType;
  global?: boolean;
  cwd?: string;
}

/**
 * List installed skills.
 * @param options - List options
 */
export async function runList(options?: ListOptions): Promise<void> {
  const cwd = options?.cwd ?? process.cwd();
  const installed = await listInstalled(cwd, options?.agent, options?.global);

  if (installed.length === 0) {
    console.log('No skills installed.');
    return;
  }

  printTable(
    ['Name', 'Version', 'Agent', 'Path'],
    installed.map((s) => [s.name, s.version, s.agent, s.path]),
  );
}
