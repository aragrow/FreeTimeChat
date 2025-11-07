# Role-Based 2FA Grace Period Implementation

## Overview

Implemented role-based Two-Factor Authentication (2FA) grace periods with
automatic account deactivation for users who fail to enable 2FA within the
allowed timeframe.

## Requirements

- **Admin and CustomerAdmin roles**: 2 hours from first login to enable 2FA
- **Regular users**: 10 days from first login to enable 2FA
- **Automatic deactivation**: Accounts are automatically deactivated if 2FA is
  not enabled within the grace period

## Implementation Details

### 1. Role-Based Grace Period Calculation

Created a new private method `calculateRoleBasedGracePeriod()` in
[auth.service.ts](../apps/api/src/services/auth.service.ts):

```typescript
private calculateRoleBasedGracePeriod(roles: string[]): Date {
  const now = new Date();

  // Check if user has admin or customeradmin role
  const hasAdminRole = roles.some(
    (role) => role.toLowerCase() === 'admin' || role.toLowerCase() === 'customeradmin'
  );

  if (hasAdminRole) {
    // 2 hours for admin and customeradmin
    return new Date(now.getTime() + 2 * 60 * 60 * 1000);
  }

  // 10 days for regular users
  return new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
}
```

### 2. Grace Period Setup on First Login

Modified the `login()` method to automatically set the grace period when a user
logs in for the first time:

```typescript
// Set 2FA grace period on first login
if (!user.lastLoginAt && !user.twoFactorGracePeriodEndsAt) {
  const gracePeriodEndDate = this.calculateRoleBasedGracePeriod(roles);
  await this.prisma.user.update({
    where: { id: user.id },
    data: { twoFactorGracePeriodEndsAt: gracePeriodEndDate },
  });
  // Update user object with new grace period
  user.twoFactorGracePeriodEndsAt = gracePeriodEndDate;
}
```

### 3. Grace Period Enforcement

Added grace period expiration check in the `login()` method that automatically
deactivates accounts:

```typescript
// Check if 2FA grace period has expired
if (!user.twoFactorEnabled && user.twoFactorGracePeriodEndsAt) {
  const now = new Date();
  if (now > user.twoFactorGracePeriodEndsAt) {
    // Grace period expired, deactivate account
    await this.prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    throw new Error(
      `Account deactivated: 2FA must be enabled within the grace period. Please contact your administrator to reactivate your account.`
    );
  }
}
```

### 4. Registration Flow Update

Updated the `register()` method to use role-based grace periods instead of the
global security settings:

```typescript
// Get user's roles (or assign default role)
const roles = await this.userService.getUserRoles(user.id);
const role = roles.length > 0 ? roles[0] : 'user';

// Calculate role-based 2FA grace period
const gracePeriodEndDate = this.calculateRoleBasedGracePeriod(
  roles.length > 0 ? roles : ['user']
);

// Set 2FA grace period for new user
await this.prisma.user.update({
  where: { id: user.id },
  data: { twoFactorGracePeriodEndsAt: gracePeriodEndDate },
});
```

## Database Schema

The implementation uses the existing `twoFactorGracePeriodEndsAt` field in the
User model:

```prisma
model User {
  // ... other fields
  twoFactorEnabled           Boolean           @default(false) @map("two_factor_enabled")
  twoFactorSecret            String?           @map("two_factor_secret")
  twoFactorGracePeriodEndsAt DateTime?         @map("two_factor_grace_period_ends_at")
  isActive                   Boolean           @default(true) @map("is_active")
  lastLoginAt                DateTime?         @map("last_login_at")
  // ... other fields
}
```

## Workflow

### First Login (New User)

1. User successfully authenticates with email/password
2. System checks if this is first login (`lastLoginAt` is null)
3. System checks user's roles
4. Grace period is calculated based on role:
   - Admin/CustomerAdmin: Current time + 2 hours
   - Regular users: Current time + 10 days
5. Grace period end date is stored in `twoFactorGracePeriodEndsAt`
6. User receives access token and can use the system

### Subsequent Logins (Within Grace Period)

1. User successfully authenticates with email/password
2. System checks if 2FA is enabled
3. If 2FA not enabled, checks grace period:
   - If grace period not expired: Login succeeds
   - If grace period expired: Account deactivated, login fails

### After Grace Period Expires

1. User attempts to login
2. System detects grace period expired and 2FA not enabled
3. Account is automatically deactivated (`isActive = false`)
4. Login fails with clear error message
5. User must contact administrator to reactivate account

## Security Benefits

1. **Enforces 2FA adoption**: Users must enable 2FA within a reasonable
   timeframe
2. **Role-based security**: Higher-privilege roles (admin, customeradmin) have
   shorter grace periods
3. **Automatic enforcement**: No manual intervention required to enforce the
   policy
4. **Clear communication**: Users receive explicit error messages about why
   their account was deactivated
5. **Admin control**: Administrators can reactivate accounts after users enable
   2FA

## User Experience

### For Regular Users

- 10 days to enable 2FA after first login
- Ample time to set up 2FA without disruption
- Clear messaging if grace period expires

### For Admin/CustomerAdmin Users

- 2 hours to enable 2FA after first login
- Stricter requirement due to elevated privileges
- Forces immediate 2FA setup for security-critical accounts

## Testing Considerations

To test the grace period enforcement:

1. **Create test users with different roles**:
   - Regular user (10-day grace period)
   - Admin user (2-hour grace period)
   - CustomerAdmin user (2-hour grace period)

2. **Manually adjust grace period in database** for immediate testing:

   ```sql
   -- Set grace period to expire in 1 minute
   UPDATE users
   SET two_factor_grace_period_ends_at = NOW() + INTERVAL '1 minute'
   WHERE email = 'test@example.com';
   ```

3. **Verify account deactivation**:
   - Wait for grace period to expire
   - Attempt login
   - Confirm account is deactivated
   - Check error message

4. **Test reactivation**:
   - Have admin reactivate account
   - User enables 2FA
   - User can login successfully

## Files Modified

- [apps/api/src/services/auth.service.ts](../apps/api/src/services/auth.service.ts) -
  Main implementation
- [apps/api/prisma/schema-main.prisma](../apps/api/prisma/schema-main.prisma) -
  Schema (no changes, uses existing field)

## Related Features

- [2FA Setup Flow](./2fa-setup.md) (if exists)
- [User Management](./user-management.md) (if exists)
- [Security Settings](./security-settings.md) (if exists)

## Future Enhancements

1. **Configurable grace periods**: Allow administrators to customize grace
   periods per role
2. **Email notifications**: Send warning emails before grace period expires
3. **Grace period extensions**: Allow administrators to extend grace periods for
   specific users
4. **Audit logging**: Log all grace period-related events for compliance
