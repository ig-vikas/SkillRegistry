import { scanPath } from '@skillregistry/scanner';
import { printSecurityReport } from '../utils/display.js';

/**
 * Scan a local skill directory.
 * @param path - Path to skill directory
 */
export async function runScan(path: string): Promise<void> {
  const report = await scanPath(path);
  printSecurityReport(report);
  if (report.blocked) process.exitCode = 1;
}
