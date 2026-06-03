import { initLockFile } from '../utils/lock-file.js';
import { success } from '../utils/display.js';

/**
 * Initialize skillreg.lock.json in the current directory.
 * @param cwd - Working directory
 */
export async function runInit(cwd: string): Promise<void> {
  await initLockFile(cwd);
  success(`Created ${cwd}/skillreg.lock.json`);
}
