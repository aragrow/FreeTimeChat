# @freetimechat/types

Shared TypeScript types for FreeTimeChat monorepo.

## Overview

This package contains all shared type definitions used across the FreeTimeChat web and API applications. It ensures type consistency and reusability throughout the monorepo.

## Installation

This package is private and used internally within the monorepo. It's automatically available to other packages via pnpm workspaces.

## Usage

### In Web Application

```typescript
import type { User, Project, TimeEntry } from '@freetimechat/types';

const user: User = {
  id: '123',
  email: 'user@example.com',
  name: 'John Doe',
  // ...
};
```

### In API Application

```typescript
import type { LoginRequest, LoginResponse } from '@freetimechat/types';

function login(req: LoginRequest): Promise<LoginResponse> {
  // Implementation
}
```

## Type Categories

### User Types (`user.types.ts`)

- `User` - User entity with all fields
- `UserPublic` - User entity without sensitive fields
- `Client` - Client/tenant entity
- `Role` - Role for RBAC
- `Capability` - Permission capability
- `UserRole` - User-Role junction
- `RoleCapability` - Role-Capability junction with allow/deny
- `ImpersonationSession` - Admin impersonation tracking

### Authentication Types (`auth.types.ts`)

- `JWTPayload` - JWT access token payload
- `ImpersonationMetadata` - Impersonation data in JWT
- `RefreshToken` - Refresh token entity
- `LoginRequest` / `LoginResponse` - Login flow
- `RegisterRequest` - Registration data
- `RefreshTokenRequest` / `RefreshTokenResponse` - Token refresh
- `TwoFactorEnableRequest` / `TwoFactorEnableResponse` - 2FA setup
- `TwoFactorVerifyRequest` - 2FA verification
- `TwoFactorDisableRequest` - 2FA removal
- `GoogleUserInfo` - Google OAuth user data

### Project Types (`project.types.ts`)

- `Project` - Project entity
- `TimeEntry` - Time tracking entry
- `Task` - Task entity
- `TaskStatus` - Task status enum (TODO, IN_PROGRESS, REVIEW, DONE, CANCELLED)
- `TaskPriority` - Task priority enum (LOW, MEDIUM, HIGH, URGENT)
- `CreateProjectRequest` / `UpdateProjectRequest` - Project mutations
- `CreateTimeEntryRequest` / `UpdateTimeEntryRequest` - Time entry mutations
- `CreateTaskRequest` / `UpdateTaskRequest` - Task mutations

### Chat Types (`chat.types.ts`)

- `Conversation` - Chat conversation entity
- `Message` - Chat message entity
- `MessageRole` - Message role enum (USER, ASSISTANT, SYSTEM)
- `MessageMetadata` - Message metadata with intent and entities
- `ChatRequest` / `ChatResponse` - Chat interaction
- `CreateConversationRequest` - Conversation creation

## Development

### Build

```bash
# Build TypeScript
pnpm build

# Watch mode
pnpm dev
```

### Clean

```bash
pnpm clean
```

## Adding New Types

When adding new types:

1. Create a new `.types.ts` file in `src/` for the category
2. Export types from the file
3. Add export to `src/index.ts`
4. Build the package: `pnpm build`
5. Document the types in this README

## Type Safety

All types follow these principles:

- Use explicit types, avoid `any`
- Use optional properties (`?`) instead of `| undefined` where appropriate
- Use enums for fixed value sets
- Include JSDoc comments for complex types
- Separate entity types from request/response DTOs

## Examples

### User Authentication

```typescript
import type { LoginRequest, LoginResponse, UserPublic } from '@freetimechat/types';

async function handleLogin(request: LoginRequest): Promise<LoginResponse> {
  const user: UserPublic = await authenticate(request);

  return {
    accessToken: generateToken(user),
    refreshToken: generateRefreshToken(user),
    user,
  };
}
```

### Time Tracking

```typescript
import type { TimeEntry, CreateTimeEntryRequest } from '@freetimechat/types';

async function createTimeEntry(
  request: CreateTimeEntryRequest
): Promise<TimeEntry> {
  return await db.timeEntry.create({
    data: request,
  });
}
```

### RBAC

```typescript
import type { User, Role, Capability } from '@freetimechat/types';

function hasCapability(user: User, capabilityName: string): boolean {
  return user.roles?.some(ur =>
    ur.role?.capabilities?.some(rc =>
      rc.capability?.name === capabilityName && rc.isAllowed
    )
  ) ?? false;
}
```

## Related Documentation

- [Project Instructions](../../.claude/instructions.md)
- [Database Schema](../../.claude/database.md)
- [Authentication](../../.claude/authentication.md)
- [Authorization](../../.claude/authorization.md)
