# Authentication, Authorization & Impersonation Guide

**Target Audience:** Junior developers with less than 6 months of experience

**Last Updated:** January 2025

---

## Table of Contents

1. [Introduction](#introduction)
2. [Key Concepts](#key-concepts)
3. [System Architecture Overview](#system-architecture-overview)
4. [Authentication Flow](#authentication-flow)
5. [Authorization Flow](#authorization-flow)
6. [Impersonation Flow](#impersonation-flow)
7. [Two-Factor Authentication (2FA) Flow](#two-factor-authentication-2fa-flow)
8. [Code Walkthrough](#code-walkthrough)
9. [Common Development Tasks](#common-development-tasks)
10. [Troubleshooting](#troubleshooting)
11. [Security Best Practices](#security-best-practices)

---

## Introduction

### What is This Guide?

This guide explains how FreeTimeChat handles user identity, permissions, admin
impersonation, and two-factor authentication. Think of it as four layers of
security:

1. **Authentication** - "Who are you?" (proving your identity with
   email/password)
2. **Two-Factor Authentication (2FA)** - "Prove you have your phone" (extra
   security layer)
3. **Authorization** - "What can you do?" (checking your permissions)
4. **Impersonation** - "Admin pretending to be you" (for debugging/support)

### Why Do We Need This?

- **Authentication** ensures only real users can access the system
- **Two-Factor Authentication** prevents account takeover even if passwords are
  stolen
- **Authorization** ensures users only access features they're allowed to use
- **Impersonation** allows admins to help users by seeing exactly what they see

---

## Key Concepts

### 1. JWT (JSON Web Tokens)

**What is a JWT?** A JWT is like a digital ID card that proves who you are. It's
a long string of text that contains:

- Your user ID
- Your email
- Your roles
- When it expires

**Example JWT (simplified):**

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoiam9obkBleGFtcGxlLmNvbSIsInJvbGUiOiJhZG1pbiJ9.signature
```

**Important Parts:**

- **Header** - Says "this is a JWT"
- **Payload** - Contains your information (user ID, roles, etc.)
- **Signature** - Proves it hasn't been tampered with

**In Simple Terms:** When you log in, the server gives you a JWT. You show this
JWT with every request to prove who you are. It's like showing your ID card to
enter a building.

### 2. Access Token vs Refresh Token

**Access Token:**

- Short-lived (15 minutes)
- Used for every API request
- If stolen, expires quickly

**Refresh Token:**

- Long-lived (7 days)
- Used to get a new access token when the old one expires
- Stored more securely

**Analogy:**

- Access token = Temporary visitor badge (expires after 15 minutes)
- Refresh token = Your employee ID card (can get new visitor badges)

### 3. RBAC (Role-Based Access Control)

**What is a Role?** A role is a job title that determines what you can do.
Examples:

- **admin** - Can do everything
- **tenantadmin** - Can manage their organization
- **user** - Regular user access

**What is a Capability?** A capability is a specific permission. Examples:

- `users:read` - Can view users
- `users:write` - Can create/edit users
- `roles:manage` - Can manage roles

**How They Work Together:**

1. User has a role (e.g., "admin")
2. Role has capabilities (e.g., "users:write", "roles:manage")
3. System checks: "Does this user's role have the required capability?"

**Database Structure:**

```
User → UserRole → Role → RoleCapability → Capability
 │                 │                         │
 └─ user123        └─ admin                  └─ users:write
```

### 4. Multi-Tenant Architecture

**What is a Tenant?** A tenant is like a separate company using our system. Each
tenant has:

- Their own database
- Their own users
- Their own data (projects, time entries, etc.)

**Why Separate Databases?**

- **Security** - One company can't access another's data
- **Performance** - Smaller, faster databases
- **Compliance** - Easier to meet data residency requirements

---

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Login Page   │  │ Auth Context │  │ Protected    │      │
│  │              │  │ (State Mgmt) │  │ Routes       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        API (Express.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Routes  │  │ Auth         │  │ Permission   │      │
│  │ /auth/login  │  │ Middleware   │  │ Middleware   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ JWT Service  │  │ Auth Service │  │ Role Service │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Database (PostgreSQL)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Main DB      │  │ Tenant DB 1  │  │ Tenant DB 2  │      │
│  │ (Auth/Users) │  │ (Company A)  │  │ (Company B)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

#### Frontend Components

- **AuthContext** - Manages user state and authentication
- **ImpersonationContext** - Manages impersonation state
- **ProtectedRoute** - Guards pages that require authentication
- **Login Page** - User login interface

#### Backend Components

- **Auth Routes** - Handle login, register, logout, refresh
- **Auth Middleware** - Validates JWT on every request
- **Permission Middleware** - Checks user roles/capabilities
- **JWT Service** - Creates and validates tokens
- **Auth Service** - Handles login logic, password verification
- **Role Service** - Manages roles and capabilities
- **Impersonation Service** - Handles admin impersonation

---

## Authentication Flow

### 1. User Login Flow (Email & Password)

**Step-by-Step Process:**

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Browser │                │   API   │                │ Database │
└─────────┘                └─────────┘                └──────────┘
     │                          │                           │
     │ 1. POST /auth/login      │                           │
     │ { email, password }      │                           │
     ├─────────────────────────>│                           │
     │                          │                           │
     │                          │ 2. Find user by email     │
     │                          ├──────────────────────────>│
     │                          │                           │
     │                          │ 3. User record            │
     │                          │<──────────────────────────┤
     │                          │                           │
     │                          │ 4. Verify password        │
     │                          │    (bcrypt.compare)       │
     │                          │                           │
     │                          │ 5. Get user roles         │
     │                          ├──────────────────────────>│
     │                          │<──────────────────────────┤
     │                          │                           │
     │                          │ 6. Generate access token  │
     │                          │    (JWT with 15min exp)   │
     │                          │                           │
     │                          │ 7. Generate refresh token │
     │                          │    (JWT with 7day exp)    │
     │                          │                           │
     │                          │ 8. Store refresh token    │
     │                          ├──────────────────────────>│
     │                          │                           │
     │ 9. Response with tokens  │                           │
     │<─────────────────────────┤                           │
     │ { accessToken,           │                           │
     │   refreshToken,          │                           │
     │   user }                 │                           │
     │                          │                           │
     │ 10. Store in localStorage│                           │
     │                          │                           │
```

**Code Location:**

**Frontend:** `apps/web/src/contexts/AuthContext.tsx` - `login()` function

```typescript
const login = async (email: string, password: string) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  // Store tokens
  localStorage.setItem('accessToken', data.data.accessToken);
  localStorage.setItem('refreshToken', data.data.refreshToken);

  // Update state
  setUser(data.data.user);
  setAccessToken(data.data.accessToken);
};
```

**Backend:** `apps/api/src/routes/auth.routes.ts` - POST /auth/login

```typescript
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // 1. Find user
  const user = await prisma.user.findUnique({
    where: { email },
    include: { tenant: true },
  });

  // 2. Verify password
  const isValid = await bcrypt.compare(password, user.passwordHash);

  // 3. Get roles
  const roles = await roleService.getUserRoles(user.id);

  // 4. Generate tokens
  const accessToken = jwtService.signAccessToken({
    userId: user.id,
    email: user.email,
    roles: roles,
  });

  const refreshToken = jwtService.signRefreshToken({
    userId: user.id,
  });

  // 5. Store refresh token
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  res.json({
    status: 'success',
    data: { accessToken, refreshToken, user },
  });
});
```

### 2. Token Refresh Flow

**Why Do We Need This?** Access tokens expire after 15 minutes for security.
Instead of making the user log in again, we use the refresh token to get a new
access token.

**Step-by-Step Process:**

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Browser │                │   API   │                │ Database │
└─────────┘                └─────────┘                └──────────┘
     │                          │                           │
     │ 1. Access token expires  │                           │
     │                          │                           │
     │ 2. POST /auth/refresh    │                           │
     │ { refreshToken }         │                           │
     ├─────────────────────────>│                           │
     │                          │                           │
     │                          │ 3. Verify refresh token   │
     │                          ├──────────────────────────>│
     │                          │<──────────────────────────┤
     │                          │                           │
     │                          │ 4. Get user & roles       │
     │                          ├──────────────────────────>│
     │                          │<──────────────────────────┤
     │                          │                           │
     │                          │ 5. Generate new access    │
     │                          │    token (15min exp)      │
     │                          │                           │
     │ 6. Response with new     │                           │
     │    access token          │                           │
     │<─────────────────────────┤                           │
     │                          │                           │
```

**Code Location:**

**Frontend:** `apps/web/src/contexts/AuthContext.tsx` - `refreshTokenFunc()`

```typescript
const refreshTokenFunc = async () => {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await response.json();

  // Update access token
  setAccessToken(data.data.accessToken);
  localStorage.setItem('accessToken', data.data.accessToken);
};

// Auto-refresh every 14 minutes
useEffect(() => {
  const interval = setInterval(
    () => {
      refreshTokenFunc();
    },
    14 * 60 * 1000
  ); // 14 minutes

  return () => clearInterval(interval);
}, []);
```

### 3. Protected Request Flow

**How Every API Request Works:**

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Browser │                │   API   │                │ Database │
└─────────┘                └─────────┘                └──────────┘
     │                          │                           │
     │ 1. GET /admin/users      │                           │
     │ Header: Authorization:   │                           │
     │   Bearer <accessToken>   │                           │
     ├─────────────────────────>│                           │
     │                          │                           │
     │                          │ 2. Auth Middleware        │
     │                          │    - Extract token        │
     │                          │    - Verify signature     │
     │                          │    - Check expiration     │
     │                          │                           │
     │                          │ 3. Permission Middleware  │
     │                          │    - Check user role      │
     │                          │    - Verify capability    │
     │                          │                           │
     │                          │ 4. Execute route handler  │
     │                          ├──────────────────────────>│
     │                          │<──────────────────────────┤
     │                          │                           │
     │ 5. Response with data    │                           │
     │<─────────────────────────┤                           │
```

**Code Location:**

**Frontend:** `apps/web/src/hooks/useAuth.ts`

```typescript
const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// Usage in components
const response = await fetch(`${API_URL}/admin/users`, {
  headers: getAuthHeaders(),
});
```

**Backend:** `apps/api/src/middleware/auth.middleware.ts`

```typescript
export const authenticateJWT = async (req, res, next) => {
  // 1. Extract token from header
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    // 2. Verify token
    const payload = jwtService.verifyAccessToken(token);

    // 3. Attach user info to request
    req.user = payload;

    next(); // Continue to next middleware/route
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
```

---

## Authorization Flow

### 1. Role-Based Authorization

**How Roles Work:**

```
Database Structure:

User (john@example.com)
  └─> UserRole
       └─> Role (admin)
            └─> RoleCapability
                 ├─> Capability (users:read)    [allow: true]
                 ├─> Capability (users:write)   [allow: true]
                 ├─> Capability (roles:manage)  [allow: true]
                 └─> Capability (projects:read) [allow: false]
```

**Step-by-Step Authorization Check:**

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Request │                │   API   │                │ Database │
└─────────┘                └─────────┘                └──────────┘
     │                          │                           │
     │ 1. GET /admin/users      │                           │
     │ (requires users:read)    │                           │
     ├─────────────────────────>│                           │
     │                          │                           │
     │                          │ 2. Auth Middleware        │
     │                          │    Extract user from JWT  │
     │                          │    (user.id, roles)       │
     │                          │                           │
     │                          │ 3. Permission Middleware  │
     │                          │    requireCapability(     │
     │                          │      'users:read'         │
     │                          │    )                      │
     │                          │                           │
     │                          │ 4. Check user's role      │
     │                          │    capabilities           │
     │                          ├──────────────────────────>│
     │                          │                           │
     │                          │ 5. Get RoleCapabilities   │
     │                          │    for user's roles       │
     │                          │<──────────────────────────┤
     │                          │                           │
     │                          │ 6. Check if 'users:read'  │
     │                          │    exists with allow=true │
     │                          │                           │
     │ 7a. If YES:              │                           │
     │     Continue to handler  │                           │
     │                          │                           │
     │ 7b. If NO:               │                           │
     │     403 Forbidden        │                           │
     │<─────────────────────────┤                           │
```

**Code Location:**

**Backend:** `apps/api/src/middleware/permission.middleware.ts`

```typescript
export const requireCapability = (capability: string) => {
  return async (req, res, next) => {
    const userId = req.user.sub;

    // 1. Get user's roles
    const roles = await roleService.getUserRoles(userId);

    // 2. Get all capabilities for these roles
    const capabilities = await roleService.getRoleCapabilities(roles);

    // 3. Check if required capability exists with allow=true
    const hasCapability = capabilities.some(
      (cap) => cap.name === capability && cap.allow === true
    );

    if (!hasCapability) {
      return res.status(403).json({
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

// Usage in routes
router.get(
  '/users',
  authenticateJWT,
  requireCapability('users:read'),
  async (req, res) => {
    // User has permission, execute route
  }
);
```

### 2. Role Hierarchy

**FreeTimeChat Roles:**

```
┌──────────────────────────────────────────────────┐
│ admin (System Administrator)                      │
│ - Full access to everything                      │
│ - Can manage tenants, roles, capabilities        │
│ - Can impersonate users                          │
│ - Can access all tenant data                     │
└──────────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│ tenantadmin (Organization Administrator)         │
│ - Manages their tenant's users, clients, projects│
│ - Cannot manage system roles or other tenants    │
│ - Cannot impersonate users                       │
│ - Only sees their tenant's data                  │
└──────────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│ user (Regular User)                               │
│ - Can access chat and time tracking              │
│ - Can view their own projects and time entries   │
│ - Cannot access admin panel                      │
└──────────────────────────────────────────────────┘
```

**Frontend Route Protection:**

**Code Location:** `apps/web/src/app/admin/layout.tsx`

```typescript
export default function AdminLayout({ children }) {
  const { user } = useAuth();

  // Check if user has admin or tenantadmin role
  const hasAdminAccess =
    user?.roles?.includes('admin') ||
    user?.roles?.includes('tenantadmin');

  const isAdmin = user?.roles?.includes('admin');

  // Redirect non-admin users
  useEffect(() => {
    if (user && !hasAdminAccess) {
      router.push('/chat');
    }
  }, [user, hasAdminAccess]);

  // Show different navigation based on role
  const commonNavigation = [
    { name: 'Dashboard', href: '/admin/dashboard' },
    { name: 'Users', href: '/admin/users' },
    { name: 'Clients', href: '/admin/clients' },
    { name: 'Projects', href: '/admin/projects' },
  ];

  const adminOnlyNavigation = [
    { name: 'Roles', href: '/admin/roles' },
    { name: 'Tenants', href: '/admin/tenants' },
    { name: 'Capabilities', href: '/admin/capabilities' },
  ];

  // Combine based on role
  const navigation = isAdmin
    ? [...commonNavigation, ...adminOnlyNavigation]
    : commonNavigation;

  return (
    <div>
      <nav>
        {navigation.map(item => (
          <a href={item.href}>{item.name}</a>
        ))}
      </nav>
      {children}
    </div>
  );
}
```

---

## Impersonation Flow

### What is Impersonation?

**Purpose:** Admin users can temporarily "become" another user to:

- Debug issues the user is experiencing
- Provide support without asking for their password
- See exactly what the user sees

**Security Features:**

- Only admins can impersonate
- All impersonation sessions are logged
- Clear visual indicator when impersonating
- One-click to exit impersonation

### Impersonation Start Flow

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Admin   │                │   API   │                │ Database │
│ Browser │                │         │                │          │
└─────────┘                └─────────┘                └──────────┘
     │                          │                           │
     │ 1. Click "Impersonate"   │                           │
     │    on user John          │                           │
     │                          │                           │
     │ 2. POST /admin/users/    │                           │
     │    john-id/impersonate   │                           │
     │    Header: Bearer        │                           │
     │      <admin-token>       │                           │
     ├─────────────────────────>│                           │
     │                          │                           │
     │                          │ 3. Verify admin has       │
     │                          │    impersonation rights   │
     │                          │                           │
     │                          │ 4. Get target user (John) │
     │                          ├──────────────────────────>│
     │                          │<──────────────────────────┤
     │                          │                           │
     │                          │ 5. Create impersonation   │
     │                          │    session record         │
     │                          ├──────────────────────────>│
     │                          │    - adminUserId: admin-1 │
     │                          │    - targetUserId: john-id│
     │                          │    - startedAt: now       │
     │                          │<──────────────────────────┤
     │                          │                           │
     │                          │ 6. Generate new JWT with  │
     │                          │    impersonation metadata:│
     │                          │    {                      │
     │                          │      sub: "john-id",      │
     │                          │      email: "john@...",   │
     │                          │      roles: ["user"],     │
     │                          │      impersonation: {     │
     │                          │        adminUserId: "...",│
     │                          │        sessionId: "..."   │
     │                          │      }                    │
     │                          │    }                      │
     │                          │                           │
     │ 7. Response with         │                           │
     │    impersonation token   │                           │
     │<─────────────────────────┤                           │
     │                          │                           │
     │ 8. Store new token       │                           │
     │    Replace admin token   │                           │
     │                          │                           │
     │ 9. Redirect to /chat     │                           │
     │    (as John)             │                           │
     │                          │                           │
     │ 10. Show yellow banner   │                           │
     │     "Impersonating John" │                           │
```

**Code Location:**

**Frontend:** `apps/web/src/contexts/ImpersonationContext.tsx`

```typescript
const startImpersonation = async (targetUserId: string) => {
  const response = await fetch(
    `${API_URL}/admin/users/${targetUserId}/impersonate`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );

  if (response.ok) {
    const data = await response.json();

    // Store impersonation token (replaces admin token)
    localStorage.setItem('accessToken', data.data.accessToken);

    // Update state
    setIsImpersonating(true);
    setTargetUser(data.data.targetUser);

    // Refresh auth context with new token
    await refreshUser();

    return true;
  }
};
```

**Backend:** `apps/api/src/routes/admin/users.routes.ts`

```typescript
router.post(
  '/:id/impersonate',
  authenticateJWT,
  requireRole('admin'),
  async (req, res) => {
    const { id: targetUserId } = req.params;
    const adminUserId = req.user.sub;

    // 1. Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    // 2. Prevent impersonating other admins
    const targetRoles = await roleService.getUserRoles(targetUserId);
    if (targetRoles.includes('admin')) {
      return res.status(403).json({
        message: 'Cannot impersonate other administrators',
      });
    }

    // 3. Create impersonation session
    const session = await prisma.impersonationSession.create({
      data: {
        adminUserId,
        targetUserId,
        startedAt: new Date(),
      },
    });

    // 4. Generate impersonation token
    const accessToken = jwtService.signAccessToken({
      userId: targetUserId,
      email: targetUser.email,
      roles: targetRoles,
      impersonation: {
        adminUserId,
        adminEmail: req.user.email,
        sessionId: session.id,
      },
    });

    res.json({
      status: 'success',
      data: {
        accessToken,
        session,
        targetUser: {
          id: targetUser.id,
          email: targetUser.email,
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
        },
      },
    });
  }
);
```

### Impersonation Stop Flow

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Admin   │                │   API   │                │ Database │
│ Browser │                │         │                │          │
│(as John)│                │         │                │          │
└─────────┘                └─────────┘                └──────────┘
     │                          │                           │
     │ 1. Click "Exit           │                           │
     │    Impersonation"        │                           │
     │                          │                           │
     │ 2. POST /admin/users/    │                           │
     │    impersonate/stop      │                           │
     │    Header: Bearer        │                           │
     │      <impersonation-token│                           │
     ├─────────────────────────>│                           │
     │                          │                           │
     │                          │ 3. Extract impersonation  │
     │                          │    metadata from JWT      │
     │                          │    (sessionId)            │
     │                          │                           │
     │                          │ 4. Update session record  │
     │                          ├──────────────────────────>│
     │                          │    SET endedAt = now      │
     │                          │<──────────────────────────┤
     │                          │                           │
     │                          │ 5. Call logout()          │
     │                          │    Clear all tokens       │
     │                          │                           │
     │ 6. Response: Success     │                           │
     │<─────────────────────────┤                           │
     │                          │                           │
     │ 7. Clear localStorage    │                           │
     │    tokens                │                           │
     │                          │                           │
     │ 8. Redirect to /login    │                           │
     │                          │                           │
     │ 9. Admin must log in     │                           │
     │    again                 │                           │
```

**Why Log Out Completely?**

- **Security**: Forces admin to re-authenticate after impersonation
- **Audit Trail**: Clear separation between impersonation and admin sessions
- **Best Practice**: Ensures clean state transition

**Code Location:**

**Frontend:** `apps/web/src/contexts/ImpersonationContext.tsx`

```typescript
const endImpersonation = async () => {
  const response = await fetch(`${API_URL}/admin/users/impersonate/stop`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (response.ok) {
    console.log('Stop impersonation successful');

    // Clear state
    setIsImpersonating(false);
    setTargetUser(null);

    // Completely log out (clears tokens, redirects to /login)
    await logout();
  }
};
```

**Backend:** `apps/api/src/routes/admin/users.routes.ts`

```typescript
router.post('/impersonate/stop', async (req, res) => {
  const currentUser = req.user;

  // 1. Verify user is currently impersonating
  if (!currentUser.impersonation?.sessionId) {
    return res.status(400).json({
      message: 'No active impersonation session',
    });
  }

  // 2. End the impersonation session
  await prisma.impersonationSession.update({
    where: { id: currentUser.impersonation.sessionId },
    data: { endedAt: new Date() },
  });

  res.json({
    status: 'success',
    message: 'Impersonation session stopped',
  });
});
```

### Impersonation UI Indicators

**ImpersonationBanner Component:**

**Code Location:** `apps/web/src/components/admin/ImpersonationBanner.tsx`

```typescript
export function ImpersonationBanner() {
  const { isImpersonating, targetUser, endImpersonation } = useImpersonation();

  if (!isImpersonating || !targetUser) {
    return null; // Don't show if not impersonating
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-400 border-b-2 border-yellow-600">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Warning Icon */}
            <div className="w-10 h-10 bg-yellow-600 rounded-full">
              ⚠️
            </div>

            <div>
              <p className="text-sm font-bold text-yellow-900">
                Impersonation Mode Active
              </p>
              <p className="text-xs text-yellow-800">
                You are currently signed in as{' '}
                <span className="font-semibold">
                  {targetUser.firstName} {targetUser.lastName}
                </span>
                {' '}({targetUser.email})
              </p>
            </div>
          </div>

          {/* Exit Button */}
          <button
            onClick={endImpersonation}
            className="bg-yellow-900 hover:bg-yellow-950 text-white px-4 py-2 rounded"
          >
            Exit Impersonation
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Where It's Used:** The banner is included in
`apps/web/src/components/ClientLayout.tsx` so it appears on every page when
impersonating.

---

## Two-Factor Authentication (2FA) Flow

### What is Two-Factor Authentication?

**Purpose:** Two-Factor Authentication (2FA) adds an extra layer of security
beyond just email and password. It requires users to provide two different types
of proof:

1. **Something you know** - Your password
2. **Something you have** - Your phone with an authenticator app

**Why Use 2FA?**

- **Enhanced Security** - Even if someone steals your password, they can't log
  in without your phone
- **Prevent Account Takeover** - Protects against phishing and password breaches
- **Compliance** - Many regulations require 2FA for sensitive data
- **Industry Standard** - Expected by security-conscious users

**Real-World Analogy:** Think of entering a secure building:

- **Password** = Your access card (something you have)
- **2FA Code** = Your fingerprint scan (something you are)
- Both are required to enter

### Key 2FA Concepts

#### 1. TOTP (Time-based One-Time Password)

**What is TOTP?** TOTP generates a 6-digit code that changes every 30 seconds.
Both your phone and our server use the same secret to generate matching codes.

**How It Works:**

```
Secret Key (shared once) + Current Time → 6-Digit Code

Example:
Secret: JBSWY3DPEHPK3PXP
Time: 1704067200 (Unix timestamp)
↓ (HMAC-SHA1 algorithm)
Code: 123456 (valid for 30 seconds)
```

**Important Points:**

- Code changes every 30 seconds
- Server and phone must have synchronized time
- Same secret always generates same code for same time
- Secret is never transmitted after initial setup

#### 2. Authenticator Apps

**What are Authenticator Apps?** Apps that generate TOTP codes on your phone:

- Google Authenticator
- Microsoft Authenticator
- Authy
- 1Password

**How They Work:**

1. Scan QR code during setup (contains secret key)
2. App stores secret securely on your phone
3. App generates 6-digit codes every 30 seconds
4. You enter code when logging in

#### 3. QR Codes

**What is a QR Code?** A QR code is a square barcode that contains the secret
key and account information.

**QR Code Contents:**

```
otpauth://totp/FreeTimeChat:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=FreeTimeChat
```

Breaking it down:

- `otpauth://totp/` - TOTP protocol
- `FreeTimeChat:user@example.com` - Label (app name + user email)
- `secret=JBSWY3DPEHPK3PXP` - The secret key
- `issuer=FreeTimeChat` - App name

#### 4. Backup Codes

**What are Backup Codes?** One-time-use codes that work if you lose your phone.

**Example Backup Codes:**

```
1. A3B7-9K2L-4P5Q
2. X8C9-2M6N-7R4S
3. K5L2-8P9Q-3W6X
```

**Important:**

- Store these somewhere safe (not on your phone!)
- Each code can only be used once
- Generate new codes after using them

### 2FA Setup Flow (Enable 2FA)

**Step-by-Step Process:**

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ User    │                │   API   │                │ Database │
│ Browser │                │         │                │          │
└─────────┘                └─────────┘                └──────────┘
     │                          │                           │
     │ 1. User wants to         │                           │
     │    enable 2FA            │                           │
     │                          │                           │
     │ 2. POST /2fa/enable      │                           │
     │    { password }          │                           │
     ├─────────────────────────>│                           │
     │                          │                           │
     │                          │ 3. Verify user password   │
     │                          ├──────────────────────────>│
     │                          │<──────────────────────────┤
     │                          │                           │
     │                          │ 4. Generate secret key    │
     │                          │    using speakeasy        │
     │                          │    secret =               │
     │                          │      JBSWY3DPEHPK3PXP     │
     │                          │                           │
     │                          │ 5. Generate QR code URL   │
     │                          │    otpauth://totp/...     │
     │                          │                           │
     │                          │ 6. Create QR code image   │
     │                          │    as Data URL            │
     │                          │                           │
     │                          │ 7. Generate 10 backup     │
     │                          │    codes                  │
     │                          │                           │
     │                          │ 8. Store secret in DB     │
     │                          │    (NOT enabled yet)      │
     │                          ├──────────────────────────>│
     │                          │                           │
     │ 9. Response with QR code,│                           │
     │    secret, backup codes  │                           │
     │<─────────────────────────┤                           │
     │                          │                           │
     │ 10. Display QR code      │                           │
     │     Show backup codes    │                           │
     │                          │                           │
     │ 11. User scans QR code   │                           │
     │     with authenticator   │                           │
     │     app                  │                           │
     │                          │                           │
     │ 12. User enters 6-digit  │                           │
     │     code from app        │                           │
     │                          │                           │
     │ 13. POST /2fa/verify     │                           │
     │     { token: "123456" }  │                           │
     ├─────────────────────────>│                           │
     │                          │                           │
     │                          │ 14. Verify TOTP code      │
     │                          │     matches secret        │
     │                          │                           │
     │                          │ 15. Set                   │
     │                          │     twoFactorEnabled=true │
     │                          ├──────────────────────────>│
     │                          │                           │
     │ 16. Success! 2FA enabled │                           │
     │<─────────────────────────┤                           │
     │                          │                           │
```

**Code Location:**

**Backend:** `apps/api/src/services/two-factor.service.ts` - Enable 2FA

```typescript
class TwoFactorService {
  async enable(
    userId: string,
    password: string
  ): Promise<TwoFactorEnableResponse> {
    // 1. Get user
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // 2. Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid password');
    }

    // 3. Generate secret using speakeasy
    const secret = speakeasy.generateSecret({
      name: `FreeTimeChat (${user.email})`,
      issuer: 'FreeTimeChat',
      length: 32, // Secret length in bytes
    });

    // 4. Generate QR code as Data URL
    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);

    // 5. Generate backup codes
    const backupCodes = this.generateBackupCodes(10);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 10))
    );

    // 6. Store secret (NOT enabled yet)
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret.base32, // Store in base32 format
        twoFactorBackupCodes: hashedBackupCodes,
      },
    });

    // 7. Return setup data to user
    return {
      secret: secret.base32,
      qrCode: qrCodeDataUrl, // data:image/png;base64,...
      backupCodes: backupCodes, // Plain text (user must save these)
    };
  }

  // Generate random backup codes
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate format: XXXX-XXXX-XXXX
      const code = crypto.randomBytes(6).toString('hex').toUpperCase();
      const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
      codes.push(formatted);
    }
    return codes;
  }
}
```

**Backend:** `apps/api/src/services/two-factor.service.ts` - Verify and Complete
Setup

```typescript
async verify(userId: string, token: string): Promise<boolean> {
  // 1. Get user with secret
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user.twoFactorSecret) {
    throw new Error('2FA not initialized. Call /2fa/enable first.');
  }

  // 2. Verify TOTP token using speakeasy
  const isValid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: token,
    window: 2,  // Allow 2 time steps before/after (±60 seconds)
  });

  if (!isValid) {
    throw new Error('Invalid verification code');
  }

  // 3. Enable 2FA
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: true,  // NOW it's enabled
    },
  });

  return true;
}
```

**Backend:** `apps/api/src/routes/two-factor.routes.ts`

```typescript
// POST /api/v1/2fa/enable
router.post('/enable', authenticateJWT, async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      status: 'error',
      message: 'Password is required',
    });
  }

  try {
    const result = await twoFactorService.enable(req.user.sub, password);

    res.json({
      status: 'success',
      data: {
        secret: result.secret,
        qrCode: result.qrCode,
        backupCodes: result.backupCodes,
      },
      message: 'Scan QR code and verify to complete setup',
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
});

// POST /api/v1/2fa/verify
router.post('/verify', authenticateJWT, async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      status: 'error',
      message: 'Verification code is required',
    });
  }

  try {
    await twoFactorService.verify(req.user.sub, token);

    res.json({
      status: 'success',
      message: '2FA enabled successfully',
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
});
```

### 2FA Login Flow

**When 2FA is Enabled:**

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ User    │                │   API   │                │ Database │
│ Browser │                │         │                │          │
└─────────┘                └─────────┘                └──────────┘
     │                          │                           │
     │ 1. POST /auth/login      │                           │
     │    { email, password }   │                           │
     ├─────────────────────────>│                           │
     │                          │                           │
     │                          │ 2. Verify email/password  │
     │                          ├──────────────────────────>│
     │                          │<──────────────────────────┤
     │                          │                           │
     │                          │ 3. Check if 2FA enabled   │
     │                          │    user.twoFactorEnabled  │
     │                          │                           │
     │ 4. Response: 2FA required│                           │
     │    { requires2FA: true } │                           │
     │<─────────────────────────┤                           │
     │                          │                           │
     │ 5. Show 2FA code input   │                           │
     │                          │                           │
     │ 6. User opens            │                           │
     │    authenticator app     │                           │
     │    Sees: 123456          │                           │
     │                          │                           │
     │ 7. POST /auth/2fa/verify │                           │
     │    { email, token:       │                           │
     │      "123456" }          │                           │
     ├─────────────────────────>│                           │
     │                          │                           │
     │                          │ 8. Get user's 2FA secret  │
     │                          ├──────────────────────────>│
     │                          │<──────────────────────────┤
     │                          │                           │
     │                          │ 9. Verify TOTP token      │
     │                          │    speakeasy.totp.verify()│
     │                          │    - secret: user's secret│
     │                          │    - token: "123456"      │
     │                          │    - window: 1 (strict)   │
     │                          │                           │
     │                          │ 10. Generate JWT tokens   │
     │                          │     (same as normal login)│
     │                          │                           │
     │ 11. Success! Tokens      │                           │
     │     { accessToken,       │                           │
     │       refreshToken }     │                           │
     │<─────────────────────────┤                           │
     │                          │                           │
     │ 12. Store tokens         │                           │
     │     Redirect to app      │                           │
     │                          │                           │
```

**Code Location:**

**Backend:** `apps/api/src/routes/auth.routes.ts` - Modified Login

```typescript
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Find user and verify password
    const user = await prisma.user.findUnique({ where: { email } });
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials',
      });
    }

    // 2. Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Don't generate tokens yet, require 2FA code first
      return res.status(200).json({
        status: 'success',
        data: {
          requires2FA: true,
          email: user.email, // Needed for 2FA verify step
        },
        message: 'Please enter your 2FA code',
      });
    }

    // 3. No 2FA, proceed with normal login
    const roles = await roleService.getUserRoles(user.id);
    const accessToken = jwtService.signAccessToken({
      userId: user.id,
      email: user.email,
      roles: roles,
    });
    const refreshToken = jwtService.signRefreshToken({ userId: user.id });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      status: 'success',
      data: { accessToken, refreshToken, user },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
    });
  }
});

// POST /api/v1/auth/2fa/verify
router.post('/2fa/verify', async (req, res) => {
  const { email, token } = req.body;

  try {
    // 1. Find user
    const user = await prisma.user.findUnique({ where: { email } });

    // 2. Verify 2FA code
    const isValid = await twoFactorService.verifyLogin(user.id, token);

    if (!isValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid 2FA code',
      });
    }

    // 3. Generate tokens (same as normal login)
    const roles = await roleService.getUserRoles(user.id);
    const accessToken = jwtService.signAccessToken({
      userId: user.id,
      email: user.email,
      roles: roles,
    });
    const refreshToken = jwtService.signRefreshToken({ userId: user.id });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      status: 'success',
      data: { accessToken, refreshToken, user },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: '2FA verification failed',
    });
  }
});
```

**Backend:** `apps/api/src/services/two-factor.service.ts` - Login Verification

```typescript
async verifyLogin(userId: string, token: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user.twoFactorEnabled) {
    throw new Error('2FA is not enabled for this user');
  }

  // Verify TOTP with stricter window for login (only ±30 seconds)
  const isValid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: token,
    window: 1,  // Stricter: only 1 time step (30 seconds) before/after
  });

  return isValid;
}
```

### Disable 2FA Flow

**Step-by-Step Process:**

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ User    │                │   API   │                │ Database │
│ Browser │                │         │                │          │
└─────────┘                └─────────┘                └──────────┘
     │                          │                           │
     │ 1. POST /2fa/disable     │                           │
     │    { password,           │                           │
     │      token: "123456" }   │                           │
     ├─────────────────────────>│                           │
     │                          │                           │
     │                          │ 2. Verify password        │
     │                          ├──────────────────────────>│
     │                          │<──────────────────────────┤
     │                          │                           │
     │                          │ 3. Verify TOTP token      │
     │                          │    (to confirm it's you)  │
     │                          │                           │
     │                          │ 4. Clear 2FA settings     │
     │                          │    SET                    │
     │                          │    twoFactorEnabled=false │
     │                          │    twoFactorSecret=null   │
     │                          │    backupCodes=null       │
     │                          ├──────────────────────────>│
     │                          │                           │
     │ 5. Success! 2FA disabled │                           │
     │<─────────────────────────┤                           │
     │                          │                           │
```

**Code Location:**

**Backend:** `apps/api/src/services/two-factor.service.ts`

```typescript
async disable(userId: string, password: string, token: string): Promise<void> {
  // 1. Get user
  const user = await prisma.user.findUnique({ where: { id: userId } });

  // 2. Verify password
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    throw new Error('Invalid password');
  }

  // 3. Verify 2FA code (to confirm it's really the user)
  const isValidToken = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: token,
    window: 2,
  });

  if (!isValidToken) {
    throw new Error('Invalid 2FA code');
  }

  // 4. Disable 2FA and clear secrets
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
    },
  });
}
```

**Backend:** `apps/api/src/routes/two-factor.routes.ts`

```typescript
// POST /api/v1/2fa/disable
router.post('/disable', authenticateJWT, async (req, res) => {
  const { password, token } = req.body;

  if (!password || !token) {
    return res.status(400).json({
      status: 'error',
      message: 'Password and 2FA code are required',
    });
  }

  try {
    await twoFactorService.disable(req.user.sub, password, token);

    res.json({
      status: 'success',
      message: '2FA disabled successfully',
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
});
```

### Using Backup Codes

**When to Use:**

- Lost your phone
- Authenticator app deleted
- Phone damaged or stolen

**Backup Code Verification:**

```typescript
// apps/api/src/services/two-factor.service.ts
async verifyBackupCode(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user.twoFactorBackupCodes || user.twoFactorBackupCodes.length === 0) {
    throw new Error('No backup codes available');
  }

  // Check each hashed backup code
  for (let i = 0; i < user.twoFactorBackupCodes.length; i++) {
    const isMatch = await bcrypt.compare(code, user.twoFactorBackupCodes[i]);

    if (isMatch) {
      // Found matching code! Remove it so it can't be used again
      const updatedCodes = [...user.twoFactorBackupCodes];
      updatedCodes.splice(i, 1);  // Remove used code

      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorBackupCodes: updatedCodes,
        },
      });

      return true;
    }
  }

  return false;  // No matching code found
}
```

**Login with Backup Code:**

```typescript
// apps/api/src/routes/auth.routes.ts
router.post('/2fa/verify-backup', async (req, res) => {
  const { email, backupCode } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    const isValid = await twoFactorService.verifyBackupCode(
      user.id,
      backupCode
    );

    if (!isValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid backup code',
      });
    }

    // Generate tokens (same as normal login)
    const roles = await roleService.getUserRoles(user.id);
    const accessToken = jwtService.signAccessToken({
      userId: user.id,
      email: user.email,
      roles: roles,
    });
    const refreshToken = jwtService.signRefreshToken({ userId: user.id });

    res.json({
      status: 'success',
      data: { accessToken, refreshToken, user },
      message: 'Logged in with backup code. Please set up 2FA again.',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Backup code verification failed',
    });
  }
});
```

### 2FA Security Features

#### 1. Time Window (Clock Skew Tolerance)

**The Problem:** Phone and server clocks might not be perfectly synchronized.

**The Solution:**

```typescript
speakeasy.totp.verify({
  secret: secret,
  token: token,
  window: 2, // Accept codes from 2 steps before/after current time
});
```

**What `window: 2` means:**

```
Current time: 12:00:00 (code: 123456)

Accepted codes:
- 11:59:00 (code: 789012) ✓
- 11:59:30 (code: 345678) ✓
- 12:00:00 (code: 123456) ✓ (current)
- 12:00:30 (code: 901234) ✓
- 12:01:00 (code: 567890) ✓

Rejected codes:
- 11:59:00 and earlier ✗
- 12:01:30 and later ✗
```

**Different Windows for Different Operations:**

- **Setup verification** - `window: 2` (more lenient, ±60 seconds)
- **Login verification** - `window: 1` (stricter, ±30 seconds)
- **Disable 2FA** - `window: 2` (more lenient to prevent lockout)

#### 2. Backup Code Security

**Why Hash Backup Codes?** If database is compromised, attackers can't use the
backup codes directly.

```typescript
// Generate plain codes for user
const plainCodes = ['A3B7-9K2L-4P5Q', 'X8C9-2M6N-7R4S'];

// Hash before storing
const hashedCodes = await Promise.all(
  plainCodes.map((code) => bcrypt.hash(code, 10))
);

// Store hashed versions
await prisma.user.update({
  data: { twoFactorBackupCodes: hashedCodes },
});

// User saves plain codes (not hashed)
// Show to user: ['A3B7-9K2L-4P5Q', 'X8C9-2M6N-7R4S']
```

#### 3. Password Required for 2FA Changes

**Why?** Prevents attacker from disabling 2FA if they steal your access token.

**All 2FA operations require password:**

- Enable 2FA - password required
- Disable 2FA - password + 2FA code required
- Regenerate backup codes - password required

### Common 2FA Tasks

#### Task 1: Enable 2FA for a User

**Frontend Flow:**

```typescript
// 1. User clicks "Enable 2FA" button
async function handleEnable2FA() {
  const password = prompt('Enter your password to enable 2FA');

  // 2. Call API to start 2FA setup
  const response = await fetch(`${API_URL}/2fa/enable`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ password }),
  });

  const data = await response.json();

  if (response.ok) {
    // 3. Show QR code
    setQrCode(data.data.qrCode); // data:image/png;base64,...
    setBackupCodes(data.data.backupCodes); // Array of codes
    setShowQRModal(true);
  }
}

// 4. User scans QR code and enters verification code
async function handleVerify2FA(verificationCode: string) {
  const response = await fetch(`${API_URL}/2fa/verify`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ token: verificationCode }),
  });

  if (response.ok) {
    alert('2FA enabled successfully!');
    setShowQRModal(false);
  }
}
```

**UI Components:**

```typescript
// QR Code Modal
function TwoFactorSetupModal() {
  return (
    <Modal>
      <h2>Set Up Two-Factor Authentication</h2>

      <div className="steps">
        <h3>Step 1: Scan QR Code</h3>
        <p>Use Google Authenticator or similar app</p>
        <img src={qrCode} alt="QR Code" />

        <h3>Step 2: Save Backup Codes</h3>
        <p>Store these codes in a safe place</p>
        <ul>
          {backupCodes.map(code => (
            <li key={code}>{code}</li>
          ))}
        </ul>

        <h3>Step 3: Verify</h3>
        <input
          type="text"
          placeholder="Enter 6-digit code"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
        />
        <button onClick={() => handleVerify2FA(verificationCode)}>
          Verify and Enable
        </button>
      </div>
    </Modal>
  );
}
```

#### Task 2: Check 2FA Status

```typescript
// Backend route
router.get('/2fa/status', authenticateJWT, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.sub },
    select: {
      twoFactorEnabled: true,
      twoFactorBackupCodes: true,
    },
  });

  res.json({
    status: 'success',
    data: {
      enabled: user.twoFactorEnabled,
      hasBackupCodes: user.twoFactorBackupCodes?.length > 0,
      backupCodesRemaining: user.twoFactorBackupCodes?.length || 0,
    },
  });
});

// Frontend usage
async function check2FAStatus() {
  const response = await fetch(`${API_URL}/2fa/status`, {
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (data.data.enabled) {
    console.log('2FA is enabled');
    console.log(`${data.data.backupCodesRemaining} backup codes remaining`);
  }
}
```

#### Task 3: Regenerate Backup Codes

```typescript
// Backend service
async regenerateBackupCodes(userId: string, password: string): Promise<string[]> {
  // Verify password
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);

  if (!isValidPassword) {
    throw new Error('Invalid password');
  }

  // Generate new codes
  const newCodes = this.generateBackupCodes(10);
  const hashedCodes = await Promise.all(
    newCodes.map(code => bcrypt.hash(code, 10))
  );

  // Store new codes
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorBackupCodes: hashedCodes },
  });

  return newCodes;
}

// Backend route
router.post('/2fa/regenerate-backup-codes', authenticateJWT, async (req, res) => {
  const { password } = req.body;

  const newCodes = await twoFactorService.regenerateBackupCodes(
    req.user.sub,
    password
  );

  res.json({
    status: 'success',
    data: { backupCodes: newCodes },
    message: 'New backup codes generated. Save these immediately!',
  });
});
```

### Troubleshooting 2FA

#### Issue 1: "Invalid 2FA Code" During Login

**Symptoms:**

- User enters correct-looking code
- Always says "Invalid"

**Common Causes:**

**Cause 1: Time sync issue**

```bash
# Check server time
date

# Check phone time
# Settings → General → Date & Time → Set Automatically: ON
```

**Solution:** Enable automatic time on phone

**Cause 2: Wrong secret**

```typescript
// Check user's 2FA status in database
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
  select: {
    twoFactorEnabled: true,
    twoFactorSecret: true,
  },
});

console.log('2FA Enabled:', user.twoFactorEnabled);
console.log('Has Secret:', !!user.twoFactorSecret);
```

**Cause 3: Code already used** TOTP codes can only be used once. Wait for next
code.

#### Issue 2: Lost Phone / Can't Access Authenticator

**Solution 1: Use Backup Code**

```
1. On login screen, click "Use backup code instead"
2. Enter one of your saved backup codes
3. Login successful
4. Immediately disable and re-enable 2FA with new phone
```

**Solution 2: Admin Disable 2FA**

```typescript
// Admin can disable 2FA for user
await prisma.user.update({
  where: { id: 'user-id' },
  data: {
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorBackupCodes: null,
  },
});
```

#### Issue 3: QR Code Won't Scan

**Symptoms:**

- Authenticator app can't read QR code

**Solutions:**

**Solution 1: Enter secret manually**

```typescript
// Show secret key in setup modal
<p>Can't scan? Enter this code manually:</p>
<code>{secret}</code>

// User enters in authenticator app:
// Account: FreeTimeChat:user@example.com
// Key: JBSWY3DPEHPK3PXP
// Type: Time-based
```

**Solution 2: Make QR code bigger**

```typescript
// Generate larger QR code
const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url, {
  width: 300, // Larger size
  margin: 2,
});
```

#### Issue 4: Backup Codes Don't Work

**Symptoms:**

- Enter backup code
- Says "Invalid"

**Debugging:**

```typescript
// Check if user has backup codes
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
  select: {
    twoFactorBackupCodes: true,
  },
});

console.log('Backup codes count:', user.twoFactorBackupCodes?.length);

// Test backup code verification
const testCode = 'A3B7-9K2L-4P5Q';
for (const hashedCode of user.twoFactorBackupCodes) {
  const matches = await bcrypt.compare(testCode, hashedCode);
  if (matches) {
    console.log('Code matches!');
  }
}
```

**Common Issues:**

- Typo in backup code (check dashes and letters)
- Code already used (each code works only once)
- Wrong user account

### 2FA Best Practices

#### 1. Always Provide Backup Codes

**Why?** Users will lose their phones. Without backup codes, they're locked out.

**Implementation:**

```typescript
// Generate 10 backup codes during setup
const backupCodes = this.generateBackupCodes(10);

// Show prominently in UI
<div className="backup-codes-warning">
  ⚠️ IMPORTANT: Save these backup codes now!
  You won't see them again.
</div>
```

#### 2. Allow Manual Secret Entry

**Why?** Some phones can't scan QR codes (camera issues, accessibility).

**Implementation:**

```typescript
<div className="manual-entry">
  <p>Can't scan QR code?</p>
  <button onClick={() => setShowManualEntry(true)}>
    Enter code manually
  </button>

  {showManualEntry && (
    <div>
      <p>Account: FreeTimeChat:{user.email}</p>
      <p>Key: <code>{secret}</code></p>
      <p>Type: Time-based</p>
    </div>
  )}
</div>
```

#### 3. Require Password for 2FA Changes

**Why?** Prevents attackers from disabling 2FA if they steal an access token.

**Always require:**

```typescript
// ✅ GOOD - Password required
router.post('/2fa/disable', authenticateJWT, async (req, res) => {
  const { password, token } = req.body;

  // Verify password before disabling
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid password' });
  }

  // Proceed with disable
});

// ❌ BAD - No password check
router.post('/2fa/disable', authenticateJWT, async (req, res) => {
  // Just disable without password check
  await twoFactorService.disable(req.user.sub);
});
```

#### 4. Use Appropriate Time Windows

**Different windows for different operations:**

```typescript
// Setup verification - More lenient (user might take time)
window: 2; // ±60 seconds

// Login verification - Stricter (security critical)
window: 1; // ±30 seconds

// Disable 2FA - More lenient (prevent lockout)
window: 2; // ±60 seconds
```

#### 5. Log 2FA Events

**Track important 2FA events:**

```typescript
// Create audit log table
model TwoFactorAuditLog {
  id        String   @id @default(uuid())
  userId    String
  action    String   // 'enabled', 'disabled', 'login_success', 'login_failed'
  ipAddress String
  userAgent String
  createdAt DateTime @default(now())
}

// Log events
await prisma.twoFactorAuditLog.create({
  data: {
    userId: user.id,
    action: 'login_failed',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  },
});
```

#### 6. Warn Users Before Enabling

**Clear communication:**

```typescript
<div className="2fa-warning">
  <h3>Before you enable 2FA:</h3>
  <ul>
    <li>✓ You'll need your phone to log in</li>
    <li>✓ Save your backup codes in a safe place</li>
    <li>✓ Make sure your phone's time is set automatically</li>
    <li>✓ Install an authenticator app first</li>
  </ul>

  <p>Recommended apps:</p>
  <ul>
    <li>Google Authenticator</li>
    <li>Microsoft Authenticator</li>
    <li>Authy</li>
  </ul>
</div>
```

---

## Code Walkthrough

### Authentication Context (Frontend State Management)

**File:** `apps/web/src/contexts/AuthContext.tsx`

This is the central hub for authentication state in the frontend. Think of it as
the "memory" that remembers who you are.

**Key Responsibilities:**

1. Store user information (email, roles, etc.)
2. Store authentication tokens
3. Provide login/logout functions
4. Auto-refresh tokens
5. Check authentication status on page load

**Complete Flow:**

```typescript
// 1. Create Context
export const AuthContext = createContext<AuthContextType>(undefined);

// 2. Provider Component
export function AuthProvider({ children }) {
  // State
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 3. Load tokens on mount
  useEffect(() => {
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');

    if (storedAccessToken) {
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      checkAuthWithToken(storedAccessToken); // Verify token is valid
    } else {
      setIsLoading(false);
    }
  }, []);

  // 4. Auto-refresh tokens every 14 minutes
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        refreshTokenFunc();
      }, 14 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [user]);

  // 5. Check if token is valid
  const checkAuthWithToken = async (token: string) => {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      setUser(data.data); // User is authenticated
    } else {
      // Token invalid, clear everything
      setUser(null);
      setAccessToken(null);
      localStorage.removeItem('accessToken');
    }

    setIsLoading(false);
  };

  // 6. Login function
  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      setAccessToken(data.data.accessToken);
      setRefreshToken(data.data.refreshToken);
      setUser(data.data.user);

      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
    }

    return data;
  };

  // 7. Logout function
  const logout = async () => {
    // Call backend to invalidate refresh token
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // Clear local state
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);

    // Clear storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    // Redirect to login
    router.push('/login');
  };

  // 8. Provide to all children
  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      getAuthHeaders: () => ({
        Authorization: `Bearer ${accessToken}`
      })
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// 9. Hook for easy access
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

**Usage in Components:**

```typescript
function MyComponent() {
  const { user, login, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <p>Welcome, {user.email}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### JWT Service (Backend Token Management)

**File:** `apps/api/src/services/jwt.service.ts`

This service creates and validates JWT tokens using RSA encryption.

**Key Concepts:**

- **RSA** - Asymmetric encryption (public/private key pair)
- **Private Key** - Signs tokens (kept secret)
- **Public Key** - Verifies tokens (can be shared)

```typescript
import jwt from 'jsonwebtoken';
import fs from 'fs';

class JWTService {
  private privateKey: string;
  private publicKey: string;

  constructor() {
    // Load RSA keys from files
    this.privateKey = fs.readFileSync('keys/jwt-private.pem', 'utf8');
    this.publicKey = fs.readFileSync('keys/jwt-public.pem', 'utf8');
  }

  // Create access token (15 minute expiry)
  signAccessToken(payload: {
    userId: string;
    email: string;
    roles: string[];
    impersonation?: any;
  }) {
    return jwt.sign(
      {
        sub: payload.userId, // Subject (user ID)
        email: payload.email,
        roles: payload.roles,
        impersonation: payload.impersonation,
        iat: Math.floor(Date.now() / 1000), // Issued at
        exp: Math.floor(Date.now() / 1000) + 15 * 60, // Expires in 15 min
        aud: 'freetimechat-web', // Audience (who can use it)
        iss: 'freetimechat-api', // Issuer (who created it)
      },
      this.privateKey,
      { algorithm: 'RS256' } // RSA with SHA-256
    );
  }

  // Create refresh token (7 day expiry)
  signRefreshToken(payload: { userId: string }) {
    return jwt.sign(
      {
        sub: payload.userId,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      },
      this.privateKey,
      { algorithm: 'RS256' }
    );
  }

  // Verify and decode access token
  verifyAccessToken(token: string) {
    try {
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        audience: 'freetimechat-web',
        issuer: 'freetimechat-api',
      });

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      throw new Error('Invalid token');
    }
  }

  // Verify refresh token
  verifyRefreshToken(token: string) {
    try {
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
      });

      if (decoded.type !== 'refresh') {
        throw new Error('Not a refresh token');
      }

      return decoded;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
}

export const jwtService = new JWTService();
```

**How RSA Works:**

1. **Signing (creating token):**

   ```
   Data + Private Key → Signature
   ```

2. **Verifying (checking token):**
   ```
   Data + Signature + Public Key → Valid/Invalid
   ```

**Why This is Secure:**

- Private key stays on server (never shared)
- Even if someone steals a token, they can't create new ones
- Public key can verify tokens but can't create them

### Auth Middleware (Backend Request Validation)

**File:** `apps/api/src/middleware/auth.middleware.ts`

This middleware runs on EVERY protected API request to verify the user's token.

```typescript
export const authenticateJWT = async (req, res, next) => {
  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers.authorization;
    // Format: "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'No token provided',
      });
    }

    const token = authHeader.split(' ')[1]; // Extract token part

    // 2. Verify token signature and expiration
    const payload = jwtService.verifyAccessToken(token);

    // 3. Attach user info to request object
    // Now all route handlers can access req.user
    req.user = {
      sub: payload.sub, // User ID
      email: payload.email,
      roles: payload.roles,
      impersonation: payload.impersonation,
    };

    // 4. Continue to next middleware or route handler
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: error.message || 'Invalid token',
    });
  }
};
```

**Usage in Routes:**

```typescript
import { authenticateJWT } from '../middleware/auth.middleware';

// Unprotected route (anyone can access)
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Protected route (requires valid token)
router.get(
  '/profile',
  authenticateJWT, // <-- Middleware checks token
  async (req, res) => {
    // If we get here, token is valid
    const userId = req.user.sub;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    res.json({ user });
  }
);
```

### Permission Middleware (Backend Authorization)

**File:** `apps/api/src/middleware/permission.middleware.ts`

This middleware checks if a user has the required role or capability.

```typescript
// Check if user has specific role
export const requireRole = (requiredRole: string) => {
  return async (req, res, next) => {
    const userRoles = req.user.roles || [];

    if (!userRoles.includes(requiredRole)) {
      return res.status(403).json({
        status: 'error',
        message: `Requires ${requiredRole} role`,
      });
    }

    next();
  };
};

// Check if user has ANY of the specified roles
export const requireAnyRole = (requiredRoles: string[]) => {
  return async (req, res, next) => {
    const userRoles = req.user.roles || [];

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        status: 'error',
        message: `Requires one of: ${requiredRoles.join(', ')}`,
      });
    }

    next();
  };
};

// Check if user has specific capability
export const requireCapability = (capability: string) => {
  return async (req, res, next) => {
    const userId = req.user.sub;

    // Get user's roles
    const userRoles = await roleService.getUserRoles(userId);

    // Get all role capabilities
    const capabilities = await roleService.getRoleCapabilities(userRoles);

    // Check if capability exists with allow=true
    const hasCapability = capabilities.some(
      (cap) => cap.name === capability && cap.allow === true
    );

    if (!hasCapability) {
      return res.status(403).json({
        status: 'error',
        message: `Requires ${capability} capability`,
      });
    }

    next();
  };
};
```

**Usage Examples:**

```typescript
// Require specific role
router.get(
  '/admin/stats',
  authenticateJWT,
  requireRole('admin'),
  async (req, res) => {
    // Only admins can access
  }
);

// Require any of multiple roles
router.get(
  '/admin/dashboard',
  authenticateJWT,
  requireAnyRole(['admin', 'tenantadmin']),
  async (req, res) => {
    // Either admin or tenantadmin can access
  }
);

// Require specific capability
router.post(
  '/admin/users',
  authenticateJWT,
  requireCapability('users:write'),
  async (req, res) => {
    // User must have users:write capability
  }
);

// Combine multiple checks
router.delete(
  '/admin/users/:id',
  authenticateJWT,
  requireRole('admin'),
  requireCapability('users:delete'),
  async (req, res) => {
    // Must be admin AND have users:delete capability
  }
);
```

---

## Common Development Tasks

### Task 1: Add a New Protected Page

**Scenario:** You need to create a new admin page that requires authentication.

**Steps:**

1. **Create the page component:**

```typescript
// apps/web/src/app/admin/reports/page.tsx
'use client';

import { useAuth } from '@/hooks/useAuth';

export default function ReportsPage() {
  const { user, getAuthHeaders } = useAuth();
  const [reports, setReports] = useState([]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/reports`,
      {
        headers: getAuthHeaders()  // Includes Authorization header
      }
    );

    if (response.ok) {
      const data = await response.json();
      setReports(data.data);
    }
  };

  return (
    <div>
      <h1>Reports</h1>
      {reports.map(report => (
        <div key={report.id}>{report.name}</div>
      ))}
    </div>
  );
}
```

2. **Add to admin navigation:**

```typescript
// apps/web/src/app/admin/layout.tsx
const commonNavigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: 'chart' },
  { name: 'Users', href: '/admin/users', icon: 'users' },
  { name: 'Reports', href: '/admin/reports', icon: 'document' }, // NEW
];
```

3. **The page is automatically protected** because it's under
   `/admin/layout.tsx` which uses `<ProtectedRoute>`.

### Task 2: Add a New API Endpoint with Authorization

**Scenario:** Create an endpoint that only users with `reports:read` capability
can access.

**Steps:**

1. **Create the route:**

```typescript
// apps/api/src/routes/admin/reports.routes.ts
import { Router } from 'express';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { requireCapability } from '../../middleware/permission.middleware';

const router = Router();

// GET /admin/reports - List all reports
router.get(
  '/',
  authenticateJWT, // Check token
  requireCapability('reports:read'), // Check capability
  async (req, res) => {
    try {
      const userId = req.user.sub;

      // Get reports for this user's tenant
      const reports = await prisma.report.findMany({
        where: {
          tenantId: req.user.tenantId,
        },
      });

      res.json({
        status: 'success',
        data: reports,
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch reports',
      });
    }
  }
);

export default router;
```

2. **Register the route:**

```typescript
// apps/api/src/routes/admin.routes.ts
import reportsRoutes from './admin/reports.routes';

router.use('/reports', reportsRoutes);
```

3. **Add the capability to database:**

```sql
-- Add new capability
INSERT INTO "Capability" (id, name, description)
VALUES ('cap-reports-read', 'reports:read', 'Can view reports');

-- Assign to admin role
INSERT INTO "RoleCapability" (id, "roleId", "capabilityId", allow)
VALUES (
  'rc-admin-reports-read',
  '<admin-role-id>',
  'cap-reports-read',
  true
);
```

### Task 3: Create a New User with Specific Role

**Scenario:** You need to create a test user with the "tenantadmin" role.

**Steps:**

1. **Use the seed script or create manually:**

```typescript
// apps/api/prisma/seed.ts
async function createTenantAdmin() {
  // 1. Hash password
  const passwordHash = await bcrypt.hash('password123', 10);

  // 2. Create user
  const user = await prisma.user.create({
    data: {
      email: 'tenantadmin@example.com',
      passwordHash,
      firstName: 'Tenant',
      lastName: 'Admin',
      tenantId: '<tenant-id>',
    },
  });

  // 3. Get tenantadmin role
  const role = await prisma.role.findFirst({
    where: { name: 'tenantadmin' },
  });

  // 4. Assign role to user
  await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId: role.id,
    },
  });

  console.log('Created tenant admin:', user.email);
}
```

2. **Run the seed:**

```bash
pnpm --filter @freetimechat/api prisma:seed:main
```

### Task 4: Debug Authorization Issues

**Scenario:** User says "I'm getting 403 Forbidden but I should have access."

**Debugging Steps:**

1. **Check the JWT token:**

```typescript
// In browser console
const token = localStorage.getItem('accessToken');
console.log('Token:', token);

// Decode token (don't verify, just decode)
const parts = token.split('.');
const payload = JSON.parse(atob(parts[1]));
console.log('Payload:', payload);
// Look at: sub (user ID), roles, impersonation
```

2. **Check user's roles in database:**

```sql
-- Get user's roles
SELECT u.email, r.name as role
FROM "User" u
JOIN "UserRole" ur ON u.id = ur."userId"
JOIN "Role" r ON ur."roleId" = r.id
WHERE u.email = 'user@example.com';
```

3. **Check role's capabilities:**

```sql
-- Get capabilities for a role
SELECT r.name as role, c.name as capability, rc.allow
FROM "Role" r
JOIN "RoleCapability" rc ON r.id = rc."roleId"
JOIN "Capability" c ON rc."capabilityId" = c.id
WHERE r.name = 'tenantadmin';
```

4. **Check API logs:**

```bash
# Look for 403 errors in API console
# You'll see which capability check failed
```

5. **Common Issues:**
   - User has wrong role assigned
   - Role is missing required capability
   - RoleCapability has `allow = false`
   - Token is expired
   - Token is from wrong tenant

### Task 5: Add a New Role with Custom Capabilities

**Scenario:** Create a "project-manager" role that can manage projects but not
users.

**Steps:**

1. **Create the role:**

```sql
INSERT INTO "Role" (id, name, description)
VALUES (
  'role-pm',
  'project-manager',
  'Can manage projects and time entries'
);
```

2. **Create capabilities:**

```sql
-- Projects
INSERT INTO "Capability" (id, name, description)
VALUES
  ('cap-proj-read', 'projects:read', 'Can view projects'),
  ('cap-proj-write', 'projects:write', 'Can create/edit projects'),
  ('cap-time-read', 'time:read', 'Can view time entries'),
  ('cap-time-write', 'time:write', 'Can create/edit time entries');
```

3. **Assign capabilities to role:**

```sql
INSERT INTO "RoleCapability" ("roleId", "capabilityId", allow)
VALUES
  ('role-pm', 'cap-proj-read', true),
  ('role-pm', 'cap-proj-write', true),
  ('role-pm', 'cap-time-read', true),
  ('role-pm', 'cap-time-write', true);
```

4. **Use in routes:**

```typescript
router.post(
  '/projects',
  authenticateJWT,
  requireCapability('projects:write'), // PM can access
  async (req, res) => {
    // Create project
  }
);

router.post(
  '/users',
  authenticateJWT,
  requireCapability('users:write'), // PM cannot access
  async (req, res) => {
    // Create user
  }
);
```

---

## Troubleshooting

### Issue 1: "401 Unauthorized" on API Requests

**Symptoms:**

- API returns 401 status
- Error message: "No token provided" or "Invalid token"

**Causes & Solutions:**

**Cause 1: Token not being sent**

```typescript
// ❌ BAD - No Authorization header
fetch('/api/users');

// ✅ GOOD - Include token
fetch('/api/users', {
  headers: {
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  },
});

// ✅ BETTER - Use getAuthHeaders()
const { getAuthHeaders } = useAuth();
fetch('/api/users', {
  headers: getAuthHeaders(),
});
```

**Cause 2: Token expired**

```typescript
// Check if token is expired
const token = localStorage.getItem('accessToken');
const parts = token.split('.');
const payload = JSON.parse(atob(parts[1]));

const now = Math.floor(Date.now() / 1000);
if (payload.exp < now) {
  console.log('Token expired!');
  // Trigger refresh or logout
}
```

**Solution:** AuthContext should auto-refresh, but you can manually trigger:

```typescript
const { refreshUser } = useAuth();
await refreshUser();
```

**Cause 3: Token format wrong**

```typescript
// ❌ BAD
Authorization: accessToken

// ✅ GOOD
Authorization: Bearer accessToken
```

### Issue 2: "403 Forbidden" - User Has No Access

**Symptoms:**

- API returns 403 status
- Error message: "Insufficient permissions" or "Requires admin role"

**Debugging Steps:**

1. **Check user's token claims:**

```javascript
// Browser console
const token = localStorage.getItem('accessToken');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Roles:', payload.roles);
```

2. **Verify role assignment in database:**

```sql
SELECT u.email, r.name
FROM "User" u
JOIN "UserRole" ur ON u.id = ur."userId"
JOIN "Role" r ON ur."roleId" = r.id
WHERE u.email = 'user@example.com';
```

3. **Check if role has required capability:**

```sql
SELECT c.name, rc.allow
FROM "RoleCapability" rc
JOIN "Capability" c ON rc."capabilityId" = c.id
WHERE rc."roleId" = '<role-id>';
```

4. **Common fixes:**

```typescript
// Add role to user
await prisma.userRole.create({
  data: {
    userId: 'user-id',
    roleId: 'admin-role-id',
  },
});

// Add capability to role
await prisma.roleCapability.create({
  data: {
    roleId: 'role-id',
    capabilityId: 'capability-id',
    allow: true,
  },
});
```

### Issue 3: Impersonation Banner Doesn't Show

**Symptoms:**

- Admin impersonates user successfully
- No yellow warning banner appears

**Causes & Solutions:**

**Cause 1: ImpersonationProvider not mounted**

```typescript
// ✅ Check apps/web/src/components/ClientLayout.tsx
export function ClientLayout({ children }) {
  return (
    <ImpersonationProvider>
      <ImpersonationBanner />  {/* Must be here */}
      {children}
    </ImpersonationProvider>
  );
}
```

**Cause 2: JWT doesn't include impersonation metadata**

```typescript
// Check token in browser console
const token = localStorage.getItem('accessToken');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Impersonation:', payload.impersonation);
// Should show: { adminUserId: '...', sessionId: '...' }
```

**Cause 3: User object not updated**

```typescript
// In ImpersonationContext
useEffect(() => {
  if (user?.isImpersonating) {
    setIsImpersonating(true); // This should trigger
  }
}, [user]);
```

### Issue 4: Token Refresh Loop

**Symptoms:**

- Console shows continuous `/auth/refresh` requests
- Page becomes slow
- Token keeps refreshing even when user is idle

**Cause:** Multiple refresh timers running

**Solution:**

```typescript
// ✅ GOOD - Cleanup interval
useEffect(() => {
  if (user) {
    const interval = setInterval(
      () => {
        refreshTokenFunc();
      },
      14 * 60 * 1000
    );

    return () => clearInterval(interval); // IMPORTANT: Cleanup
  }
}, [user]);

// ❌ BAD - No cleanup
useEffect(() => {
  setInterval(
    () => {
      refreshTokenFunc();
    },
    14 * 60 * 1000
  );
  // Timer keeps running forever
}, [user]);
```

### Issue 5: Can't Log In After Impersonation

**Symptoms:**

- Admin exits impersonation
- Lands on login page
- Login fails or token issues

**Cause:** Tokens not properly cleared

**Solution:**

```typescript
const endImpersonation = async () => {
  // 1. Call backend to end session
  await fetch('/admin/users/impersonate/stop', {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  // 2. MUST clear all tokens
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');

  // 3. Clear state
  setUser(null);
  setAccessToken(null);
  setRefreshToken(null);

  // 4. Redirect to login
  window.location.href = '/login'; // Force full page reload
};
```

### Issue 6: "Failed to Fetch" Error

**Symptoms:**

- API requests fail before reaching the server
- Error message: "Failed to fetch"
- Network tab shows request failed

**Causes & Solutions:**

**Cause 1: API server not running**

```bash
# Check if API is running
curl http://localhost:3001/api/v1/health

# If not running, start it
pnpm dev
```

**Cause 2: Wrong API URL**

```typescript
// Check .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1  // ✅ CORRECT

// NOT:
NEXT_PUBLIC_API_URL=http://localhost:3000  // ❌ WRONG PORT
NEXT_PUBLIC_API_URL=http://localhost:3001  // ❌ MISSING /api/v1
```

**Cause 3: CORS issues**

```typescript
// apps/api/src/index.ts
app.use(
  cors({
    origin: process.env.WEB_URL || 'http://localhost:3000',
    credentials: true,
  })
);
```

---

## Security Best Practices

### 1. Never Store Passwords in Plain Text

**❌ WRONG:**

```typescript
await prisma.user.create({
  data: {
    email: 'user@example.com',
    password: 'password123', // NEVER DO THIS
  },
});
```

**✅ CORRECT:**

```typescript
import bcrypt from 'bcrypt';

const passwordHash = await bcrypt.hash('password123', 10);

await prisma.user.create({
  data: {
    email: 'user@example.com',
    passwordHash: passwordHash, // Hashed password
  },
});
```

### 2. Always Validate JWT Tokens

**❌ WRONG:**

```typescript
// Trusting the token without verification
const token = req.headers.authorization.split(' ')[1];
const payload = JSON.parse(atob(token.split('.')[1])); // Decoded but NOT verified
req.user = payload; // DANGEROUS
```

**✅ CORRECT:**

```typescript
// Verify signature and claims
const token = req.headers.authorization.split(' ')[1];
const payload = jwtService.verifyAccessToken(token); // Throws if invalid
req.user = payload; // Safe
```

### 3. Use Short-Lived Access Tokens

**Why?**

- If stolen, they expire quickly (15 minutes)
- Limits damage from compromised tokens

**Implementation:**

```typescript
// Access token: 15 minutes
exp: Math.floor(Date.now() / 1000) + 15 * 60;

// Refresh token: 7 days
exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

// Auto-refresh before expiry (14 minutes)
setInterval(refreshToken, 14 * 60 * 1000);
```

### 4. Log Impersonation Sessions

**Why?**

- Audit trail for compliance
- Detect abuse
- Accountability

**Implementation:**

```typescript
// Create session record
await prisma.impersonationSession.create({
  data: {
    adminUserId: admin.id,
    targetUserId: target.id,
    startedAt: new Date(),
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  },
});

// End session
await prisma.impersonationSession.update({
  where: { id: sessionId },
  data: { endedAt: new Date() },
});
```

### 5. Never Expose Sensitive Data in JWTs

**❌ WRONG:**

```typescript
const token = jwt.sign(
  {
    userId: user.id,
    email: user.email,
    passwordHash: user.passwordHash, // NEVER
    ssn: user.ssn, // NEVER
    creditCard: user.creditCard, // NEVER
  },
  privateKey
);
```

**✅ CORRECT:**

```typescript
const token = jwt.sign(
  {
    sub: user.id, // Just the user ID
    email: user.email, // Email is OK (not sensitive)
    roles: userRoles, // Roles are OK
  },
  privateKey
);
```

**Remember:** JWTs can be decoded by anyone. They're encoded, not encrypted.

### 6. Implement Rate Limiting

**Why?**

- Prevent brute force attacks on login
- Prevent DDoS

**Implementation:**

```typescript
// apps/api/src/middleware/rateLimiter.middleware.ts
import rateLimit from 'express-rate-limit';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, try again later',
});

// Use in routes
router.post(
  '/login',
  loginRateLimiter, // Apply rate limit
  async (req, res) => {
    // Login logic
  }
);
```

### 7. Validate All Input

**❌ WRONG:**

```typescript
const { email, password } = req.body;
// Use directly without validation
```

**✅ CORRECT:**

```typescript
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const { email, password } = loginSchema.parse(req.body);
// Will throw if invalid
```

### 8. Use HTTPS in Production

**Why?**

- Protects tokens in transit
- Prevents man-in-the-middle attacks

**Never:**

```
http://api.example.com  // ❌ Unencrypted
```

**Always:**

```
https://api.example.com  // ✅ Encrypted
```

---

## Glossary

**Authentication** - Proving who you are (like showing your passport)

**Authorization** - Checking what you're allowed to do (like checking if your
ticket allows business class)

**JWT (JSON Web Token)** - A digital ID card containing your user information

**Access Token** - Short-lived token (15 min) used for API requests

**Refresh Token** - Long-lived token (7 days) used to get new access tokens

**RBAC (Role-Based Access Control)** - Permission system based on user roles

**Role** - A job title that determines permissions (e.g., admin, user)

**Capability** - A specific permission (e.g., users:read, users:write)

**Impersonation** - Admin temporarily becoming another user

**Middleware** - Code that runs before your route handler (like a checkpoint)

**Bearer Token** - Token format: "Bearer <token>" in Authorization header

**bcrypt** - Algorithm for securely hashing passwords

**RSA** - Encryption algorithm using public/private key pairs

**Tenant** - An organization using the system (multi-tenant = multiple
organizations)

**2FA (Two-Factor Authentication)** - Security method requiring two forms of
proof: password + phone

**TOTP (Time-based One-Time Password)** - 6-digit code that changes every 30
seconds

**Authenticator App** - Mobile app that generates TOTP codes (Google
Authenticator, Authy, etc.)

**QR Code** - Square barcode containing the 2FA secret key for easy setup

**Backup Codes** - One-time-use codes for 2FA recovery if you lose your phone

**speakeasy** - Node.js library for generating and verifying TOTP codes

**qrcode** - Node.js library for generating QR code images

---

## Additional Resources

### Key Files Reference

**Frontend:**

- `apps/web/src/contexts/AuthContext.tsx` - Authentication state management
- `apps/web/src/contexts/ImpersonationContext.tsx` - Impersonation state
- `apps/web/src/hooks/useAuth.ts` - Auth hook for components
- `apps/web/src/components/auth/ProtectedRoute.tsx` - Route guard
- `apps/web/src/app/login/page.tsx` - Login UI
- `apps/web/src/app/admin/layout.tsx` - Admin panel layout with role-based nav

**Backend:**

- `apps/api/src/services/jwt.service.ts` - JWT creation and validation
- `apps/api/src/services/auth.service.ts` - Login/logout logic
- `apps/api/src/services/role.service.ts` - Role and capability management
- `apps/api/src/services/impersonation.service.ts` - Impersonation logic
- `apps/api/src/services/two-factor.service.ts` - 2FA TOTP and backup codes
- `apps/api/src/middleware/auth.middleware.ts` - JWT validation middleware
- `apps/api/src/middleware/permission.middleware.ts` - Authorization middleware
- `apps/api/src/routes/auth.routes.ts` - Auth endpoints (includes 2FA login
  flow)
- `apps/api/src/routes/two-factor.routes.ts` - 2FA management endpoints
- `apps/api/src/routes/admin/users.routes.ts` - User management + impersonation

**Database:**

- `apps/api/prisma/schema-main.prisma` - User, Role, Capability tables
- `apps/api/prisma/seed.ts` - Test data creation

### Learning Resources

**JWT:**

- https://jwt.io - Decode and inspect JWTs
- https://jwt.io/introduction - JWT basics

**bcrypt:**

- https://www.npmjs.com/package/bcrypt - Password hashing

**RBAC:**

- https://en.wikipedia.org/wiki/Role-based_access_control - RBAC concept

---

## Quick Reference Commands

```bash
# Start development servers
pnpm dev

# View API logs
# Check terminal where pnpm dev is running

# Seed database with test users
pnpm --filter @freetimechat/api prisma:seed:main

# Generate new RSA keys
openssl genrsa -out apps/api/keys/jwt-private.pem 2048
openssl rsa -in apps/api/keys/jwt-private.pem -pubout -out apps/api/keys/jwt-public.pem

# Check database
pnpm --filter @freetimechat/api prisma:studio:main

# Run migrations
pnpm --filter @freetimechat/api prisma:migrate:deploy:main
```

---

**Questions or Issues?**

If you encounter issues not covered in this guide:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review the [Code Walkthrough](#code-walkthrough) for the relevant component
3. Check API logs for error messages
4. Ask a senior developer for help

**Remember:** When in doubt, add console.log() statements to trace the flow!
