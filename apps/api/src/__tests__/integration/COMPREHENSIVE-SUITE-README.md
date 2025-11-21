# Comprehensive Test Suite Documentation

## 🔒 Data Safety First

**IMPORTANT: This test suite is 100% SAFE for your existing data!**

### 🔍 Revolutionary Two-Layer Cleanup System

**Layer 1: Entity Tracking (Primary)**

- Every entity created is tracked in an array
- Cleanup deletes in REVERSE order (LIFO) for foreign key safety
- Full audit trail of all creations and deletions

**Layer 2: Pattern Matching (Safety Net)**

- Catches any missed entities by pattern (@test.local, test-)
- Provides double safety guarantee

The test suite:

- ✅ **Tracks EVERY entity** created during tests
- ✅ **ONLY** deletes tracked entities OR entities with `@test.local` emails
- ✅ **ONLY** deletes tenants with `test-` prefix
- ✅ **Cleans up in LIFO order** to respect foreign keys
- ✅ **Full logging** of all operations

The test suite:

- ❌ **NEVER** touches `aragrow-llc` or any real tenant
- ❌ **NEVER** touches `david@aragrow-llc.local` or any real user
- ❌ **NEVER** touches system roles (admin, tenantadmin, user)
- ❌ **NEVER** touches client database data (projects, time entries, etc.)

**For complete documentation:**

- **[TRACKING-SYSTEM.md](./TRACKING-SYSTEM.md)** - How entity tracking works
- **[DATA-SAFETY.md](./DATA-SAFETY.md)** - Complete safety documentation

---

## Overview

The comprehensive test suite (`comprehensive-suite.test.ts`) is a complete
integration testing framework that tests **every single aspect** of the
FreeTimeChat application across all three user roles:

- **Admin** - Full system access including tenant management, system settings,
  and all features
- **TenantAdmin** - Tenant-scoped access to manage their organization
- **User** - Basic access to projects, time entries, tasks, and chat

## Test Coverage

### 1. Authentication Tests (Public Access)

- User registration with validation
- Login with credentials
- Token refresh mechanism
- Logout functionality
- Google OAuth integration
- Two-factor authentication (2FA)
- Account request creation

**Total Tests**: 12+ test cases

### 2. Admin Role Tests (Full System Access)

All administrative features including:

#### 2.1 Dashboard and Statistics

- System-wide statistics
- Tenant-filtered statistics
- Dashboard configuration

#### 2.2 Tenant Management

- List all tenants with pagination
- Create new tenants with admin user
- Get tenant by ID
- Update tenant information
- Activate/deactivate tenants
- Tenant statistics

#### 2.3 User Management

- List all users with filtering
- Create new users
- Get user by ID
- Update user information
- Activate/deactivate users
- User statistics

#### 2.4 Roles and Capabilities

- Manage RBAC roles
- Manage capabilities
- Assign roles to users

#### 2.5 Account Request Management

- View account requests
- Approve requests
- Reject requests

#### 2.6 System Settings

- View system configuration
- Update system settings

#### 2.7 Integration Templates

- Manage integration templates
- API configuration

#### 2.8 LLM Configuration

- OpenAI/LLM settings
- Model configuration

#### 2.9 PayPal Integration

- Payment integration status

#### 2.10 Impersonation

- Start/stop user impersonation
- Admin oversight

**Total Tests**: 40+ test cases

### 3. TenantAdmin Role Tests (Tenant-Scoped Access)

Tenant administrators can manage their organization:

#### 3.1 Tenant-Scoped Dashboard

- View their tenant's statistics only
- Cannot access other tenants

#### 3.2 Limited Tenant Management

- View only their own tenant
- Cannot create new tenants
- Data isolation enforced

#### 3.3 Tenant-Scoped User Management

- Manage users in their tenant only
- Cannot access other tenant users
- Create users in their tenant

#### 3.4 Tenant Settings

- Currency selection (170+ world currencies)
- Invoice configuration
- Localization settings

#### 3.5-3.16 Business Features (All Tenant-Scoped)

- Projects
- Clients
- Time Entries
- Invoices
- Products
- Vendors
- Expenses
- Bills
- Payment Terms
- Discounts and Coupons
- Reports
- Tasks

**Total Tests**: 35+ test cases

### 4. User Role Tests (Basic Access)

Regular users can access their assigned work:

#### 4.1 User Profile

- View own profile
- Update profile information

#### 4.2 User Security

- Change own password

#### 4.3 Projects

- View assigned projects
- No admin access

#### 4.4 Time Entries

- View own time entries
- Create time entries
- No admin access

#### 4.5 Tasks

- View assigned tasks
- Update task status

#### 4.6 Chat

- Create conversations
- Send messages
- View conversation history

#### 4.7 Reports

- View own reports

#### 4.8 No Access to Admin Features

- Explicitly tests that users CANNOT access:
  - User management
  - Tenant management
  - System settings
  - Roles and capabilities

**Total Tests**: 20+ test cases

### 5. Data Isolation Tests

Critical security tests ensuring:

- Tenants cannot see other tenant data
- Projects are isolated per tenant
- Clients are tenant-specific
- Time entries are tenant-scoped

**Total Tests**: 5+ test cases

### 6. Validation and Error Handling

Comprehensive error testing:

#### 6.1 Authentication Errors

- Missing tokens
- Invalid tokens
- Expired tokens

#### 6.2 Validation Errors

- Invalid email formats
- Missing required fields
- Invalid data types

#### 6.3 Not Found Errors

- Non-existent resources
- Non-existent routes

#### 6.4 Permission Errors

- Insufficient permissions
- Cross-tenant access attempts

#### 6.5 Duplicate and Conflict Errors

- Duplicate emails
- Duplicate tenant slugs

**Total Tests**: 15+ test cases

### 7. Performance and Pagination Tests

#### 7.1 Pagination

- User list pagination
- Project list pagination

#### 7.2 Filtering

- Filter by status
- Search functionality

#### 7.3 Sorting

- Sort by various fields

**Total Tests**: 6+ test cases

### 8. Health and Monitoring

- Health check endpoint
- Detailed health check
- API root information

**Total Tests**: 3+ test cases

## Total Test Coverage: 140+ Test Cases

## Running the Tests

### Run All Tests

```bash
cd apps/api
pnpm test:integration
```

### Run Only Comprehensive Suite

```bash
cd apps/api
pnpm jest comprehensive-suite
```

### Run Specific Section

```bash
# Run only authentication tests
pnpm jest comprehensive-suite -t "Authentication Flow"

# Run only admin tests
pnpm jest comprehensive-suite -t "Admin Role"

# Run only tenant admin tests
pnpm jest comprehensive-suite -t "TenantAdmin Role"

# Run only user tests
pnpm jest comprehensive-suite -t "User Role"
```

### Watch Mode

```bash
pnpm jest comprehensive-suite --watch
```

### Coverage Report

```bash
pnpm jest comprehensive-suite --coverage
```

## Test Data Setup

The test suite automatically:

1. **Creates test users** for each role:
   - `admin@test.local` - Full admin access
   - `tenantadmin@test.local` - Tenant admin access
   - `user@test.local` - Regular user access

2. **Creates test tenants**:
   - `test-tenant-1` - For tenant admin testing
   - `test-tenant-2` - For user testing

3. **Assigns roles** via RBAC system

4. **Generates auth tokens** for API requests

5. **Cleans up** all test data after completion

## Test Structure

Each test follows this pattern:

```typescript
describe('Feature Area', () => {
  it('should perform expected action', async () => {
    const response = await request(app)
      .get('/api/v1/endpoint')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
  });
});
```

## Key Features

### 1. Role-Based Testing

Tests verify that:

- Admins can access everything
- TenantAdmins can only access their tenant data
- Users can only access their assigned work
- Permission boundaries are enforced

### 2. Data Isolation Testing

Ensures multi-tenant architecture works correctly:

- Tenant A cannot see Tenant B's data
- Database-level isolation
- API-level access control

### 3. Comprehensive CRUD Testing

For each entity:

- ✅ Create
- ✅ Read (list and get by ID)
- ✅ Update
- ✅ Delete (where applicable)
- ✅ Filtering and pagination
- ✅ Validation

### 4. Error Path Testing

Tests all failure scenarios:

- Authentication failures
- Authorization failures
- Validation errors
- Not found errors
- Conflict errors

### 5. Security Testing

- Token validation
- Permission checks
- Data isolation
- Cross-tenant access prevention

## Continuous Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Comprehensive Tests
  run: |
    cd apps/api
    pnpm test:integration
```

## Maintenance

### Adding New Tests

When adding new features, add tests to the appropriate section:

1. Determine which role(s) can access the feature
2. Add tests to the relevant section (Admin, TenantAdmin, or User)
3. Add permission denial tests for roles that shouldn't have access
4. Add data isolation tests if the feature involves tenant data

### Example: Adding Invoice Tests

```typescript
describe('2.X Invoices (Admin)', () => {
  it('should get all invoices across all tenants', async () => {
    const response = await request(app)
      .get('/api/v1/admin/invoices')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
  });
});

describe('3.X Invoices (TenantAdmin)', () => {
  it('should get invoices in their tenant only', async () => {
    const response = await request(app)
      .get('/api/v1/admin/invoices')
      .set('Authorization', `Bearer ${tenantAdminToken}`);

    expect(response.status).toBe(200);
    // Verify tenant isolation
  });
});

describe('4.X Invoices (User)', () => {
  it('should NOT access invoices', async () => {
    const response = await request(app)
      .get('/api/v1/admin/invoices')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(403);
  });
});
```

## Troubleshooting

### Test Database Connection Fails

```bash
# Ensure PostgreSQL is running
docker-compose up -d postgres

# Run migrations
pnpm prisma:migrate:main
pnpm prisma:generate:main
```

### Test User Creation Fails

```bash
# Run database seed
pnpm prisma:seed:main
```

### Tests Timeout

Increase timeout in jest.config.js:

```javascript
testTimeout: 30000; // 30 seconds
```

### Permission Tests Fail

Verify roles exist in database:

```sql
SELECT * FROM role WHERE name IN ('admin', 'tenantadmin', 'user');
```

## Best Practices

1. **Always clean up test data** - Tests should be idempotent
2. **Use unique identifiers** - Avoid conflicts with existing data
3. **Test both success and failure paths** - Don't just test happy paths
4. **Verify data isolation** - Especially important for multi-tenant systems
5. **Keep tests independent** - Don't rely on test execution order
6. **Use meaningful test descriptions** - Make failures easy to understand

## Performance Considerations

The comprehensive suite runs **140+ tests**. To optimize:

1. **Run in parallel**: Jest runs tests in parallel by default
2. **Use test.only()** during development to run specific tests
3. **Split into smaller suites** if needed for CI/CD
4. **Use database transactions** where possible to speed up cleanup

## Contributing

When adding features to FreeTimeChat:

1. ✅ Add tests to comprehensive-suite.test.ts
2. ✅ Update this README with new test sections
3. ✅ Ensure all three role perspectives are tested
4. ✅ Add data isolation tests for tenant-scoped features
5. ✅ Run full suite before committing

## Related Documentation

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [FreeTimeChat API Documentation](../../README.md)
- [Authentication Flow](../auth-flow.test.ts)
- [Database Testing Helpers](../helpers/db-helpers.ts)

## Summary

The comprehensive test suite provides:

- ✅ Complete coverage of all menu options
- ✅ All three user roles tested (Admin, TenantAdmin, User)
- ✅ Authentication through chat and everything in between
- ✅ 140+ test cases covering success and failure paths
- ✅ Data isolation verification
- ✅ Permission boundary enforcement
- ✅ CRUD operation testing for all entities
- ✅ Error handling and validation
- ✅ Performance and pagination testing
- ✅ Security and access control testing

This test suite ensures the FreeTimeChat application works correctly and
securely across all user roles and feature areas.
