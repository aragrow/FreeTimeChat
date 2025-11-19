# FreeTimeChat - Time Keeping Software

## 🚨 CRITICAL: Core Working Principles - READ FIRST

### 🎯 Follow User Directions EXACTLY

- **Do ONLY what the user explicitly asks for** - no more, no less
- **Do NOT take liberties** or make assumptions about what the user might want
- **Do NOT commit uncommitted changes** unless explicitly asked
- **Do NOT add features** that weren't requested
- **Do NOT refactor code** that wasn't mentioned
- **Do NOT fix unrelated issues** unless asked

### 💬 Always Ask Before Acting

When you have ideas or suggestions:

1. **STOP** - Do not implement immediately
2. **ASK** - Explain your suggestion and ask permission first
3. **WAIT** - Let the user decide before proceeding
4. **Examples of when to ASK:**
   - "I noticed X could be improved. Would you like me to fix it?"
   - "There are uncommitted changes in the repo. Should I commit them?"
   - "I found an error in Y. Should I fix it while I'm here?"
   - "I could also add Z feature. Would you like that?"

### ✅ When In Doubt

- Ask for clarification
- Err on the side of doing less rather than more
- Confirm scope before starting work
- Present options and let user choose

### ❌ Never Assume

- Don't assume what's in scope
- Don't assume user wants all changes committed
- Don't assume suggested improvements should be made
- Don't assume silence means agreement

---

**📚 For complete details, see [instructions.md](./instructions.md)**

---

## 📖 Essential Documentation

Before starting ANY task, familiarize yourself with these key documents:

### Core Development Guides

- **[instructions.md](./instructions.md)** - Complete project architecture and
  implementation details
- **[QUICKSTART.md](./QUICKSTART.md)** - Setup guide and common commands
- **[code.md](./code.md)** - Coding standards and best practices
- **[git.md](./git.md)** - Git workflow and commit standards

### System Architecture

- **[authentication.md](./authentication.md)** - Authentication system (JWT,
  2FA, OAuth)
- **[authorization.md](./authorization.md)** - RBAC and capability system
- **[database.md](./database.md)** - Multi-tenant database architecture
- **[memory.md](./memory.md)** - Memory and context management

### Project Planning

- **[plan.md](./plan.md)** - Development roadmap and task breakdown
- **[userstories.md](./userstories.md)** - User stories and requirements
- **[test.md](./test.md)** - Testing strategy

---

## ⚠️ Git Workflow Reminders

### What to Commit

- **ONLY commit files that were explicitly modified** for the current task
- **NEVER commit uncommitted changes** found in the working directory
- **ASK FIRST** if you find uncommitted changes - don't assume they should be
  included

### Commit Process

1. **Review**: Check `git status` to see what changed
2. **Verify**: Ensure ONLY requested changes are staged
3. **Ask**: If unsure about uncommitted files, ask user first
4. **Commit**: Only commit what was explicitly requested
5. **Message**: Use conventional commit format (see git.md)

### Example Scenarios

**✅ CORRECT:**

```
User: "Fix the tenant dropdown to show names instead of IDs"
You: Modify only the specific file mentioned, commit just that change
```

**❌ INCORRECT:**

```
User: "Fix the tenant dropdown to show names instead of IDs"
You: Find 9 uncommitted files, commit all of them together
```

**✅ CORRECT:**

```
User: "continue the conversation"
You: Notice uncommitted changes, ask: "I see uncommitted changes in X files.
     Should I commit these, or continue with a different task?"
```

---

## 🔄 Common Workflows

### Starting a Task

1. Read the user's request carefully - what EXACTLY are they asking for?
2. If unclear, ASK for clarification before proceeding
3. Reference relevant docs (code.md, authentication.md, etc.)
4. Plan the minimal changes needed

### During Development

1. Make ONLY the requested changes
2. If you notice issues, ASK: "I noticed X. Should I fix it?"
3. Don't refactor or improve unless explicitly requested
4. Follow code.md standards for any new code

### Completing a Task

1. Test that changes work
2. Check git status - ensure only requested files changed
3. If extra files changed, investigate why
4. Commit ONLY what was requested (unless user said otherwise)

---

## 🎨 Design Philosophy

FreeTimeChat follows **Digital Clarity** design principles (see
[freetimechat_philosophy.md](./freetimechat_philosophy.md)):

- Clean geometric forms
- Purposeful negative space
- Swiss minimalism meets modern interfaces
- Every pixel serves a purpose

---

## Project Overview

A time tracking application with two distinct interfaces:

- **User Interface**: Chat-based interaction for all time tracking operations
- **Admin Interface**: Traditional web UI for management and reporting

## Architecture

- Next.js 16 with App Router and Turbopack
- Multi-tenant architecture with database-per-client isolation
- AI-powered natural language processing for time entry
- RBAC with capability-based permissions
- JWT authentication with RS256 encryption
- PostgreSQL + Prisma ORM + Redis caching
- **No Docker required** - Uses local PostgreSQL installation

## Key Principles

1. Users interact through chat - no traditional UI navigation needed
2. Natural language understanding for time entries (e.g., "I worked 3 hours on
   project X")
3. Admin interface is efficient and data-focused
4. Clear separation between user chat and admin interfaces
5. Security and data isolation are paramount

## Available Commands

- `/feature` - Add new features to the project
- `/chat-handler` - Create or modify chat command handlers
- `/admin-ui` - Work on admin interface components
- `/test-chat` - Test chat functionality and responses

---

## 🚀 Quick Reference

### Development Commands

```bash
pnpm dev              # Start all apps
pnpm build            # Build all apps
pnpm test             # Run tests
pnpm lint             # Check code quality
pnpm commit           # Automated commit workflow
```

### Database Setup (No Docker)

This project **does NOT use Docker**. It uses your local PostgreSQL
installation:

```bash
# Database is running locally on macOS (Homebrew)
# Connection: postgresql://david@localhost:5432/

# Apply migrations
cd apps/api
pnpm prisma:push:main      # Push main DB schema
pnpm prisma:push:client    # Push client DB schema

# Seed the database
pnpm prisma:seed:main      # Seed admin user and test data

# Generate Prisma clients
pnpm prisma:generate:main
pnpm prisma:generate:client
```

### Development Users

After seeding the database, these users are available for testing:

| Email                         | Password    | Role        | Tenant                               |
| ----------------------------- | ----------- | ----------- | ------------------------------------ |
| `admin@freetimechat.local`    | `0pen@2025` | admin       | None (system admin)                  |
| `testuser@freetimechat.local` | `Test@2025` | user        | Test Tenant (Key: `TEST-TENANT-KEY`) |
| `000002@aragrow-llc.local`    | `Open@2025` | tenantadmin | ARAGROW LLC (Key: `ARAGROW-LLC`)     |

Login at: http://localhost:3000/login

### Documentation Lookup

- Need to understand auth? → [authentication.md](./authentication.md)
- Need to add RBAC checks? → [authorization.md](./authorization.md)
- Need to write code? → [code.md](./code.md)
- Need to commit? → [git.md](./git.md)
- Need database info? → [database.md](./database.md)
