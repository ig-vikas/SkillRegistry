---
name: cron-scheduling
type: skill
description: Cron job scheduling system for AI agent gateway with recurring task execution and management.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [backend, tools, scheduling]
tags: [cron, scheduling, jobs, recurring, automation]
---

# Cron Scheduling Expert

Implement cron job scheduling for AI agents with flexible schedules, retry logic, and execution tracking.

## Architecture

AI Agent Request -> Job Parser -> Scheduler -> Job Executor -> Result Logger -> Notification

## Core Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| Job Parser | Parse cron/interval expressions | node-cron |
| Scheduler | Manage scheduled jobs | node-cron, node-schedule |
| Job Store | Persist job definitions | SQLite/JSON |
| Executor | Run jobs at scheduled times | Custom |
| Result Logger | Track job execution results | Winston |
| Notification | Send status updates | WebSocket |

## Implementation

```bash
pnpm add node-cron node-schedule uuid
```

### Job Types

```typescript
// src/services/tools/cron/types.ts
import { z } from 'zod';

const CronScheduleSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('cron'), expression: z.string() }),
  z.object({ type: z.literal('interval'), milliseconds: z.number().int().positive() }),
  z.object({ type: z.literal('date'), date: z.date() }),
]);

const JobTaskSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('bash'), command: z.string().min(1).max(1000) }),
  z.object({ type: z.literal('browser'), commands: z.array(z.unknown()) }),
  z.object({ type: z.literal('canvas'), commands: z.array(z.unknown()) }),
  z.object({ type: z.literal('http'), url: z.string().url(), method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional() }),
  z.object({ type: z.literal('message'), message: z.string().min(1) }),
  z.object({ type: z.literal('custom'), tool: z.string(), args: z.unknown() }),
]);

export const ScheduledJobSchema = z.object({
  name: z.string().min(1).max(200),
  userId: z.string().min(1),
  channelId: z.string().min(1),
  schedule: CronScheduleSchema,
  task: JobTaskSchema,
  enabled: z.boolean().default(true),
  priority: z.number().int().min(0).max(10).default(5),
  retry: z.object({
    maxAttempts: z.number().int().min(1).max(10).default(3),
    delay: z.number().int().positive().default(5000),
    backoff: z.enum(['none', 'linear', 'exponential']).default('exponential'),
  }).default({}),
  timeout: z.number().int().positive().max(3600000).default(60000),
  notifications: z.object({
    onSuccess: z.boolean().default(false),
    onFailure: z.boolean().default(true),
    webhookUrl: z.string().url().optional(),
  }).default({}),
});
```

### Cron Service

```typescript
// src/services/tools/cron/cron-service.ts
import { CronJob } from 'cron';
import { v4 as uuidv4 } from 'uuid';

export class CronService {
  private jobs = new Map<string, { job: any; scheduled: CronJob }>();
  private userJobs = new Map<string, Set<string>>();
  private config: any;
  
  constructor(config: any = {}) {
    this.config = { maxJobsPerUser: 20, maxTotalJobs: 100, ...config };
  }
  
  validateCronExpression(expression: string): { valid: boolean; error?: string } {
    try {
      new CronJob(expression, () => {}, null, false);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Invalid' };
    }
  }
  
  async createJob(jobInput: any, userId: string): Promise<any> {
    // Enforce limits
    if (userId && this.userJobs.get(userId)?.size >= this.config.maxJobsPerUser) {
      throw new Error(`Max jobs per user (${this.config.maxJobsPerUser}) exceeded`);
    }
    if (this.jobs.size >= this.config.maxTotalJobs) {
      throw new Error(`Max total jobs (${this.config.maxTotalJobs}) exceeded`);
    }
    
    // Validate
    if (jobInput.schedule.type === 'cron') {
      const validation = this.validateCronExpression(jobInput.schedule.expression);
      if (!validation.valid) throw new Error(validation.error);
    }
    
    const job = {
      id: `job_${uuidv4()}`,
      ...jobInput,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      nextExecution: this.calculateNextExecution(jobInput.schedule),
    };
    
    // Schedule job
    const scheduled = new CronJob(
      jobInput.schedule.type === 'cron' ? jobInput.schedule.expression : '* * * * *',
      () => this.executeJob(job.id),
      null,
      false
    );
    
    this.jobs.set(job.id, { job, scheduled });
    if (!this.userJobs.has(userId)) this.userJobs.set(userId, new Set());
    this.userJobs.get(userId)!.add(job.id);
    
    return job;
  }
  
  calculateNextExecution(schedule: any): number {
    if (schedule.type === 'cron') {
      const job = new CronJob(schedule.expression, () => {}, null, false);
      return job.nextDates(1)[0].getTime();
    }
    return Date.now();
  }
  
  private async executeJob(jobId: string): Promise<void> {
    const entry = this.jobs.get(jobId);
    if (!entry || !entry.job.enabled) return;
    
    const job = entry.job;
    job.executionCount++;
    job.updatedAt = Date.now();
    
    try {
      // Execute task based on type
      let result: any;
      switch (job.task.type) {
        case 'bash':
          // Execute via bash service
          break;
        case 'message':
          result = { messageSent: true, message: job.task.message };
          break;
        default:
          result = { executed: true };
      }
      
      job.successCount++;
      job.lastExecution = { at: Date.now(), success: true, result };
      
      if (job.notifications.onSuccess) {
        await this.notify(job, { success: true, result });
      }
    } catch (error) {
      job.failureCount++;
      job.lastExecution = { at: Date.now(), success: false, error: error instanceof Error ? error.message : 'Unknown' };
      
      if (job.notifications.onFailure) {
        await this.notify(job, { success: false, error: error instanceof Error ? error.message : 'Unknown' });
      }
    }
  }
  
  private async notify(job: any, result: any): Promise<void> {
    // Send via WebSocket or webhook
  }
  
  getJob(jobId: string): any | null {
    return this.jobs.get(jobId)?.job || null;
  }
  
  listJobs(userId?: string): any[] {
    if (userId) {
      return Array.from(this.userJobs.get(userId) || []).map(id => this.jobs.get(id)?.job).filter(Boolean);
    }
    return Array.from(this.jobs.values()).map(e => e.job);
  }
  
  async updateJob(jobId: string, updates: any): Promise<any | null> {
    const entry = this.jobs.get(jobId);
    if (!entry) return null;
    
    const job = entry.job;
    Object.assign(job, updates);
    job.updatedAt = Date.now();
    return job;
  }
  
  async deleteJob(jobId: string): Promise<boolean> {
    const entry = this.jobs.get(jobId);
    if (!entry) return false;
    
    entry.scheduled.stop();
    const job = entry.job;
    this.userJobs.get(job.userId)?.delete(jobId);
    this.jobs.delete(jobId);
    return true;
  }
  
  async setJobEnabled(jobId: string, enabled: boolean): Promise<any | null> {
    const job = this.getJob(jobId);
    if (!job) return null;
    job.enabled = enabled;
    job.updatedAt = Date.now();
    return job;
  }
  
  getStats(): any {
    return {
      totalJobs: this.jobs.size,
      enabledJobs: Array.from(this.jobs.values()).filter(e => e.job.enabled).length,
      disabledJobs: Array.from(this.jobs.values()).filter(e => !e.job.enabled).length,
      activeUsers: this.userJobs.size,
    };
  }
}
```

## Configuration Schema

```typescript
// src/config/cron-config.ts
import { z } from 'zod';

export const CronConfigSchema = z.object({
  cron: z.object({
    enabled: z.boolean().default(true),
    maxJobsPerUser: z.number().int().positive().default(20),
    maxTotalJobs: z.number().int().positive().default(100),
    defaultTimeout: z.number().int().positive().default(60000),
    requireApproval: z.object({
      bash: z.boolean().default(true),
      custom: z.boolean().default(false),
    }).default({}),
  }).default({}),
});
```

## HTTP API Endpoints

```typescript
// POST /api/cron/jobs - Create job
router.post('/jobs', async (req, res) => {
  const jobInput = ScheduledJobSchema.parse(req.body);
  const gateway: AgentGateway = req.app.get('gateway');
  const job = await gateway.createCronJob(jobInput, req.user?.id || 'anonymous');
  res.status(201).json(job);
});

// GET /api/cron/jobs - List jobs
router.get('/jobs', async (req, res) => {
  const gateway: AgentGateway = req.app.get('gateway');
  const jobs = gateway.listCronJobs(req.query.userId as string | undefined);
  res.json(jobs);
});

// GET /api/cron/jobs/:jobId - Get job
router.get('/jobs/:jobId', async (req, res) => {
  const gateway: AgentGateway = req.app.get('gateway');
  const job = gateway.getCronJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// PUT /api/cron/jobs/:jobId - Update job
router.put('/jobs/:jobId', async (req, res) => {
  const gateway: AgentGateway = req.app.get('gateway');
  const job = gateway.getCronJob(req.params.jobId);
  if (!job || job.userId !== req.user?.id) return res.status(403).json({ error: 'Not authorized' });
  const updatedJob = await gateway.updateCronJob(req.params.jobId, req.body, req.user?.id || 'anonymous');
  res.json(updatedJob);
});

// DELETE /api/cron/jobs/:jobId - Delete job
router.delete('/jobs/:jobId', async (req, res) => {
  const gateway: AgentGateway = req.app.get('gateway');
  const job = gateway.getCronJob(req.params.jobId);
  if (!job || job.userId !== req.user?.id) return res.status(403).json({ error: 'Not authorized' });
  const deleted = await gateway.deleteCronJob(req.params.jobId, req.user?.id || 'anonymous');
  res.json({ success: deleted });
});

// POST /api/cron/jobs/:jobId/run - Run job now
router.post('/jobs/:jobId/run', async (req, res) => {
  const gateway: AgentGateway = req.app.get('gateway');
  const job = gateway.getCronJob(req.params.jobId);
  if (!job || job.userId !== req.user?.id) return res.status(403).json({ error: 'Not authorized' });
  const result = await gateway.runCronJobNow(req.params.jobId, req.user?.id || 'anonymous');
  res.json(result);
});

// POST /api/cron/jobs/:jobId/enable - Enable job
router.post('/jobs/:jobId/enable', async (req, res) => {
  const gateway: AgentGateway = req.app.get('gateway');
  const job = gateway.getCronJob(req.params.jobId);
  if (!job || job.userId !== req.user?.id) return res.status(403).json({ error: 'Not authorized' });
  const updatedJob = await gateway.setCronJobEnabled(req.params.jobId, true, req.user?.id || 'anonymous');
  res.json(updatedJob);
});

// POST /api/cron/jobs/:jobId/disable - Disable job
router.post('/jobs/:jobId/disable', async (req, res) => {
  const gateway: AgentGateway = req.app.get('gateway');
  const job = gateway.getCronJob(req.params.jobId);
  if (!job || job.userId !== req.user?.id) return res.status(403).json({ error: 'Not authorized' });
  const updatedJob = await gateway.setCronJobEnabled(req.params.jobId, false, req.user?.id || 'anonymous');
  res.json(updatedJob);
});

// GET /api/cron/stats - Get statistics
router.get('/stats', async (req, res) => {
  const gateway: AgentGateway = req.app.get('gateway');
  res.json(gateway.getCronStats());
});
```

## Integration with Gateway

```typescript
// src/core/gateway.ts
import { CronService } from '../services/tools/cron/cron-service';

export class AgentGateway {
  private cronService: CronService;
  
  async initialize() {
    this.cronService = new CronService(this.config.cron, this.approvalManager);
  }
  
  async createCronJob(jobInput: any, userId: string): Promise<any> {
    return this.cronService.createJob(jobInput, userId);
  }
  
  getCronJob(jobId: string): any | null {
    return this.cronService.getJob(jobId);
  }
  
  listCronJobs(userId?: string): any[] {
    return this.cronService.listJobs(userId);
  }
  
  async updateCronJob(jobId: string, updates: any, userId: string): Promise<any | null> {
    return this.cronService.updateJob(jobId, updates);
  }
  
  async deleteCronJob(jobId: string, userId: string): Promise<boolean> {
    return this.cronService.deleteJob(jobId);
  }
  
  async setCronJobEnabled(jobId: string, enabled: boolean, userId: string): Promise<any | null> {
    return this.cronService.setJobEnabled(jobId, enabled);
  }
  
  async runCronJobNow(jobId: string, userId: string): Promise<any | null> {
    return this.cronService['executeJob'](jobId);
  }
  
  getCronStats(): any {
    return this.cronService.getStats();
  }
}
```

## Testing

```typescript
// tests/services/tools/cron-service.test.ts
describe('CronService', () => {
  let service: CronService;
  
  beforeEach(() => {
    service = new CronService({ maxJobsPerUser: 5, maxTotalJobs: 10 });
  });
  
  it('validates cron expressions', () => {
    expect(service.validateCronExpression('0 * * * *').valid).toBe(true);
    expect(service.validateCronExpression('invalid').valid).toBe(false);
  });
  
  it('creates and lists jobs', async () => {
    const job = await service.createJob({
      name: 'Test Job',
      userId: 'test-user',
      channelId: 'test-channel',
      schedule: { type: 'cron', expression: '0 * * * *' },
      task: { type: 'message', message: 'Hello' },
    });
    
    expect(job).toBeDefined();
    expect(job.id).toBeDefined();
    
    const jobs = service.listJobs('test-user');
    expect(jobs).toHaveLength(1);
    expect(jobs[0].name).toBe('Test Job');
  });
  
  it('deletes job', async () => {
    const job = await service.createJob({
      name: 'Test Job',
      userId: 'test-user',
      channelId: 'test-channel',
      schedule: { type: 'cron', expression: '0 * * * *' },
      task: { type: 'message', message: 'Hello' },
    });
    
    const deleted = await service.deleteJob(job.id);
    expect(deleted).toBe(true);
    expect(service.getJob(job.id)).toBeNull();
  });
  
  it('enforces user job limit', async () => {
    for (let i = 0; i < 5; i++) {
      await service.createJob({
        name: `Job ${i}`,
        userId: 'test-user',
        channelId: 'test-channel',
        schedule: { type: 'cron', expression: '0 * * * *' },
        task: { type: 'message', message: 'Hello' },
      });
    }
    
    await expect(
      service.createJob({
        name: 'Job 6',
        userId: 'test-user',
        channelId: 'test-channel',
        schedule: { type: 'cron', expression: '0 * * * *' },
        task: { type: 'message', message: 'Hello' },
      })
    ).rejects.toThrow('Max jobs per user');
  });
});
```

## Cron Expression Examples

```
# Every minute
* * * * *

# Every 5 minutes
*/5 * * * *

# Every hour
0 * * * *

# Every day at midnight
0 0 * * *

# Every Monday at 9 AM
0 9 * * 1

# First day of month at midnight
0 0 1 * *
```

## Resources

- [node-cron](https://github.com/node-cron/node-cron)
- [node-schedule](https://github.com/node-schedule/node-schedule)
- [crontab.guru](https://crontab.guru/)

## Principles

1. Reliability
2. Flexibility
3. Security
4. Observability
5. Scalability
