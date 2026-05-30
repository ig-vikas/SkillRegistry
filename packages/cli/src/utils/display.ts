import type { SecurityReport } from '@skillregistry/core';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';

/**
 * Print success message.
 * @param msg - Message
 */
export function success(msg: string): void {
  console.log(chalk.green('✔'), msg);
}

/**
 * Print error message.
 * @param msg - Message
 */
export function error(msg: string): void {
  console.error(chalk.red('✖'), msg);
}

/**
 * Print info message.
 * @param msg - Message
 */
export function info(msg: string): void {
  console.log(chalk.blue('ℹ'), msg);
}

/**
 * Create a spinner.
 * @param text - Spinner text
 * @returns Ora spinner
 */
export function spinner(text: string) {
  return ora(text).start();
}

/**
 * Print data as CLI table.
 * @param headers - Column headers
 * @param rows - Table rows
 */
export function printTable(headers: string[], rows: string[][]): void {
  const table = new Table({ head: headers.map((h) => chalk.bold(h)) });
  for (const row of rows) {
    table.push(row);
  }
  console.log(table.toString());
}

/**
 * Print security scan report.
 * @param report - Security report
 */
export function printSecurityReport(report: SecurityReport): void {
  const color =
    report.score >= 80 ? chalk.green : report.score >= 50 ? chalk.yellow : chalk.red;
  console.log(`\nSecurity score: ${color(String(report.score))}/100`);
  console.log(`Passed: ${report.passed ? chalk.green('yes') : chalk.red('no')}`);
  console.log(`Blocked: ${report.blocked ? chalk.red('yes') : chalk.green('no')}`);

  if (report.issues.length > 0) {
    console.log(chalk.bold('\nIssues:'));
    for (const issue of report.issues) {
      const sev =
        issue.severity === 'critical'
          ? chalk.red(issue.severity)
          : issue.severity === 'high'
            ? chalk.magenta(issue.severity)
            : chalk.gray(issue.severity);
      console.log(`  [${sev}] ${issue.code}: ${issue.message}${issue.line ? ` (line ${issue.line})` : ''}`);
    }
  }
}
