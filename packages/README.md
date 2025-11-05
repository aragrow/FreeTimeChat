# Packages

This directory contains shared packages used across FreeTimeChat applications.

## Structure

```
packages/
├── types/      # Shared TypeScript types/interfaces (to be created)
└── config/     # Shared configuration (to be created)
```

## Creating the Packages

### 1. Create Shared Types Package

```bash
mkdir -p packages/types/src
cd packages/types

# Create package.json
cat > package.json << 'EOF'
{
  "name": "@freetimechat/types",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist *.tsbuildinfo"
  },
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}
EOF

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Create index.ts
cat > src/index.ts << 'EOF'
// Export all shared types
export * from './user';
export * from './auth';
export * from './time-entry';
export * from './project';
EOF
```

### 2. Create Config Package

```bash
mkdir -p packages/config
cd packages/config

# Create package.json
cat > package.json << 'EOF'
{
  "name": "@freetimechat/config",
  "version": "0.1.0",
  "main": "./index.js",
  "files": [
    "eslint",
    "typescript"
  ]
}
EOF

# Add shared ESLint and TypeScript configs
```

## Usage

### In Next.js App (web)

```typescript
import type { User, TimeEntry } from '@freetimechat/types';
```

### In API App

```typescript
import type { User, TimeEntry } from '@freetimechat/types';
```

## Example Type Definitions

### packages/types/src/user.ts

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  clientId: string;
  roles: UserRole[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  role: Role;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  capabilities: RoleCapability[];
}

export interface RoleCapability {
  id: string;
  roleId: string;
  capabilityId: string;
  capability: Capability;
  isAllowed: boolean;
}

export interface Capability {
  id: string;
  name: string;
  description?: string;
}
```

### packages/types/src/auth.ts

```typescript
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  clientId: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}
```

### packages/types/src/time-entry.ts

```typescript
export interface TimeEntry {
  id: string;
  userId: string;
  projectId: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // minutes
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTimeEntryRequest {
  projectId: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

export interface TimeEntryResponse {
  id: string;
  userId: string;
  projectId: string;
  project: {
    id: string;
    name: string;
  };
  description?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  createdAt: string;
  updatedAt: string;
}
```

## Development

```bash
# Build types package
cd packages/types
pnpm build

# Watch mode (auto-rebuild)
pnpm dev
```

## Important Notes

1. **Build First**: Always build shared packages before building apps
2. **Type Safety**: Changes to types affect all apps
3. **Version Sync**: Keep versions in sync across packages
4. **Breaking Changes**: Document breaking changes

## Auto-build on Install

The root `package.json` includes a postinstall script:

```json
"postinstall": "turbo run build --filter=@freetimechat/types"
```

This ensures types are built after `pnpm install`.
