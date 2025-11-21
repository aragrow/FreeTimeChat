# Development Data Seeder

## Overview

The development data seeder (`seed-dev-data.ts`) creates comprehensive,
realistic test data for development and testing purposes.

## What It Creates

### System Administrator

- **1 Main System Admin**
  - Email: `sysadmin@dev.local`
  - Password: `SysAdmin@2025`
  - Full system access to all tenants

### Tenants (5 Total)

Each tenant includes:

1. **Acme Corporation** (`acme-corp`)
2. **Global Tech Solutions** (`global-tech`)
3. **Pacific Industries** (`pacific-ind`)
4. **Sunrise Enterprises** (`sunrise-ent`)
5. **Meridian Group** (`meridian-group`)

### Per Tenant Data

**Users:**

- 1 Tenant Admin (`admin@{tenant}.dev.local`, Password: `Admin@2025`)
- 3-5 Regular Users (`user1-5@{tenant}.dev.local`, Password: `User@2025`)

**Client Database (per tenant):**

- 8-15 Clients (companies)
- 2-5 Projects per Client
- 10-20 Time Entries per Project

### Total Data Volume

- **1 System Admin** - access to everything
- **5 Tenant Admins** - 1 per tenant
- **15-25 Regular Users** - 3-5 per tenant
- **40-75 Clients** - 8-15 per tenant
- **80-375 Projects** - 2-5 per client
- **800-7,500 Time Entries** - 10-20 per project

## Data Characteristics

### Deterministic

- Uses a seeded random number generator (seed: 12345)
- **Same data every time you run it**
- Perfect for consistent testing and development

### Realistic

- Uses real-looking names, companies, cities
- Proper address formatting
- Realistic hourly rates and project timelines
- Varied currencies and localization settings

### Isolated

- **Does NOT affect existing data**
- Only creates/deletes users with `@dev.local` emails
- Only manages specific dev tenant slugs
- Your production/test data remains untouched

## Usage

### Prerequisites

1. Run the main seeder first (creates roles and capabilities):

   ```bash
   cd apps/api
   pnpm seed
   ```

2. Ensure PostgreSQL is running (Docker):

   ```bash
   docker-compose up -d
   ```

3. Create tenant databases manually (or use provisioning endpoint):

   ```bash
   # Connect to postgres
   docker-compose exec postgres psql -U freetimechat -d postgres

   # Create databases for each tenant
   CREATE DATABASE freetimechat_acme_corp;
   CREATE DATABASE freetimechat_global_tech;
   CREATE DATABASE freetimechat_pacific_ind;
   CREATE DATABASE freetimechat_sunrise_ent;
   CREATE DATABASE freetimechat_meridian_group;

   # Exit
   \q
   ```

4. Push Prisma schemas to tenant databases:
   ```bash
   # For each tenant, push the client schema
   CLIENT_DATABASE_URL="postgresql://freetimechat:freetimechat_dev_password@localhost:5432/freetimechat_acme_corp" pnpm prisma:push:client
   CLIENT_DATABASE_URL="postgresql://freetimechat:freetimechat_dev_password@localhost:5432/freetimechat_global_tech" pnpm prisma:push:client
   CLIENT_DATABASE_URL="postgresql://freetimechat:freetimechat_dev_password@localhost:5432/freetimechat_pacific_ind" pnpm prisma:push:client
   CLIENT_DATABASE_URL="postgresql://freetimechat:freetimechat_dev_password@localhost:5432/freetimechat_sunrise_ent" pnpm prisma:push:client
   CLIENT_DATABASE_URL="postgresql://freetimechat:freetimechat_dev_password@localhost:5432/freetimechat_meridian_group" pnpm prisma:push:client
   ```

### Running the Seeder

```bash
cd apps/api
pnpm seed:dev
```

### Re-running the Seeder

The seeder can be run multiple times safely:

```bash
pnpm seed:dev
```

It will:

1. Delete all existing dev data (`@dev.local` users and dev tenants)
2. Recreate everything from scratch
3. Generate the same deterministic data

## Credentials

### System Admin

```
Email: sysadmin@dev.local
Password: SysAdmin@2025
Access: All tenants
```

### Tenant Admins

```
acme-corp:        admin@acme-corp.dev.local       | Admin@2025
global-tech:      admin@global-tech.dev.local     | Admin@2025
pacific-ind:      admin@pacific-ind.dev.local     | Admin@2025
sunrise-ent:      admin@sunrise-ent.dev.local     | Admin@2025
meridian-group:   admin@meridian-group.dev.local  | Admin@2025
```

### Regular Users

```
{tenant}:  user1@{tenant}.dev.local  | User@2025
           user2@{tenant}.dev.local  | User@2025
           user3@{tenant}.dev.local  | User@2025
           user4@{tenant}.dev.local  | User@2025
           user5@{tenant}.dev.local  | User@2025
```

## Tenant Configurations

| Tenant                | Currency | Language | Date Format | Timezone            |
| --------------------- | -------- | -------- | ----------- | ------------------- |
| Acme Corporation      | USD      | en       | MM/DD/YYYY  | America/New_York    |
| Global Tech Solutions | EUR      | en       | DD/MM/YYYY  | Europe/London       |
| Pacific Industries    | USD      | en       | MM/DD/YYYY  | America/Los_Angeles |
| Sunrise Enterprises   | GBP      | en       | DD/MM/YYYY  | Europe/London       |
| Meridian Group        | CAD      | en       | YYYY-MM-DD  | America/Toronto     |

## Testing Multi-Tenancy

The seeder is perfect for testing:

1. **Tenant Isolation**: Each tenant has separate data in their own database
2. **Cross-Tenant Access**: System admin can access all tenants
3. **Role-Based Access**: Different roles (admin, tenantadmin, user)
4. **Localization**: Different currencies, date formats, timezones
5. **Impersonation**: Admins can impersonate users within their scope

## Cleanup

To remove all development data:

```bash
pnpm seed:dev
# This will clean and recreate all dev data

# Or manually delete:
psql -U freetimechat -d freetimechat_main -c "DELETE FROM users WHERE email LIKE '%@dev.local'"
```

## Safety Features

✅ **Only affects dev data** - Filters by `@dev.local` emails and specific
tenant slugs ✅ **Deterministic** - Same data every run for consistent testing
✅ **Isolated** - Separate databases per tenant ✅ **Documented** - Clear
credentials and structure

## Troubleshooting

### "Main seed data not found" Error

**Solution**: Run the main seeder first:

```bash
pnpm seed
```

### Database Connection Errors

**Solution**: Ensure PostgreSQL is running and tenant databases exist:

```bash
docker-compose up -d
# Then create tenant databases as shown in Prerequisites
```

### "Cannot find module" Errors

**Solution**: Generate Prisma clients:

```bash
pnpm prisma:generate
```

## Development Workflow

1. **Initial Setup**:

   ```bash
   docker-compose up -d
   pnpm seed           # Main seeder (roles, capabilities, system admin)
   pnpm seed:dev       # Dev data (tenants, users, clients, projects)
   ```

2. **Reset Dev Data**:

   ```bash
   pnpm seed:dev       # Cleans and recreates all dev data
   ```

3. **Start Development**:

   ```bash
   pnpm dev
   ```

4. **Test Features**:
   - Login as system admin to see all tenants
   - Login as tenant admin to manage their tenant
   - Login as regular user to use the app
   - Test impersonation, RBAC, multi-tenancy, etc.

## Notes

- The seeder uses `localhost` PostgreSQL URLs (modify if your setup differs)
- Data generation uses pools of realistic names, companies, cities
- Time entries have random dates within project timelines
- 80% of time entries are marked as billable
- Hourly rates range from $50-150 per hour
- Compensation types are randomly assigned (HOURLY/SALARY)

## Future Enhancements

Possible additions for the seeder:

- [ ] Invoice generation
- [ ] Payment records
- [ ] Task creation with different statuses
- [ ] Conversation and message history
- [ ] Product catalog
- [ ] Vendor records
- [ ] Expense records
- [ ] Discount and coupon rules

---

**Generated for**: FreeTimeChat Development **Version**: 1.0 **Last Updated**:
2025-01-06
