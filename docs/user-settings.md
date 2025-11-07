# User Settings Documentation

This document describes the user settings functionality in FreeTimeChat,
including profile preferences, security settings, and the user menu interface.

## Overview

The user settings system allows users to manage their account preferences,
communication settings, and security options through an intuitive dropdown menu
interface. Settings are divided into two main categories:

1. **Profile Settings**: Communication preferences, notifications, and account
   recovery
2. **Security Settings**: Password management and two-factor authentication

## Table of Contents

- [User Menu Component](#user-menu-component)
- [Profile Settings](#profile-settings)
- [Security Settings](#security-settings)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Role-Based 2FA Grace Periods](#role-based-2fa-grace-periods)

## User Menu Component

### Location

- **Component**: `apps/web/src/components/ui/UserMenu.tsx`
- **Integration**: `apps/web/src/app/admin/layout.tsx`

### Features

- **Hover-activated dropdown menu**
- Displays user avatar with initials
- Shows user's full name and email
- Provides quick access to:
  - Profile settings
  - Security settings
  - Logout function

### User Experience

- Menu appears when hovering over the user's name/email in the sidebar
- Menu disappears when mouse leaves the area
- Links navigate to respective settings pages
- Logout button immediately ends the session

### Implementation Details

```typescript
// UserMenu Component Structure
<div onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
  {/* User Info Trigger */}
  <div className="w-10 h-10 rounded-full bg-blue-500">
    {/* User Initials */}
  </div>

  {/* Dropdown Menu (visible on hover) */}
  {isOpen && (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg">
      <Link href="/settings/profile">Profile</Link>
      <Link href="/settings/security">Security</Link>
      <button onClick={onLogout}>Logout</button>
    </div>
  )}
</div>
```

## Profile Settings

### Location

**Page**: `apps/web/src/app/settings/profile/page.tsx`

### Features

#### 1. Communication Medium Selection

Choose how you want to receive notifications:

- **Email** (default): Receive notifications via email
- **SMS**: Receive notifications via text message
- **Both**: Receive notifications via both email and SMS
- **None**: Do not send notifications (not recommended)

**API Field**: `communicationMedium` **Allowed Values**: `email`, `sms`, `both`,
`none`

#### 2. Notification Frequency

Control how often you receive notifications about user activity:

- **Immediate** (default): Receive notifications as soon as events occur
- **Hourly Digest**: Receive a summary once per hour
- **Daily Digest**: Receive a daily summary
- **Weekly Digest**: Receive a weekly summary

**API Field**: `notificationFrequency` **Allowed Values**: `immediate`,
`hourly`, `daily`, `weekly`

#### 3. Account Recovery

Add a secondary email address for account recovery:

- **Primary Email**: Your main account email (read-only, displayed for
  reference)
- **Secondary Email** (optional): Alternative email for password reset and
  account recovery

**API Field**: `secondaryEmail` **Validation**: Valid email format required

### User Flow

1. User hovers over their name in the sidebar
2. Clicks "Profile" in the dropdown menu
3. Views current profile settings
4. Modifies desired settings
5. Clicks "Save Changes"
6. Receives success/error message
7. Settings are updated in the database

### Validation

**Client-side validation**:

- Email format validation for secondary email
- Required field checks

**Server-side validation**:

- Communication medium must be one of: `email`, `sms`, `both`, `none`
- Notification frequency must be one of: `immediate`, `hourly`, `daily`,
  `weekly`
- Secondary email must match regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

## Security Settings

### Location

**Page**: `apps/web/src/app/settings/security/page.tsx`

### Features

#### 1. Password Change

Securely change your account password:

**Required Fields**:

- **Current Password**: For verification
- **New Password**: Must be at least 8 characters
- **Confirm New Password**: Must match new password

**Validation**:

- Minimum 8 characters
- Current password must be correct
- New password and confirmation must match
- New password must meet security requirements

**Process**:

1. User enters current password
2. User enters new password twice
3. Client-side validation checks password requirements
4. Server verifies current password hash
5. Server validates new password strength
6. Server updates password hash
7. User receives confirmation message

#### 2. Two-Factor Authentication (2FA)

**Enable 2FA Process**:

1. Click "Enable 2FA" button
2. Server generates TOTP secret
3. QR code is displayed
4. User scans QR code with authenticator app (Google Authenticator, Authy, etc.)
5. Manual secret code shown as fallback option
6. User enters 6-digit verification code from app
7. Server validates code
8. 2FA is enabled on the account

**Disable 2FA Process**:

1. User confirms they want to disable 2FA
2. Server disables 2FA for the account
3. User receives confirmation message

**2FA Status Badge**:

- **Green "Enabled"**: 2FA is active
- **Gray "Disabled"**: 2FA is not active

### Security Tips

The security page displays helpful security tips:

- Use a unique password that you don't use for other accounts
- Enable two-factor authentication for additional security
- Never share your password or 2FA codes with anyone
- Review your account activity regularly
- Use a password manager to generate and store strong passwords

## API Endpoints

### Profile Settings Endpoints

#### GET /api/v1/user/profile/settings

Fetch the current user's profile settings.

**Authentication**: Required (JWT token)

**Response**:

```json
{
  "status": "success",
  "data": {
    "communicationMedium": "email",
    "notificationFrequency": "immediate",
    "secondaryEmail": "backup@example.com"
  }
}
```

**Status Codes**:

- `200 OK`: Settings retrieved successfully
- `401 Unauthorized`: No valid authentication token
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

#### PUT /api/v1/user/profile/settings

Update the current user's profile settings.

**Authentication**: Required (JWT token)

**Request Body**:

```json
{
  "communicationMedium": "both",
  "notificationFrequency": "daily",
  "secondaryEmail": "backup@example.com"
}
```

**Response**:

```json
{
  "status": "success",
  "message": "Profile settings updated successfully",
  "data": {
    "communicationMedium": "both",
    "notificationFrequency": "daily",
    "secondaryEmail": "backup@example.com"
  }
}
```

**Validation Errors**:

```json
{
  "status": "error",
  "message": "Invalid communication medium"
}
```

**Status Codes**:

- `200 OK`: Settings updated successfully
- `400 Bad Request`: Validation error
- `401 Unauthorized`: No valid authentication token
- `500 Internal Server Error`: Server error

### Security Settings Endpoints

#### GET /api/v1/user/security/settings

Fetch the current user's security settings.

**Authentication**: Required (JWT token)

**Response**:

```json
{
  "status": "success",
  "data": {
    "twoFactorEnabled": true,
    "twoFactorGracePeriodEndsAt": "2025-01-15T10:00:00.000Z",
    "lastLoginAt": "2025-01-07T14:30:00.000Z"
  }
}
```

**Status Codes**:

- `200 OK`: Settings retrieved successfully
- `401 Unauthorized`: No valid authentication token
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

#### POST /api/v1/user/password/change

Change the current user's password.

**Authentication**: Required (JWT token)

**Request Body**:

```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Response (Success)**:

```json
{
  "status": "success",
  "message": "Password changed successfully"
}
```

**Response (Error - Wrong Current Password)**:

```json
{
  "status": "error",
  "message": "Current password is incorrect"
}
```

**Response (Error - Weak Password)**:

```json
{
  "status": "error",
  "message": "Invalid password: Password must be at least 8 characters long"
}
```

**Status Codes**:

- `200 OK`: Password changed successfully
- `400 Bad Request`: Missing fields or weak password
- `401 Unauthorized`: No valid authentication token or wrong current password
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

## Database Schema

### User Model Fields

The following fields were added to the `User` model in
`apps/api/prisma/schema-main.prisma`:

```prisma
model User {
  // ... existing fields

  communicationMedium        String?           @default("email") @map("communication_medium")
  notificationFrequency      String?           @default("immediate") @map("notification_frequency")
  secondaryEmail             String?           @map("secondary_email")

  // ... rest of fields
}
```

**Field Details**:

| Field                   | Type      | Default       | Description                        | Allowed Values                           |
| ----------------------- | --------- | ------------- | ---------------------------------- | ---------------------------------------- |
| `communicationMedium`   | `String?` | `"email"`     | Preferred communication channel    | `email`, `sms`, `both`, `none`           |
| `notificationFrequency` | `String?` | `"immediate"` | How often to receive notifications | `immediate`, `hourly`, `daily`, `weekly` |
| `secondaryEmail`        | `String?` | `null`        | Backup email for account recovery  | Valid email format                       |

**Database Column Names**:

- `communication_medium` (snake_case in database)
- `notification_frequency` (snake_case in database)
- `secondary_email` (snake_case in database)

## Role-Based 2FA Grace Periods

### Overview

FreeTimeChat implements role-based grace periods for enabling two-factor
authentication (2FA). Different user roles have different time limits to enable
2FA after their first login.

### Grace Period Rules

| Role               | Grace Period | Description                                                         |
| ------------------ | ------------ | ------------------------------------------------------------------- |
| **Admin**          | 2 hours      | Administrators have 2 hours from first login to enable 2FA          |
| **CustomerAdmin**  | 2 hours      | Customer administrators have 2 hours from first login to enable 2FA |
| **User** (regular) | 10 days      | Regular users have 10 days from first login to enable 2FA           |

### Implementation Details

**Location**: `apps/api/src/services/auth.service.ts`

#### Grace Period Calculation

```typescript
private calculateRoleBasedGracePeriod(roles: string[]): Date {
  const now = new Date();
  const hasAdminRole = roles.some(
    (role) => role.toLowerCase() === 'admin' || role.toLowerCase() === 'customeradmin'
  );

  if (hasAdminRole) {
    return new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
  }
  return new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days
}
```

#### Grace Period Assignment

Grace periods are automatically set on a user's **first login**:

```typescript
// In login method - Set grace period on first login
if (!user.lastLoginAt && !user.twoFactorGracePeriodEndsAt) {
  const gracePeriodEndDate = this.calculateRoleBasedGracePeriod(roles);
  await this.prisma.user.update({
    where: { id: user.id },
    data: { twoFactorGracePeriodEndsAt: gracePeriodEndDate },
  });
}
```

#### Grace Period Enforcement

During login, the system checks if the grace period has expired:

```typescript
// Check if grace period expired
if (!user.twoFactorEnabled && user.twoFactorGracePeriodEndsAt) {
  const now = new Date();
  if (now > user.twoFactorGracePeriodEndsAt) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });
    throw new Error(
      'Account deactivated: 2FA must be enabled within the grace period. Please contact your administrator to reactivate your account.'
    );
  }
}
```

### User Experience

1. **First Login**:
   - User logs in for the first time
   - System calculates grace period based on user's role
   - Grace period end date is stored in database
   - User sees a warning about enabling 2FA

2. **Subsequent Logins (Within Grace Period)**:
   - User can log in normally
   - Warning message reminds them to enable 2FA
   - Countdown shows time remaining

3. **Login After Grace Period Expired**:
   - User attempts to log in
   - System detects expired grace period
   - Account is automatically deactivated
   - Error message: "Account deactivated: 2FA must be enabled within the grace
     period. Please contact your administrator to reactivate your account."
   - Admin must manually reactivate the account

4. **2FA Enabled**:
   - User enables 2FA within grace period
   - Grace period check is bypassed
   - User can log in normally with 2FA

### Security Benefits

- **Enforced Security**: Ensures all users enable 2FA
- **Role-Based**: Higher-privilege roles (admin, customeradmin) must enable 2FA
  faster
- **Automatic Enforcement**: No manual intervention needed
- **Clear Messaging**: Users understand why their account was deactivated

### Administrative Tasks

**Reactivating Deactivated Accounts**:

Administrators can reactivate accounts that were deactivated due to grace period
expiration:

1. Navigate to User Management
2. Find the deactivated user
3. Click "Activate" button
4. User's `isActive` field is set to `true`
5. User can log in again
6. Grace period is still active; user must enable 2FA

**Extending Grace Periods**:

Administrators can extend grace periods if needed:

1. Access database directly (via Prisma Studio or SQL)
2. Update `twoFactorGracePeriodEndsAt` field
3. Set new expiration date/time
4. Save changes

## Frontend Implementation

### File Structure

```
apps/web/src/
├── app/
│   ├── admin/
│   │   └── layout.tsx              # UserMenu integration
│   └── settings/
│       ├── profile/
│       │   └── page.tsx            # Profile settings page
│       └── security/
│           └── page.tsx            # Security settings page
├── components/
│   └── ui/
│       └── UserMenu.tsx            # Hover-activated dropdown menu
└── hooks/
    └── useCapabilities.ts          # Capability checking hook
```

### State Management

**Profile Settings State**:

```typescript
const [formData, setFormData] = useState({
  communicationMedium: 'email',
  notificationFrequency: 'immediate',
  secondaryEmail: '',
});
```

**Security Settings State**:

```typescript
const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
const [showQRCode, setShowQRCode] = useState(false);
const [qrCodeData, setQRCodeData] = useState<{
  qrCode: string;
  secret: string;
} | null>(null);
const [verificationCode, setVerificationCode] = useState('');
const [passwordData, setPasswordData] = useState({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});
```

### API Integration

All settings pages use the `useAuth` hook to:

- Get authentication headers (`getAuthHeaders()`)
- Access current user information (`user`)
- Handle logout (`logout()`)

**Example API Call**:

```typescript
const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/user/profile/settings`,
  {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData),
  }
);
```

## Backend Implementation

### File Structure

```
apps/api/src/
├── routes/
│   ├── index.ts                    # Route registration
│   └── user/
│       ├── profile.routes.ts       # Profile endpoints
│       └── security.routes.ts      # Security endpoints
└── services/
    ├── auth.service.ts             # 2FA grace period logic
    └── password.service.ts         # Password hashing/validation
```

### Route Registration

In `apps/api/src/routes/index.ts`:

```typescript
import userProfileRoutes from './user/profile.routes';
import userSecurityRoutes from './user/security.routes';

// User profile and security routes
v1Router.use('/user/profile', userProfileRoutes);
v1Router.use('/user/security', userSecurityRoutes);
```

### Password Service Integration

The password change endpoint uses the password service for:

- **Validation**: `passwordService.validatePassword(newPassword)`
- **Hashing**: `passwordService.hash(newPassword)`
- **Verification**: `passwordService.verify(currentPassword, user.passwordHash)`

## Testing

### Manual Testing Checklist

**Profile Settings**:

- [ ] Load profile settings page
- [ ] Verify default values are loaded
- [ ] Change communication medium to each option
- [ ] Change notification frequency to each option
- [ ] Enter valid secondary email
- [ ] Enter invalid secondary email (should show error)
- [ ] Save changes successfully
- [ ] Verify changes persist after page reload

**Security Settings**:

- [ ] Load security settings page
- [ ] View current 2FA status
- [ ] Change password with correct current password
- [ ] Try changing password with wrong current password (should fail)
- [ ] Try changing password with weak password (should fail)
- [ ] Try changing password with mismatched confirmation (should fail)
- [ ] Enable 2FA successfully
- [ ] Scan QR code with authenticator app
- [ ] Verify 6-digit code
- [ ] Disable 2FA successfully

**User Menu**:

- [ ] Hover over user name in sidebar
- [ ] Verify menu appears
- [ ] Click "Profile" link (should navigate)
- [ ] Click "Security" link (should navigate)
- [ ] Click "Logout" button (should log out)
- [ ] Verify menu disappears when mouse leaves

**2FA Grace Periods**:

- [ ] Create new admin user
- [ ] Log in as new admin user
- [ ] Verify grace period is 2 hours
- [ ] Create new regular user
- [ ] Log in as new regular user
- [ ] Verify grace period is 10 days
- [ ] Wait for grace period to expire (or manually update database)
- [ ] Try logging in (should fail with account deactivated)
- [ ] Admin reactivates account
- [ ] User enables 2FA
- [ ] User can log in normally

## Troubleshooting

### Profile Settings Not Saving

**Symptoms**: Changes don't persist after clicking "Save Changes"

**Possible Causes**:

- Invalid authentication token
- Validation error (invalid email format, invalid enum values)
- Network error

**Solutions**:

1. Check browser console for errors
2. Verify authentication token is valid
3. Check network tab for API response
4. Ensure secondary email has valid format
5. Ensure communication medium and notification frequency are valid values

### 2FA QR Code Not Displaying

**Symptoms**: QR code is blank or not showing

**Possible Causes**:

- Server error generating secret
- Network error
- Image rendering issue

**Solutions**:

1. Check browser console for errors
2. Check network tab for API response
3. Try using manual secret code instead
4. Refresh the page and try again

### Password Change Fails

**Symptoms**: Error message when changing password

**Possible Causes**:

- Current password is incorrect
- New password doesn't meet requirements
- Passwords don't match

**Solutions**:

1. Verify current password is correct
2. Ensure new password is at least 8 characters
3. Ensure new password and confirmation match
4. Check for additional password requirements in error message

### Account Deactivated Due to Grace Period

**Symptoms**: User cannot log in, receives "Account deactivated" message

**Cause**: 2FA grace period expired without enabling 2FA

**Solution**:

1. Admin must reactivate the account in User Management
2. User must enable 2FA immediately after reactivation
3. User can then log in normally

## Related Documentation

- [2FA Grace Period Implementation](./2fa-grace-period-implementation.md) -
  Detailed 2FA grace period documentation
- [Authentication Flow](./.claude/authentication.md) - Complete authentication
  architecture
- [Authorization Flow](./.claude/authorization.md) - RBAC system documentation

## Change Log

### Version 1.0 (2025-01-07)

- Initial implementation of user settings
- Created UserMenu hover-activated dropdown component
- Implemented profile settings (communication medium, notification frequency,
  secondary email)
- Implemented security settings (password change, 2FA management)
- Added role-based 2FA grace periods (2 hours for admin/customeradmin, 10 days
  for users)
- Created API endpoints for profile and security settings
- Updated database schema with new User fields
- Added comprehensive documentation
