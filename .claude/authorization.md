# Authorization Architecture (RBAC with Explicit Deny)

This document outlines the Role-Based Access Control (RBAC) system for FreeTimeChat with support for multiple roles per user, granular capabilities, and explicit deny rules.

## Overview

FreeTimeChat implements a flexible RBAC system with the following features:

- **Users** can have **multiple roles**
- **Roles** can have **multiple capabilities** (permissions)
- **Capabilities** can be **explicitly denied**, which takes precedence over grants
- **Granular permissions** with read/write separation
- **Hierarchical naming**: `resource.action` (e.g., `user.read`, `user.write`)

### Authorization Flow

```
User Request → Check User's Roles → Collect All Capabilities → Check for Explicit Deny → Check for Allow → Grant/Deny Access
```

**Key Principle:** **Explicit Deny > Allow**
- If ANY role denies a capability, access is denied
- If NO role denies and AT LEAST ONE role allows, access is granted
- If no explicit allow or deny, access is denied by default

---

## Database Schema

### Roles Table

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false, -- Cannot be deleted/modified
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_roles_name ON roles(name);

-- Insert default system roles
INSERT INTO roles (name, description, is_system_role) VALUES
  ('admin', 'System administrator with full access', true),
  ('user', 'Standard user with basic access', true),
  ('manager', 'Manager with team oversight capabilities', true),
  ('viewer', 'Read-only access to reports', true);
```

### Capabilities Table

```sql
CREATE TABLE capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'user.read', 'project.write'
  description TEXT,
  resource VARCHAR(50) NOT NULL,      -- e.g., 'user', 'project', 'report'
  action VARCHAR(50) NOT NULL,        -- e.g., 'read', 'write', 'delete'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_capability UNIQUE(resource, action)
);

CREATE INDEX idx_capabilities_name ON capabilities(name);
CREATE INDEX idx_capabilities_resource ON capabilities(resource);

-- Insert default capabilities
INSERT INTO capabilities (name, resource, action, description) VALUES
  -- Admin
  ('isadmin', 'system', 'admin', 'Full system administrator access'),

  -- User management
  ('user.read', 'user', 'read', 'View user information'),
  ('user.write', 'user', 'write', 'Create and update users'),
  ('user.delete', 'user', 'delete', 'Delete users'),

  -- Role management
  ('role.read', 'role', 'read', 'View roles'),
  ('role.write', 'role', 'write', 'Create and update roles'),
  ('role.delete', 'role', 'delete', 'Delete roles'),

  -- Capability management
  ('capability.read', 'capability', 'read', 'View capabilities'),
  ('capability.write', 'capability', 'write', 'Create and update capabilities'),
  ('capability.delete', 'capability', 'delete', 'Delete capabilities'),

  -- Project management
  ('project.read', 'project', 'read', 'View projects'),
  ('project.write', 'project', 'write', 'Create and update projects'),
  ('project.delete', 'project', 'delete', 'Delete projects'),

  -- Time entry management
  ('timeentry.read', 'timeentry', 'read', 'View time entries'),
  ('timeentry.write', 'timeentry', 'write', 'Create and update time entries'),
  ('timeentry.delete', 'timeentry', 'delete', 'Delete time entries'),
  ('timeentry.read.all', 'timeentry', 'read_all', 'View all users time entries'),
  ('timeentry.write.all', 'timeentry', 'write_all', 'Edit all users time entries'),

  -- Report management
  ('report.read', 'report', 'read', 'View reports'),
  ('report.read.all', 'report', 'read_all', 'View all users reports'),
  ('report.export', 'report', 'export', 'Export reports'),

  -- Client management
  ('client.read', 'client', 'read', 'View clients'),
  ('client.write', 'client', 'write', 'Create and update clients'),
  ('client.delete', 'client', 'delete', 'Delete clients'),

  -- Chat management
  ('chat.use', 'chat', 'use', 'Use chat interface'),
  ('chat.history.read', 'chat', 'history_read', 'View own chat history'),
  ('chat.history.read.all', 'chat', 'history_read_all', 'View all chat history');
```

### User-Role Junction Table (Many-to-Many)

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by UUID REFERENCES users(id), -- Who assigned this role

  CONSTRAINT unique_user_role UNIQUE(user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
```

### Role-Capability Junction Table (Many-to-Many with Deny Support)

```sql
CREATE TABLE role_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  capability_id UUID REFERENCES capabilities(id) ON DELETE CASCADE,
  is_allowed BOOLEAN DEFAULT true, -- true = grant, false = explicit deny
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_role_capability UNIQUE(role_id, capability_id)
);

CREATE INDEX idx_role_capabilities_role_id ON role_capabilities(role_id);
CREATE INDEX idx_role_capabilities_capability_id ON role_capabilities(capability_id);

-- Default role capabilities
-- Admin role: Full access
INSERT INTO role_capabilities (role_id, capability_id, is_allowed)
SELECT
  (SELECT id FROM roles WHERE name = 'admin'),
  id,
  true
FROM capabilities;

-- User role: Basic access
INSERT INTO role_capabilities (role_id, capability_id, is_allowed)
SELECT
  (SELECT id FROM roles WHERE name = 'user'),
  id,
  true
FROM capabilities
WHERE name IN (
  'chat.use',
  'chat.history.read',
  'timeentry.read',
  'timeentry.write',
  'project.read',
  'report.read'
);

-- Manager role: Team oversight
INSERT INTO role_capabilities (role_id, capability_id, is_allowed)
SELECT
  (SELECT id FROM roles WHERE name = 'manager'),
  id,
  true
FROM capabilities
WHERE name IN (
  'chat.use',
  'chat.history.read',
  'timeentry.read',
  'timeentry.write',
  'timeentry.read.all',
  'project.read',
  'project.write',
  'report.read',
  'report.read.all',
  'report.export',
  'user.read'
);

-- Viewer role: Read-only access
INSERT INTO role_capabilities (role_id, capability_id, is_allowed)
SELECT
  (SELECT id FROM roles WHERE name = 'viewer'),
  id,
  true
FROM capabilities
WHERE name IN (
  'timeentry.read.all',
  'project.read',
  'report.read',
  'report.read.all',
  'user.read'
);

-- Example: Viewer explicitly denied from writing
INSERT INTO role_capabilities (role_id, capability_id, is_allowed)
SELECT
  (SELECT id FROM roles WHERE name = 'viewer'),
  id,
  false -- EXPLICIT DENY
FROM capabilities
WHERE action = 'write' OR action = 'delete';
```

---

## Prisma Schema

```prisma
// apps/api/prisma/schema.prisma

model User {
  id          String        @id @default(uuid())
  email       String        @unique
  name        String
  // ... other user fields from authentication.md

  // Relationships
  roles       UserRole[]
  assignedRoles UserRole[] @relation("RoleAssigner")

  // ... other relationships
  @@map("users")
}

model Role {
  id           String           @id @default(uuid())
  name         String           @unique
  description  String?
  isSystemRole Boolean          @default(false) @map("is_system_role")
  users        UserRole[]
  capabilities RoleCapability[]
  createdAt    DateTime         @default(now()) @map("created_at")
  updatedAt    DateTime         @updatedAt @map("updated_at")

  @@map("roles")
}

model Capability {
  id          String           @id @default(uuid())
  name        String           @unique
  description String?
  resource    String
  action      String
  roles       RoleCapability[]
  createdAt   DateTime         @default(now()) @map("created_at")
  updatedAt   DateTime         @updatedAt @map("updated_at")

  @@unique([resource, action])
  @@index([name])
  @@index([resource])
  @@map("capabilities")
}

model UserRole {
  id         String   @id @default(uuid())
  userId     String   @map("user_id")
  roleId     String   @map("role_id")
  assignedBy String?  @map("assigned_by")
  assignedAt DateTime @default(now()) @map("assigned_at")

  user     User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  role     Role  @relation(fields: [roleId], references: [id], onDelete: Cascade)
  assigner User? @relation("RoleAssigner", fields: [assignedBy], references: [id])

  @@unique([userId, roleId])
  @@index([userId])
  @@index([roleId])
  @@map("user_roles")
}

model RoleCapability {
  id           String     @id @default(uuid())
  roleId       String     @map("role_id")
  capabilityId String     @map("capability_id")
  isAllowed    Boolean    @default(true) @map("is_allowed")
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  role       Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  capability Capability @relation(fields: [capabilityId], references: [id], onDelete: Cascade)

  @@unique([roleId, capabilityId])
  @@index([roleId])
  @@index([capabilityId])
  @@map("role_capabilities")
}
```

---

## Authorization Service

```typescript
// apps/api/src/services/auth/authorizationService.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AuthorizationService {
  /**
   * Check if user has a specific capability
   * Implements: Explicit Deny > Allow > Default Deny
   */
  static async userHasCapability(
    userId: string,
    capabilityName: string
  ): Promise<boolean> {
    // Get all user's roles and their capabilities
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            capabilities: {
              include: {
                capability: true,
              },
              where: {
                capability: {
                  name: capabilityName,
                },
              },
            },
          },
        },
      },
    });

    if (userRoles.length === 0) {
      return false; // No roles = no access
    }

    let hasAllow = false;
    let hasExplicitDeny = false;

    // Check all roles for this capability
    for (const userRole of userRoles) {
      for (const roleCapability of userRole.role.capabilities) {
        if (roleCapability.capability.name === capabilityName) {
          if (roleCapability.isAllowed === false) {
            // Explicit deny found - immediate rejection
            hasExplicitDeny = true;
          } else if (roleCapability.isAllowed === true) {
            // Allow found
            hasAllow = true;
          }
        }
      }
    }

    // Explicit deny takes precedence over allow
    if (hasExplicitDeny) {
      return false;
    }

    // Return true if at least one role allows
    return hasAllow;
  }

  /**
   * Check if user has ANY of the specified capabilities
   */
  static async userHasAnyCapability(
    userId: string,
    capabilityNames: string[]
  ): Promise<boolean> {
    for (const capabilityName of capabilityNames) {
      if (await this.userHasCapability(userId, capabilityName)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has ALL specified capabilities
   */
  static async userHasAllCapabilities(
    userId: string,
    capabilityNames: string[]
  ): Promise<boolean> {
    for (const capabilityName of capabilityNames) {
      if (!(await this.userHasCapability(userId, capabilityName))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get all capabilities for a user (resolved with deny rules)
   */
  static async getUserCapabilities(userId: string): Promise<{
    allowed: string[];
    denied: string[];
  }> {
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            capabilities: {
              include: {
                capability: true,
              },
            },
          },
        },
      },
    });

    const capabilityMap = new Map<string, boolean>();

    // Collect all capabilities from all roles
    for (const userRole of userRoles) {
      for (const roleCapability of userRole.role.capabilities) {
        const capName = roleCapability.capability.name;
        const isAllowed = roleCapability.isAllowed;

        // If explicit deny exists, set to false (deny takes precedence)
        if (capabilityMap.has(capName)) {
          if (!isAllowed) {
            capabilityMap.set(capName, false);
          }
          // If already allowed and this is also allowed, keep allowed
          // If already denied, keep denied (deny wins)
        } else {
          capabilityMap.set(capName, isAllowed);
        }
      }
    }

    const allowed: string[] = [];
    const denied: string[] = [];

    capabilityMap.forEach((isAllowed, capName) => {
      if (isAllowed) {
        allowed.push(capName);
      } else {
        denied.push(capName);
      }
    });

    return { allowed, denied };
  }

  /**
   * Check if user is admin (has 'isadmin' capability)
   */
  static async isAdmin(userId: string): Promise<boolean> {
    return this.userHasCapability(userId, 'isadmin');
  }

  /**
   * Check resource-level permission (read/write pattern)
   */
  static async canReadResource(
    userId: string,
    resource: string
  ): Promise<boolean> {
    return this.userHasCapability(userId, `${resource}.read`);
  }

  static async canWriteResource(
    userId: string,
    resource: string
  ): Promise<boolean> {
    return this.userHasCapability(userId, `${resource}.write`);
  }

  static async canDeleteResource(
    userId: string,
    resource: string
  ): Promise<boolean> {
    return this.userHasCapability(userId, `${resource}.delete`);
  }

  /**
   * Assign role to user
   */
  static async assignRoleToUser(
    userId: string,
    roleId: string,
    assignedBy: string
  ) {
    // Check if assigner has permission
    const canAssign = await this.userHasCapability(assignedBy, 'role.write');
    if (!canAssign && !(await this.isAdmin(assignedBy))) {
      throw new Error('Insufficient permissions to assign roles');
    }

    return prisma.userRole.create({
      data: {
        userId,
        roleId,
        assignedBy,
      },
    });
  }

  /**
   * Remove role from user
   */
  static async removeRoleFromUser(userId: string, roleId: string, removedBy: string) {
    const canRemove = await this.userHasCapability(removedBy, 'role.write');
    if (!canRemove && !(await this.isAdmin(removedBy))) {
      throw new Error('Insufficient permissions to remove roles');
    }

    return prisma.userRole.deleteMany({
      where: {
        userId,
        roleId,
      },
    });
  }

  /**
   * Add capability to role
   */
  static async addCapabilityToRole(
    roleId: string,
    capabilityId: string,
    isAllowed: boolean = true
  ) {
    return prisma.roleCapability.upsert({
      where: {
        roleId_capabilityId: {
          roleId,
          capabilityId,
        },
      },
      update: {
        isAllowed,
      },
      create: {
        roleId,
        capabilityId,
        isAllowed,
      },
    });
  }

  /**
   * Remove capability from role
   */
  static async removeCapabilityFromRole(roleId: string, capabilityId: string) {
    return prisma.roleCapability.deleteMany({
      where: {
        roleId,
        capabilityId,
      },
    });
  }

  /**
   * Cache user permissions (for performance)
   * Store in Redis with TTL of 5 minutes
   */
  static async cacheUserPermissions(userId: string) {
    const capabilities = await this.getUserCapabilities(userId);
    // Store in Redis: key = `user:${userId}:permissions`
    // Value = JSON.stringify(capabilities)
    // TTL = 300 seconds
    return capabilities;
  }

  /**
   * Invalidate user permission cache
   */
  static async invalidateUserPermissions(userId: string) {
    // Delete Redis key: `user:${userId}:permissions`
  }
}
```

---

## Authorization Middleware

```typescript
// apps/api/src/middleware/authorize.ts
import { Request, Response, NextFunction } from 'express';
import { AuthorizationService } from '../services/auth/authorizationService';
import { AuthRequest } from './auth';

/**
 * Middleware to check if user has required capability
 */
export function requireCapability(capabilityName: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const hasCapability = await AuthorizationService.userHasCapability(
      req.user.userId,
      capabilityName
    );

    if (!hasCapability) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Required capability: ${capabilityName}`,
      });
    }

    next();
  };
}

/**
 * Middleware to check if user has ANY of the required capabilities
 */
export function requireAnyCapability(capabilityNames: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const hasAny = await AuthorizationService.userHasAnyCapability(
      req.user.userId,
      capabilityNames
    );

    if (!hasAny) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Required any of: ${capabilityNames.join(', ')}`,
      });
    }

    next();
  };
}

/**
 * Middleware to check if user has ALL required capabilities
 */
export function requireAllCapabilities(capabilityNames: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const hasAll = await AuthorizationService.userHasAllCapabilities(
      req.user.userId,
      capabilityNames
    );

    if (!hasAll) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Required all of: ${capabilityNames.join(', ')}`,
      });
    }

    next();
  };
}

/**
 * Middleware to check if user is admin
 */
export function requireAdmin() {
  return requireCapability('isadmin');
}

/**
 * Middleware for resource-based permissions
 */
export function requireResourceAccess(resource: string, action: 'read' | 'write' | 'delete') {
  return requireCapability(`${resource}.${action}`);
}

/**
 * Attach user capabilities to request for easy access
 */
export async function attachCapabilities(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next();
  }

  try {
    const capabilities = await AuthorizationService.getUserCapabilities(
      req.user.userId
    );

    // Attach to request
    (req as any).capabilities = capabilities.allowed;
    (req as any).deniedCapabilities = capabilities.denied;

    next();
  } catch (error) {
    next(error);
  }
}
```

---

## API Endpoints

### Role Management

```typescript
// apps/api/src/routes/roles/index.ts
import express from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireCapability } from '../../middleware/authorize';
import { RoleService } from '../../services/roleService';

const router = express.Router();

// List all roles
router.get(
  '/',
  requireAuth,
  requireCapability('role.read'),
  async (req, res) => {
    const roles = await prisma.role.findMany({
      include: {
        capabilities: {
          include: {
            capability: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });
    res.json(roles);
  }
);

// Get single role
router.get(
  '/:id',
  requireAuth,
  requireCapability('role.read'),
  async (req, res) => {
    const role = await prisma.role.findUnique({
      where: { id: req.params.id },
      include: {
        capabilities: {
          include: {
            capability: true,
          },
        },
        users: {
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json(role);
  }
);

// Create role
router.post(
  '/',
  requireAuth,
  requireCapability('role.write'),
  async (req, res) => {
    const { name, description } = req.body;

    const role = await prisma.role.create({
      data: {
        name,
        description,
      },
    });

    res.status(201).json(role);
  }
);

// Update role
router.patch(
  '/:id',
  requireAuth,
  requireCapability('role.write'),
  async (req, res) => {
    const { name, description } = req.body;

    // Check if system role
    const existingRole = await prisma.role.findUnique({
      where: { id: req.params.id },
    });

    if (existingRole?.isSystemRole) {
      return res.status(400).json({ error: 'Cannot modify system roles' });
    }

    const role = await prisma.role.update({
      where: { id: req.params.id },
      data: { name, description },
    });

    res.json(role);
  }
);

// Delete role
router.delete(
  '/:id',
  requireAuth,
  requireCapability('role.delete'),
  async (req, res) => {
    const role = await prisma.role.findUnique({
      where: { id: req.params.id },
    });

    if (role?.isSystemRole) {
      return res.status(400).json({ error: 'Cannot delete system roles' });
    }

    await prisma.role.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Role deleted successfully' });
  }
);

// Add capability to role
router.post(
  '/:id/capabilities',
  requireAuth,
  requireCapability('role.write'),
  async (req, res) => {
    const { capabilityId, isAllowed } = req.body;

    const roleCapability = await AuthorizationService.addCapabilityToRole(
      req.params.id,
      capabilityId,
      isAllowed
    );

    res.status(201).json(roleCapability);
  }
);

// Remove capability from role
router.delete(
  '/:id/capabilities/:capabilityId',
  requireAuth,
  requireCapability('role.write'),
  async (req, res) => {
    await AuthorizationService.removeCapabilityFromRole(
      req.params.id,
      req.params.capabilityId
    );

    res.json({ message: 'Capability removed from role' });
  }
);

export default router;
```

### User Role Management

```typescript
// apps/api/src/routes/users/:userId/roles.ts
import express from 'express';
import { requireAuth } from '../../../middleware/auth';
import { requireCapability } from '../../../middleware/authorize';
import { AuthorizationService } from '../../../services/auth/authorizationService';

const router = express.Router({ mergeParams: true });

// Get user's roles
router.get(
  '/',
  requireAuth,
  requireCapability('user.read'),
  async (req, res) => {
    const { userId } = req.params;

    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: true,
        assigner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json(userRoles);
  }
);

// Assign role to user
router.post(
  '/',
  requireAuth,
  requireCapability('role.write'),
  async (req, res) => {
    const { userId } = req.params;
    const { roleId } = req.body;
    const assignedBy = (req as any).user.userId;

    const userRole = await AuthorizationService.assignRoleToUser(
      userId,
      roleId,
      assignedBy
    );

    // Invalidate user permission cache
    await AuthorizationService.invalidateUserPermissions(userId);

    res.status(201).json(userRole);
  }
);

// Remove role from user
router.delete(
  '/:roleId',
  requireAuth,
  requireCapability('role.write'),
  async (req, res) => {
    const { userId, roleId } = req.params;
    const removedBy = (req as any).user.userId;

    await AuthorizationService.removeRoleFromUser(userId, roleId, removedBy);

    // Invalidate user permission cache
    await AuthorizationService.invalidateUserPermissions(userId);

    res.json({ message: 'Role removed from user' });
  }
);

// Get user's effective capabilities
router.get(
  '/capabilities',
  requireAuth,
  async (req, res) => {
    const { userId } = req.params;

    // Users can view their own capabilities, or admins can view any
    if ((req as any).user.userId !== userId) {
      const isAdmin = await AuthorizationService.isAdmin((req as any).user.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const capabilities = await AuthorizationService.getUserCapabilities(userId);
    res.json(capabilities);
  }
);

export default router;
```

### Capability Management

```typescript
// apps/api/src/routes/capabilities/index.ts
import express from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireCapability } from '../../middleware/authorize';

const router = express.Router();

// List all capabilities
router.get(
  '/',
  requireAuth,
  requireCapability('capability.read'),
  async (req, res) => {
    const capabilities = await prisma.capability.findMany({
      include: {
        _count: {
          select: { roles: true },
        },
      },
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });

    res.json(capabilities);
  }
);

// Create capability
router.post(
  '/',
  requireAuth,
  requireCapability('capability.write'),
  async (req, res) => {
    const { name, resource, action, description } = req.body;

    const capability = await prisma.capability.create({
      data: {
        name,
        resource,
        action,
        description,
      },
    });

    res.status(201).json(capability);
  }
);

// Update capability
router.patch(
  '/:id',
  requireAuth,
  requireCapability('capability.write'),
  async (req, res) => {
    const { name, resource, action, description } = req.body;

    const capability = await prisma.capability.update({
      where: { id: req.params.id },
      data: { name, resource, action, description },
    });

    res.json(capability);
  }
);

// Delete capability
router.delete(
  '/:id',
  requireAuth,
  requireCapability('capability.delete'),
  async (req, res) => {
    await prisma.capability.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Capability deleted successfully' });
  }
);

export default router;
```

---

## Frontend Implementation

### Hook for Authorization

```typescript
// apps/web/lib/auth/useAuthorization.ts
'use client';

import { useAuth } from './useAuth';
import { useState, useEffect } from 'react';
import { authClient } from '../api-client/auth-client';

interface UserCapabilities {
  allowed: string[];
  denied: string[];
}

export function useAuthorization() {
  const { user } = useAuth();
  const [capabilities, setCapabilities] = useState<UserCapabilities>({
    allowed: [],
    denied: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCapabilities();
    } else {
      setCapabilities({ allowed: [], denied: [] });
      setLoading(false);
    }
  }, [user]);

  const loadCapabilities = async () => {
    try {
      const caps = await authClient.getUserCapabilities();
      setCapabilities(caps);
    } catch (error) {
      console.error('Failed to load capabilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasCapability = (capabilityName: string): boolean => {
    return capabilities.allowed.includes(capabilityName);
  };

  const hasAnyCapability = (capabilityNames: string[]): boolean => {
    return capabilityNames.some((cap) => capabilities.allowed.includes(cap));
  };

  const hasAllCapabilities = (capabilityNames: string[]): boolean => {
    return capabilityNames.every((cap) => capabilities.allowed.includes(cap));
  };

  const canRead = (resource: string): boolean => {
    return hasCapability(`${resource}.read`);
  };

  const canWrite = (resource: string): boolean => {
    return hasCapability(`${resource}.write`);
  };

  const canDelete = (resource: string): boolean => {
    return hasCapability(`${resource}.delete`);
  };

  const isAdmin = (): boolean => {
    return hasCapability('isadmin');
  };

  return {
    capabilities,
    loading,
    hasCapability,
    hasAnyCapability,
    hasAllCapabilities,
    canRead,
    canWrite,
    canDelete,
    isAdmin,
    refresh: loadCapabilities,
  };
}
```

### Protected Component Wrapper

```typescript
// apps/web/components/auth/ProtectedComponent.tsx
'use client';

import { useAuthorization } from '@/lib/auth/useAuthorization';
import { ReactNode } from 'react';

interface ProtectedComponentProps {
  children: ReactNode;
  requiredCapability?: string;
  requiredCapabilities?: string[];
  requireAll?: boolean; // If true, requires all capabilities; if false, requires any
  fallback?: ReactNode;
}

export function ProtectedComponent({
  children,
  requiredCapability,
  requiredCapabilities,
  requireAll = false,
  fallback = null,
}: ProtectedComponentProps) {
  const { hasCapability, hasAnyCapability, hasAllCapabilities, loading } =
    useAuthorization();

  if (loading) {
    return <div>Loading permissions...</div>;
  }

  let hasAccess = false;

  if (requiredCapability) {
    hasAccess = hasCapability(requiredCapability);
  } else if (requiredCapabilities) {
    hasAccess = requireAll
      ? hasAllCapabilities(requiredCapabilities)
      : hasAnyCapability(requiredCapabilities);
  } else {
    // No requirements specified, allow access
    hasAccess = true;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

### Role Management UI

```typescript
// apps/web/app/admin/roles/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { ProtectedComponent } from '@/components/auth/ProtectedComponent';
import { roleClient } from '@/lib/api-client/role-client';

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const data = await roleClient.getAllRoles();
      setRoles(data);
    } catch (error) {
      console.error('Failed to load roles:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedComponent requiredCapability="role.read">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Role Management</h1>

          <ProtectedComponent requiredCapability="role.write">
            <button className="btn-primary">Create Role</button>
          </ProtectedComponent>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="grid gap-4">
            {roles.map((role) => (
              <RoleCard key={role.id} role={role} onUpdate={loadRoles} />
            ))}
          </div>
        )}
      </div>
    </ProtectedComponent>
  );
}

function RoleCard({ role, onUpdate }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{role.name}</h3>
          <p className="text-sm text-gray-600">{role.description}</p>
          <p className="text-xs text-gray-500 mt-2">
            {role._count?.users || 0} users assigned
          </p>
        </div>

        <ProtectedComponent requiredCapability="role.write">
          <div className="flex gap-2">
            <button className="btn-sm">Edit</button>
            {!role.isSystemRole && (
              <button className="btn-sm btn-danger">Delete</button>
            )}
          </div>
        </ProtectedComponent>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Capabilities:</h4>
        <div className="flex flex-wrap gap-2">
          {role.capabilities?.map((rc) => (
            <span
              key={rc.id}
              className={`px-2 py-1 text-xs rounded ${
                rc.isAllowed
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {rc.isAllowed ? '✓' : '✗'} {rc.capability.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Common Use Cases

### Example 1: Restricting Time Entry Access

```typescript
// User can only read their own time entries
// Manager can read all time entries

router.get('/api/time-entries', requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const canReadAll = await AuthorizationService.userHasCapability(
    userId,
    'timeentry.read.all'
  );

  const timeEntries = await prisma.timeEntry.findMany({
    where: canReadAll ? {} : { userId }, // Filter by user if not admin/manager
  });

  res.json(timeEntries);
});
```

### Example 2: Explicit Deny Override

```typescript
// Scenario: User has both "user" and "viewer" roles
// "user" role: allows timeentry.write
// "viewer" role: explicitly DENIES timeentry.write
// Result: User CANNOT write time entries (deny wins)

const canWrite = await AuthorizationService.userHasCapability(
  userId,
  'timeentry.write'
);
// Returns: false (because viewer role explicitly denies)
```

### Example 3: Admin Override

```typescript
// Check if user can delete a project
// Either has project.delete OR is admin

const canDelete =
  (await AuthorizationService.userHasCapability(userId, 'project.delete')) ||
  (await AuthorizationService.isAdmin(userId));
```

---

## Testing Checklist

- [ ] User with no roles has no access
- [ ] User with single role has correct capabilities
- [ ] User with multiple roles has combined capabilities
- [ ] Explicit deny overrides allow from other roles
- [ ] System roles cannot be modified or deleted
- [ ] Role assignment requires proper permissions
- [ ] Capability caching works correctly
- [ ] Cache is invalidated when roles change
- [ ] Admin capability grants full access
- [ ] Resource-level permissions (read/write/delete) work correctly
- [ ] Frontend correctly shows/hides UI based on capabilities
- [ ] API endpoints properly enforce capability checks

---

## Performance Optimization

### Caching Strategy

```typescript
// apps/api/src/services/auth/authorizationCache.ts
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);
const CACHE_TTL = 300; // 5 minutes

export class AuthorizationCache {
  static async getUserCapabilities(userId: string) {
    const cacheKey = `user:${userId}:capabilities`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Load from database
    const capabilities = await AuthorizationService.getUserCapabilities(userId);

    // Cache for 5 minutes
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(capabilities));

    return capabilities;
  }

  static async invalidateUser(userId: string) {
    await redis.del(`user:${userId}:capabilities`);
  }

  static async invalidateRole(roleId: string) {
    // Find all users with this role and invalidate their cache
    const userRoles = await prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });

    for (const { userId } of userRoles) {
      await this.invalidateUser(userId);
    }
  }
}
```

---

## Security Best Practices

1. **Default Deny**: If no explicit allow, access is denied
2. **Explicit Deny Precedence**: Deny always wins over allow
3. **Audit Logging**: Log all role/capability changes
4. **Permission Caching**: Cache user permissions for performance
5. **Cache Invalidation**: Invalidate cache when roles change
6. **Least Privilege**: Grant minimal permissions needed
7. **Regular Audits**: Review role assignments periodically
8. **System Roles**: Protect critical roles from modification
9. **Role Hierarchy**: Consider implementing role inheritance if needed
10. **Frontend Security**: Always enforce permissions on backend (frontend is just UX)

---

## Future Enhancements

1. **Role Hierarchy**: Parent roles inherit capabilities from child roles
2. **Conditional Permissions**: Time-based or context-based permissions
3. **Resource-Level Permissions**: Per-resource granular control (e.g., can edit only their own projects)
4. **Permission Groups**: Group related capabilities together
5. **Audit Trail**: Complete history of permission changes
6. **Permission Request Workflow**: Users can request additional permissions
7. **Dynamic Capabilities**: Define capabilities at runtime
8. **API Key Permissions**: Different permission sets for API keys vs users
