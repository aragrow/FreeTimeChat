# FreeTimeChat - Testing Plan

This document outlines the comprehensive testing strategy for FreeTimeChat, covering unit tests, integration tests, end-to-end tests, security testing, and performance testing.

---

## Table of Contents

- [Testing Strategy Overview](#testing-strategy-overview)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [End-to-End Testing](#end-to-end-testing)
- [Security Testing](#security-testing)
- [Performance Testing](#performance-testing)
- [Test Environments](#test-environments)
- [Test Data Management](#test-data-management)
- [CI/CD Integration](#cicd-integration)
- [Coverage Requirements](#coverage-requirements)
- [Testing Checklist](#testing-checklist)

---

## Testing Strategy Overview

### Testing Pyramid

```
                    /\
                   /  \
                  / E2E \         (10% of tests)
                 /______\
                /        \
               /Integration\      (30% of tests)
              /____________\
             /              \
            /  Unit Tests    \    (60% of tests)
           /__________________\
```

### Testing Principles

1. **Test Early, Test Often**: Write tests as you develop features
2. **Test Isolation**: Each test should be independent and repeatable
3. **Fast Feedback**: Unit tests run in seconds, not minutes
4. **Meaningful Coverage**: Focus on critical paths, not just coverage percentage
5. **Test Maintenance**: Keep tests clean, readable, and up-to-date
6. **Security First**: Include security tests in every layer

### Testing Goals

- **Code Coverage**: Minimum 80% overall, 90% for critical paths
- **Regression Prevention**: Catch bugs before they reach production
- **Documentation**: Tests serve as living documentation
- **Confidence**: Deploy with confidence knowing tests pass
- **Security**: Verify security controls work as designed

---

## Unit Testing

Unit tests verify individual functions, methods, and components in isolation.

### Backend Unit Tests

#### Authentication Service Tests
**File:** `apps/api/src/services/__tests__/AuthenticationService.test.ts`
**Related Tasks:** 9.1.1
**User Stories:** US-001, US-003, US-005, US-006, US-007

**Test Cases:**

```typescript
describe('AuthenticationService', () => {
  describe('register', () => {
    it('should create new user with hashed password', async () => {
      // Test that password is hashed, user created, verification email sent
    });

    it('should reject duplicate email', async () => {
      // Test unique email constraint
    });

    it('should reject weak passwords', async () => {
      // Test password validation (min 8 chars, complexity)
    });

    it('should assign user to correct client', async () => {
      // Test client assignment logic
    });
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      // Test successful login flow
    });

    it('should reject invalid password', async () => {
      // Test password verification
    });

    it('should reject unverified email', async () => {
      // Test email verification requirement
    });

    it('should require 2FA code if enabled', async () => {
      // Test 2FA enforcement
    });
  });

  describe('verifyEmail', () => {
    it('should activate account with valid token', async () => {
      // Test email verification flow
    });

    it('should reject expired tokens', async () => {
      // Test token expiration (24 hours)
    });

    it('should reject invalid tokens', async () => {
      // Test token validation
    });
  });

  describe('resetPassword', () => {
    it('should send reset email for valid email', async () => {
      // Test password reset request
    });

    it('should allow password change with valid token', async () => {
      // Test password reset flow
    });

    it('should invalidate all sessions after reset', async () => {
      // Test session invalidation
    });
  });

  describe('setup2FA', () => {
    it('should generate TOTP secret and QR code', async () => {
      // Test 2FA setup
    });

    it('should generate backup codes', async () => {
      // Test backup code generation
    });

    it('should activate 2FA after code verification', async () => {
      // Test 2FA activation
    });
  });

  describe('verify2FA', () => {
    it('should accept valid TOTP code', async () => {
      // Test 2FA code verification
    });

    it('should reject invalid code', async () => {
      // Test invalid code handling
    });

    it('should accept backup code and mark as used', async () => {
      // Test backup code usage
    });
  });
});
```

---

#### Authorization Service Tests
**File:** `apps/api/src/services/__tests__/AuthorizationService.test.ts`
**Related Tasks:** 9.1.2
**User Stories:** US-033, US-034, US-035, US-037

**Test Cases:**

```typescript
describe('AuthorizationService', () => {
  describe('userHasCapability', () => {
    it('should return true for user with capability', async () => {
      // Test capability check for assigned role
    });

    it('should return false for user without capability', async () => {
      // Test capability denial
    });

    it('should respect explicit deny rules', async () => {
      // Test deny rules override allow rules
    });

    it('should use Redis cache for repeated checks', async () => {
      // Test caching layer
    });
  });

  describe('getRoleCapabilities', () => {
    it('should return all capabilities for role', async () => {
      // Test capability listing
    });

    it('should include inherited capabilities', async () => {
      // Test capability inheritance (if implemented)
    });
  });

  describe('assignRoleToUser', () => {
    it('should assign role and invalidate cache', async () => {
      // Test role assignment
    });

    it('should prevent assigning role from different client', async () => {
      // Test client isolation
    });

    it('should audit role assignment', async () => {
      // Test audit logging
    });
  });
});
```

---

#### Database Service Tests
**File:** `apps/api/src/services/__tests__/DatabaseService.test.ts`
**Related Tasks:** 9.1.3
**User Stories:** US-055, US-056

**Test Cases:**

```typescript
describe('DatabaseService', () => {
  describe('getMainDatabase', () => {
    it('should return singleton main database instance', () => {
      // Test connection reuse
    });

    it('should connect to correct main database', () => {
      // Test connection string
    });
  });

  describe('getClientDatabase', () => {
    it('should create new connection for first access', async () => {
      // Test connection creation
    });

    it('should reuse existing connection', async () => {
      // Test connection pooling
    });

    it('should cleanup stale connections', async () => {
      // Test 30-minute timeout cleanup
    });

    it('should enforce max connection limit', async () => {
      // Test max 100 connections
    });

    it('should throw error for invalid client', async () => {
      // Test error handling
    });
  });

  describe('buildClientDatabaseUrl', () => {
    it('should construct correct connection URL', () => {
      // Test URL construction
    });

    it('should use UUID-based database name', () => {
      // Test naming convention
    });
  });
});
```

---

#### Impersonation Service Tests
**File:** `apps/api/src/services/__tests__/ImpersonationService.test.ts`
**Related Tasks:** 9.1.4
**User Stories:** US-039, US-040, US-041, US-042

**Test Cases:**

```typescript
describe('ImpersonationService', () => {
  describe('startImpersonation', () => {
    it('should create impersonation session for admin', async () => {
      // Test impersonation start
    });

    it('should reject user without impersonation capability', async () => {
      // Test permission check
    });

    it('should prevent impersonating super admin', async () => {
      // Test super admin protection
    });

    it('should prevent impersonating self', async () => {
      // Test self-impersonation prevention
    });

    it('should create audit log entry', async () => {
      // Test audit logging
    });

    it('should return JWT with impersonation metadata', async () => {
      // Test token structure
    });
  });

  describe('endImpersonation', () => {
    it('should mark session as ended', async () => {
      // Test session termination
    });

    it('should create audit log entry', async () => {
      // Test audit logging
    });
  });

  describe('getImpersonationContext', () => {
    it('should extract impersonation data from JWT', () => {
      // Test JWT parsing
    });

    it('should return null for non-impersonation token', () => {
      // Test normal token handling
    });
  });

  describe('isActionRestricted', () => {
    it('should block password changes during impersonation', () => {
      // Test password change restriction
    });

    it('should block 2FA changes during impersonation', () => {
      // Test 2FA restriction
    });

    it('should allow time entry creation', () => {
      // Test allowed actions
    });
  });
});
```

---

#### Chat Processing Service Tests
**File:** `apps/api/src/services/__tests__/ChatProcessingService.test.ts`
**Related Tasks:** 9.1.5
**User Stories:** US-012, US-013, US-014, US-058

**Test Cases:**

```typescript
describe('ChatProcessingService', () => {
  describe('parseTimeEntry', () => {
    it('should extract duration, project, and date from "I worked 3 hours on Project X today"', () => {
      // Test basic parsing
    });

    it('should handle "Log 2 hours for client meeting yesterday"', () => {
      // Test relative dates
    });

    it('should handle "Worked from 9am to 5pm on Project Alpha"', () => {
      // Test time ranges
    });

    it('should handle "4.5 hours on dashboard feature"', () => {
      // Test decimal hours
    });

    it('should fuzzy match project names', () => {
      // Test fuzzy matching (e.g., "dash" matches "Dashboard")
    });

    it('should ask for clarification if ambiguous', () => {
      // Test ambiguity handling
    });
  });

  describe('parseTimerCommand', () => {
    it('should detect "start timer for Project X"', () => {
      // Test timer start detection
    });

    it('should detect "stop timer"', () => {
      // Test timer stop detection
    });

    it('should extract project from timer command', () => {
      // Test project extraction
    });
  });

  describe('parseQuery', () => {
    it('should detect "show my time this week"', () => {
      // Test query detection
    });

    it('should extract date range from query', () => {
      // Test date range parsing
    });

    it('should extract project filter from query', () => {
      // Test project filter
    });
  });
});
```

---

#### Time Entry Service Tests
**File:** `apps/api/src/services/__tests__/TimeEntryService.test.ts`
**Related Tasks:** 9.1.6
**User Stories:** US-012, US-018, US-019, US-020, US-021

**Test Cases:**

```typescript
describe('TimeEntryService', () => {
  describe('createTimeEntry', () => {
    it('should create time entry in client database', async () => {
      // Test creation in correct database
    });

    it('should validate required fields', async () => {
      // Test validation
    });

    it('should reject negative duration', async () => {
      // Test duration validation
    });

    it('should assign to correct user and client', async () => {
      // Test user/client assignment
    });
  });

  describe('updateTimeEntry', () => {
    it('should update time entry if user owns it', async () => {
      // Test ownership check
    });

    it('should reject update if entry locked (>30 days)', async () => {
      // Test lock enforcement
    });

    it('should create audit log entry', async () => {
      // Test audit logging
    });
  });

  describe('deleteTimeEntry', () => {
    it('should soft delete time entry', async () => {
      // Test soft delete
    });

    it('should reject deletion if locked', async () => {
      // Test lock enforcement
    });

    it('should create audit log entry', async () => {
      // Test audit logging
    });
  });

  describe('getUserTimeEntries', () => {
    it('should return only user\'s entries', async () => {
      // Test user isolation
    });

    it('should filter by date range', async () => {
      // Test date filtering
    });

    it('should filter by project', async () => {
      // Test project filtering
    });

    it('should paginate results', async () => {
      // Test pagination
    });
  });
});
```

---

### Frontend Unit Tests

#### Authentication Components
**File:** `apps/web/src/components/__tests__/LoginForm.test.tsx`
**Related Tasks:** 9.1.7
**User Stories:** US-003, US-004, US-007

**Test Cases:**

```typescript
describe('LoginForm', () => {
  it('should render email and password fields', () => {
    // Test form rendering
  });

  it('should validate email format', async () => {
    // Test email validation
  });

  it('should validate password presence', async () => {
    // Test password validation
  });

  it('should call login API on submit', async () => {
    // Test form submission
  });

  it('should show 2FA prompt if required', async () => {
    // Test 2FA flow
  });

  it('should redirect to dashboard on success', async () => {
    // Test redirect logic
  });

  it('should show error message for invalid credentials', async () => {
    // Test error handling
  });
});

describe('GoogleOAuthButton', () => {
  it('should render Google sign-in button', () => {
    // Test rendering
  });

  it('should initiate OAuth flow on click', () => {
    // Test OAuth initiation
  });
});

describe('RegisterForm', () => {
  it('should validate password strength', async () => {
    // Test password requirements
  });

  it('should validate password confirmation match', async () => {
    // Test password matching
  });

  it('should call register API on submit', async () => {
    // Test registration
  });
});
```

---

#### Chat Components
**File:** `apps/web/src/components/__tests__/ChatInterface.test.tsx`
**Related Tasks:** 9.1.8
**User Stories:** US-010, US-011, US-012

**Test Cases:**

```typescript
describe('ChatInterface', () => {
  it('should render message input and send button', () => {
    // Test UI rendering
  });

  it('should send message on Enter key', async () => {
    // Test keyboard interaction
  });

  it('should send message on button click', async () => {
    // Test button interaction
  });

  it('should show loading indicator while sending', async () => {
    // Test loading state
  });

  it('should display user message immediately', async () => {
    // Test optimistic UI
  });

  it('should display system response', async () => {
    // Test response rendering
  });

  it('should scroll to bottom on new message', () => {
    // Test auto-scroll
  });

  it('should support multi-line input with Shift+Enter', async () => {
    // Test multi-line support
  });
});

describe('ChatMessage', () => {
  it('should render user messages with correct styling', () => {
    // Test user message appearance
  });

  it('should render system messages with correct styling', () => {
    // Test system message appearance
  });

  it('should show timestamp', () => {
    // Test timestamp display
  });

  it('should render markdown content', () => {
    // Test markdown support
  });
});
```

---

#### Impersonation Components
**File:** `apps/web/src/components/__tests__/ImpersonationBanner.test.tsx`
**Related Tasks:** 9.1.9
**User Stories:** US-039, US-041

**Test Cases:**

```typescript
describe('ImpersonationBanner', () => {
  it('should not render when not impersonating', () => {
    // Test conditional rendering
  });

  it('should render when impersonating', () => {
    // Test banner display
  });

  it('should show target user name', () => {
    // Test user name display
  });

  it('should show admin name', () => {
    // Test admin name display
  });

  it('should have Exit Impersonation button', () => {
    // Test button presence
  });

  it('should call endImpersonation on button click', async () => {
    // Test exit functionality
  });
});

describe('ImpersonationContext', () => {
  it('should provide impersonation state', () => {
    // Test context state
  });

  it('should save admin token on startImpersonation', async () => {
    // Test token management
  });

  it('should restore admin token on endImpersonation', async () => {
    // Test token restoration
  });
});
```

---

#### Time Entry Components
**File:** `apps/web/src/components/__tests__/TimeEntryForm.test.tsx`
**Related Tasks:** 9.1.10
**User Stories:** US-019, US-020

**Test Cases:**

```typescript
describe('TimeEntryForm', () => {
  it('should render all form fields', () => {
    // Test form rendering
  });

  it('should validate required fields', async () => {
    // Test validation
  });

  it('should validate duration is positive', async () => {
    // Test duration validation
  });

  it('should pre-populate form when editing', () => {
    // Test edit mode
  });

  it('should call onSubmit with form data', async () => {
    // Test submission
  });

  it('should call onCancel when Cancel clicked', () => {
    // Test cancel
  });
});

describe('TimeEntryList', () => {
  it('should render time entries in table', () => {
    // Test list rendering
  });

  it('should show edit button for each entry', () => {
    // Test edit button
  });

  it('should show delete button for each entry', () => {
    // Test delete button
  });

  it('should confirm before deleting', async () => {
    // Test delete confirmation
  });

  it('should filter by date range', async () => {
    // Test filtering
  });

  it('should sort by column on header click', async () => {
    // Test sorting
  });
});
```

---

## Integration Testing

Integration tests verify that multiple components work together correctly.

### API Integration Tests

#### Authentication Flow Tests
**File:** `apps/api/src/__tests__/integration/auth.test.ts`
**Related Tasks:** 9.2.1
**User Stories:** US-001, US-003, US-005, US-006, US-007

**Test Cases:**

```typescript
describe('Authentication Flow Integration', () => {
  describe('Registration → Email Verification → Login', () => {
    it('should complete full registration flow', async () => {
      // 1. Register user
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'Test123!', name: 'Test User' });
      expect(registerRes.status).toBe(201);

      // 2. Verify email
      const { verificationToken } = await getVerificationToken('test@example.com');
      const verifyRes = await request(app)
        .get(`/api/auth/verify-email?token=${verificationToken}`);
      expect(verifyRes.status).toBe(200);

      // 3. Login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Test123!' });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body).toHaveProperty('accessToken');
      expect(loginRes.body).toHaveProperty('refreshToken');
    });
  });

  describe('2FA Setup and Login', () => {
    it('should complete 2FA setup and login with 2FA', async () => {
      // 1. Login
      const loginRes = await authenticateUser('user@example.com', 'password');
      const { accessToken } = loginRes.body;

      // 2. Setup 2FA
      const setupRes = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(setupRes.body).toHaveProperty('secret');
      expect(setupRes.body).toHaveProperty('qrCode');

      // 3. Verify 2FA setup
      const code = generateTOTP(setupRes.body.secret);
      const verifyRes = await request(app)
        .post('/api/auth/2fa/verify-setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code });
      expect(verifyRes.status).toBe(200);

      // 4. Logout and login with 2FA
      await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${accessToken}`);

      const loginRes2 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'password' });
      expect(loginRes2.body).toHaveProperty('requires2FA', true);

      const code2 = generateTOTP(setupRes.body.secret);
      const login2FARes = await request(app)
        .post('/api/auth/2fa/verify')
        .send({ tempToken: loginRes2.body.tempToken, code: code2 });
      expect(login2FARes.status).toBe(200);
      expect(login2FARes.body).toHaveProperty('accessToken');
    });
  });

  describe('Token Refresh Flow', () => {
    it('should refresh access token with refresh token', async () => {
      // 1. Login
      const loginRes = await authenticateUser('user@example.com', 'password');
      const { accessToken, refreshToken } = loginRes.body;

      // 2. Wait for token to near expiration (or manually expire)
      // 3. Refresh token
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });
      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body).toHaveProperty('accessToken');
      expect(refreshRes.body).toHaveProperty('refreshToken');
      expect(refreshRes.body.refreshToken).not.toBe(refreshToken); // Token rotation
    });

    it('should detect refresh token reuse', async () => {
      // 1. Login
      const loginRes = await authenticateUser('user@example.com', 'password');
      const { refreshToken } = loginRes.body;

      // 2. Use refresh token
      const refreshRes1 = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });
      expect(refreshRes1.status).toBe(200);

      // 3. Attempt to reuse old refresh token
      const refreshRes2 = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken }); // Reusing old token
      expect(refreshRes2.status).toBe(401);
      expect(refreshRes2.body.error).toContain('Token reuse detected');
    });
  });
});
```

---

#### Multi-Tenant Database Tests
**File:** `apps/api/src/__tests__/integration/multi-tenant.test.ts`
**Related Tasks:** 9.2.2
**User Stories:** US-049, US-055, US-056

**Test Cases:**

```typescript
describe('Multi-Tenant Database Integration', () => {
  describe('Client Database Isolation', () => {
    it('should isolate data between clients', async () => {
      // 1. Create two clients
      const client1 = await createClient('Client 1');
      const client2 = await createClient('Client 2');

      // 2. Create users for each client
      const user1 = await createUser('user1@client1.com', client1.id);
      const user2 = await createUser('user2@client2.com', client2.id);

      // 3. Create time entry as user1
      const token1 = await loginUser(user1.email, 'password');
      const entryRes = await request(app)
        .post('/api/time-entries')
        .set('Authorization', `Bearer ${token1}`)
        .send({ projectId: 'proj1', duration: 3, date: '2025-01-01' });
      expect(entryRes.status).toBe(201);

      // 4. Verify user2 cannot see user1's entry
      const token2 = await loginUser(user2.email, 'password');
      const listRes = await request(app)
        .get('/api/time-entries')
        .set('Authorization', `Bearer ${token2}`);
      expect(listRes.body.entries).toHaveLength(0);
    });
  });

  describe('Database Connection Management', () => {
    it('should reuse connections for same client', async () => {
      // 1. Make multiple requests for same client
      // 2. Verify same database connection is used
      // 3. Check connection pool metrics
    });

    it('should cleanup stale connections', async () => {
      // 1. Create connections for multiple clients
      // 2. Wait for timeout period (30 minutes)
      // 3. Verify stale connections are closed
    });

    it('should enforce connection limit', async () => {
      // 1. Create 100 client databases
      // 2. Make requests to all 100 clients
      // 3. Attempt 101st connection
      // 4. Verify error or oldest connection is recycled
    });
  });

  describe('Request Routing', () => {
    it('should route requests to correct client database', async () => {
      // 1. Login as user in client A
      // 2. Create resource (time entry)
      // 3. Verify resource is in client A's database, not main database
    });

    it('should fail if client database unavailable', async () => {
      // 1. Simulate database unavailability
      // 2. Attempt request
      // 3. Verify graceful error handling
    });
  });
});
```

---

#### Impersonation Flow Tests
**File:** `apps/api/src/__tests__/integration/impersonation.test.ts`
**Related Tasks:** 9.2.3
**User Stories:** US-038, US-039, US-040, US-041

**Test Cases:**

```typescript
describe('Impersonation Integration', () => {
  describe('Full Impersonation Flow', () => {
    it('should complete start → action → end impersonation', async () => {
      // 1. Login as admin
      const adminToken = await loginUser('admin@client.com', 'password');

      // 2. Start impersonation
      const impersonateRes = await request(app)
        .post('/api/admin/impersonate/start')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetUserId: 'user-123' });
      expect(impersonateRes.status).toBe(200);
      const { impersonationToken, sessionId } = impersonateRes.body;

      // 3. Perform action as impersonated user
      const entryRes = await request(app)
        .post('/api/time-entries')
        .set('Authorization', `Bearer ${impersonationToken}`)
        .send({ projectId: 'proj1', duration: 2, date: '2025-01-01' });
      expect(entryRes.status).toBe(201);

      // 4. End impersonation
      const endRes = await request(app)
        .post('/api/admin/impersonate/end')
        .set('Authorization', `Bearer ${impersonationToken}`)
        .send({ sessionId });
      expect(endRes.status).toBe(200);

      // 5. Verify session is marked as ended in database
      const session = await getImpersonationSession(sessionId);
      expect(session.endedAt).not.toBeNull();
    });
  });

  describe('Impersonation Restrictions', () => {
    it('should block password change during impersonation', async () => {
      // 1. Start impersonation
      const impersonationToken = await startImpersonation('admin-id', 'user-id');

      // 2. Attempt password change
      const changeRes = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${impersonationToken}`)
        .send({ newPassword: 'NewPass123!' });
      expect(changeRes.status).toBe(403);
      expect(changeRes.body.error).toContain('restricted during impersonation');
    });

    it('should block 2FA changes during impersonation', async () => {
      // Similar to above for 2FA setup
    });

    it('should allow time tracking during impersonation', async () => {
      // Verify allowed actions work
    });
  });

  describe('Impersonation Audit', () => {
    it('should log all actions during impersonation', async () => {
      // 1. Start impersonation
      // 2. Perform multiple actions
      // 3. End impersonation
      // 4. Verify all actions in audit log with impersonation context
    });
  });
});
```

---

#### Chat Processing Integration Tests
**File:** `apps/api/src/__tests__/integration/chat.test.ts`
**Related Tasks:** 9.2.4
**User Stories:** US-012, US-013, US-014

**Test Cases:**

```typescript
describe('Chat Processing Integration', () => {
  describe('Time Entry via Chat', () => {
    it('should create time entry from natural language', async () => {
      // 1. Login as user
      const token = await loginUser('user@client.com', 'password');

      // 2. Send chat message
      const chatRes = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'I worked 3 hours on Project Alpha today' });
      expect(chatRes.status).toBe(200);

      // 3. Verify time entry was created
      const entries = await getTimeEntries(token);
      expect(entries).toHaveLength(1);
      expect(entries[0].duration).toBe(3);
      expect(entries[0].project.name).toBe('Project Alpha');
    });

    it('should handle ambiguous input with clarification', async () => {
      // 1. Send ambiguous message
      // 2. Verify system asks for clarification
      // 3. Provide clarification
      // 4. Verify time entry created
    });
  });

  describe('Timer Control via Chat', () => {
    it('should start and stop timer via chat', async () => {
      // 1. Send "start timer for Project X"
      // 2. Verify timer is running
      // 3. Send "stop timer"
      // 4. Verify timer stopped and time entry created
    });
  });

  describe('Query via Chat', () => {
    it('should retrieve time data via natural language query', async () => {
      // 1. Create several time entries
      // 2. Send query "show my time this week"
      // 3. Verify response contains correct data
    });
  });
});
```

---

### Frontend Integration Tests

#### Authentication Flow Tests
**File:** `apps/web/src/__tests__/integration/auth.test.tsx`
**Related Tasks:** 9.2.5
**User Stories:** US-001, US-003, US-009

**Test Cases:**

```typescript
describe('Frontend Authentication Flow', () => {
  it('should complete registration → verification → login flow', async () => {
    // 1. Render registration form
    // 2. Fill form and submit
    // 3. Verify email sent message
    // 4. Click verification link
    // 5. Verify redirect to login
    // 6. Login
    // 7. Verify redirect to dashboard
  });

  it('should persist session across page refreshes', async () => {
    // 1. Login
    // 2. Reload page
    // 3. Verify still logged in
  });

  it('should logout and clear tokens', async () => {
    // 1. Login
    // 2. Click logout
    // 3. Verify redirect to login
    // 4. Verify cannot access protected routes
  });
});
```

---

#### Chat Integration Tests
**File:** `apps/web/src/__tests__/integration/chat.test.tsx`
**Related Tasks:** 9.2.6
**User Stories:** US-010, US-011, US-012

**Test Cases:**

```typescript
describe('Chat Interface Integration', () => {
  it('should send message and display response', async () => {
    // 1. Render chat interface
    // 2. Type message
    // 3. Click send
    // 4. Verify message appears
    // 5. Verify response appears
  });

  it('should create time entry and show confirmation', async () => {
    // 1. Send time entry message
    // 2. Verify confirmation message
    // 3. Verify time entry appears in list
  });

  it('should load conversation history on mount', async () => {
    // 1. Create conversation history
    // 2. Reload chat interface
    // 3. Verify history is loaded
  });
});
```

---

## End-to-End Testing

E2E tests verify complete user workflows using a real browser.

### E2E Test Setup
**Tool:** Playwright or Cypress
**Related Tasks:** 9.3.1

**Configuration:**
```typescript
// playwright.config.ts
export default {
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'Chrome', use: { browserName: 'chromium' } },
    { name: 'Firefox', use: { browserName: 'firefox' } },
    { name: 'Safari', use: { browserName: 'webkit' } },
  ],
};
```

---

### Critical User Journeys

#### E2E-001: New User Registration and First Time Entry
**File:** `e2e/user-registration.spec.ts`
**Related Tasks:** 9.3.2
**User Stories:** US-001, US-002, US-003, US-012

**Test Steps:**
```typescript
test('New user can register and log first time entry', async ({ page }) => {
  // 1. Navigate to registration page
  await page.goto('/register');

  // 2. Fill registration form
  await page.fill('input[name="name"]', 'John Doe');
  await page.fill('input[name="email"]', 'john@example.com');
  await page.fill('input[name="password"]', 'Test123!');
  await page.fill('input[name="confirmPassword"]', 'Test123!');
  await page.click('button[type="submit"]');

  // 3. Verify email sent message
  await expect(page.locator('text=Verification email sent')).toBeVisible();

  // 4. Get verification link from test email
  const verificationLink = await getVerificationLinkFromEmail('john@example.com');
  await page.goto(verificationLink);

  // 5. Verify account activated message
  await expect(page.locator('text=Account activated')).toBeVisible();

  // 6. Login
  await page.fill('input[name="email"]', 'john@example.com');
  await page.fill('input[name="password"]', 'Test123!');
  await page.click('button[type="submit"]');

  // 7. Verify redirect to chat interface
  await expect(page).toHaveURL('/chat');

  // 8. Send time entry message
  await page.fill('textarea[placeholder="Type a message"]', 'I worked 3 hours on onboarding today');
  await page.press('textarea', 'Enter');

  // 9. Verify confirmation
  await expect(page.locator('text=Logged 3 hours')).toBeVisible({ timeout: 5000 });

  // 10. Navigate to time entries
  await page.click('a[href="/time-entries"]');

  // 11. Verify entry appears
  await expect(page.locator('table tbody tr')).toHaveCount(1);
  await expect(page.locator('text=3 hours')).toBeVisible();
});
```

---

#### E2E-002: Admin User Management
**File:** `e2e/admin-user-management.spec.ts`
**Related Tasks:** 9.3.3
**User Stories:** US-026, US-027, US-028, US-029

**Test Steps:**
```typescript
test('Admin can create, edit, and deactivate user', async ({ page }) => {
  // 1. Login as admin
  await loginAsAdmin(page);

  // 2. Navigate to user management
  await page.click('a[href="/admin/users"]');

  // 3. Click Create User
  await page.click('button:has-text("Create User")');

  // 4. Fill user form
  await page.fill('input[name="name"]', 'Jane Smith');
  await page.fill('input[name="email"]', 'jane@example.com');
  await page.selectOption('select[name="role"]', 'user');
  await page.fill('input[name="password"]', 'TempPass123!');
  await page.click('button[type="submit"]');

  // 5. Verify user appears in list
  await expect(page.locator('text=Jane Smith')).toBeVisible();

  // 6. Edit user
  await page.click('button[data-user-email="jane@example.com"][aria-label="Edit"]');
  await page.fill('input[name="name"]', 'Jane Doe');
  await page.click('button[type="submit"]');

  // 7. Verify updated name
  await expect(page.locator('text=Jane Doe')).toBeVisible();

  // 8. Deactivate user
  await page.click('button[data-user-email="jane@example.com"][aria-label="Deactivate"]');
  await page.click('button:has-text("Confirm")');

  // 9. Verify user marked as inactive
  await expect(page.locator('tr:has-text("Jane Doe") .status')).toHaveText('Inactive');
});
```

---

#### E2E-003: Admin Impersonation
**File:** `e2e/admin-impersonation.spec.ts`
**Related Tasks:** 9.3.4
**User Stories:** US-038, US-039, US-041

**Test Steps:**
```typescript
test('Admin can impersonate user and return to admin dashboard', async ({ page }) => {
  // 1. Login as admin
  await loginAsAdmin(page);

  // 2. Navigate to users
  await page.click('a[href="/admin/users"]');

  // 3. Click "Sign in as" for a user
  await page.click('button[data-user-id="user-123"]:has-text("Sign in as")');

  // 4. Verify redirected to chat interface
  await expect(page).toHaveURL('/chat');

  // 5. Verify impersonation banner visible
  await expect(page.locator('.impersonation-banner')).toBeVisible();
  await expect(page.locator('text=Viewing as Test User')).toBeVisible();

  // 6. Perform action as user (create time entry)
  await page.fill('textarea', 'Log 2 hours for testing');
  await page.press('textarea', 'Enter');
  await expect(page.locator('text=Logged 2 hours')).toBeVisible({ timeout: 5000 });

  // 7. Exit impersonation
  await page.click('button:has-text("Exit Impersonation")');

  // 8. Verify back on admin dashboard
  await expect(page).toHaveURL('/admin');

  // 9. Verify no longer impersonating
  await expect(page.locator('.impersonation-banner')).not.toBeVisible();
});
```

---

#### E2E-004: Time Tracking Workflow
**File:** `e2e/time-tracking.spec.ts`
**Related Tasks:** 9.3.5
**User Stories:** US-012, US-013, US-018, US-019, US-020

**Test Steps:**
```typescript
test('User can track time via chat, timer, and manual entry', async ({ page }) => {
  // 1. Login as user
  await loginAsUser(page);

  // === Chat-based time entry ===
  // 2. Send chat message
  await page.fill('textarea', 'I worked 3 hours on Project Alpha today');
  await page.press('textarea', 'Enter');
  await expect(page.locator('text=Logged 3 hours')).toBeVisible({ timeout: 5000 });

  // === Timer-based time entry ===
  // 3. Start timer
  await page.fill('textarea', 'Start timer for Project Beta');
  await page.press('textarea', 'Enter');
  await expect(page.locator('.timer-running')).toBeVisible();

  // 4. Wait 2 seconds
  await page.waitForTimeout(2000);

  // 5. Stop timer
  await page.fill('textarea', 'Stop timer');
  await page.press('textarea', 'Enter');
  await expect(page.locator('.timer-running')).not.toBeVisible();

  // === Manual time entry ===
  // 6. Navigate to time entries
  await page.click('a[href="/time-entries"]');

  // 7. Click New Entry
  await page.click('button:has-text("New Entry")');

  // 8. Fill form
  await page.selectOption('select[name="project"]', 'Project Gamma');
  await page.fill('input[name="duration"]', '4');
  await page.fill('input[name="date"]', '2025-01-01');
  await page.fill('textarea[name="description"]', 'Manual entry test');
  await page.click('button[type="submit"]');

  // 9. Verify all three entries appear
  await expect(page.locator('table tbody tr')).toHaveCount(3);
});
```

---

#### E2E-005: Reporting and Analytics
**File:** `e2e/reporting.spec.ts`
**Related Tasks:** 9.3.6
**User Stories:** US-043, US-044, US-045, US-046

**Test Steps:**
```typescript
test('Admin can view and export reports', async ({ page }) => {
  // 1. Login as admin
  await loginAsAdmin(page);

  // 2. Navigate to reports
  await page.click('a[href="/admin/reports"]');

  // 3. Select date range
  await page.fill('input[name="startDate"]', '2025-01-01');
  await page.fill('input[name="endDate"]', '2025-01-31');
  await page.click('button:has-text("Apply Filter")');

  // 4. Verify charts display
  await expect(page.locator('.chart-container')).toBeVisible();

  // 5. View project breakdown
  await page.click('tab:has-text("By Project")');
  await expect(page.locator('table tbody tr')).toHaveCount.greaterThan(0);

  // 6. Export to CSV
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("Export CSV")'),
  ]);
  expect(download.suggestedFilename()).toContain('.csv');

  // 7. View dashboard overview
  await page.click('a[href="/admin/dashboard"]');
  await expect(page.locator('.metric-card')).toHaveCount(4); // Total hours, active users, etc.
});
```

---

#### E2E-006: Security and Permissions
**File:** `e2e/security.spec.ts`
**Related Tasks:** 9.3.7
**User Stories:** US-028, US-037, US-040

**Test Steps:**
```typescript
test('Permissions are enforced correctly', async ({ page }) => {
  // 1. Login as regular user
  await loginAsUser(page);

  // 2. Attempt to access admin page
  await page.goto('/admin/users');

  // 3. Verify redirected to unauthorized page
  await expect(page).toHaveURL('/unauthorized');

  // 4. Logout and login as admin
  await page.click('button:has-text("Logout")');
  await loginAsAdmin(page);

  // 5. Access admin page successfully
  await page.goto('/admin/users');
  await expect(page).toHaveURL('/admin/users');

  // 6. Start impersonation
  await page.click('button[data-user-id="user-123"]:has-text("Sign in as")');

  // 7. Attempt restricted action (password change)
  await page.goto('/profile/security');
  await page.fill('input[name="newPassword"]', 'NewPass123!');
  await page.click('button:has-text("Change Password")');

  // 8. Verify error message
  await expect(page.locator('text=restricted during impersonation')).toBeVisible();
});
```

---

## Security Testing

### Authentication Security Tests
**Related Tasks:** 9.4.1
**User Stories:** US-001, US-003, US-005, US-006

**Test Cases:**

1. **Password Strength Enforcement**
   - Verify weak passwords are rejected
   - Test all password requirements (length, complexity)
   - Verify dictionary words rejected

2. **Brute Force Protection**
   - Test account lockout after 5 failed login attempts
   - Verify lockout duration (30 minutes)
   - Test rate limiting on login endpoint

3. **Session Security**
   - Verify tokens expire correctly (access: 15 min, refresh: 7 days)
   - Test refresh token rotation
   - Verify token reuse detection
   - Test session invalidation on logout
   - Test session invalidation on password change

4. **2FA Security**
   - Verify TOTP codes expire after 30 seconds
   - Test backup codes are single-use
   - Verify 2FA cannot be disabled without password

---

### Authorization Security Tests
**Related Tasks:** 9.4.2
**User Stories:** US-033, US-035, US-037

**Test Cases:**

1. **Permission Enforcement**
   - Test users can only access resources they have permission for
   - Verify explicit deny rules override allow rules
   - Test capability inheritance (if implemented)

2. **Multi-Tenant Isolation**
   - Verify users cannot access other clients' data
   - Test client database isolation
   - Verify admin can only manage users in own client
   - Test super admin can access all clients

3. **Impersonation Security**
   - Verify only users with 'admin.impersonate' capability can impersonate
   - Test restricted actions during impersonation
   - Verify cannot impersonate super admin
   - Test impersonation session timeout (4 hours)

---

### Input Validation & Injection Tests
**Related Tasks:** 9.4.3

**Test Cases:**

1. **SQL Injection**
   - Test common SQL injection patterns in all inputs
   - Verify Prisma ORM prevents SQL injection
   - Test parameterized queries

2. **XSS (Cross-Site Scripting)**
   - Test script injection in chat messages
   - Verify HTML is sanitized in user inputs
   - Test stored XSS in time entry descriptions

3. **Command Injection**
   - Test command injection in file uploads (if implemented)
   - Verify input sanitization for shell commands

4. **LDAP/NoSQL Injection**
   - If using Redis or other NoSQL, test injection patterns

---

### API Security Tests
**Related Tasks:** 9.4.4

**Test Cases:**

1. **CORS Configuration**
   - Verify CORS headers are correctly set
   - Test unauthorized origins are rejected

2. **Rate Limiting**
   - Test rate limits are enforced
   - Verify different limits for different endpoints
   - Test rate limit headers are present

3. **HTTPS Enforcement**
   - Verify HTTP requests redirect to HTTPS (production)
   - Test HSTS headers

4. **Security Headers**
   - Verify CSP (Content Security Policy) header
   - Verify X-Content-Type-Options header
   - Verify X-Frame-Options header
   - Verify X-XSS-Protection header

---

### Data Security Tests
**Related Tasks:** 9.4.5

**Test Cases:**

1. **Sensitive Data Exposure**
   - Verify passwords are hashed (never stored plaintext)
   - Test password hashes are not returned in API responses
   - Verify JWT private key is not exposed
   - Test error messages don't leak sensitive info

2. **Encryption**
   - Verify JWT tokens use RS256 (asymmetric encryption)
   - Test refresh tokens are securely stored
   - Verify 2FA secrets are encrypted at rest

---

## Performance Testing

### Load Testing
**Related Tasks:** 9.5.1
**Tool:** k6 or Artillery

**Scenarios:**

1. **Baseline Load**
   - Concurrent users: 100
   - Duration: 10 minutes
   - Expected: Response time < 500ms, 0% errors

2. **Peak Load**
   - Concurrent users: 500
   - Duration: 5 minutes
   - Expected: Response time < 1s, < 1% errors

3. **Stress Test**
   - Gradual ramp up to 1000 users
   - Duration: 15 minutes
   - Expected: Identify breaking point

**Example k6 Script:**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
  },
};

export default function () {
  // Login
  let loginRes = http.post('http://localhost:4000/api/auth/login', {
    email: 'user@example.com',
    password: 'password',
  });
  check(loginRes, { 'login successful': (r) => r.status === 200 });

  let token = loginRes.json('accessToken');

  // Create time entry
  let entryRes = http.post('http://localhost:4000/api/time-entries',
    JSON.stringify({
      projectId: 'proj-123',
      duration: 3,
      date: '2025-01-01',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  check(entryRes, { 'entry created': (r) => r.status === 201 });

  sleep(1);
}
```

---

### Database Performance Tests
**Related Tasks:** 9.5.2

**Test Cases:**

1. **Query Performance**
   - Test complex queries with large datasets (10k+ records)
   - Verify indexes are used correctly
   - Test N+1 query problems
   - Measure query execution time

2. **Connection Pool Performance**
   - Test connection acquisition time
   - Verify connection reuse
   - Test pool saturation handling

3. **Multi-Tenant Performance**
   - Test with 100+ client databases
   - Measure connection overhead
   - Test cleanup of stale connections

---

### Frontend Performance Tests
**Related Tasks:** 9.5.3
**Tool:** Lighthouse, WebPageTest

**Metrics:**

1. **Core Web Vitals**
   - LCP (Largest Contentful Paint): < 2.5s
   - FID (First Input Delay): < 100ms
   - CLS (Cumulative Layout Shift): < 0.1

2. **Load Time**
   - First Contentful Paint: < 1.5s
   - Time to Interactive: < 3.5s
   - Total Bundle Size: < 200KB (gzipped)

3. **Runtime Performance**
   - Chat message render time: < 100ms
   - Scroll performance: 60fps
   - Search/filter response: < 200ms

---

## Test Environments

### Local Development
- **Purpose:** Developer testing during development
- **Database:** Local PostgreSQL with test data
- **Redis:** Local Redis instance
- **Seed Data:** Minimal test data (5 users, 10 projects, 50 time entries)

### CI/CD Environment
- **Purpose:** Automated testing on every commit
- **Database:** Ephemeral PostgreSQL instance (Docker)
- **Redis:** Ephemeral Redis instance (Docker)
- **Seed Data:** Automated seeding before tests
- **Isolation:** Each test run gets fresh database

### Staging Environment
- **Purpose:** Pre-production testing with production-like data
- **Database:** Staging PostgreSQL with sanitized production data
- **Redis:** Staging Redis instance
- **Seed Data:** Sanitized copy of production data (anonymized)

### Production Environment
- **Purpose:** Smoke tests after deployment
- **Database:** Production database (read-only tests)
- **Tests:** Non-destructive smoke tests only
- **Monitoring:** Synthetic monitoring with uptime checks

---

## Test Data Management

### Test Data Strategy
**Related Tasks:** 9.1.1 - 9.3.7

1. **Factories**
   - Use test factories to generate test data
   - Ensure realistic data (valid emails, names, etc.)
   - Support different scenarios (active/inactive users, locked entries, etc.)

**Example Factory:**
```typescript
// factories/UserFactory.ts
export class UserFactory {
  static create(overrides?: Partial<User>): User {
    return {
      id: faker.datatype.uuid(),
      email: faker.internet.email(),
      name: faker.name.fullName(),
      clientId: 'default-client-id',
      passwordHash: hashPassword('Test123!'),
      emailVerified: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides?: Partial<User>): User[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}
```

2. **Database Seeding**
   - Seed script for development database
   - Seed script for CI/CD environment
   - Idempotent seeding (can run multiple times)

3. **Test Cleanup**
   - Use transactions that rollback after each test
   - Or truncate tables after each test suite
   - Clean up uploaded files/resources

---

## CI/CD Integration

### GitHub Actions Workflow
**Related Tasks:** 10.1.5
**File:** `.github/workflows/test.yml`

```yaml
name: Test Suite

on:
  push:
    branches: [ main, dev-* ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: freetimechat_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Generate Prisma Client
        run: pnpm prisma generate

      - name: Run database migrations
        run: pnpm prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/freetimechat_test

      - name: Seed test database
        run: pnpm prisma db seed

      - name: Run unit tests
        run: pnpm test:unit

      - name: Run integration tests
        run: pnpm test:integration

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Generate coverage report
        run: pnpm test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: ./test-results
```

---

## Coverage Requirements

### Overall Coverage Targets
- **Unit Tests:** 80% minimum coverage
- **Integration Tests:** 70% minimum coverage
- **E2E Tests:** Cover all critical user journeys
- **Overall:** 80% code coverage

### Critical Path Coverage (90% minimum)
- Authentication flow (login, register, 2FA)
- Authorization checks (permissions, capabilities)
- Multi-tenant database routing
- Impersonation flow
- Time entry creation

### Coverage Tools
- **Backend:** Jest with Istanbul
- **Frontend:** Jest with React Testing Library
- **E2E:** Playwright test coverage

### Coverage Reports
- Generate on every CI/CD run
- Upload to Codecov or similar service
- Block PR merge if coverage drops below threshold

---

## Testing Checklist

### Before Each Commit
- [ ] Run unit tests (`pnpm test:unit`)
- [ ] Run linter (`pnpm lint`)
- [ ] Check TypeScript compilation (`pnpm build`)

### Before Each PR
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests for affected features pass
- [ ] Code coverage meets minimum threshold
- [ ] No new security vulnerabilities (run `pnpm audit`)
- [ ] Manual testing of changed features

### Before Each Release
- [ ] All tests pass (unit + integration + E2E)
- [ ] Security tests pass
- [ ] Performance tests pass (no regression)
- [ ] Smoke tests on staging environment
- [ ] Manual QA of all critical user journeys
- [ ] Database migration tested on staging
- [ ] Rollback plan tested

### Continuous Monitoring (Production)
- [ ] Synthetic monitoring active (uptime checks)
- [ ] Error tracking configured (Sentry or similar)
- [ ] Performance monitoring (APM)
- [ ] Log aggregation and alerting
- [ ] Security scanning (Dependabot, Snyk)

---

## Testing Best Practices

1. **Write Tests First (TDD)**: For critical features, write tests before implementation
2. **Keep Tests Independent**: Each test should be able to run in isolation
3. **Use Descriptive Names**: Test names should describe what they test
4. **Test One Thing**: Each test should verify one specific behavior
5. **Mock External Dependencies**: Use mocks for external APIs, email services, etc.
6. **Clean Up After Tests**: Always clean up test data to prevent test pollution
7. **Test Edge Cases**: Don't just test the happy path
8. **Keep Tests Fast**: Unit tests should run in milliseconds, not seconds
9. **Review Test Code**: Test code should be reviewed just like production code
10. **Update Tests with Code**: When requirements change, update tests immediately

---

**Document Version:** 1.0
**Last Updated:** 2025-11-04
**Maintained By:** Development Team
