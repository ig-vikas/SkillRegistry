---
name: authorization
type: skill
description: Role-based access control (RBAC) and permission system for AI agent gateway with fine-grained resource authorization and policy enforcement.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [security, backend, architecture]
tags: [authorization, rbac, permissions, security, access-control, policies, roles]
---

# Authorization System Expert

Implement a comprehensive authorization system for AI agent gateway with role-based access control (RBAC), fine-grained permissions, resource-level authorization, and policy enforcement.

## Architecture Overview

```
User/Device Request
     │
     ▼
┌─────────────────┐
│ Authentication  │  (who are you?)
│ - Token         │
│ - Session       │
│ - Credentials   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Authorization   │  (what can you do?)
│ - Role Check    │
│ - Permission    │
│ - Resource ACL  │
│ - Policy Engine │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Access Decision │  (Allow/Deny)
└────────┬────────┘
         │
         ▼
    Allow or Deny
```

## Core Components

| Component | Purpose | Implementation |
|-----------|---------|----------------|
| RoleManager | Manage role hierarchy and assignments | Zod + In-memory/SQLite |
| PermissionManager | Define and check permissions | Bitmask or string-based |
| ResourceACL | Resource-level access control lists | Map<resource, access> |
| PolicyEngine | Dynamic policy evaluation | Rule-based engine |
| AuditLogger | Log all authorization decisions | Structured logging |

## Role-Based Access Control (RBAC)

### Role Hierarchy

```
Owner (Super Admin)
    ↓
Admin
    ↓
Editor
    ↓
Viewer
    ↓
Guest (Unauthenticated)
```

### Default Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| owner | Full access, can manage all resources | All permissions |
| admin | Can manage users, roles, and most resources | All except owner-only operations |
| editor | Can create, edit, and delete content | CRUD on owned/assigned resources |
| viewer | Read-only access | GET, LIST operations only |
| guest | Limited access, requires approval | Basic read, restricted tools |

### Role Definition (Zod Schema)

```typescript
// src/types/authorization.ts
import { z } from 'zod';

export const RoleName = z.enum([
  'owner', 'admin', 'editor', 'viewer', 'guest'
]);

export type RoleName = z.infer<typeof RoleName>;

export const RoleSchema = z.object({
  name: RoleName,
  description: z.string(),
  level: z.number().int().positive(),
  inherits: z.array(RoleName).default([]),
  permissions: z.array(z.string()).default([]),
});

export const UserRoleAssignmentSchema = z.object({
  userId: z.string(),
  role: RoleName,
  assignedBy: z.string(),
  assignedAt: z.number().int().positive(),
  expiresAt: z.number().int().positive().optional(),
});

// Role hierarchy levels (higher = more privileges)
export const ROLE_LEVELS: Record<RoleName, number> = {
  guest: 10,
  viewer: 20,
  editor: 30,
  admin: 40,
  owner: 50,
};
```

## Permission System

### Permission Definitions

```typescript
// Permission categories and actions
export const PermissionCategory = z.enum([
  'users', 'roles', 'tokens', 'sessions', 'channels',
  'tools', 'providers', 'storage', 'config', 'system'
]);

export const PermissionAction = z.enum([
  'create', 'read', 'update', 'delete', 'list',
  'manage', 'approve', 'execute', 'admin'
]);

export const PermissionSchema = z.object({
  category: PermissionCategory,
  action: PermissionAction,
  description: z.string(),
});

// Build full permission string
export function buildPermission(
  category: string,
  action: string
): string {
  return `${category}:${action}`;
}

// Parse permission string
export function parsePermission(permission: string): { category: string; action: string } {
  const [category, action] = permission.split(':');
  return { category, action };
}
```

### Permission Matrix

| Category | create | read | update | delete | list | manage | approve | execute | admin |
|----------|--------|------|--------|--------|------|--------|---------|---------|-------|
| users | - | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | ✓ |
| roles | - | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | ✓ |
| tokens | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | ✓ |
| sessions | - | ✓ | ✓ | ✓ | ✓ | - | - | - | - |
| channels | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - |
| tools | - | ✓ | - | - | ✓ | - | ✓ | ✓ | - |
| providers | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - |
| storage | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - |
| config | - | ✓ | ✓ | - | - | - | - | - | ✓ |
| system | - | ✓ | - | - | - | ✓ | - | - | ✓ |

### Role-Permission Mapping

```typescript
// src/config/role-permissions.ts
import { RoleName } from '../types/authorization';

export const ROLE_PERMISSIONS: Record<RoleName, Set<string>> = {
  owner: new Set([
    'users:create', 'users:read', 'users:update', 'users:delete', 'users:list', 'users:manage', 'users:admin',
    'roles:create', 'roles:read', 'roles:update', 'roles:delete', 'roles:list', 'roles:manage', 'roles:admin',
    'tokens:create', 'tokens:read', 'tokens:update', 'tokens:delete', 'tokens:list', 'tokens:manage', 'tokens:admin',
    'sessions:read', 'sessions:update', 'sessions:delete', 'sessions:list',
    'channels:create', 'channels:read', 'channels:update', 'channels:delete', 'channels:list', 'channels:manage',
    'tools:read', 'tools:list', 'tools:approve', 'tools:execute',
    'providers:create', 'providers:read', 'providers:update', 'providers:delete', 'providers:list', 'providers:manage',
    'storage:create', 'storage:read', 'storage:update', 'storage:delete', 'storage:list', 'storage:manage',
    'config:read', 'config:update',
    'system:read', 'system:manage', 'system:admin',
  ]),
  
  admin: new Set([
    'users:read', 'users:update', 'users:list', 'users:manage',
    'roles:read', 'roles:update', 'roles:list', 'roles:manage',
    'tokens:create', 'tokens:read', 'tokens:update', 'tokens:delete', 'tokens:list', 'tokens:manage',
    'sessions:read', 'sessions:update', 'sessions:delete', 'sessions:list',
    'channels:create', 'channels:read', 'channels:update', 'channels:delete', 'channels:list', 'channels:manage',
    'tools:read', 'tools:list', 'tools:approve', 'tools:execute',
    'providers:create', 'providers:read', 'providers:update', 'providers:delete', 'providers:list', 'providers:manage',
    'storage:create', 'storage:read', 'storage:update', 'storage:delete', 'storage:list', 'storage:manage',
    'config:read', 'config:update',
    'system:read', 'system:manage',
  ]),
  
  editor: new Set([
    'tokens:create', 'tokens:read', 'tokens:list',
    'sessions:read', 'sessions:list',
    'channels:create', 'channels:read', 'channels:update', 'channels:list',
    'tools:read', 'tools:list', 'tools:execute',
    'providers:read', 'providers:list',
    'storage:create', 'storage:read', 'storage:update', 'storage:list',
    'config:read',
    'system:read',
  ]),
  
  viewer: new Set([
    'tokens:read', 'tokens:list',
    'sessions:read', 'sessions:list',
    'channels:read', 'channels:list',
    'tools:read', 'tools:list',
    'providers:read', 'providers:list',
    'storage:read', 'storage:list',
    'config:read',
    'system:read',
  ]),
  
  guest: new Set([
    'sessions:read', 'sessions:list',
    'channels:read', 'channels:list',
    'providers:read', 'providers:list',
    'system:read',
  ]),
};
```

## Resource-Level Authorization

### Access Control Lists (ACLs)

```typescript
// src/types/resource-acl.ts
import { z } from 'zod';

export const ResourceType = z.enum([
  'channel', 'session', 'device', 'provider', 'tool', 'file'
]);

export const AccessLevel = z.enum(['none', 'read', 'write', 'admin']);

export const ResourceACLSchema = z.object({
  resourceType: ResourceType,
  resourceId: z.string(),
  userId: z.string(),
  accessLevel: AccessLevel,
  grantedBy: z.string(),
  grantedAt: z.number().int().positive(),
});

export type ResourceACL = z.infer<typeof ResourceACLSchema>;

// ACL Manager
export class ACLManager {
  private acls: Map<string, Map<string, AccessLevel>> = new Map();
  
  // Grant access to resource
  grantAccess(
    resourceType: string,
    resourceId: string,
    userId: string,
    accessLevel: AccessLevel,
    grantedBy: string
  ): void {
    const resourceKey = `${resourceType}:${resourceId}`;
    if (!this.acls.has(resourceKey)) {
      this.acls.set(resourceKey, new Map());
    }
    this.acls.get(resourceKey)!.set(userId, accessLevel);
  }
  
  // Revoke access from resource
  revokeAccess(
    resourceType: string,
    resourceId: string,
    userId: string
  ): void {
    const resourceKey = `${resourceType}:${resourceId}`;
    const acl = this.acls.get(resourceKey);
    if (acl) {
      acl.delete(userId);
      if (acl.size === 0) {
        this.acls.delete(resourceKey);
      }
    }
  }
  
  // Check access level for resource
  getAccessLevel(
    resourceType: string,
    resourceId: string,
    userId: string
  ): AccessLevel {
    const resourceKey = `${resourceType}:${resourceId}`;
    const acl = this.acls.get(resourceKey);
    return acl?.get(userId) || 'none';
  }
  
  // Check if user has at least the required access level
  hasAccess(
    resourceType: string,
    resourceId: string,
    userId: string,
    requiredLevel: AccessLevel
  ): boolean {
    const accessLevel = this.getAccessLevel(resourceType, resourceId, userId);
    const levels: Record<AccessLevel, number> = {
      none: 0, read: 1, write: 2, admin: 3
    };
    return levels[accessLevel] >= levels[requiredLevel];
  }
  
  // Get all resources user has access to
  getUserResources(userId: string): Array<{ resourceType: string; resourceId: string; accessLevel: AccessLevel }> {
    const resources: Array<{ resourceType: string; resourceId: string; accessLevel: AccessLevel }> = [];
    
    for (const [resourceKey, acl] of this.acls) {
      const [resourceType, resourceId] = resourceKey.split(':');
      const accessLevel = acl.get(userId);
      if (accessLevel && accessLevel !== 'none') {
        resources.push({ resourceType, resourceId, accessLevel });
      }
    }
    
    return resources;
  }
}
```

## Policy Engine

### Policy Definition

```typescript
// src/types/policy.ts
import { z } from 'zod';

export const PolicyCondition = z.object({
  field: z.string(),
  operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'regex']),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
});

export const PolicyRule = z.object({
  name: z.string(),
  description: z.string(),
  conditions: z.array(PolicyCondition),
  effect: z.enum(['allow', 'deny']),
  priority: z.number().int().default(0),
});

export const PolicySchema = z.object({
  name: z.string(),
  description: z.string(),
  enabled: z.boolean().default(true),
  rules: z.array(PolicyRule),
});

export type Policy = z.infer<typeof PolicySchema>;
```

### Policy Evaluation Engine

```typescript
// src/services/policy-engine.ts
import { Policy, PolicyRule, PolicyCondition } from '../types/policy';

export class PolicyEngine {
  private policies: Map<string, Policy> = new Map();
  
  addPolicy(policy: Policy): void {
    this.policies.set(policy.name, policy);
  }
  
  removePolicy(name: string): void {
    this.policies.delete(name);
  }
  
  async evaluate(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string,
    context: Record<string, any> = {}
  ): Promise<{ allowed: boolean; reason?: string }> {
    const evaluationContext = {
      userId,
      resourceType,
      resourceId,
      action,
      ...context,
      timestamp: Date.now(),
    };
    
    // Collect all applicable rules
    const applicableRules: Array<{ rule: PolicyRule; policy: string }> = [];
    
    for (const [policyName, policy] of this.policies) {
      if (!policy.enabled) continue;
      
      for (const rule of policy.rules) {
        if (this.ruleMatches(rule, evaluationContext)) {
          applicableRules.push({ rule, policy: policyName });
        }
      }
    }
    
    // Sort by priority (higher priority first)
    applicableRules.sort((a, b) => b.rule.priority - a.rule.priority);
    
    // First matching rule wins
    for (const { rule, policy } of applicableRules) {
      return {
        allowed: rule.effect === 'allow',
        reason: `Policy ${policy}, Rule ${rule.name}`,
      };
    }
    
    // Default: deny
    return { allowed: false, reason: 'No matching policy rule' };
  }
  
  private ruleMatches(rule: PolicyRule, context: Record<string, any>): boolean {
    for (const condition of rule.conditions) {
      if (!this.conditionMatches(condition, context)) {
        return false;
      }
    }
    return true;
  }
  
  private conditionMatches(condition: PolicyCondition, context: Record<string, any>): boolean {
    const value = context[condition.field];
    
    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'neq':
        return value !== condition.value;
      case 'gt':
        return value > condition.value;
      case 'gte':
        return value >= condition.value;
      case 'lt':
        return value < condition.value;
      case 'lte':
        return value <= condition.value;
      case 'in':
        return (Array.isArray(condition.value) && condition.value.includes(value));
      case 'nin':
        return !Array.isArray(condition.value) || !condition.value.includes(value);
      case 'regex':
        return new RegExp(condition.value as string).test(value);
      default:
        return false;
    }
  }
}
```

## Authorization Manager

### Complete Implementation

```typescript
// src/services/authorization.ts
import { RoleName, ROLE_LEVELS, ROLE_PERMISSIONS } from '../config/role-permissions';
import { ACLManager } from './resource-acl';
import { PolicyEngine } from './policy-engine';

export interface AuthorizationContext {
  userId: string;
  role: RoleName;
  deviceId?: string;
  channelId?: string;
  sessionId?: string;
  ipAddress?: string;
  timestamp: number;
}

export interface AuthorizationRequest {
  userId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  context?: Record<string, any>;
}

export class AuthorizationManager {
  private aclManager: ACLManager;
  private policyEngine: PolicyEngine;
  private roleAssignments: Map<string, { role: RoleName; assignedAt: number }> = new Map();
  private auditLog: Array<{ request: AuthorizationRequest; result: boolean; timestamp: number; reason?: string }> = [];
  
  constructor() {
    this.aclManager = new ACLManager();
    this.policyEngine = new PolicyEngine();
    this.setupDefaultPolicies();
  }
  
  private setupDefaultPolicies(): void {
    // Owner can do anything
    this.policyEngine.addPolicy({
      name: 'owner-full-access',
      description: 'Owner has full access to all resources',
      enabled: true,
      rules: [{
        name: 'owner-allow-all',
        description: 'Allow all actions for owner',
        conditions: [{ field: 'role', operator: 'eq', value: 'owner' }],
        effect: 'allow',
        priority: 1000,
      }],
    });
    
    // Admin can manage users and roles
    this.policyEngine.addPolicy({
      name: 'admin-user-management',
      description: 'Admin can manage users and roles',
      enabled: true,
      rules: [
        {
          name: 'admin-manage-users',
          description: 'Allow admin to manage users',
          conditions: [
            { field: 'role', operator: 'eq', value: 'admin' },
            { field: 'resourceType', operator: 'in', value: ['users', 'roles'] },
          ],
          effect: 'allow',
          priority: 500,
        },
      ],
    });
    
    // Owners of resources can manage them
    this.policyEngine.addPolicy({
      name: 'resource-owner-access',
      description: 'Users can manage their own resources',
      enabled: true,
      rules: [
        {
          name: 'owner-access-to-own-resources',
          description: 'Allow users to manage resources they own',
          conditions: [
            { field: 'userId', operator: 'eq', value: '{resourceOwner}' },
          ],
          effect: 'allow',
          priority: 300,
        },
      ],
    });
  }
  
  // Assign role to user
  assignRole(userId: string, role: RoleName, assignedBy: string): void {
    this.roleAssignments.set(userId, { role, assignedAt: Date.now() });
    this.log(`Assigned role ${role} to ${userId} by ${assignedBy}`);
  }
  
  // Get user role
  getRole(userId: string): RoleName {
    const assignment = this.roleAssignments.get(userId);
    return assignment?.role || 'guest';
  }
  
  // Check permission
  hasPermission(userId: string, permission: string): boolean {
    const role = this.getRole(userId);
    const rolePermissions = ROLE_PERMISSIONS[role];
    return rolePermissions.has(permission);
  }
  
  // Check if user has all required permissions
  hasPermissions(userId: string, permissions: string[]): boolean {
    return permissions.every(p => this.hasPermission(userId, p));
  }
  
  // Check role level requirement
  requiresRole(userId: string, minRole: RoleName): boolean {
    const role = this.getRole(userId);
    return ROLE_LEVELS[role] >= ROLE_LEVELS[minRole];
  }
  
  // Authorize action
  async authorize(request: AuthorizationRequest): Promise<{ allowed: boolean; reason?: string }> {
    const { userId, action, resourceType, resourceId, context = {} } = request;
    const role = this.getRole(userId);
    
    // Build permission string
    const permission = resourceType ? `${resourceType}:${action}` : action;
    
    // Check role-based permissions first
    const hasRolePermission = this.hasPermission(userId, permission);
    if (hasRolePermission) {
      this.log(`ALLOWED (role permission): ${userId} ${permission}`);
      return { allowed: true, reason: `Role ${role} has permission ${permission}` };
    }
    
    // Check resource-level ACL
    if (resourceType && resourceId) {
      const accessLevel = this.aclManager.getAccessLevel(resourceType, resourceId, userId);
      const requiredAccess = this.actionToAccessLevel(action);
      
      if (accessLevel && this.aclManager.hasAccess(resourceType, resourceId, userId, requiredAccess)) {
        this.log(`ALLOWED (ACL): ${userId} ${accessLevel} access to ${resourceType}:${resourceId}`);
        return { allowed: true, reason: `ACL allows ${accessLevel} access` };
      }
    }
    
    // Evaluate policies
    const policyResult = await this.policyEngine.evaluate(
      userId,
      role,
      resourceType || '',
      resourceId || '',
      action,
      { ...context, role }
    );
    
    if (policyResult.allowed) {
      this.log(`ALLOWED (policy): ${userId} ${permission} - ${policyResult.reason}`);
      return policyResult;
    }
    
    // Deny by default
    this.log(`DENIED: ${userId} ${permission}`);
    return { allowed: false, reason: `No permission ${permission} for role ${role}` };
  }
  
  // Convenience method for common checks
  async canExecuteTool(userId: string, tool: string): Promise<{ allowed: boolean; reason?: string }> {
    return this.authorize({
      userId,
      action: 'execute',
      resourceType: 'tools',
      resourceId: tool,
    });
  }
  
  async canAccessChannel(userId: string, channelId: string): Promise<{ allowed: boolean; reason?: string }> {
    return this.authorize({
      userId,
      action: 'read',
      resourceType: 'channel',
      resourceId: channelId,
    });
  }
  
  async canManageProvider(userId: string, providerId: string): Promise<{ allowed: boolean; reason?: string }> {
    return this.authorize({
      userId,
      action: 'manage',
      resourceType: 'provider',
      resourceId: providerId,
    });
  }
  
  private actionToAccessLevel(action: string): 'none' | 'read' | 'write' | 'admin' {
    const writeActions = ['create', 'update', 'delete', 'execute'];
    const adminActions = ['manage', 'admin', 'approve'];
    
    if (adminActions.includes(action)) return 'admin';
    if (writeActions.includes(action)) return 'write';
    return 'read';
  }
  
  private log(message: string): void {
    console.log(`[AUTH] ${new Date().toISOString()} ${message}`);
  }
}
```

## Integration with Gateway

### Gateway Integration

```typescript
// src/core/gateway.ts
import { AuthorizationManager } from '../services/authorization';
import { RoleName } from '../types/authorization';

export class AgentGateway {
  private authManager: AuthorizationManager;
  
  constructor() {
    this.authManager = new AuthorizationManager();
    this.setupDefaultRoles();
  }
  
  private setupDefaultRoles(): void {
    // Assign owner role to admin user
    this.authManager.assignRole('user:admin', 'owner', 'system');
    
    // Assign admin role to moderators
    this.authManager.assignRole('user:moderator', 'admin', 'user:admin');
  }
  
  async handleIncomingMessage(message: any): Promise<any> {
    const { senderId, channelId } = message;
    
    // Check if sender can access this channel
    const authResult = await this.authManager.canAccessChannel(senderId, channelId);
    if (!authResult.allowed) {
      throw new Error(`Access denied: ${authResult.reason}`);
    }
    
    // Process message...
  }
  
  async executeTool(
    userId: string,
    tool: string,
    args: any,
    channelId: string
  ): Promise<any> {
    // Check authorization
    const authResult = await this.authManager.canExecuteTool(userId, tool);
    if (!authResult.allowed) {
      throw new Error(`Tool execution denied: ${authResult.reason}`);
    }
    
    // Check if tool requires approval
    const toolConfig = this.getToolConfig(tool);
    if (toolConfig.requireApproval && !this.authManager.requiresRole(userId, 'owner')) {
      // Request approval...
    }
    
    // Execute tool...
  }
  
  // Admin API: Assign role
  async assignRole(
    adminUserId: string,
    targetUserId: string,
    role: RoleName
  ): Promise<void> {
    // Check admin has permission
    const authResult = await this.authManager.authorize({
      userId: adminUserId,
      action: 'manage',
      resourceType: 'users',
      resourceId: targetUserId,
    });
    
    if (!authResult.allowed) {
      throw new Error(`Cannot assign role: ${authResult.reason}`);
    }
    
    this.authManager.assignRole(targetUserId, role, adminUserId);
  }
  
  // Admin API: Grant resource access
  async grantResourceAccess(
    adminUserId: string,
    userId: string,
    resourceType: string,
    resourceId: string,
    accessLevel: 'read' | 'write' | 'admin'
  ): Promise<void> {
    const authResult = await this.authManager.authorize({
      userId: adminUserId,
      action: 'manage',
      resourceType,
      resourceId,
    });
    
    if (!authResult.allowed) {
      throw new Error(`Cannot grant access: ${authResult.reason}`);
    }
    
    this.authManager.getACLManager().grantAccess(
      resourceType,
      resourceId,
      userId,
      accessLevel,
      adminUserId
    );
  }
}
```

## Middleware Integration

### Express Middleware

```typescript
// src/api/middleware/authorization.ts
import { Request, Response, NextFunction } from 'express';
import { AuthorizationManager } from '../../services/authorization';

export interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export function authorizationMiddleware(
  authManager: AuthorizationManager,
  resourceType: string,
  action: string
) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const resourceId = req.params.id || req.params[`${resourceType}Id`];
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Not authenticated' });
    }
    
    try {
      const result = await authManager.authorize({
        userId,
        action,
        resourceType,
        resourceId,
        context: { ip: req.ip, userAgent: req.get('User-Agent') },
      });
      
      if (!result.allowed) {
        return res.status(403).json({ error: `Forbidden: ${result.reason || 'Access denied'}` });
      }
      
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Usage
export function requirePermission(permission: string) {
  return authorizationMiddleware(authManager, '', permission);
}

export function requireRole(minRole: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!authManager.requiresRole(userId, minRole as any)) {
      return res.status(403).json({ error: 'Insufficient role level' });
    }
    
    next();
  };
}
```

## Configuration (Zod Schema)

```typescript
// src/config/authorization-config.ts
import { z } from 'zod';
import { RoleName } from '../types/authorization';

export const AuthorizationConfigSchema = z.object({
  // Role settings
  roles: z.object({
    default: RoleName.default('viewer'),
    initialAssignment: RoleName.default('guest'),
    hierarchy: z.array(RoleName).default(['guest', 'viewer', 'editor', 'admin', 'owner']),
  }).default({}),
  
  // Permission settings
  permissions: z.object({
    wildcardEnabled: z.boolean().default(true),
    strictMode: z.boolean().default(false),
  }).default({}),
  
  // Resource ACL settings
  acl: z.object({
    enabled: z.boolean().default(true),
    maxEntries: z.number().int().positive().default(10000),
    ttl: z.number().int().positive().optional(), // seconds
  }).default({}),
  
  // Policy engine settings
  policy: z.object({
    enabled: z.boolean().default(true),
    maxPolicies: z.number().int().positive().default(100),
    cacheEnabled: z.boolean().default(true),
    cacheTTL: z.number().int().positive().default(60), // seconds
  }).default({}),
  
  // Audit logging
  audit: z.object({
    enabled: z.boolean().default(true),
    logDenials: z.boolean().default(true),
    logGrants: z.boolean().default(false),
    retentionDays: z.number().int().positive().default(90),
  }).default({}),
  
  // Default access
  defaults: z.object({
    guestAccess: z.array(z.string()).default(['sessions:read', 'providers:read']),
    newUserRole: RoleName.default('viewer'),
  }).default({}),
});

export type AuthorizationConfig = z.infer<typeof AuthorizationConfigSchema>;

export const DefaultAuthorizationConfig: AuthorizationConfig = {
  roles: { default: 'viewer', initialAssignment: 'guest' },
  permissions: { wildcardEnabled: true, strictMode: false },
  acl: { enabled: true, maxEntries: 10000 },
  policy: { enabled: true, maxPolicies: 100, cacheEnabled: true, cacheTTL: 60 },
  audit: { enabled: true, logDenials: true, logGrants: false, retentionDays: 90 },
  defaults: { guestAccess: ['sessions:read', 'providers:read'], newUserRole: 'viewer' },
};
```

## Storage Backend

```typescript
// src/storage/authorization-storage.ts
import { z } from 'zod';
import { RoleAssignmentSchema, ResourceACLSchema, PolicySchema } from '../types';
import { Database } from 'bun:sqlite';

export class AuthorizationStorage {
  private db: Database;
  
  constructor(dbPath: string = './data/authorization.db') {
    this.db = new Database(dbPath);
    this.init();
  }
  
  private init(): void {
    // Create tables
    this.db.run(`
      CREATE TABLE IF NOT EXISTS role_assignments (
        userId TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        assignedBy TEXT NOT NULL,
        assignedAt INTEGER NOT NULL
      )
    `);
    
    this.db.run(`
      CREATE TABLE IF NOT EXISTS resource_acls (
        resourceType TEXT NOT NULL,
        resourceId TEXT NOT NULL,
        userId TEXT NOT NULL,
        accessLevel TEXT NOT NULL,
        grantedBy TEXT NOT NULL,
        grantedAt INTEGER NOT NULL,
        PRIMARY KEY (resourceType, resourceId, userId)
      )
    `);
    
    this.db.run(`
      CREATE TABLE IF NOT EXISTS policies (
        name TEXT PRIMARY KEY,
        description TEXT,
        enabled INTEGER DEFAULT 1,
        rules TEXT NOT NULL
      )
    `);
    
    this.db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        request TEXT NOT NULL,
        result INTEGER NOT NULL,
        reason TEXT,
        timestamp INTEGER NOT NULL
      )
    `);
    
    // Create indexes
    this.db.run('CREATE INDEX IF NOT EXISTS idx_acls_resource ON resource_acls(resourceType, resourceId)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_acls_user ON resource_acls(userId)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp)');
  }
  
  // Role assignments
  getRoleAssignment(userId: string): any | null {
    const stmt = this.db.prepare('SELECT * FROM role_assignments WHERE userId = ?');
    return stmt.get(userId) as any;
  }
  
  assignRole(userId: string, role: string, assignedBy: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO role_assignments (userId, role, assignedBy, assignedAt)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(userId, role, assignedBy, Date.now());
  }
  
  // ACL operations
  getACLsForResource(resourceType: string, resourceId: string): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM resource_acls 
      WHERE resourceType = ? AND resourceId = ?
    `);
    return stmt.all(resourceType, resourceId) as any[];
  }
  
  getACLsForUser(userId: string): any[] {
    const stmt = this.db.prepare('SELECT * FROM resource_acls WHERE userId = ?');
    return stmt.all(userId) as any[];
  }
  
  grantAccess(
    resourceType: string,
    resourceId: string,
    userId: string,
    accessLevel: string,
    grantedBy: string
  ): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO resource_acls 
      (resourceType, resourceId, userId, accessLevel, grantedBy, grantedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(resourceType, resourceId, userId, accessLevel, grantedBy, Date.now());
  }
  
  revokeAccess(resourceType: string, resourceId: string, userId: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM resource_acls 
      WHERE resourceType = ? AND resourceId = ? AND userId = ?
    `);
    stmt.run(resourceType, resourceId, userId);
  }
  
  // Policy operations
  getPolicies(): any[] {
    const stmt = this.db.prepare('SELECT * FROM policies');
    return stmt.all() as any[];
  }
  
  savePolicy(policy: any): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO policies (name, description, enabled, rules)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(policy.name, policy.description, policy.enabled ? 1 : 0, JSON.stringify(policy.rules));
  }
  
  // Audit logging
  logAuthorization(request: any, result: boolean, reason?: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (id, request, result, reason, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      JSON.stringify(request),
      result ? 1 : 0,
      reason,
      Date.now()
    );
  }
  
  close(): void {
    this.db.close();
  }
}
```

## Best Practices

### 1. Principle of Least Privilege

```typescript
// Always grant minimum required permissions
// Bad: Grant admin role when viewer is enough
bad: authManager.assignRole(userId, 'admin');

// Good: Grant appropriate role
good: authManager.assignRole(userId, 'viewer');
```

### 2. Defense in Depth

```typescript
// Multiple layers of authorization checks
async function deleteChannel(userId: string, channelId: string) {
  // 1. Check role-based permission
  if (!authManager.hasPermission(userId, 'channels:delete')) {
    throw new Error('Permission denied');
  }
  
  // 2. Check resource-level ACL
  if (!authManager.hasAccess('channel', channelId, userId, 'admin')) {
    throw new Error('Access denied');
  }
  
  // 3. Check policy
  const policyResult = await authManager.authorize({
    userId,
    action: 'delete',
    resourceType: 'channel',
    resourceId: channelId,
  });
  
  if (!policyResult.allowed) {
    throw new Error('Policy denied');
  }
  
  // 4. Delete channel
  await channelService.delete(channelId);
}
```

### 3. Separation of Duties

```typescript
// Different users for different operations
// Admin can manage users but not execute dangerous tools
// Owner can execute tools but should not be the only admin
```

### 4. Regular Access Reviews

```typescript
// Periodic review of assignments
function auditRoles() {
  const allAssignments = authManager.getAllRoleAssignments();
  const inactiveUsers = userService.getInactiveUsers(30);
  
  for (const assignment of allAssignments) {
    if (inactiveUsers.has(assignment.userId) && 
        assignment.role !== 'viewer') {
      console.warn(`Inactive user ${assignment.userId} has elevated role ${assignment.role}`);
    }
  }
}
```

### 5. Fail-Secure Default

```typescript
// Always deny by default
// Explicit allow required
const DEFAULT_ACCESS = 'none';
```

### 6. Audit Everything

```typescript
// Log all authorization decisions
authManager.on('decision', (request, result) => {
  auditLogger.log({
    type: 'authorization',
    userId: request.userId,
    action: request.action,
    resource: request.resourceType ? `${request.resourceType}:${request.resourceId}` : undefined,
    result,
    reason: result.reason,
    timestamp: Date.now(),
  });
});
```

## Testing

### Unit Tests

```typescript
import { AuthorizationManager } from '../services/authorization';
import { ROLE_PERMISSIONS } from '../config/role-permissions';

describe('AuthorizationManager', () => {
  let authManager: AuthorizationManager;
  
  beforeEach(() => {
    authManager = new AuthorizationManager();
    authManager.assignRole('user:admin', 'owner', 'system');
    authManager.assignRole('user:editor', 'editor', 'user:admin');
    authManager.assignRole('user:viewer', 'viewer', 'user:admin');
  });
  
  describe('Role Assignment', () => {
    it('assigns roles correctly', () => {
      expect(authManager.getRole('user:admin')).toBe('owner');
      expect(authManager.getRole('user:editor')).toBe('editor');
      expect(authManager.getRole('user:viewer')).toBe('viewer');
      expect(authManager.getRole('user:unknown')).toBe('guest');
    });
    
    it('checks role hierarchy', () => {
      expect(authManager.requiresRole('user:admin', 'owner')).toBe(true);
      expect(authManager.requiresRole('user:admin', 'admin')).toBe(true);
      expect(authManager.requiresRole('user:editor', 'admin')).toBe(false);
      expect(authManager.requiresRole('user:viewer', 'editor')).toBe(false);
    });
  });
  
  describe('Permission Checking', () => {
    it('allows owner all permissions', () => {
      expect(authManager.hasPermission('user:admin', 'users:admin')).toBe(true);
      expect(authManager.hasPermission('user:admin', 'providers:manage')).toBe(true);
    });
    
    it('restricts editor permissions', () => {
      expect(authManager.hasPermission('user:editor', 'providers:read')).toBe(true);
      expect(authManager.hasPermission('user:editor', 'providers:manage')).toBe(false);
    });
    
    it('restricts viewer permissions', () => {
      expect(authManager.hasPermission('user:viewer', 'sessions:read')).toBe(true);
      expect(authManager.hasPermission('user:viewer', 'sessions:delete')).toBe(false);
    });
  });
  
  describe('Authorization', () => {
    it('authorizes allowed actions', async () => {
      const result = await authManager.authorize({
        userId: 'user:admin',
        action: 'manage',
        resourceType: 'providers',
        resourceId: 'provider:1',
      });
      expect(result.allowed).toBe(true);
    });
    
    it('denies unauthorized actions', async () => {
      const result = await authManager.authorize({
        userId: 'user:viewer',
        action: 'delete',
        resourceType: 'sessions',
        resourceId: 'session:1',
      });
      expect(result.allowed).toBe(false);
    });
  });
});
```

### Integration Tests

```typescript
describe('Authorization Integration', () => {
  let gateway: AgentGateway;
  
  beforeAll(() => {
    gateway = new AgentGateway();
  });
  
  it('blocks unauthorized message access', async () => {
    const userId = 'user:viewer';
    const channelId = 'private:channel';
    
    // Viewer cannot access private channel
    const result = await gateway.canAccessChannel(userId, channelId);
    expect(result.allowed).toBe(false);
  });
  
  it('allows authorized tool execution', async () => {
    const userId = 'user:admin';
    const tool = 'bash';
    
    const result = await gateway.canExecuteTool(userId, tool);
    expect(result.allowed).toBe(true);
  });
  
  it('requires approval for dangerous tools', async () => {
    const userId = 'user:editor';
    const tool = 'bash';
    
    const authResult = await gateway.canExecuteTool(userId, tool);
    expect(authResult.allowed).toBe(false);
    expect(authResult.reason).toContain('approval');
  });
});
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Permission denied | Missing role permission | Assign appropriate role or permission |
| Access denied | Missing ACL entry | Grant resource access via ACL |
| Policy denied | Policy rule blocks action | Review and update policies |
| Token expired | Session token expired | Re-authenticate to get new token |
| Role not found | User has no role assignment | Assign default role |

### Debug Commands

```bash
# Check user role
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/auth/role

# Check permissions
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/auth/permissions

# Check ACLs
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/auth/acls

# Test authorization
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"action":"read","resourceType":"channel","resourceId":"channel:1"}' \
  http://localhost:3000/api/auth/check
```

## Resources

- **[RBAC on Wikipedia](https://en.wikipedia.org/wiki/Role-based_access_control)** - RBAC fundamentals
- **[OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)** - Security best practices
- **[Zod](https://zod.dev/)** - Schema validation
- **[Bun SQLite](https://bun.sh/docs/api/sqlite)** - SQLite database
- **[JSON Web Tokens](https://jwt.io/)** - Token-based authentication

## Principles

1. **Least Privilege**: Grant only necessary permissions
2. **Separation of Duties**: Different roles for different responsibilities
3. **Defense in Depth**: Multiple layers of authorization checks
4. **Fail-Secure**: Default to deny on any error
5. **Auditability**: Log all authorization decisions
6. **Transparency**: Make permissions and roles visible to users
7. **Maintainability**: Keep authorization logic simple and testable
8. **Performance**: Authorization checks should be fast and cacheable

