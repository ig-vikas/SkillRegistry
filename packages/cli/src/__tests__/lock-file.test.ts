import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { initLockFile, readLockFile, upsertSkillEntry } from '../utils/lock-file.js';

describe('lock-file', () => {
  it('creates and updates lock file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'skr-'));
    await initLockFile(dir);
    const lock = await readLockFile(dir);
    expect(lock.lockfileVersion).toBe(1);
    expect(lock.skills).toEqual({});

    await upsertSkillEntry(dir, 'test-skill', {
      version: '1.0.0',
      resolved: 'https://example.com',
      checksum: 'abc',
      security_score: 100,
      installed_agents: ['cursor'],
      installed_at: new Date().toISOString(),
    });

    const updated = await readLockFile(dir);
    expect(updated.skills['test-skill']?.version).toBe('1.0.0');

    const raw = await readFile(join(dir, 'skillreg.lock.json'), 'utf8');
    expect(raw).toContain('test-skill');
  });
});
