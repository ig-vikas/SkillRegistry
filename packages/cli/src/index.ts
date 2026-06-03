#!/usr/bin/env node
import { Command } from 'commander';
import type { AgentType } from '@skillregistry/core';
import { runAdd } from './commands/add.js';
import { runAudit } from './commands/audit.js';
import { runCreate } from './commands/create.js';
import { runDoctor } from './commands/doctor.js';
import { runInfo } from './commands/info.js';
import { runInit } from './commands/init.js';
import { runList } from './commands/list.js';
import { runPublish } from './commands/publish.js';
import { runRemove } from './commands/remove.js';
import { runScan } from './commands/scan.js';
import { runSearch } from './commands/search.js';
import { runUpdate } from './commands/update.js';

const program = new Command();

program
  .name('skillreg')
  .description('npm for AI agent skills — discover, install, and scan skills')
  .version('0.1.0')
  .option('--registry <url>', 'Registry API URL')
  .option('--registry-file <path>', 'Local registry.json path');

program
  .command('init')
  .description('Initialize skillreg.lock.json')
  .action(() => runInit(process.cwd()));

program
  .command('search <query>')
  .description('Search registry by keyword')
  .action((query: string) => {
    const opts = program.opts<{ registryFile?: string }>();
    const searchOpts = opts.registryFile ? { registryPath: opts.registryFile } : {};
    return runSearch(query, searchOpts);
  });

program
  .command('add <skill>')
  .description('Install a skill')
  .option('--agent <agent>', 'Target agent')
  .option('--global', 'Install to global agent dirs')
  .option('--force', 'Install even if security scan blocks')
  .option('--skills-dir <dir>', 'Local skills directory')
  .action((skill: string, opts: { agent?: string; global?: boolean; force?: boolean; skillsDir?: string }) => {
    const globalOpts = program.opts<{ registryFile?: string }>();
    return runAdd(skill, {
      ...(opts.agent ? { agent: opts.agent as AgentType } : {}),
      ...(opts.global ? { global: true } : {}),
      ...(opts.force ? { force: true } : {}),
      ...(opts.skillsDir ? { skillsDir: opts.skillsDir } : {}),
      ...(globalOpts.registryFile ? { registryPath: globalOpts.registryFile } : {}),
    });
  });

program
  .command('remove <skill>')
  .description('Uninstall a skill')
  .option('--agent <agent>', 'Target agent')
  .option('--global', 'Remove from global dirs')
  .action((skill: string, opts: { agent?: string; global?: boolean }) =>
    runRemove(skill, {
      ...(opts.agent ? { agent: opts.agent as AgentType } : {}),
      ...(opts.global ? { global: true } : {}),
    }),
  );

program
  .command('list')
  .description('List installed skills')
  .option('--agent <agent>', 'Filter by agent')
  .option('--global', 'List global installs')
  .action((opts: { agent?: string; global?: boolean }) =>
    runList({
      ...(opts.agent ? { agent: opts.agent as AgentType } : {}),
      ...(opts.global ? { global: true } : {}),
    }),
  );

program
  .command('info <skill>')
  .description('Show skill details and security report')
  .option('--skills-dir <dir>', 'Local skills directory')
  .action((skill: string, opts: { skillsDir?: string }) => {
    const globalOpts = program.opts<{ registryFile?: string }>();
    return runInfo(skill, {
      ...(globalOpts.registryFile ? { registryPath: globalOpts.registryFile } : {}),
      ...(opts.skillsDir ? { skillsDir: opts.skillsDir } : {}),
    });
  });

program
  .command('scan <path>')
  .description('Scan a local skill for security issues')
  .action((path: string) => runScan(path));

program
  .command('create <name>')
  .description('Scaffold a new skill')
  .option('--no-interactive', 'Use default scaffold metadata')
  .action((name: string, opts: { interactive?: boolean }) =>
    runCreate(name, { noInteractive: opts.interactive === false }),
  );

program
  .command('publish')
  .description('Publish a skill to the registry')
  .option('--dir <dir>', 'Skill directory')
  .action((opts: { dir?: string }) => runPublish(opts.dir));

program
  .command('update [skill]')
  .description('Update one or all skills')
  .action((skill?: string) => {
    const globalOpts = program.opts<{ registryFile?: string }>();
    return runUpdate(skill, globalOpts.registryFile ? { registryPath: globalOpts.registryFile } : {});
  });

program
  .command('audit')
  .description('Security audit all installed skills')
  .option('--global', 'Audit global installs')
  .action((opts: { global?: boolean }) => runAudit(opts.global ? { global: true } : {}));

program
  .command('doctor')
  .description('Check system health')
  .action(() => runDoctor());

program.parse();
