import { access } from 'node:fs/promises';
import { getAllAgentStatuses } from '../utils/agent-detector.js';
import { getCachedIndex } from '../utils/cache.js';
import { getRegistryUrl } from '../utils/config.js';
import { printTable, info } from '../utils/display.js';

/**
 * Check system health for SkillRegistry CLI.
 * @param cwd - Project directory
 */
export async function runDoctor(cwd?: string): Promise<void> {
  const projectDir = cwd ?? process.cwd();
  info('SkillRegistry Doctor\n');

  const agents = await getAllAgentStatuses(projectDir);
  printTable(
    ['Agent', 'Installed', 'Reason'],
    agents.map((a) => [a.agent, a.installed ? 'yes' : 'no', a.reason ?? '-']),
  );

  try {
    const url = await getRegistryUrl();
    const res = await fetch(`${url}/stats`);
    console.log(`\nRegistry: ${res.ok ? 'reachable' : 'unreachable'} (${url})`);
  } catch {
    console.log('\nRegistry: unreachable (offline mode will use cache)');
  }

  const cached = await getCachedIndex();
  console.log(`Cache: ${cached ? `${Object.keys(cached.skills).length} skills indexed` : 'empty'}`);

  try {
    await access(`${projectDir}/skillreg.lock.json`);
    console.log('Lock file: present');
  } catch {
    console.log('Lock file: not found (run skillreg init)');
  }
}
