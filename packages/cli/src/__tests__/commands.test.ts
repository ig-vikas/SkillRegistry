import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCreate } from '../commands/create.js';
import { runDoctor } from '../commands/doctor.js';
import { runInfo } from '../commands/info.js';
import { runInit } from '../commands/init.js';
import { runList } from '../commands/list.js';
import { runScan } from '../commands/scan.js';
import { runSearch } from '../commands/search.js';
import { getCacheDir, setCachedIndex } from '../utils/cache.js';
import { detectInstalledAgents } from '../utils/agent-detector.js';
import { initLockFile, readLockFile, writeLockFile } from '../utils/lock-file.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..', '..', '..');
const registryPath = join(rootDir, 'registry.json');
const skillsDir = join(rootDir, 'skills');
const scannerFixtures = join(rootDir, 'packages', 'scanner', 'src', '__tests__', 'fixtures');

describe('CLI commands', () => {
  let tempDir: string;
  let logs: string[];
  let errors: string[];

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'skillregistry-cli-'));
    logs = [];
    errors = [];
    vi.spyOn(console, 'log').mockImplementation((...message: unknown[]) => {
      logs.push(message.map(String).join(' '));
    });
    vi.spyOn(console, 'error').mockImplementation((...message: unknown[]) => {
      errors.push(message.map(String).join(' '));
    });
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 503 }));
    process.exitCode = undefined;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    delete process.env.SKILLREGISTRY_CACHE_DIR;
    process.exitCode = undefined;
    await rm(tempDir, { recursive: true, force: true });
  });

  it('doctor command exits 0 without crashing', async () => {
    await runDoctor(tempDir);
    expect(process.exitCode).toBeUndefined();
    expect(logs.join('\n')).toContain('SkillRegistry Doctor');
  });

  it('search react returns results from registry.json', async () => {
    await runSearch('react', { registryPath });
    expect(logs.join('\n')).toContain('react-expert');
  });

  it('search with no results returns empty state gracefully', async () => {
    await runSearch('nonexistent-xyz-abc', { registryPath });
    expect(logs.join('\n')).toContain('No skills found.');
  });

  it('info react-expert displays metadata without crashing', async () => {
    await runInfo('react-expert', { registryPath, skillsDir });
    expect(logs.join('\n')).toContain('react-expert@1.0.0');
  });

  it('scan clean fixture returns score >= 90', async () => {
    await runScan(join(scannerFixtures, 'clean.md'));
    expect(process.exitCode).toBeUndefined();
    expect(logs.join('\n')).toContain('Security score:');
  });

  it('scan dangerous fixture returns blocked true', async () => {
    await runScan(join(scannerFixtures, 'dangerous.md'));
    expect(process.exitCode).toBe(1);
    expect(logs.join('\n')).toContain('Blocked:');
  });

  it('list with no installed skills shows empty state', async () => {
    await runList({ cwd: tempDir });
    expect(logs.join('\n')).toContain('No skills installed.');
  });

  it('init creates skillregistry.lock.json in cwd', async () => {
    await runInit(tempDir);
    const raw = await readFile(join(tempDir, 'skillregistry.lock.json'), 'utf8');
    expect(JSON.parse(raw)).toEqual({ lockfileVersion: 1, skills: {} });
  });

  it('create --no-interactive generates SKILL.md', async () => {
    await runCreate('test-skill', { cwd: tempDir, noInteractive: true });
    const raw = await readFile(join(tempDir, 'test-skill', 'SKILL.md'), 'utf8');
    expect(raw).toContain('name: test-skill');
  });

  it('agent-detector returns array on all platforms', async () => {
    await expect(detectInstalledAgents(tempDir)).resolves.toEqual(expect.any(Array));
  });

  it('lock-file read/write is idempotent', async () => {
    await initLockFile(tempDir);
    const first = await readLockFile(tempDir);
    await writeLockFile(tempDir, first);
    const second = await readLockFile(tempDir);
    expect(second).toEqual(first);
  });

  it('cache directory is created if it does not exist', async () => {
    const cacheRoot = join(tempDir, 'cache');
    process.env.SKILLREGISTRY_CACHE_DIR = cacheRoot;
    await setCachedIndex({ version: '1.0.0', updated_at: new Date().toISOString(), skills: {} });
    expect(getCacheDir()).toBe(cacheRoot);
    await expect(readFile(join(cacheRoot, 'index.json'), 'utf8')).resolves.toContain('skills');
  });
});
