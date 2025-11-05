# Lib

Library code, utilities, and shared functionality.

## Structure

### `/api`
API client and API-related utilities
- API client configuration
- Endpoint definitions
- Request/response interceptors
- Error handling

Example:
```tsx
// lib/api/client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: Number(process.env.NEXT_PUBLIC_API_TIMEOUT),
});
```

### `/utils`
General utility functions
- Date formatting
- String manipulation
- Validation helpers
- Type guards

Example:
```tsx
// lib/utils/format.ts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
```

### `/hooks`
Shared custom React hooks
- Use hooks for reusable logic
- Follow React hooks naming convention (use*)
- Include proper TypeScript types

Example:
```tsx
// lib/hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  // Implementation
}
```

## Guidelines

- Keep utilities pure and side-effect free
- Add unit tests for complex utilities
- Use TypeScript for all lib code
- Document with JSDoc for complex functions
