# User Roles Guide

This guide explains the three user roles in AfricAI Digital Books, from least to
most authority.

---

## 1. User (Basic User)

The standard role for all authenticated users within a tenant.

### Access & Capabilities

**Dashboard & Core Features:**

- View personal dashboard with time tracking summary
- Access AI chat for natural language time entry
- View conversation history

**Time Management:**

- Create, edit, and delete personal time entries
- View personal time tracking reports
- Track time against assigned projects

**Projects & Tasks:**

- View projects assigned to them
- Create and manage personal tasks
- Log time against tasks

**Profile & Settings:**

- Update personal profile information
- Change password
- Enable/disable two-factor authentication
- Configure personal preferences

### Restrictions

- Cannot access any admin pages
- Cannot view other users' data
- Cannot modify tenant settings
- Cannot manage users, roles, or permissions
- Cannot access accounting features (invoices, payments, bills)
- Cannot view audit logs

---

## 2. Tenant Admin

A user with elevated privileges to manage their organization's tenant.

### Additional Access (Beyond User Role)

**User Management:**

- View all users within the tenant
- Invite new users to the tenant
- Approve or reject account requests
- Assign users to projects
- Deactivate user accounts within the tenant

**Business Management:**

- **Projects**: Create, edit, delete, and manage all projects
- **Clients**: Manage client records and relationships
- **Products**: Create and manage product/service catalog

**Account Receivables:**

- **Invoices**: Create, send, edit, and void invoices
- **Payments**: Record and track customer payments
- **Discounts & Coupons**: Create promotional discounts

**Account Payables:**

- **Vendors**: Manage vendor records
- **Bills**: Create, approve, and pay vendor bills
- **Bill Payments**: Record payments to vendors

**Tenant Configuration:**

- **Tenant Settings**: Configure organization settings including:
  - Invoice address and contact information
  - Currency and invoice numbering
  - Logo and branding
  - Payment method configuration (Stripe, PayPal)
  - Navigation customization
- **Integrations**: Configure third-party integrations
- **LLM Settings**: Configure AI assistant preferences

**Reports & Analytics:**

- View all time entries across the tenant
- Generate financial reports
- Access business analytics

### Restrictions

- Cannot access system-wide settings
- Cannot manage other tenants
- Cannot create or modify roles
- Cannot create or modify capabilities/permissions
- Cannot view system audit logs
- Cannot impersonate users

---

## 3. Admin (System Administrator)

The highest authority level with full system access.

### Additional Access (Beyond Tenant Admin Role)

**System-Wide User Management:**

- Access and manage users across ALL tenants
- View and process account requests for all tenants
- Impersonate any user for support purposes
- Full user lifecycle management

**Tenant Management:**

- Create new tenants
- Edit tenant configurations
- View all tenant details and databases
- Manage tenant subscriptions and limits

**Access Control (RBAC):**

- **Roles**: Create, edit, and delete roles
- **Capabilities**: Create, edit, and delete capabilities/permissions
- **Role-Capability Assignment**: Assign capabilities to roles with allow/deny
  permissions
- Configure permission inheritance

**System Configuration:**

- **System Settings**: Global platform configuration
- Configure system-wide defaults
- Manage feature flags

**Monitoring & Audit:**

- **Audit Logs**: View complete audit trail of all system changes
- Monitor system health
- Track security events
- View impersonation session history

**Navigation Access:**

Admins have exclusive access to these navigation sections:

- **Access Control Section**: Roles, Capabilities
- **System Settings** (under Configuration)
- **Audit Log** (under Monitoring)

### Admin-Only Pages

The following pages are restricted to Admin role only (not Tenant Admin):

- `/admin/account-requests` - System-wide account requests
- `/admin/tenants` - Tenant management
- `/admin/roles` - Role management
- `/admin/roles/[id]` - Role detail and capability assignment
- `/admin/capabilities` - Capability management
- `/admin/audit` - Audit log viewer

---

## Role Comparison Summary

| Feature                  | User | Tenant Admin | Admin |
| ------------------------ | ---- | ------------ | ----- |
| Personal time tracking   | Yes  | Yes          | Yes   |
| AI chat                  | Yes  | Yes          | Yes   |
| Personal profile         | Yes  | Yes          | Yes   |
| View all tenant users    | No   | Yes          | Yes   |
| Manage tenant users      | No   | Yes          | Yes   |
| Manage projects/clients  | No   | Yes          | Yes   |
| Invoicing & payments     | No   | Yes          | Yes   |
| Bills & vendors          | No   | Yes          | Yes   |
| Tenant settings          | No   | Yes          | Yes   |
| Manage other tenants     | No   | No           | Yes   |
| Create/edit roles        | No   | No           | Yes   |
| Create/edit capabilities | No   | No           | Yes   |
| View audit logs          | No   | No           | Yes   |
| Impersonate users        | No   | No           | Yes   |
| System settings          | No   | No           | Yes   |

---

## Navigation Structure by Role

### User Navigation

- Dashboard
- Chat
- Time Tracking
- Profile
- Settings

### Tenant Admin Navigation (Additional Sections)

- **Business**: Projects, Clients
- **Account Receivables**: Invoices, Payments, Products, Discounts, Coupons
- **Account Payables**: Vendors, Bills, Bill Payments
- **Users**: Users, Account Requests (tenant only)
- **Configuration**: Tenant Settings, Integrations, LLM Settings

### Admin Navigation (Additional Sections)

- **Users**: Account Requests (system-wide), Tenants
- **Access Control**: Roles, Capabilities
- **Configuration**: System Settings
- **Monitoring**: Audit Log

---

## Role Assignment

### Default Role

New users are assigned the **User** role by default upon registration or
invitation.

### Promoting to Tenant Admin

System Admins can promote users to Tenant Admin by:

1. Navigating to the user's profile
2. Assigning the `tenantadmin` role

### Promoting to Admin

Only existing Admins can promote users to Admin role. This should be done
sparingly and only for trusted personnel who need system-wide access.

---

## Security Considerations

### Principle of Least Privilege

- Assign users the minimum role required for their responsibilities
- Regularly audit role assignments
- Remove elevated access when no longer needed

### Admin Role Precautions

- Limit the number of Admin accounts
- Enable two-factor authentication for all Admins
- Monitor audit logs for Admin actions
- Use impersonation instead of sharing credentials for support

### Tenant Admin Responsibilities

- Regularly review user access within their tenant
- Process account requests promptly
- Maintain accurate tenant settings for invoicing
- Monitor time entries and project assignments

---

## Best Practices

1. **Start with User role** - Only escalate when necessary
2. **Document role changes** - Keep records of who approved promotions
3. **Regular access reviews** - Quarterly review of elevated permissions
4. **Separate concerns** - Consider multiple Tenant Admins for different
   functions
5. **Training** - Ensure users understand their role capabilities and
   limitations

---

## Technical Implementation

For developers, role checking is implemented as follows:

```typescript
// Check for Admin role (system administrator)
const isAdmin =
  user?.roles?.some((role) => role?.toLowerCase() === 'admin') ||
  user?.role?.toLowerCase() === 'admin';

// Check for Tenant Admin role
const isTenantAdmin =
  user?.roles?.some((role) => role?.toLowerCase() === 'tenantadmin') ||
  user?.role?.toLowerCase() === 'tenantadmin';

// Check for admin-level access (either Admin or Tenant Admin)
const hasAdminAccess = isAdmin || isTenantAdmin;
```

### API Route Protection

Routes are protected with middleware that validates:

1. Authentication (valid JWT token)
2. Authorization (role-based access)
3. Tenant context (for multi-tenant data isolation)

See
[Authentication & Authorization Guide](./authentication-authorization-guide.md)
for implementation details.
