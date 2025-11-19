# AfricAI Digital Books Web App

Next.js frontend application for AfricAI Digital Books with dual interface:

- **Chat Interface**: Natural language time entry
- **Admin Dashboard**: User and system management

## Tech Stack

- **Next.js 16+** with App Router and Turbopack
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Context** for state management
- **localStorage** for authentication persistence

## Getting Started

### Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Environment Variables

Create `.env.local` file:

```bash
cp .env.example .env.local
```

Required variables:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_NAME=AfricAI Digital Books
```

## Authentication System

### AuthContext Implementation

**Location**: `src/contexts/AuthContext.tsx`

The authentication system uses React Context with localStorage persistence:

#### Features

- **Token Persistence**: Access and refresh tokens stored in localStorage
- **Automatic Loading**: Tokens loaded on app mount
- **Auto Refresh**: Tokens automatically refreshed every 14 minutes
- **Secure Logout**: Clears tokens from both state and localStorage

#### Token Storage

```typescript
// Login - stores tokens
localStorage.setItem('accessToken', token);
localStorage.setItem('refreshToken', token);

// Mount - loads tokens
const storedAccessToken = localStorage.getItem('accessToken');
const storedRefreshToken = localStorage.getItem('refreshToken');

// Logout - clears tokens
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
```

#### Usage

```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, login, logout, getAuthHeaders } = useAuth();

  // Check if authenticated
  if (!user) return <LoginForm />;

  // Make authenticated API calls
  const headers = getAuthHeaders();
  fetch(`${API_URL}/endpoint`, { headers });
}
```

### Protected Routes

**Location**: `src/components/auth/ProtectedRoute.tsx`

Wraps pages that require authentication:

```typescript
<ProtectedRoute>
  <MyProtectedPage />
</ProtectedRoute>
```

### Admin Routes

**Location**: `src/app/admin/layout.tsx`

Admin layout checks for admin role:

```typescript
// Redirects non-admin users to chat
if (!user?.roles?.includes('admin')) {
  router.push('/chat');
}
```

## Project Structure

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── admin/             # Admin dashboard pages
│   │   │   ├── dashboard/     # Admin stats and overview
│   │   │   ├── users/         # User management
│   │   │   ├── roles/         # Role management
│   │   │   ├── clients/       # Client management
│   │   │   └── capabilities/  # Capability management
│   │   ├── chat/              # Chat interface
│   │   ├── login/             # Login page
│   │   └── register/          # Registration page
│   ├── components/            # React components
│   │   ├── auth/             # Authentication components
│   │   ├── ui/               # UI components (Card, Button, etc.)
│   │   └── chat/             # Chat-specific components
│   ├── contexts/             # React contexts
│   │   └── AuthContext.tsx   # Authentication state
│   ├── hooks/                # Custom React hooks
│   │   └── useAuth.ts        # Auth hook
│   └── lib/                  # Utilities
└── public/                   # Static assets
```

## Features

### Chat Interface

- Natural language time entry
- Conversation history
- Real-time responses
- Project and task tracking

### Admin Dashboard

- User management (CRUD)
- Role management with capabilities
- Client (tenant) management
- System statistics and analytics
- Impersonation support

## Development

### Hot Module Replacement

Next.js automatically reloads components on save with Fast Refresh.

### Type Safety

TypeScript types are shared via `@freetimechat/types` package:

```typescript
import type { User, Project } from '@freetimechat/types';
```

### Styling

Tailwind CSS with custom configuration:

```typescript
// Example component
<div className="bg-white shadow-md rounded-lg p-6">
  <h1 className="text-2xl font-bold text-gray-900">Title</h1>
</div>
```

## Security

### XSS Protection

- All user inputs sanitized
- React escapes by default
- Content Security Policy enforced

### Token Security

- Tokens stored in localStorage (XSS vulnerable - use CSP)
- Automatic token refresh
- Secure logout clears all tokens

**Security Consideration**: localStorage is vulnerable to XSS attacks. Ensure:

1. Content Security Policy is properly configured
2. All user inputs are validated and sanitized
3. Dependencies are kept up to date

For production, consider using HttpOnly cookies with server-side rendering.

## API Integration

### Making Authenticated Requests

```typescript
const { getAuthHeaders } = useAuth();

const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/endpoint`, {
  method: 'GET',
  headers: getAuthHeaders(),
});
```

### Error Handling

```typescript
if (!response.ok) {
  if (response.status === 401) {
    // Token expired, AuthContext handles refresh
    await refreshUser();
  }
  throw new Error('API request failed');
}
```

## Build & Deploy

### Production Build

```bash
pnpm build
```

### Environment Variables

Production requires:

- `NEXT_PUBLIC_API_URL` - Backend API URL (must use HTTPS)
- `NEXT_PUBLIC_APP_NAME` - Application name
- All other vars from `.env.example`

### Deploy on Vercel

The easiest deployment option:

```bash
vercel deploy
```

Or connect your GitHub repository to Vercel for automatic deployments.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript](https://www.typescriptlang.org/docs)
