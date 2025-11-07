# FreeTimeChat

A modern time tracking application with a unique dual-interface architecture:

- **Users**: Interact via natural language chat interface
- **Admins**: Use traditional web dashboard for management

## Features

- 💬 Natural language time entry via chat
- 🔐 Secure authentication (JWT RS256, Google OAuth, 2FA)
- 👥 Role-based access control (RBAC) with explicit deny rules
- ⚙️ User settings with profile and security management
- 🔔 Configurable notification preferences (email, SMS, frequency)
- ⏰ Role-based 2FA grace periods (2h for admins, 10d for users)
- 🧠 Long-term conversation memory
- 📊 Comprehensive admin dashboard
- 🗄️ Multi-tenant database architecture (database-per-client)
- 🔒 Complete data isolation between clients
- 🚀 Full-stack TypeScript

## Tech Stack

### Frontend

- **Next.js 14+** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Server Components**

### Backend

- **Node.js + Express/Fastify**
- **TypeScript**
- **Prisma ORM**
- **PostgreSQL** with pgvector
- **Redis** for caching

### Authentication

- **JWT with RS256** (asymmetric encryption)
- **Google OAuth 2.0**
- **2FA with TOTP** (authenticator apps)
- **Refresh token rotation**

## Project Structure

```
FreeTimeChat/
├── .claude/                   # Documentation
│   ├── instructions.md        # Project overview
│   ├── git.md                 # Git best practices
│   ├── code.md                # Coding standards
│   ├── authentication.md      # Auth architecture
│   ├── authorization.md       # RBAC system
│   ├── memory.md              # Memory system
│   └── database.md            # Database setup
├── apps/
│   ├── web/                   # Next.js frontend
│   └── api/                   # Express backend
├── packages/
│   ├── types/                 # Shared TypeScript types
│   └── config/                # Shared configuration
├── scripts/
│   └── commit.js              # Automated commit script
└── prisma/
    └── schema.prisma          # Database schema
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL 16+ (local or cloud)
- Redis (optional, for caching)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd FreeTimeChat

# Install dependencies
pnpm install

# Set up environment variables
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

# Generate RSA keys for JWT
cd apps/api
mkdir keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -outform PEM -pubout -out keys/public.pem
cd ../..

# Set up database
cd apps/api
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma db seed
cd ../..

# Start development servers
pnpm dev
```

### Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Prisma Studio: `pnpm prisma studio`

## Automated Commit Workflow

This project includes an automated commit script that:

1. ✅ Analyzes all changes
2. ✅ Generates detailed commit message
3. ✅ Creates commit with comprehensive description
4. ✅ Automatically creates new dev branch (dev-1, dev-2, etc.)

### Using the Automated Commit

Instead of manual `git commit`, use:

```bash
# Run the automated commit script
pnpm commit

# Or manually
node scripts/commit.js
```

**What it does:**

1. Shows you all changed files
2. Categorizes changes (frontend, backend, docs, etc.)
3. Generates a detailed commit message with statistics
4. Asks for confirmation
5. Creates the commit
6. Automatically creates a new branch (dev-1, dev-2, dev-3, etc.)

**Example output:**

```
========================================
   FreeTimeChat Automated Commit
========================================

Step 1: Current Status
M  .claude/instructions.md
A  scripts/commit.js
...

Step 2: Analyzing Changes...
Found 5 modified file(s)

Step 3: Generating Commit Message...
────────────────────────────────────────
feat: update frontend and backend
────────────────────────────────────────
## Summary of Changes
This commit includes 5 file(s) modified...

Proceed with this commit? (y/n): y

✓ Commit created successfully
✓ Created and switched to branch: dev-1

Next Steps:
  1. Continue working on dev-1
  2. Merge when ready: git checkout main && git merge dev-1
  3. Push to remote: git push origin dev-1
```

### Manual Commits (Traditional Way)

You can still use traditional git commands:

```bash
git add .
git commit -m "feat: add new feature"
git push
```

## Development Workflow

### Option 1: Auto-Generated Dev Branches (Recommended for Solo)

```bash
# Make changes
# Run automated commit
pnpm commit
# Creates dev-1, commit is made

# Make more changes
# Run automated commit
pnpm commit
# Creates dev-2, commit is made

# Merge when ready
git checkout main
git merge dev-2
git push
```

### Option 2: Feature Branches (Recommended for Teams)

```bash
# Create feature branch
git checkout -b feature/chat-history

# Make changes and commit
git add .
git commit -m "feat(chat): add conversation history"

# Push and create PR
git push origin feature/chat-history
```

## Available Scripts

```bash
# Development
pnpm dev           # Start all apps in development mode
pnpm build         # Build all apps for production
pnpm test          # Run all tests
pnpm lint          # Lint all code
pnpm format        # Format code with Prettier

# Git
pnpm commit        # Automated commit with branch creation

# Database
pnpm prisma studio          # Open Prisma Studio
pnpm prisma migrate dev     # Create and apply migration
pnpm prisma db seed         # Seed database
```

## Documentation

### Core Documentation

Comprehensive documentation is available in the `.claude/` directory:

- **[Instructions](.claude/instructions.md)** - Complete project overview and
  architecture
- **[Git Best Practices](.claude/git.md)** - Git workflow and automated commit
  setup
- **[Code Standards](.claude/code.md)** - Coding best practices and component
  organization
- **[Authentication](.claude/authentication.md)** - Auth system architecture
- **[Authorization](.claude/authorization.md)** - RBAC and permissions
- **[Memory System](.claude/memory.md)** - Long-term conversation memory
- **[Database Setup](.claude/database.md)** - Database configuration guide

### Feature Documentation

Detailed feature documentation is available in the `docs/` directory:

- **[User Settings](docs/user-settings.md)** - User profile and security
  settings management
- **[2FA Grace Periods](docs/2fa-grace-period-implementation.md)** - Role-based
  2FA enforcement

## Architecture Highlights

### Multi-Tenant Database Architecture

- **Database-Per-Client** isolation for maximum security
- **Main Database**: Authentication, authorization, and client registry
- **Client Databases**: Each client has their own UUID-named database
  - Format: `freetimechat_<uuid>`
  - Contains all transactional data (projects, time entries, conversations)
  - Complete data isolation between clients
- **Benefits**:
  - Maximum security - data breach in one tenant doesn't affect others
  - Compliance-friendly for data residency requirements
  - Easy client backup/restore and offboarding
  - Scalable - can move specific clients to dedicated servers

### Dual Interface

- **Chat Interface**: Natural language processing for time tracking
  - "I worked 3 hours on the dashboard today"
  - "Show me my time this week"
  - "Start timer for client meeting"

- **Admin Dashboard**: Traditional web interface
  - User management
  - Role and permission configuration
  - Time entry management
  - Reports and analytics
  - Audit logs

### Security

- RS256 JWT tokens (asymmetric encryption)
- Refresh token rotation with reuse detection
- 2FA support with authenticator apps
- Google OAuth integration
- Explicit deny rules in RBAC
- Complete audit trail
- Database-per-tenant isolation

### Memory System

- **Short-term**: Redis for session data
- **Long-term**: PostgreSQL for conversation history (per-client database)
- **Semantic**: Vector embeddings for context
- **User preferences**: Personalization data

## Contributing

1. Read [code.md](.claude/code.md) for coding standards
2. Read [git.md](.claude/git.md) for git workflow
3. Create feature branch or use automated commits
4. Write tests for new features
5. Ensure linting passes
6. Create pull request

## License

[MIT License](LICENSE)

## Support

For issues and questions:

- Check documentation in `.claude/` directory
- Review [instructions.md](.claude/instructions.md)
- Open an issue on GitHub

---

Built with ❤️ using Next.js, TypeScript, and modern best practices.
