# Claude Code Instructions for FreeTimeChat

## Core Working Principles

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

## Project Context

This is a time tracking application with a unique architecture:

- Regular users interact ONLY through chat interface
- Admins use a traditional web interface
- Built with Next.js and TypeScript

## Related Documentation

- **[Git Best Practices](./git.md)** - Git workflow and commit standards
  including automated commit script that generates detailed commit messages and
  auto-creates dev branches (dev-1, dev-2, etc.)
- **[Code Standards & Best Practices](./code.md)** - Comprehensive coding
  standards for frontend and backend development, component organization
  patterns, breaking pages into logical components, file structure, TypeScript
  conventions, and code quality guidelines
- **[Authentication System](./authentication.md)** - Complete authentication
  architecture including JWT (RS256), Google OAuth, 2FA with TOTP, and token
  rotation strategies
- **[Authorization System](./authorization.md)** - Role-Based Access Control
  (RBAC) with multiple roles per user, granular capabilities, and explicit deny
  rules that override allow permissions
- **[Memory System](./memory.md)** - Long-term memory architecture for chat
  conversations including short-term (Redis), long-term (PostgreSQL), semantic
  memory (vector embeddings), and context management
- **[Database Configuration](./database.md)** - Multi-tenant database
  architecture with database-per-client isolation. Comprehensive guide for
  database selection and setup with top 3 cloud options (Supabase, Railway,
  Neon) and 3 local options (Docker, native, Postgres.app). Main database for
  auth/authorization, UUID-based client databases for transactional data

## Development Guidelines

### When Working on Chat Features

- Focus on natural language understanding
- Support various time entry formats (hours, time ranges, descriptions)
- Provide helpful, conversational responses
- Handle ambiguous requests gracefully
- Always confirm actions before executing
- **Conversation Tracking**: Give each conversation a unique ID using uuid4, and
  save the state of the conversation in each interaction for future analysis of
  accuracy
- Store conversation context to improve response quality

### When Working on Admin Features

- Use standard UI patterns (tables, forms, charts)
- Prioritize data visualization
- Enable bulk operations
- Implement robust filtering and search
- **Audit Trail**: Track audit trail of each add, update, and delete operation
- Include: who performed the action, when, what changed (before/after values)

### Code Standards

- Use TypeScript with strict mode
- Follow Next.js 14+ App Router conventions
- Implement proper error handling
- Add JSDoc comments for complex functions
- Write unit tests for business logic
- Use Tailwind CSS for styling

### Chat Handler Pattern

Chat handlers should:

1. Parse user intent from natural language
2. Extract relevant data (time, project, description)
3. Validate the data
4. Execute the operation
5. Provide clear confirmation with summary

### API Structure

- `/api/chat` - Handle all user chat interactions
- `/api/admin/*` - Admin-only endpoints
- `/api/time-entries/*` - CRUD operations for time entries
- `/api/reports/*` - Reporting and analytics
- `/api/auth/*` - Authentication endpoints
- `/api/roles/*` - Role management endpoints
- `/api/capabilities/*` - Capability management endpoints

### Security Considerations

- Implement authentication for both interfaces (see authentication.md)
- Role-based access control with explicit deny support (see authorization.md)
- Validate all chat inputs for SQL injection, XSS
- Rate limit chat API to prevent abuse
- Sanitize all user-provided data
- Use parameterized queries (Prisma handles this)
- Implement CORS properly
- Audit log security-sensitive operations

## File Organization

```
/app
  /chat - User chat interface
  /admin - Admin interface
  /api - API routes
/components
  /chat - Chat-specific components
  /admin - Admin-specific components
  /shared - Shared components
/lib
  /chat - Chat processing logic
  /db - Database operations
  /utils - Utility functions
/types - TypeScript type definitions
```

## Testing Approach

- Test chat handlers with various natural language inputs
- Test edge cases (negative hours, invalid dates, etc.)
- Test admin operations (CRUD, bulk operations)
- Integration tests for chat-to-database flow
- Test authorization rules (explicit deny precedence)
- Test audit trail logging

## Technology Stack

### Frontend: Next.js (TypeScript)

- Modern, fast, excellent developer experience
- Perfect for building both chat interface and admin dashboard
- Deploy to Vercel for free
- Use App Router (not Pages Router) for modern React features

### Backend: Node.js + Express/Fastify (TypeScript)

- Full-stack type safety with shared types
- Faster development with same language
- Simpler deployment
- Perfect for REST API and database operations

---

## Frontend/Backend Architecture

### Recommended Architecture: Monorepo with Separated Concerns

```
/FreeTimeChat
├── /apps
│   ├── /web                      # Next.js Frontend Application
│   │   ├── /app                  # App Router pages
│   │   │   ├── /chat             # User chat interface pages
│   │   │   ├── /admin            # Admin interface pages
│   │   │   │   ├── /users        # User management
│   │   │   │   ├── /roles        # Role management
│   │   │   │   ├── /time-entries # Time entry management
│   │   │   │   ├── /projects     # Project management
│   │   │   │   └── /reports      # Reports & analytics
│   │   │   └── layout.tsx        # Root layout
│   │   ├── /components           # React components
│   │   │   ├── /chat             # Chat UI components
│   │   │   ├── /admin            # Admin UI components
│   │   │   └── /shared           # Shared components
│   │   ├── /lib                  # Frontend utilities
│   │   │   ├── /api-client       # API client functions
│   │   │   ├── /auth             # Auth context and hooks
│   │   │   └── /hooks            # React hooks
│   │   └── package.json
│   │
│   └── /api                      # Backend API Server (Express/Fastify)
│       ├── /src
│       │   ├── /routes           # API route handlers
│       │   │   ├── /auth         # Authentication endpoints
│       │   │   ├── /chat         # Chat endpoints
│       │   │   ├── /admin        # Admin endpoints
│       │   │   ├── /time-entries # Time entry CRUD
│       │   │   ├── /reports      # Reporting endpoints
│       │   │   ├── /roles        # Role management
│       │   │   └── /capabilities # Capability management
│       │   ├── /services         # Business logic layer
│       │   │   ├── /auth         # Authentication services
│       │   │   │   ├── jwtService.ts
│       │   │   │   ├── twoFactorService.ts
│       │   │   │   ├── googleAuthService.ts
│       │   │   │   ├── authorizationService.ts
│       │   │   │   └── passwordService.ts
│       │   │   ├── /chat         # Chat processing
│       │   │   │   ├── parser.ts # Intent parsing
│       │   │   │   └── handlers  # Intent handlers
│       │   │   ├── /time-entry   # Time entry operations
│       │   │   ├── /project      # Project management
│       │   │   ├── /user         # User operations
│       │   │   └── /audit        # Audit trail service
│       │   ├── /db               # Database layer
│       │   │   ├── /models       # Database models (Prisma)
│       │   │   ├── /repositories # Data access layer
│       │   │   └── /migrations   # DB migrations
│       │   ├── /middleware       # Express middleware
│       │   │   ├── auth.ts       # JWT verification
│       │   │   ├── authorize.ts  # Authorization checks
│       │   │   ├── validation.ts # Request validation
│       │   │   ├── auditLog.ts   # Audit logging
│       │   │   └── error.ts      # Error handling
│       │   ├── /utils            # Utility functions
│       │   └── server.ts         # Server entry point
│       ├── /keys                 # RSA keys for JWT
│       │   ├── private.pem
│       │   └── public.pem
│       └── package.json
│
├── /packages
│   ├── /shared-types             # Shared TypeScript types
│   │   ├── /entities             # Data model types
│   │   ├── /api                  # API request/response types
│   │   └── /chat                 # Chat-specific types
│   │
│   └── /config                   # Shared configuration
│       ├── /eslint-config        # Shared ESLint rules
│       └── /tsconfig             # Shared TS configs
│
├── /docker                       # Docker configurations
│   ├── Dockerfile.web            # Frontend container
│   ├── Dockerfile.api            # Backend container
│   └── docker-compose.yml        # Multi-container setup
│
├── package.json                  # Root workspace config
├── pnpm-workspace.yaml           # pnpm workspaces config
└── README.md
```

### Communication Between Frontend and Backend

**Frontend → Backend Communication**

- RESTful API calls via fetch/axios
- Base URL configured via environment variables
- TypeScript types shared via `@freetimechat/shared-types` package
- Authentication via JWT tokens in HTTP-only cookies (preferred) or
  Authorization header

**Development Workflow:**

- Run both frontend and backend locally during development
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- Use environment variables to configure API URL

### Environment Configuration

**Frontend (.env.local)**

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

**Backend (.env)**

```env
# Server
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/freetimechat

# JWT (RS256)
JWT_EXPIRES_IN=15m
JWT_ISSUER=freetimechat.com
JWT_AUDIENCE=freetimechat-api
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback

# Email (for verification/password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@freetimechat.com

# Redis (for caching and rate limiting)
REDIS_URL=redis://localhost:6379

# OpenAI (optional - for advanced NLP)
OPENAI_API_KEY=sk-...
```

## Database Recommendations

### Multi-Tenant Architecture (Database-Per-Client)

FreeTimeChat uses a **database-per-tenant** architecture for maximum data
isolation:

**Main Database** (freetimechat_main):

- Authentication and authorization (users, roles, capabilities)
- Client registry and database assignments
- JWT refresh tokens
- Global configuration

**Client Databases** (freetimechat\_<UUID>):

- Each client gets their own isolated database
- UUID v4-based naming: `freetimechat_550e8400e29b41d4a716446655440000`
- Contains all transactional data (projects, time entries, tasks, conversations)
- Complete data isolation between clients

**Benefits:**

- ✅ Maximum security and data isolation
- ✅ Compliance-friendly (data residency)
- ✅ Easy to backup/restore individual clients
- ✅ Scalable (can move clients to dedicated servers)
- ✅ Simple client offboarding (drop entire database)

See [database.md](./database.md) for complete architecture details and
implementation.

### Recommended: PostgreSQL (Primary Database)

**Why PostgreSQL:**

- ✅ **Relational data model** perfect for structured time tracking data
- ✅ **ACID compliance** ensures data integrity for time entries
- ✅ **JSON support** for flexible chat metadata storage
- ✅ **Excellent TypeScript ORM support** (Prisma)
- ✅ **Powerful query capabilities** for reporting and analytics
- ✅ **Free and open source** with robust community
- ✅ **Scalable** for small to enterprise-level applications
- ✅ **Full-text search** for searching time entries and projects
- ✅ **Time zone support** crucial for time tracking applications
- ✅ **Multi-database support** for multi-tenant architecture

**Recommended ORM: Prisma**

Why Prisma:

- Type-safe database queries
- Automatic TypeScript type generation
- Great developer experience
- Built-in migrations
- Visual database browser (Prisma Studio)
- Support for multiple database connections

### Main Database Tables

**Authentication & Authorization:**

- `users` - User accounts with auth fields and clientId (see authentication.md)
- `clients` - Client registry with database assignments (UUID-based)
- `refresh_tokens` - Refresh tokens with rotation tracking
- `roles` - Role definitions
- `capabilities` - Permission definitions
- `user_roles` - User to role mapping (many-to-many)
- `role_capabilities` - Role to capability mapping with allow/deny flag

### Client Database Tables

**Business Logic** (per-client database):

- `projects` - Project information
- `time_entries` - Time tracking entries
- `tasks` - Task management
- `conversations` - Chat conversation metadata
- `messages` - Chat messages with context

**Note:** Each client database has its own isolated copy of these tables with
their own data.

### Redis (Complementary - for Caching & Performance)

**Use Cases:**

- **Session storage** for JWT refresh tokens
- **Rate limiting** for chat API endpoint
- **Caching** user permissions and capabilities
- **Caching** frequently accessed data (active projects)

**When to add:** After initial launch, when performance optimization needed

### Data Backup Strategy

**For Production:**

- Daily automated backups (most hosts provide this)
- Point-in-time recovery capability
- Test backup restoration quarterly
- Store backups in separate region/location

## Implementation Roadmap

### Phase 1: Project Setup (Week 1)

1. Initialize monorepo structure (pnpm workspaces)
2. Set up Next.js frontend app with App Router
3. Set up Express/Fastify backend app
4. Create shared-types package
5. Configure TypeScript, ESLint, Prettier
6. Set up PostgreSQL locally (Docker)
7. Initialize Prisma and create initial schema
8. Generate RSA keys for JWT
9. Run first migration

### Phase 2: Authentication & Authorization (Week 2)

1. Implement JWT authentication system (RS256)
2. Create user registration and login endpoints
3. Implement Google OAuth integration
4. Add 2FA with TOTP support
5. Implement role and capability system
6. Set up authorization middleware
7. Create role/capability management endpoints
8. Write unit tests for auth services

### Phase 3: Backend Core (Week 3)

1. Create time entry CRUD endpoints
2. Create project CRUD endpoints
3. Create client CRUD endpoints
4. Implement audit logging middleware
5. Set up validation middleware
6. Add error handling middleware
7. Write unit tests for services

### Phase 4: Chat Processing (Week 4)

1. Design chat intent parser
2. Implement conversation tracking with uuid4
3. Implement time entry handler (parse "I worked 3 hours on X")
4. Create chat endpoint with state persistence
5. Add chat message storage with conversation context
6. Test various natural language inputs
7. Handle ambiguous requests with clarification

### Phase 5: Frontend Foundation (Week 5)

1. Create API client layer with TypeScript types
2. Build authentication UI (login/register/2FA)
3. Implement Google OAuth button
4. Add authorization hooks (useAuthorization)
5. Create protected routes and components
6. Create chat interface UI with conversation history
7. Connect chat UI to backend API

### Phase 6: Admin Interface (Week 6-7)

1. Build admin dashboard layout with navigation
2. Create user management pages
3. Create role/capability management UI
4. Create time entry management pages with bulk operations
5. Build project/client management interface
6. Add data tables with filtering and search
7. Implement audit log viewer

### Phase 7: Reporting & Analytics (Week 8)

1. Create reporting endpoints (time by user, project, date range)
2. Build report visualization with charts
3. Add export functionality (CSV/PDF)
4. Create dashboard widgets
5. Implement real-time metrics

### Phase 8: Testing & Polish (Week 9)

1. Comprehensive integration testing
2. Load testing and performance optimization
3. Security audit
4. Fix bugs and edge cases
5. Documentation updates
6. User acceptance testing

### Phase 9: Deployment (Week 10)

1. Set up production database
2. Configure environment variables
3. Deploy backend to Railway/Render
4. Deploy frontend to Vercel
5. Set up monitoring and logging
6. Configure automated backups
7. SSL certificates and domain configuration

## Deployment Strategy

### Recommended Deployment Setup

**Frontend (Next.js):**

- Deploy to: **Vercel** (easiest) or Netlify
- Environment variables: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- Automatic deployments from git push
- Edge functions for optimal performance

**Backend (API):**

- Deploy to: **Railway**, Render, or Fly.io
- Environment variables: See Backend .env above
- Set up health check endpoint: `GET /health`
- Configure worker processes for production

**Database:**

- **PostgreSQL** on Supabase or Railway
- Connection pooling enabled
- Automated daily backups configured
- Read replicas for scaling (if needed)

**Redis:**

- Railway Redis or Upstash
- Configure for session storage and caching

**Monitoring:**

- Sentry for error tracking
- LogRocket or similar for session replay
- Uptime monitoring (Uptime Robot, Better Uptime)
- Performance monitoring (Vercel Analytics)

### Docker Compose (Alternative - for self-hosting)

```yaml
version: '3.8'
services:
  frontend:
    build:
      context: ./apps/web
      dockerfile: ../../docker/Dockerfile.web
    ports:
      - '3000:3000'
    environment:
      - NEXT_PUBLIC_API_URL=http://api:4000
    depends_on:
      - api

  api:
    build:
      context: ./apps/api
      dockerfile: ../../docker/Dockerfile.api
    ports:
      - '4000:4000'
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/freetimechat
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    volumes:
      - ./apps/api/keys:/app/keys:ro

  db:
    image: postgres:16-alpine
    ports:
      - '5432:5432'
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=freetimechat
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Performance Optimization

### Backend

- Use Redis for caching user permissions (5-minute TTL)
- Implement database connection pooling
- Add indexes on frequently queried columns
- Use batch operations for bulk updates
- Implement rate limiting on all endpoints

### Frontend

- Use React Server Components where possible
- Implement code splitting
- Optimize images with Next.js Image component
- Cache API responses with SWR or React Query
- Lazy load admin components

## Security Checklist

- [ ] All passwords hashed with bcrypt (12+ rounds)
- [ ] JWT tokens use RS256 (not HS256)
- [ ] Refresh token rotation implemented
- [ ] 2FA available for all users
- [ ] Rate limiting on all endpoints
- [ ] CORS properly configured
- [ ] All inputs validated and sanitized
- [ ] SQL injection prevented (Prisma parameterized queries)
- [ ] XSS protection enabled
- [ ] CSRF tokens for state-changing operations
- [ ] HTTP-only cookies for tokens
- [ ] Secure flag on cookies in production
- [ ] Authorization checks on all protected endpoints
- [ ] Explicit deny rules tested and working
- [ ] Audit logs capturing all changes
- [ ] Sensitive data encrypted at rest
- [ ] TLS/SSL in production
- [ ] Security headers configured
- [ ] Dependency vulnerability scanning
- [ ] Regular security audits

## Development Commands

```bash
# Install dependencies
pnpm install

# Generate RSA keys for JWT
cd apps/api
mkdir keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -outform PEM -pubout -out keys/public.pem

# Run Prisma migrations
cd apps/api
pnpm prisma migrate dev

# Seed database with default roles and capabilities
pnpm prisma db seed

# Start development servers
pnpm dev  # Starts both frontend and backend

# Run tests
pnpm test

# Build for production
pnpm build

# Run linter
pnpm lint

# Format code
pnpm format
```

## Key Development Principles

1. **Type Safety First**: Use TypeScript strictly everywhere
2. **Security by Default**: Always validate, sanitize, and authorize
3. **Explicit Over Implicit**: Clear naming and explicit permission checks
4. **Audit Everything**: Log all important operations
5. **Fail Safely**: Default deny for permissions, graceful degradation
6. **Test Thoroughly**: Unit tests for business logic, integration tests for
   flows
7. **Document Well**: JSDoc for complex functions, README for setup
8. **Performance Matters**: Cache aggressively, optimize queries
9. **User Experience**: Clear error messages, helpful chat responses
10. **Maintainability**: Clean code, consistent patterns, refactor regularly
