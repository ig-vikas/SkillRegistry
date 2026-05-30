import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractFrontmatterOnly, hashContent, type RegistryIndex } from '@skillregistry/core';
import { scanSkill } from '@skillregistry/scanner';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const skillsDir = join(root, 'skills');

async function main() {
  const entries = await readdir(skillsDir, { withFileTypes: true });
  const skills: RegistryIndex['skills'] = {};

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillPath = join(skillsDir, entry.name, 'SKILL.md');
    try {
      const raw = await readFile(skillPath, 'utf8');
      const meta = extractFrontmatterOnly(raw);
      const report = scanSkill(raw, meta);
      skills[meta.name] = {
        name: meta.name,
        version: meta.version,
        description: meta.description,
        author: meta.author,
        categories: meta.categories,
        agents: meta.agents,
        security_score: report.score,
        verified: true,
        downloads: 0,
        checksum: hashContent(raw),
      };
      console.log(`✓ ${meta.name} (score: ${report.score})`);
    } catch (err) {
      console.error(`✗ ${entry.name}:`, err);
    }
  }

  const index: RegistryIndex = {
    version: '1.0.0',
    updated_at: new Date().toISOString(),
    skills,
  };

  await writeFile(join(root, 'registry.json'), JSON.stringify(index, null, 2) + '\n', 'utf8');
  console.log(`\nWrote registry.json with ${Object.keys(skills).length} skills`);
}

main().catch(console.error);
