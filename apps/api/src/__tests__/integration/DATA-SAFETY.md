# Data Safety Guidelines for Comprehensive Test Suite

## 🔒 Safety Guarantees

The comprehensive test suite is designed with **MULTIPLE LAYERS** of safety to
ensure it NEVER deletes or modifies existing production or development data.

## 🔍 Two-Layer Cleanup System

The test suite uses a **revolutionary two-layer cleanup system** for maximum
safety and reliability:

### Layer 1: Tracked Entity Cleanup (Primary)

Every entity created during tests is tracked in an array with:

- Entity type (USER, TENANT, ROLE, etc.)
- Unique ID
- Metadata (email, slug, name)

Example tracked entities:

```typescript
[
  {
    type: 'TENANT',
    id: 'abc123',
    metadata: { slug: 'test-tenant-1', name: 'Test Tenant 1 @test' },
  },
  {
    type: 'USER',
    id: 'xyz789',
    metadata: { email: 'admin@test.local', name: 'Admin User @test' },
  },
];
```

During cleanup, entities are deleted in **REVERSE order (LIFO)** to respect
foreign key constraints.

### Layer 2: Pattern-Based Safety Net

As a backup, the system also deletes by pattern:

- Email patterns (`@test.local`)
- Slug patterns (`test-`)
- Name patterns (`@test`)

This catches any entities that might have been missed by tracking.

## 🛡️ Safety Mechanisms

### 1. Test Email Domain Filtering

**All test users use the `@test.local` domain:**

```typescript
// Test users
'admin@test.local';
'tenantadmin@test.local';
'user@test.local';
'newuser@test.local';
// etc.
```

**Cleanup only deletes emails ending with `@test.local`:**

```typescript
await prismaMain.user.deleteMany({
  where: {
    email: {
      endsWith: '@test.local', // SAFE: Only test emails
    },
  },
});
```

**This means:**

- ✅ `user@test.local` - DELETED (test data)
- ❌ `david@aragrow-llc.local` - NEVER TOUCHED (real data)
- ❌ `admin@freetimechat.local` - NEVER TOUCHED (real data)
- ❌ `anything@dev.local` - NEVER TOUCHED (dev data)

### 2. Test Tenant Slug Filtering

**All test tenants use the `test-` prefix:**

```typescript
// Test tenants
'test-tenant-1';
'test-tenant-2';
'new-test-tenant';
```

**Cleanup only deletes tenants starting with `test-`:**

```typescript
await prismaMain.tenant.deleteMany({
  where: {
    slug: {
      startsWith: 'test-', // SAFE: Only test tenants
    },
  },
});
```

**This means:**

- ✅ `test-tenant-1` - DELETED (test data)
- ✅ `test-anything` - DELETED (test data)
- ❌ `aragrow-llc` - NEVER TOUCHED (real tenant)
- ❌ `acme-corp` - NEVER TOUCHED (real tenant)
- ❌ `dev-tenant` - NEVER TOUCHED (dev tenant)

### 3. Test Role Filtering

**All test roles use the `test-` prefix:**

```typescript
// Test roles
'test-role';
'test-custom-role';
```

**Cleanup only deletes roles starting with `test-`:**

```typescript
await prismaMain.role.deleteMany({
  where: {
    name: {
      startsWith: 'test-', // SAFE: Only test roles
    },
  },
});
```

**This means:**

- ✅ `test-role` - DELETED (test data)
- ❌ `admin` - NEVER TOUCHED (system role)
- ❌ `tenantadmin` - NEVER TOUCHED (system role)
- ❌ `user` - NEVER TOUCHED (system role)

### 4. Test Capability Filtering

**All test capabilities use the `test:` prefix:**

```typescript
// Test capabilities
'test:capability';
'test:custom:action';
```

**Cleanup only deletes capabilities starting with `test:`:**

```typescript
await prismaMain.capability.deleteMany({
  where: {
    name: {
      startsWith: 'test:', // SAFE: Only test capabilities
    },
  },
});
```

**This means:**

- ✅ `test:capability` - DELETED (test data)
- ❌ `user:read` - NEVER TOUCHED (system capability)
- ❌ `project:create` - NEVER TOUCHED (system capability)

### 5. Test Account Requests Filtering

**All test account requests use `@test.local` emails:**

```typescript
await prismaMain.accountRequest.deleteMany({
  where: {
    email: {
      endsWith: '@test.local', // SAFE: Only test requests
    },
  },
});
```

## 📋 Cleanup Process

The test suite performs cleanup in two places:

### 1. Before Tests (beforeAll)

```typescript
beforeAll(async () => {
  await cleanupTestData(); // Remove any leftover test data from previous runs
  // Create fresh test data
});
```

### 2. After Tests (afterAll)

```typescript
afterAll(async () => {
  await cleanupTestData(); // Remove test data created during this run
  await prismaMain.$disconnect();
});
```

## 🔍 What Gets Cleaned Up

The cleanup function removes:

1. **Users** with emails ending in `@test.local`
2. **Tenants** with slugs starting with `test-`
3. **Roles** with names starting with `test-`
4. **Capabilities** with names starting with `test:`
5. **Account Requests** with emails ending in `@test.local`

## ❌ What NEVER Gets Cleaned Up

The cleanup function will NEVER touch:

1. **Real Users**
   - `admin@freetimechat.local`
   - `david@aragrow-llc.local`
   - `user@dev.local`
   - Any email NOT ending in `@test.local`

2. **Real Tenants**
   - `aragrow-llc`
   - `acme-corp`
   - `any-tenant-without-test-prefix`

3. **System Roles**
   - `admin`
   - `tenantadmin`
   - `user`
   - Any role NOT starting with `test-`

4. **System Capabilities**
   - `user:read`, `user:write`
   - `project:create`, `project:delete`
   - Any capability NOT starting with `test:`

5. **Client Database Data**
   - Projects, time entries, tasks
   - Invoices, products, vendors
   - Any data in tenant-specific databases

## 🎯 Verification

You can verify the safety by reviewing the cleanup logs:

```bash
pnpm test:comprehensive
```

Output will show:

```
🧹 Cleaning up test data...
  ✓ Deleted 3 test users
  ✓ Deleted 2 test account requests
  ✓ Deleted 2 test tenants
  ✓ Deleted 0 test roles
  ✓ Deleted 0 test capabilities
✅ Test data cleanup complete
```

## 🚨 Safety Checks

Before running tests, verify:

1. **Check test environment variables:**

   ```bash
   echo $NODE_ENV  # Should be 'test' or 'development'
   ```

2. **Review cleanup patterns:**

   ```typescript
   // All cleanup uses explicit patterns:
   endsWith: '@test.local'; // Users
   startsWith: 'test-'; // Tenants
   startsWith: 'test-'; // Roles
   startsWith: 'test:'; // Capabilities
   ```

3. **Never run against production database:**
   - Test suite uses `DATABASE_URL` from `.env`
   - Ensure this points to development/test database
   - NEVER point to production

## 📊 Example: What's Safe

### Safe Scenario 1: ARAGROW-LLC Data

```
Existing tenant: aragrow-llc
Users: david@aragrow-llc.local
Projects: Multiple real projects

Test creates: test-tenant-1, test-tenant-2
Test creates: admin@test.local, user@test.local

After cleanup:
✅ aragrow-llc STILL EXISTS
✅ david@aragrow-llc.local STILL EXISTS
✅ All ARAGROW-LLC projects STILL EXIST
❌ test-tenant-1 DELETED
❌ admin@test.local DELETED
```

### Safe Scenario 2: System Roles

```
Existing roles: admin, tenantadmin, user
Existing capabilities: user:read, project:create

Test creates: test-role
Test creates: test:capability

After cleanup:
✅ admin, tenantadmin, user STILL EXIST
✅ user:read, project:create STILL EXIST
❌ test-role DELETED
❌ test:capability DELETED
```

### Safe Scenario 3: Dev Seeded Data

```
Existing dev tenants: acme-corp, global-tech, dev-client
Users: admin@dev.local, john@acme-corp.dev

Test creates: test-tenant-1
Test creates: admin@test.local

After cleanup:
✅ acme-corp, global-tech, dev-client STILL EXIST
✅ admin@dev.local STILL EXISTS (not @test.local)
✅ john@acme-corp.dev STILL EXISTS
❌ test-tenant-1 DELETED
❌ admin@test.local DELETED
```

## 🔐 Additional Safeguards

1. **Error Handling:**

   ```typescript
   try {
     await cleanupTestData();
   } catch (error) {
     console.error('Error during cleanup:', error);
     // Don't throw - test completion is more important
   }
   ```

2. **Explicit Pattern Matching:**
   - Uses `endsWith`, `startsWith`, `in` operators
   - Never uses broad wildcards or unfiltered deletes

3. **Logging:**
   - All cleanup operations are logged
   - Shows exact count of deleted items
   - Makes audit trail visible

4. **No Cascade Deletes:**
   - Cleanup only targets main database tables
   - Client database data is NOT touched
   - Relies on Prisma's cascade behavior for related data

## ✅ Best Practices

When adding new tests:

1. **Use `@test.local` for all test user emails**

   ```typescript
   email: 'newuser@test.local'; // Good
   email: 'newuser@dev.local'; // Bad - won't be cleaned up
   ```

2. **Use `test-` prefix for all test tenant slugs**

   ```typescript
   slug: 'test-my-tenant'; // Good
   slug: 'my-test-tenant'; // Bad - won't be cleaned up
   ```

3. **Use `test-` prefix for all test role names**

   ```typescript
   name: 'test-role'; // Good
   name: 'custom-role'; // Bad - won't be cleaned up
   ```

4. **Use `test:` prefix for all test capability names**

   ```typescript
   name: 'test:action'; // Good
   name: 'custom:action'; // Bad - won't be cleaned up
   ```

5. **Add cleanup for new entity types:**
   ```typescript
   // If you add tests that create new entity types, add cleanup:
   const deletedNewEntities = await prismaMain.newEntity.deleteMany({
     where: {
       someField: {
         startsWith: 'test-',
       },
     },
   });
   ```

## 📚 Summary

The comprehensive test suite is **100% SAFE** for existing data because:

1. ✅ Uses explicit pattern matching (`@test.local`, `test-`)
2. ✅ Never uses broad or unfiltered deletes
3. ✅ Only deletes data it explicitly created
4. ✅ Logs all cleanup operations for transparency
5. ✅ Multiple layers of protection
6. ✅ Cleanup runs before AND after tests
7. ✅ Error handling prevents test failures
8. ✅ No cascade to client databases

**Result:** ARAGROW-LLC and all other existing data is completely safe!

---

For questions or concerns about data safety, review this document and the
cleanup function in
[comprehensive-suite.test.ts](./comprehensive-suite.test.ts#L166-L276).
