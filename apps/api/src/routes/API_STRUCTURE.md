# API Structure

FreeTimeChat API follows REST conventions with versioned endpoints.

## Base URL

- Development: `http://localhost:4000`
- API Base: `/api`
- Current Version: `/api/v1`

## Versioning

The API uses URL versioning with the format `/api/v{version}`.

- **v1**: Current stable version

## Available Endpoints

### Health Check

#### `GET /`
Root health check for quick status verification.

**Response:**
```json
{
  "status": "ok",
  "message": "FreeTimeChat API",
  "version": "0.1.0",
  "environment": "development",
  "timestamp": "2025-01-04T10:30:00.000Z"
}
```

#### `GET /api`
API information and available endpoints.

**Response:**
```json
{
  "status": "success",
  "message": "FreeTimeChat API",
  "version": "v1",
  "endpoints": {
    "health": "/api/v1/health",
    "healthDetailed": "/api/v1/health/detailed"
  }
}
```

#### `GET /api/v1/health`
Basic health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "FreeTimeChat API is running",
  "version": "0.1.0",
  "environment": "development",
  "timestamp": "2025-01-04T10:30:00.000Z",
  "uptime": 3600
}
```

#### `GET /api/v1/health/detailed`
Detailed health check with service status.

**Response:**
```json
{
  "status": "ok",
  "message": "FreeTimeChat API is running",
  "version": "0.1.0",
  "environment": "development",
  "timestamp": "2025-01-04T10:30:00.000Z",
  "uptime": 3600,
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

## Future Endpoints

The following endpoints will be available in future releases:

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/2fa/enable` - Enable 2FA
- `POST /api/v1/auth/2fa/verify` - Verify 2FA code
- `GET /api/v1/auth/google` - Google OAuth redirect
- `GET /api/v1/auth/google/callback` - Google OAuth callback

### Users
- `GET /api/v1/users` - List users
- `GET /api/v1/users/:id` - Get user by ID
- `POST /api/v1/users` - Create user
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### Projects
- `GET /api/v1/projects` - List projects
- `GET /api/v1/projects/:id` - Get project by ID
- `POST /api/v1/projects` - Create project
- `PATCH /api/v1/projects/:id` - Update project
- `DELETE /api/v1/projects/:id` - Delete project

### Time Entries
- `GET /api/v1/time-entries` - List time entries
- `GET /api/v1/time-entries/:id` - Get time entry by ID
- `POST /api/v1/time-entries` - Create time entry
- `PATCH /api/v1/time-entries/:id` - Update time entry
- `DELETE /api/v1/time-entries/:id` - Delete time entry

### Chat
- `POST /api/v1/chat` - Send chat message
- `GET /api/v1/chat/conversations` - List conversations
- `GET /api/v1/chat/conversations/:id` - Get conversation
- `POST /api/v1/chat/conversations` - Create conversation

### Admin
- `GET /api/v1/admin/users` - Admin user management
- `GET /api/v1/admin/roles` - Role management
- `GET /api/v1/admin/audit` - Audit logs
- `POST /api/v1/admin/impersonate/start` - Start impersonation
- `POST /api/v1/admin/impersonate/end` - End impersonation

## Response Formats

### Success Response

```typescript
{
  status: 'success',
  data: any,
  message?: string
}
```

### Error Response

```typescript
{
  status: 'error',
  message: string,
  errors?: any,
  stack?: string // Only in development
}
```

### Paginated Response

```typescript
{
  status: 'success',
  data: any[],
  pagination: {
    page: number,
    perPage: number,
    total: number,
    totalPages: number,
    hasNext: boolean,
    hasPrev: boolean
  }
}
```

## HTTP Status Codes

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `204 No Content` - Successful request with no response body
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate email)
- `422 Unprocessable Entity` - Validation errors
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Error Handling

All errors follow a standard format and are handled by the centralized error middleware. Use the custom error classes:

```typescript
import { BadRequestError, UnauthorizedError, NotFoundError } from '@/utils/errors';

// Example
throw new NotFoundError('User not found');
throw new BadRequestError('Invalid email format');
```

## Authentication

Protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Rate Limiting

Rate limiting will be applied to prevent abuse:

- Default: 100 requests per 15 minutes per IP
- Auth endpoints: 5 requests per 15 minutes per IP
- Configurable via environment variables
