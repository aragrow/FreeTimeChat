# FreeTimeChat - Default Admin Credentials

## 👤 Admin Account

After running the seed script, you can login with:

| Field | Value |
|-------|-------|
| **Email** | admin@freetimechat.local |
| **Password** | 0pen@2025 |
| **Role** | Admin (full permissions) |
| **Client** | FreeTimeChat |

## 🌱 Seeding the Database

To create the admin user and seed the database:

```bash
cd apps/api
pnpm seed
```

This will create:
- ✓ Default client (FreeTimeChat)
- ✓ Admin user with all permissions
- ✓ Admin role with 28 capabilities
- ✓ All RBAC capabilities (users, roles, projects, time-entries, etc.)

## 🔐 Capabilities Included

The admin user has access to all capabilities:

### User Management
- `users:read` - View users
- `users:create` - Create users
- `users:update` - Update users
- `users:delete` - Delete users

### Role Management
- `roles:read` - View roles
- `roles:create` - Create roles
- `roles:update` - Update roles
- `roles:delete` - Delete roles

### Project Management
- `projects:read` - View projects
- `projects:create` - Create projects
- `projects:update` - Update projects
- `projects:delete` - Delete projects

### Time Entry Management
- `time-entries:read` - View time entries
- `time-entries:create` - Create time entries
- `time-entries:update` - Update time entries
- `time-entries:delete` - Delete time entries

### Task Management
- `tasks:read` - View tasks
- `tasks:create` - Create tasks
- `tasks:update` - Update tasks
- `tasks:delete` - Delete tasks

### Conversation Management
- `conversations:read` - View conversations
- `conversations:create` - Create conversations
- `conversations:delete` - Delete conversations

### Reports & Analytics
- `reports:read` - View reports
- `reports:export` - Export reports

### Admin Functions
- `admin:impersonate` - Impersonate users
- `admin:audit-logs` - View audit logs
- `admin:system-settings` - Manage system settings

## 🚀 Login

Once the database is seeded, you can login at:

**http://localhost:3000/login**

Use the credentials above to access the admin dashboard.

---

**⚠️ Security Note**: This is a default development account. In production:
1. Change the password immediately after first login
2. Create individual admin accounts for each team member
3. Disable or remove the default admin account
4. Use strong, unique passwords
5. Enable two-factor authentication

---

**Last Updated**: 2025-11-05
