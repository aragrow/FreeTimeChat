# AfricAI Digital Books API

Express backend API for AfricAI Digital Books application.

## Features

- **TypeScript**: Fully typed API with strict mode
- **Express**: Fast, unopinionated web framework
- **Security**: Helmet, CORS, rate limiting
- **Logging**: Morgan for request logging
- **Hot Reload**: Nodemon for development
- **Multi-tenant**: Database-per-client architecture
- **Authentication**: JWT with RS256, 2FA, Google OAuth
- **Authorization**: RBAC with capabilities

## Project Structure

```
apps/api/
├── src/
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic layer
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript type definitions
│   ├── app.ts           # Express app configuration
│   └── index.ts         # Server entry point
├── keys/                # JWT RSA keys (gitignored)
├── .env                 # Environment variables (gitignored)
├── .env.example         # Environment template
├── nodemon.json         # Nodemon configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL 14+
- Redis 6+ (optional, for caching)

### Installation

```bash
# Install dependencies (from root)
pnpm install

# Generate JWT keys
pnpm keys:generate

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Development

```bash
# Start development server
pnpm dev

# Or from root
pnpm dev:api
```

Server will start on `http://localhost:4000`

### Building

```bash
# Build TypeScript
pnpm build

# Start production server
pnpm start
```

## Environment Variables

See `.env.example` for all available environment variables.

Key variables:
- `PORT`: Server port (default: 4000)
- `DATABASE_URL`: Main database connection string
- `JWT_PRIVATE_KEY_PATH`: Path to JWT private key
- `JWT_PUBLIC_KEY_PATH`: Path to JWT public key
- `REDIS_URL`: Redis connection string
- `CORS_ORIGIN`: Allowed CORS origin

## API Documentation

### Base URL

- Development: `http://localhost:4000`
- Production: TBD

### Health Check

```
GET /
```

Returns API status and version.

### API Routes

Routes will be available under `/api` prefix:

- `/api/auth` - Authentication (login, register, refresh, 2FA)
- `/api/users` - User management
- `/api/projects` - Project management
- `/api/time-entries` - Time tracking
- `/api/chat` - Chat interface
- `/api/admin` - Admin operations

## Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build TypeScript to JavaScript
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript compiler check
- `pnpm clean` - Clean build artifacts

## Architecture

### Multi-Tenant Database

- **Main Database**: Stores users, clients, roles, capabilities, auth tokens
- **Client Databases**: Each client has their own database for transactional data
- **Database Service**: Manages connections and routing to correct database

### Authentication

- **JWT Tokens**: RS256 algorithm with RSA key pair
- **Access Tokens**: Short-lived (15 minutes)
- **Refresh Tokens**: Long-lived (7 days) with rotation
- **2FA**: TOTP-based two-factor authentication
- **Google OAuth**: Optional social login

### Authorization

- **RBAC**: Role-Based Access Control
- **Capabilities**: Fine-grained permissions
- **Explicit Deny**: Capability denials override allows
- **Impersonation**: Admin can impersonate users with audit trail

## Development Guidelines

### Code Organization

- **Routes**: Thin handlers, delegate to services
- **Services**: Business logic and data access
- **Middleware**: Request processing and validation
- **Types**: Shared TypeScript interfaces
- **Utils**: Pure utility functions

### Error Handling

Always use proper error handling:

```typescript
try {
  const result = await SomeService.operation();
  res.json(result);
} catch (error) {
  next(error); // Pass to error handler middleware
}
```

### Validation

Validate request data before processing:

```typescript
import { validateBody } from '@/middleware/validate.middleware';

router.post('/', validateBody(schema), async (req, res) => {
  // Request is validated
});
```

## Testing

```bash
# Run unit tests
pnpm test:unit

# Run integration tests
pnpm test:integration

# Run all tests
pnpm test
```

## Deployment

See deployment documentation in `.claude/instructions.md`

## Related Documentation

- [Project Overview](../../.claude/instructions.md)
- [Database Architecture](../../.claude/database.md)
- [Authentication](../../.claude/authentication.md)
- [Authorization](../../.claude/authorization.md)
- [Code Standards](../../.claude/code.md)
