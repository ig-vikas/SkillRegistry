import { scanManifest } from '@skillregistry/scanner';
import { downloadSkill, fetchRegistryIndex } from '../utils/downloader.js';
import { printSecurityReport } from '../utils/display.js';

export interface InfoOptions {
  registryPath?: string;
  skillsDir?: string;
}

/**
 * Show skill details and security report.
 * @param skillName - Skill name
 * @param options - Info options
 */
export async function runInfo(skillName: string, options?: InfoOptions): Promise<void> {
  const index = await fetchRegistryIndex(options?.registryPath);
  const entry = index.skills[skillName];
  if (!entry) {
    console.log(`Skill not found: ${skillName}`);
    process.exitCode = 1;
    return;
  }

  console.log(`\n${entry.name}@${entry.version}`);
  console.log(`Author: ${entry.author}`);
  console.log(`Description: ${entry.description}`);
  console.log(`Agents: ${entry.agents.join(', ')}`);
  console.log(`Categories: ${entry.categories.join(', ')}`);
  console.log(`Downloads: ${entry.downloads}`);
  console.log(`Verified: ${entry.verified ? 'yes' : 'no'}`);

  const { manifest } = await downloadSkill(skillName, entry.version, {
    ...(options?.skillsDir ? { skillsDir: options.skillsDir } : {}),
  });
  const report = scanManifest(manifest);
  printSecurityReport(report);
}
