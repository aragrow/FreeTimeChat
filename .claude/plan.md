# FreeTimeChat Development Plan

This document breaks down the entire FreeTimeChat application into small, manageable tasks organized by implementation phase.

## Table of Contents

1. [Phase 1: Project Setup](#phase-1-project-setup)
2. [Phase 2: Authentication & Authorization](#phase-2-authentication--authorization)
3. [Phase 3: Database & Multi-Tenancy](#phase-3-database--multi-tenancy)
4. [Phase 4: Backend Core Services](#phase-4-backend-core-services)
5. [Phase 5: Chat Processing & Memory](#phase-5-chat-processing--memory)
6. [Phase 6: Frontend Foundation](#phase-6-frontend-foundation)
7. [Phase 7: Admin Interface](#phase-7-admin-interface)
8. [Phase 8: Reporting & Analytics](#phase-8-reporting--analytics)
9. [Phase 9: Testing & Quality Assurance](#phase-9-testing--quality-assurance)
10. [Phase 10: Deployment & DevOps](#phase-10-deployment--devops)

---

## Phase 1: Project Setup

**Duration**: 1 week
**Dependencies**: None
**Related Docs**: [instructions.md](./instructions.md), [code.md](./code.md), [git.md](./git.md)

### 1.1 Repository & Monorepo Setup

- [x] **Task 1.1.1**: Initialize Git repository
  - Create `.gitignore` with Node, Next.js, environment files
  - Set up main branch
  - Configure branch protection rules
  - **User Story**: US-001
  - **Complexity**: Low (2 hours)

- [x] **Task 1.1.2**: Set up pnpm workspaces
  - Create `pnpm-workspace.yaml`
  - Configure workspace structure (apps/, packages/)
  - Set up root `package.json` with workspace scripts
  - **User Story**: US-001
  - **Complexity**: Low (2 hours)

- [x] **Task 1.1.3**: Configure Turbo for monorepo
  - Install and configure Turborepo
  - Create `turbo.json` with pipeline configuration
  - Set up build, dev, lint, test scripts
  - **User Story**: US-001
  - **Complexity**: Medium (4 hours)

### 1.2 Next.js Frontend Setup

- [x] **Task 1.2.1**: Create Next.js app in apps/web
  - Initialize Next.js 14+ with App Router
  - Configure TypeScript with strict mode
  - Set up Tailwind CSS
  - **User Story**: US-001
  - **Complexity**: Low (3 hours)

- [x] **Task 1.2.2**: Configure Next.js project structure
  - Create folder structure (app/, components/, lib/, hooks/)
  - Set up route groups ((auth), (dashboard), (admin))
  - Configure environment variables
  - **User Story**: US-001
  - **Complexity**: Low (2 hours)

- [x] **Task 1.2.3**: Set up shared UI components library
  - Create basic Button, Input, Card, Modal components
  - Configure component theming
  - Set up Storybook (optional)
  - **User Story**: US-001
  - **Complexity**: Medium (6 hours)

### 1.3 Express Backend Setup

- [x] **Task 1.3.1**: Create Express app in apps/api
  - Initialize Express with TypeScript
  - Set up folder structure (routes/, services/, middleware/)
  - Configure nodemon for development
  - **User Story**: US-001
  - **Complexity**: Low (3 hours)

- [ ] **Task 1.3.2**: Configure middleware stack
  - Set up CORS with proper origins
  - Add body-parser, helmet, compression
  - Configure request logging (morgan)
  - Set up error handling middleware
  - **User Story**: US-001
  - **Complexity**: Medium (4 hours)

- [ ] **Task 1.3.3**: Set up API route structure
  - Create base router structure
  - Set up health check endpoint
  - Configure API versioning
  - **User Story**: US-001
  - **Complexity**: Low (2 hours)

### 1.4 Shared Types Package

- [ ] **Task 1.4.1**: Create shared types package
  - Initialize packages/types
  - Create base type definitions (User, Role, Capability)
  - Set up TypeScript compilation
  - **User Story**: US-001
  - **Complexity**: Low (2 hours)

- [ ] **Task 1.4.2**: Create API request/response types
  - Define standard API response format
  - Create pagination types
  - Define error response types
  - **User Story**: US-001
  - **Complexity**: Low (3 hours)

### 1.5 Development Tools

- [ ] **Task 1.5.1**: Configure ESLint & Prettier
  - Set up ESLint with TypeScript rules
  - Configure Prettier
  - Create shared config in packages/config
  - **User Story**: US-001
  - **Complexity**: Low (2 hours)

- [ ] **Task 1.5.2**: Set up Husky & lint-staged
  - Install Husky for git hooks
  - Configure pre-commit hook with lint-staged
  - Add commit message validation
  - **User Story**: US-001
  - **Complexity**: Low (2 hours)

- [ ] **Task 1.5.3**: Implement automated commit script
  - Create scripts/commit.js
  - Implement change analysis and message generation
  - Add automatic dev-branch creation
  - Test commit workflow
  - **User Story**: US-001
  - **Complexity**: Medium (4 hours)

### 1.6 Database Setup

- [ ] **Task 1.6.1**: Install and configure Prisma
  - Install Prisma CLI and client
  - Initialize Prisma with PostgreSQL
  - Configure for multi-database support
  - **User Story**: US-002
  - **Complexity**: Low (2 hours)

- [ ] **Task 1.6.2**: Set up local PostgreSQL with Docker
  - Create docker-compose.yml
  - Configure PostgreSQL service
  - Add Redis service for caching
  - **User Story**: US-002
  - **Complexity**: Medium (3 hours)

- [ ] **Task 1.6.3**: Create environment configuration
  - Set up .env.example files
  - Document all environment variables
  - Create setup script for environment
  - **User Story**: US-002
  - **Complexity**: Low (2 hours)

---

## Phase 2: Authentication & Authorization

**Duration**: 2 weeks
**Dependencies**: Phase 1
**Related Docs**: [authentication.md](./authentication.md), [authorization.md](./authorization.md)

### 2.1 JWT Infrastructure

- [ ] **Task 2.1.1**: Generate RSA key pair
  - Create scripts to generate RSA keys
  - Store keys securely in apps/api/keys/
  - Add keys to .gitignore
  - **User Story**: US-003
  - **Complexity**: Low (1 hour)

- [ ] **Task 2.1.2**: Implement JWT Service
  - Create JWTService class with RS256
  - Implement generateAccessToken()
  - Implement verifyAccessToken()
  - Add token expiration handling
  - **User Story**: US-003
  - **Complexity**: Medium (6 hours)

- [ ] **Task 2.1.3**: Implement Refresh Token Service
  - Create refresh token generation
  - Implement token rotation
  - Add token family tracking
  - Implement reuse detection
  - **User Story**: US-003
  - **Complexity**: High (8 hours)

### 2.2 Database Schema - Main DB (Auth)

- [ ] **Task 2.2.1**: Create User model
  - Define User schema in Prisma
  - Add email, password, 2FA fields
  - Add clientId foreign key
  - Create indexes
  - **User Story**: US-003, US-004
  - **Complexity**: Low (2 hours)

- [ ] **Task 2.2.2**: Create Client model
  - Define Client schema
  - Add database name and host fields
  - Create unique constraints
  - **User Story**: US-004
  - **Complexity**: Low (2 hours)

- [ ] **Task 2.2.3**: Create Role & Capability models
  - Define Role, Capability schemas
  - Create UserRole junction table
  - Create RoleCapability with isAllowed flag
  - **User Story**: US-005
  - **Complexity**: Medium (4 hours)

- [ ] **Task 2.2.4**: Create RefreshToken model
  - Define RefreshToken schema
  - Add familyId for rotation tracking
  - Create indexes for performance
  - **User Story**: US-003
  - **Complexity**: Low (2 hours)

- [ ] **Task 2.2.5**: Create ImpersonationSession model
  - Define impersonation tracking schema
  - Add admin and target user relations
  - Create session metadata fields
  - **User Story**: US-006
  - **Complexity**: Low (2 hours)

- [ ] **Task 2.2.6**: Run initial migrations
  - Generate migration for main database
  - Run migration
  - Verify schema creation
  - **User Story**: US-003, US-004, US-005
  - **Complexity**: Low (1 hour)

### 2.3 Authentication Endpoints

- [ ] **Task 2.3.1**: Implement registration endpoint
  - Create POST /auth/register
  - Validate email and password
  - Hash password with bcrypt
  - Create user in database
  - **User Story**: US-007
  - **Complexity**: Medium (4 hours)

- [ ] **Task 2.3.2**: Implement login endpoint
  - Create POST /auth/login
  - Verify credentials
  - Generate access and refresh tokens
  - Handle 2FA requirement
  - **User Story**: US-008
  - **Complexity**: Medium (5 hours)

- [ ] **Task 2.3.3**: Implement refresh token endpoint
  - Create POST /auth/refresh
  - Verify refresh token
  - Rotate refresh token
  - Detect token reuse
  - **User Story**: US-008
  - **Complexity**: Medium (5 hours)

- [ ] **Task 2.3.4**: Implement logout endpoint
  - Create POST /auth/logout
  - Revoke refresh token
  - Clear cookies
  - **User Story**: US-009
  - **Complexity**: Low (2 hours)

### 2.4 Two-Factor Authentication

- [ ] **Task 2.4.1**: Implement 2FA Service
  - Install speakeasy and qrcode
  - Create TwoFactorService class
  - Implement secret generation
  - Implement QR code generation
  - **User Story**: US-010
  - **Complexity**: Medium (5 hours)

- [ ] **Task 2.4.2**: Create 2FA enable endpoint
  - Create POST /auth/2fa/enable
  - Generate secret and QR code
  - Store encrypted secret
  - **User Story**: US-010
  - **Complexity**: Medium (4 hours)

- [ ] **Task 2.4.3**: Create 2FA verify endpoint
  - Create POST /auth/2fa/verify
  - Verify TOTP code
  - Issue full access token on success
  - **User Story**: US-010
  - **Complexity**: Medium (3 hours)

- [ ] **Task 2.4.4**: Create 2FA disable endpoint
  - Create POST /auth/2fa/disable
  - Verify password and current code
  - Remove 2FA from account
  - **User Story**: US-010
  - **Complexity**: Low (2 hours)

### 2.5 Google OAuth

- [ ] **Task 2.5.1**: Set up Google OAuth credentials
  - Create Google Cloud project
  - Configure OAuth consent screen
  - Generate client ID and secret
  - **User Story**: US-011
  - **Complexity**: Low (2 hours)

- [ ] **Task 2.5.2**: Implement Google OAuth Service
  - Create GoogleAuthService
  - Implement authorization URL generation
  - Implement token exchange
  - **User Story**: US-011
  - **Complexity**: Medium (5 hours)

- [ ] **Task 2.5.3**: Create Google OAuth endpoints
  - Create GET /auth/google (redirect)
  - Create GET /auth/google/callback
  - Link Google account to user
  - **User Story**: US-011
  - **Complexity**: Medium (5 hours)

### 2.6 Authorization System

- [ ] **Task 2.6.1**: Create AuthorizationService
  - Implement getUserRoles()
  - Implement getUserCapabilities()
  - Implement userHasCapability() with explicit deny
  - Add permission caching with Redis
  - **User Story**: US-005
  - **Complexity**: High (8 hours)

- [ ] **Task 2.6.2**: Create authorization middleware
  - Create requireAuth middleware
  - Create requireCapability middleware
  - Add role-checking middleware
  - **User Story**: US-005
  - **Complexity**: Medium (4 hours)

- [ ] **Task 2.6.3**: Seed default roles and capabilities
  - Create seed script
  - Define admin, manager, user roles
  - Define capabilities (user.read, project.write, etc.)
  - Assign capabilities to roles
  - **User Story**: US-005
  - **Complexity**: Medium (4 hours)

### 2.7 Admin Impersonation

- [ ] **Task 2.7.1**: Implement ImpersonationService
  - Create startImpersonation()
  - Create endImpersonation()
  - Generate impersonation JWT
  - Track sessions in database
  - **User Story**: US-006
  - **Complexity**: High (8 hours)

- [ ] **Task 2.7.2**: Create impersonation endpoints
  - Create POST /admin/impersonate/start
  - Create POST /admin/impersonate/end
  - Create GET /admin/impersonate/sessions
  - **User Story**: US-006
  - **Complexity**: Medium (4 hours)

- [ ] **Task 2.7.3**: Implement impersonation middleware
  - Create detectImpersonation middleware
  - Create restrictImpersonation middleware
  - Add impersonation metadata to requests
  - **User Story**: US-006
  - **Complexity**: Medium (3 hours)

---

## Phase 3: Database & Multi-Tenancy

**Duration**: 1 week
**Dependencies**: Phase 2
**Related Docs**: [database.md](./database.md)

### 3.1 Client Database Infrastructure

- [ ] **Task 3.1.1**: Create DatabaseService
  - Implement getMainDatabase()
  - Implement getClientDatabase()
  - Add connection pooling
  - Implement connection cleanup
  - **User Story**: US-004
  - **Complexity**: High (10 hours)

- [ ] **Task 3.1.2**: Implement client database provisioning
  - Create createClientDatabase()
  - Generate UUID-based database name
  - Execute CREATE DATABASE command
  - **User Story**: US-004
  - **Complexity**: Medium (5 hours)

- [ ] **Task 3.1.3**: Create client database schema
  - Define Project, TimeEntry, Task models
  - Define Conversation, Message models
  - Create client schema migration
  - **User Story**: US-012, US-013, US-014
  - **Complexity**: Medium (6 hours)

- [ ] **Task 3.1.4**: Implement database migration script
  - Create migrate-all-clients.js script
  - Migrate all active client databases
  - Handle migration errors gracefully
  - **User Story**: US-004
  - **Complexity**: Medium (4 hours)

### 3.2 Client Database Middleware

- [ ] **Task 3.2.1**: Create attachClientDatabase middleware
  - Get user's clientId from JWT
  - Fetch client database connection
  - Attach to request object
  - **User Story**: US-004
  - **Complexity**: Medium (3 hours)

- [ ] **Task 3.2.2**: Test multi-tenant isolation
  - Create test clients
  - Verify data isolation
  - Test connection management
  - **User Story**: US-004
  - **Complexity**: Medium (4 hours)

### 3.3 Client Onboarding

- [ ] **Task 3.3.1**: Create client onboarding endpoint
  - Create POST /admin/clients
  - Generate client database
  - Create admin user for client
  - Assign admin role
  - **User Story**: US-015
  - **Complexity**: High (8 hours)

- [ ] **Task 3.3.2**: Create client management endpoints
  - Create GET /admin/clients (list)
  - Create GET /admin/clients/:id
  - Create PATCH /admin/clients/:id
  - Create DELETE /admin/clients/:id
  - **User Story**: US-015
  - **Complexity**: Medium (6 hours)

---

## Phase 4: Backend Core Services

**Duration**: 2 weeks
**Dependencies**: Phase 3
**Related Docs**: [code.md](./code.md)

### 4.1 Project Management

- [ ] **Task 4.1.1**: Create ProjectService
  - Implement create(), list(), getById()
  - Implement update(), delete()
  - Add soft delete support
  - **User Story**: US-016
  - **Complexity**: Medium (6 hours)

- [ ] **Task 4.1.2**: Create project endpoints
  - Create POST /projects
  - Create GET /projects (with pagination)
  - Create GET /projects/:id
  - Create PATCH /projects/:id
  - Create DELETE /projects/:id
  - **User Story**: US-016
  - **Complexity**: Medium (6 hours)

- [ ] **Task 4.1.3**: Add project validation
  - Create Zod validation schemas
  - Validate project creation
  - Validate project updates
  - **User Story**: US-016
  - **Complexity**: Low (3 hours)

### 4.2 Time Entry Management

- [ ] **Task 4.2.1**: Create TimeEntryService
  - Implement create(), list(), getById()
  - Implement update(), delete()
  - Calculate duration automatically
  - **User Story**: US-017
  - **Complexity**: Medium (6 hours)

- [ ] **Task 4.2.2**: Create time entry endpoints
  - Create POST /time-entries
  - Create GET /time-entries (with filters)
  - Create GET /time-entries/:id
  - Create PATCH /time-entries/:id
  - Create DELETE /time-entries/:id
  - **User Story**: US-017
  - **Complexity**: Medium (6 hours)

- [ ] **Task 4.2.3**: Implement time entry validation
  - Validate time ranges
  - Prevent overlapping entries
  - Validate against project
  - **User Story**: US-017
  - **Complexity**: Medium (4 hours)

### 4.3 Task Management

- [ ] **Task 4.3.1**: Create TaskService
  - Implement CRUD operations
  - Add task assignment
  - Add task completion tracking
  - **User Story**: US-018
  - **Complexity**: Medium (5 hours)

- [ ] **Task 4.3.2**: Create task endpoints
  - Create POST /tasks
  - Create GET /tasks (with filters)
  - Create PATCH /tasks/:id
  - Create DELETE /tasks/:id
  - **User Story**: US-018
  - **Complexity**: Medium (5 hours)

### 4.4 Audit Trail

- [ ] **Task 4.4.1**: Create AuditService
  - Implement log() method
  - Store before/after values
  - Capture IP address, user agent
  - Add impersonation metadata
  - **User Story**: US-019
  - **Complexity**: Medium (5 hours)

- [ ] **Task 4.4.2**: Create audit log middleware
  - Auto-log create, update, delete operations
  - Capture request metadata
  - Handle errors gracefully
  - **User Story**: US-019
  - **Complexity**: Medium (4 hours)

- [ ] **Task 4.4.3**: Create audit log endpoints
  - Create GET /admin/audit-logs
  - Add filtering by user, action, date
  - Add pagination
  - **User Story**: US-019
  - **Complexity**: Low (3 hours)

### 4.5 Caching Layer

- [ ] **Task 4.5.1**: Set up Redis client
  - Configure Redis connection
  - Create CacheService class
  - Implement get(), set(), delete()
  - **User Story**: US-020
  - **Complexity**: Low (3 hours)

- [ ] **Task 4.5.2**: Implement permission caching
  - Cache user roles and capabilities
  - Set appropriate TTL (5 minutes)
  - Invalidate on role/capability changes
  - **User Story**: US-020
  - **Complexity**: Medium (4 hours)

- [ ] **Task 4.5.3**: Implement rate limiting
  - Create rate limit middleware
  - Use Redis for counting
  - Configure limits per endpoint
  - **User Story**: US-020
  - **Complexity**: Medium (4 hours)

---

## Phase 5: Chat Processing & Memory

**Duration**: 2 weeks
**Dependencies**: Phase 4
**Related Docs**: [memory.md](./memory.md)

### 5.1 Conversation Management

- [ ] **Task 5.1.1**: Create ConversationService
  - Implement startConversation() with UUID v4
  - Implement getConversation()
  - Implement listConversations()
  - Track conversation state
  - **User Story**: US-021
  - **Complexity**: Medium (5 hours)

- [ ] **Task 5.1.2**: Create MessageService
  - Implement addMessage()
  - Implement getMessages() with pagination
  - Store message embeddings
  - **User Story**: US-021
  - **Complexity**: Medium (5 hours)

- [ ] **Task 5.1.3**: Create conversation endpoints
  - Create POST /conversations
  - Create GET /conversations
  - Create GET /conversations/:id
  - Create POST /conversations/:id/messages
  - **User Story**: US-021
  - **Complexity**: Medium (5 hours)

### 5.2 Natural Language Processing

- [ ] **Task 5.2.1**: Create IntentParser
  - Identify time entry intent
  - Extract hours/duration
  - Extract project references
  - Extract date/time information
  - **User Story**: US-022
  - **Complexity**: High (12 hours)

- [ ] **Task 5.2.2**: Create TimeEntryHandler
  - Parse natural language time entries
  - Create time entries from chat
  - Handle ambiguous requests
  - Provide confirmation messages
  - **User Story**: US-022
  - **Complexity**: High (10 hours)

- [ ] **Task 5.2.3**: Create QueryHandler
  - Handle "show my time" queries
  - Handle project queries
  - Format responses in natural language
  - **User Story**: US-023
  - **Complexity**: Medium (8 hours)

### 5.3 Memory System

- [ ] **Task 5.3.1**: Implement short-term memory (Redis)
  - Store active conversation context
  - Store recent messages
  - Set appropriate TTL
  - **User Story**: US-024
  - **Complexity**: Medium (4 hours)

- [ ] **Task 5.3.2**: Implement long-term memory (PostgreSQL)
  - Store all conversation history
  - Create conversation_context table
  - Track conversation stages
  - **User Story**: US-024
  - **Complexity**: Medium (5 hours)

- [ ] **Task 5.3.3**: Implement semantic memory (embeddings)
  - Set up OpenAI API or alternative
  - Generate message embeddings
  - Store embeddings in PostgreSQL
  - Implement similarity search
  - **User Story**: US-024
  - **Complexity**: High (10 hours)

- [ ] **Task 5.3.4**: Create user memory system
  - Track user preferences
  - Store common patterns
  - Personalize responses
  - **User Story**: US-024
  - **Complexity**: Medium (6 hours)

### 5.4 Chat API

- [ ] **Task 5.4.1**: Create chat endpoint
  - Create POST /chat
  - Parse user message
  - Determine intent
  - Route to appropriate handler
  - Generate response
  - **User Story**: US-025
  - **Complexity**: High (10 hours)

- [ ] **Task 5.4.2**: Implement conversation context
  - Maintain conversation state
  - Load relevant memory
  - Inject context into responses
  - **User Story**: US-025
  - **Complexity**: Medium (6 hours)

- [ ] **Task 5.4.3**: Add error handling and fallbacks
  - Handle unrecognized intents
  - Provide helpful suggestions
  - Escalate to human support option
  - **User Story**: US-025
  - **Complexity**: Medium (4 hours)

---

## Phase 6: Frontend Foundation

**Duration**: 2 weeks
**Dependencies**: Phase 2, Phase 5
**Related Docs**: [code.md](./code.md)

### 6.1 Authentication UI

- [ ] **Task 6.1.1**: Create login page
  - Create app/(auth)/login/page.tsx
  - Build login form component
  - Handle email/password login
  - Handle Google OAuth button
  - **User Story**: US-008
  - **Complexity**: Medium (6 hours)

- [ ] **Task 6.1.2**: Create registration page
  - Create app/(auth)/register/page.tsx
  - Build registration form
  - Validate password strength
  - Handle form submission
  - **User Story**: US-007
  - **Complexity**: Medium (5 hours)

- [ ] **Task 6.1.3**: Create 2FA setup page
  - Create app/(auth)/2fa/setup/page.tsx
  - Display QR code
  - Verify TOTP code
  - Show backup codes
  - **User Story**: US-010
  - **Complexity**: Medium (6 hours)

- [ ] **Task 6.1.4**: Create 2FA verification page
  - Create app/(auth)/2fa/verify/page.tsx
  - Input for TOTP code
  - Handle verification
  - **User Story**: US-010
  - **Complexity**: Low (3 hours)

### 6.2 Authentication Context

- [ ] **Task 6.2.1**: Create AuthContext
  - Implement login(), logout()
  - Implement verify2FA()
  - Store user state
  - Handle token refresh
  - **User Story**: US-008
  - **Complexity**: High (8 hours)

- [ ] **Task 6.2.2**: Create useAuth hook
  - Expose auth methods
  - Provide user data
  - Handle loading states
  - **User Story**: US-008
  - **Complexity**: Low (2 hours)

- [ ] **Task 6.2.3**: Create ProtectedRoute component
  - Check authentication
  - Redirect to login if needed
  - Show loading state
  - **User Story**: US-008
  - **Complexity**: Medium (3 hours)

### 6.3 Chat Interface

- [ ] **Task 6.3.1**: Create chat layout
  - Create app/chat/layout.tsx
  - Design sidebar for conversations
  - Create main chat area
  - Add mobile responsiveness
  - **User Story**: US-026
  - **Complexity**: Medium (6 hours)

- [ ] **Task 6.3.2**: Create ChatMessages component
  - Display message history
  - Style user vs assistant messages
  - Auto-scroll to bottom
  - Load more messages on scroll
  - **User Story**: US-026
  - **Complexity**: Medium (6 hours)

- [ ] **Task 6.3.3**: Create ChatInput component
  - Text input with send button
  - Handle Enter key
  - Show loading state
  - Handle errors
  - **User Story**: US-026
  - **Complexity**: Low (3 hours)

- [ ] **Task 6.3.4**: Create ConversationList component
  - List user conversations
  - Show conversation titles
  - Highlight active conversation
  - Add new conversation button
  - **User Story**: US-026
  - **Complexity**: Medium (5 hours)

- [ ] **Task 6.3.5**: Integrate chat API
  - Connect to POST /chat endpoint
  - Handle streaming responses (optional)
  - Update conversation in real-time
  - **User Story**: US-026
  - **Complexity**: Medium (6 hours)

### 6.4 Shared Components

- [ ] **Task 6.4.1**: Create Button component
  - Support variants (primary, secondary, danger)
  - Support sizes (sm, md, lg)
  - Handle loading state
  - **User Story**: All
  - **Complexity**: Low (2 hours)

- [ ] **Task 6.4.2**: Create Input component
  - Support different types
  - Show validation errors
  - Support icons
  - **User Story**: All
  - **Complexity**: Low (3 hours)

- [ ] **Task 6.4.3**: Create Modal component
  - Support different sizes
  - Handle close on overlay click
  - Add animation
  - **User Story**: All
  - **Complexity**: Medium (4 hours)

- [ ] **Task 6.4.4**: Create Table component
  - Support sorting
  - Support pagination
  - Make responsive
  - **User Story**: All
  - **Complexity**: Medium (5 hours)

---

## Phase 7: Admin Interface

**Duration**: 3 weeks
**Dependencies**: Phase 6
**Related Docs**: [code.md](./code.md), [authentication.md](./authentication.md)

### 7.1 Admin Layout

- [ ] **Task 7.1.1**: Create admin layout
  - Create app/(admin)/layout.tsx
  - Add navigation sidebar
  - Add header with user menu
  - Make responsive
  - **User Story**: US-027
  - **Complexity**: Medium (6 hours)

- [ ] **Task 7.1.2**: Create admin dashboard
  - Create app/(admin)/dashboard/page.tsx
  - Show key metrics (users, projects, time entries)
  - Add charts for time tracking
  - Show recent activity
  - **User Story**: US-027
  - **Complexity**: High (10 hours)

### 7.2 User Management

- [ ] **Task 7.2.1**: Create user list page
  - Create app/(admin)/users/page.tsx
  - Display users in table
  - Add search and filters
  - Show user status (active, inactive)
  - **User Story**: US-028
  - **Complexity**: Medium (6 hours)

- [ ] **Task 7.2.2**: Create user detail page
  - Create app/(admin)/users/[id]/page.tsx
  - Show user information
  - Display user roles
  - Show activity history
  - **User Story**: US-028
  - **Complexity**: Medium (5 hours)

- [ ] **Task 7.2.3**: Create user form components
  - Create AddUserForm component
  - Create EditUserForm component
  - Handle role assignment
  - **User Story**: US-028
  - **Complexity**: Medium (6 hours)

- [ ] **Task 7.2.4**: Add impersonation button
  - Add "Sign in as" button to user list
  - Implement impersonation flow
  - Show confirmation dialog
  - **User Story**: US-006
  - **Complexity**: Medium (4 hours)

### 7.3 Impersonation UI

- [ ] **Task 7.3.1**: Create ImpersonationContext
  - Implement startImpersonation()
  - Implement endImpersonation()
  - Manage impersonation state
  - **User Story**: US-006
  - **Complexity**: Medium (4 hours)

- [ ] **Task 7.3.2**: Create ImpersonationBanner
  - Show yellow warning banner
  - Display target user email
  - Add "Exit Impersonation" button
  - Make always visible
  - **User Story**: US-006
  - **Complexity**: Low (3 hours)

### 7.4 Role & Capability Management

- [ ] **Task 7.4.1**: Create roles list page
  - Create app/(admin)/roles/page.tsx
  - Display roles in table
  - Show capability count
  - Add create/edit actions
  - **User Story**: US-029
  - **Complexity**: Medium (5 hours)

- [ ] **Task 7.4.2**: Create role detail page
  - Create app/(admin)/roles/[id]/page.tsx
  - Show role information
  - List assigned capabilities
  - Manage capability assignments
  - **User Story**: US-029
  - **Complexity**: High (8 hours)

- [ ] **Task 7.4.3**: Create capability management UI
  - Create CapabilityList component
  - Show allow/deny status
  - Toggle capability assignment
  - Handle explicit deny
  - **User Story**: US-029
  - **Complexity**: Medium (6 hours)

### 7.5 Project Management (Admin)

- [ ] **Task 7.5.1**: Create projects list page
  - Create app/(admin)/projects/page.tsx
  - Display all projects across clients
  - Add filters (client, status, date)
  - Show project statistics
  - **User Story**: US-030
  - **Complexity**: Medium (6 hours)

- [ ] **Task 7.5.2**: Create project detail page
  - Create app/(admin)/projects/[id]/page.tsx
  - Show project information
  - Display team members
  - Show time entries
  - List tasks
  - **User Story**: US-030
  - **Complexity**: High (8 hours)

### 7.6 Time Entry Management (Admin)

- [ ] **Task 7.6.1**: Create time entries list page
  - Create app/(admin)/time-entries/page.tsx
  - Display all time entries
  - Add filters (user, project, date range)
  - Show total hours
  - **User Story**: US-031
  - **Complexity**: Medium (6 hours)

- [ ] **Task 7.6.2**: Add bulk operations
  - Select multiple entries
  - Bulk approve/reject
  - Bulk export
  - **User Story**: US-031
  - **Complexity**: Medium (5 hours)

### 7.7 Audit Log Viewer

- [ ] **Task 7.7.1**: Create audit logs page
  - Create app/(admin)/audit/page.tsx
  - Display audit trail
  - Add filters (user, action, date)
  - Show before/after values
  - Highlight impersonation actions
  - **User Story**: US-032
  - **Complexity**: High (8 hours)

---

## Phase 8: Reporting & Analytics

**Duration**: 1.5 weeks
**Dependencies**: Phase 7
**Related Docs**: [instructions.md](./instructions.md)

### 8.1 Reporting Backend

- [ ] **Task 8.1.1**: Create ReportService
  - Implement time by user report
  - Implement time by project report
  - Implement time by date range report
  - Calculate totals and averages
  - **User Story**: US-033
  - **Complexity**: High (10 hours)

- [ ] **Task 8.1.2**: Create report endpoints
  - Create GET /reports/time-by-user
  - Create GET /reports/time-by-project
  - Create GET /reports/time-by-date
  - Support CSV export
  - **User Story**: US-033
  - **Complexity**: Medium (6 hours)

### 8.2 Reporting Frontend

- [ ] **Task 8.2.1**: Create reports page
  - Create app/(admin)/reports/page.tsx
  - Add report type selector
  - Add date range picker
  - Add filter options
  - **User Story**: US-034
  - **Complexity**: Medium (6 hours)

- [ ] **Task 8.2.2**: Create chart components
  - Install chart library (Chart.js or Recharts)
  - Create TimeChart component
  - Create ProjectChart component
  - Make responsive
  - **User Story**: US-034
  - **Complexity**: Medium (6 hours)

- [ ] **Task 8.2.3**: Implement export functionality
  - Add export to CSV button
  - Add export to PDF button
  - Format exports properly
  - **User Story**: US-034
  - **Complexity**: Medium (5 hours)

### 8.3 Dashboard Widgets

- [ ] **Task 8.3.1**: Create StatsCards component
  - Show total time tracked
  - Show active projects count
  - Show active users count
  - Show efficiency metrics
  - **User Story**: US-027
  - **Complexity**: Low (3 hours)

- [ ] **Task 8.3.2**: Create RecentActivity widget
  - Show recent time entries
  - Show recent user logins
  - Show recent projects
  - **User Story**: US-027
  - **Complexity**: Medium (4 hours)

---

## Phase 9: Testing & Quality Assurance

**Duration**: 2 weeks
**Dependencies**: All previous phases
**Related Docs**: [test.md](./test.md)

### 9.1 Unit Tests

- [ ] **Task 9.1.1**: Test authentication services
  - Test JWTService
  - Test TwoFactorService
  - Test GoogleAuthService
  - **User Story**: All
  - **Complexity**: High (12 hours)

- [ ] **Task 9.1.2**: Test authorization service
  - Test permission checking
  - Test explicit deny logic
  - Test caching
  - **User Story**: US-005
  - **Complexity**: Medium (6 hours)

- [ ] **Task 9.1.3**: Test database services
  - Test DatabaseService
  - Test multi-tenant isolation
  - Test connection management
  - **User Story**: US-004
  - **Complexity**: High (8 hours)

- [ ] **Task 9.1.4**: Test business logic services
  - Test ProjectService
  - Test TimeEntryService
  - Test TaskService
  - **User Story**: US-016, US-017, US-018
  - **Complexity**: High (10 hours)

### 9.2 Integration Tests

- [ ] **Task 9.2.1**: Test authentication flow
  - Test registration → login → 2FA
  - Test token refresh
  - Test Google OAuth
  - **User Story**: US-007, US-008, US-010, US-011
  - **Complexity**: High (10 hours)

- [ ] **Task 9.2.2**: Test authorization flow
  - Test role assignment
  - Test permission checking
  - Test explicit deny
  - **User Story**: US-005
  - **Complexity**: Medium (6 hours)

- [ ] **Task 9.2.3**: Test impersonation flow
  - Test start impersonation
  - Test actions during impersonation
  - Test exit impersonation
  - **User Story**: US-006
  - **Complexity**: Medium (6 hours)

### 9.3 E2E Tests

- [ ] **Task 9.3.1**: Test user chat flow
  - Test login
  - Test creating time entry via chat
  - Test querying time
  - **User Story**: US-026
  - **Complexity**: High (8 hours)

- [ ] **Task 9.3.2**: Test admin user management
  - Test creating user
  - Test assigning roles
  - Test impersonation
  - **User Story**: US-028, US-006
  - **Complexity**: High (8 hours)

- [ ] **Task 9.3.3**: Test reporting flow
  - Test generating reports
  - Test exporting data
  - **User Story**: US-034
  - **Complexity**: Medium (5 hours)

### 9.4 Security Testing

- [ ] **Task 9.4.1**: Test authentication security
  - Test password hashing
  - Test token rotation
  - Test 2FA bypass attempts
  - **User Story**: US-003, US-010
  - **Complexity**: High (8 hours)

- [ ] **Task 9.4.2**: Test authorization security
  - Test permission bypasses
  - Test explicit deny enforcement
  - Test impersonation restrictions
  - **User Story**: US-005, US-006
  - **Complexity**: High (8 hours)

- [ ] **Task 9.4.3**: Test multi-tenant isolation
  - Verify data separation
  - Test cross-tenant access attempts
  - **User Story**: US-004
  - **Complexity**: High (6 hours)

### 9.5 Performance Testing

- [ ] **Task 9.5.1**: Load test API endpoints
  - Test concurrent requests
  - Measure response times
  - Identify bottlenecks
  - **User Story**: All
  - **Complexity**: High (8 hours)

- [ ] **Task 9.5.2**: Test database performance
  - Test query performance
  - Test connection pool limits
  - Optimize slow queries
  - **User Story**: All
  - **Complexity**: High (8 hours)

---

## Phase 10: Deployment & DevOps

**Duration**: 1 week
**Dependencies**: Phase 9
**Related Docs**: [instructions.md](./instructions.md)

### 10.1 Production Setup

- [ ] **Task 10.1.1**: Set up production database
  - Choose cloud provider (Supabase/Railway/Neon)
  - Create main database
  - Configure connection pooling
  - Set up automated backups
  - **User Story**: US-035
  - **Complexity**: Medium (4 hours)

- [ ] **Task 10.1.2**: Set up Redis
  - Deploy Redis instance
  - Configure connection
  - Test caching
  - **User Story**: US-035
  - **Complexity**: Low (2 hours)

- [ ] **Task 10.1.3**: Configure environment variables
  - Set all production env vars
  - Generate production RSA keys
  - Configure OAuth credentials
  - **User Story**: US-035
  - **Complexity**: Low (2 hours)

### 10.2 Backend Deployment

- [ ] **Task 10.2.1**: Deploy backend to Railway/Render
  - Create deployment configuration
  - Set up environment variables
  - Configure health check
  - Test deployment
  - **User Story**: US-036
  - **Complexity**: Medium (4 hours)

- [ ] **Task 10.2.2**: Set up monitoring
  - Configure error tracking (Sentry)
  - Set up logging
  - Create alerts
  - **User Story**: US-036
  - **Complexity**: Medium (4 hours)

### 10.3 Frontend Deployment

- [ ] **Task 10.3.1**: Deploy frontend to Vercel
  - Connect GitHub repository
  - Configure environment variables
  - Set up preview deployments
  - **User Story**: US-037
  - **Complexity**: Low (2 hours)

- [ ] **Task 10.3.2**: Configure custom domain
  - Set up DNS records
  - Configure SSL certificates
  - Test production URL
  - **User Story**: US-037
  - **Complexity**: Low (2 hours)

### 10.4 CI/CD Pipeline

- [ ] **Task 10.4.1**: Set up GitHub Actions
  - Create workflow for tests
  - Create workflow for linting
  - Create workflow for deployment
  - **User Story**: US-038
  - **Complexity**: Medium (5 hours)

- [ ] **Task 10.4.2**: Configure automated migrations
  - Run migrations on deploy
  - Handle migration failures
  - Set up rollback strategy
  - **User Story**: US-038
  - **Complexity**: Medium (4 hours)

---

## Summary

**Total Estimated Duration**: 18-20 weeks

**Phase Breakdown**:
- Phase 1: Project Setup - 1 week
- Phase 2: Authentication & Authorization - 2 weeks
- Phase 3: Database & Multi-Tenancy - 1 week
- Phase 4: Backend Core Services - 2 weeks
- Phase 5: Chat Processing & Memory - 2 weeks
- Phase 6: Frontend Foundation - 2 weeks
- Phase 7: Admin Interface - 3 weeks
- Phase 8: Reporting & Analytics - 1.5 weeks
- Phase 9: Testing & QA - 2 weeks
- Phase 10: Deployment & DevOps - 1 week

**Total Tasks**: 200+ granular tasks

**Key Milestones**:
1. Week 3: Authentication & authorization complete
2. Week 6: Backend core services functional
3. Week 10: Chat interface operational
4. Week 13: Admin interface complete
5. Week 15: Testing complete
6. Week 16: Production deployment

---

## Related Documentation

- [User Stories](./userstories.md) - Detailed user stories for each feature
- [Test Plan](./test.md) - Comprehensive testing strategy
- [Instructions](./instructions.md) - Project overview and architecture
- [Code Standards](./code.md) - Coding best practices
- [Git Workflow](./git.md) - Git and commit standards
