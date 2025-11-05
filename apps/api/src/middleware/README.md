# Middleware

Express middleware functions for request processing.

## Structure

Middleware for authentication, validation, error handling, etc.:

```
middleware/
├── auth.middleware.ts          # Authentication middleware
├── validate.middleware.ts      # Request validation
├── errorHandler.middleware.ts  # Error handling
├── rateLimit.middleware.ts     # Rate limiting
└── logger.middleware.ts        # Request logging
```

## Usage

### Creating Middleware

```typescript
// middleware/example.middleware.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Example middleware
 */
export function exampleMiddleware(req: Request, res: Response, next: NextFunction) {
  // Middleware logic here
  console.log('Example middleware executed');

  // Continue to next middleware
  next();
}

/**
 * Middleware with parameters
 */
export function parameterizedMiddleware(option: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log('Option:', option);
    next();
  };
}
```

### Using Middleware

```typescript
// In routes
import { exampleMiddleware, parameterizedMiddleware } from '@/middleware/example.middleware';

// Apply to specific route
router.get('/protected', exampleMiddleware, (req, res) => {
  res.json({ message: 'Protected route' });
});

// Apply with parameters
router.post('/data', parameterizedMiddleware('create'), (req, res) => {
  res.json({ message: 'Data created' });
});
```

```typescript
// In app.ts (global middleware)
import { exampleMiddleware } from '@/middleware/example.middleware';

app.use(exampleMiddleware);
```

## Common Middleware Types

### Authentication Middleware

```typescript
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Verify token and attach user to request
  next();
}
```

### Validation Middleware

```typescript
export function validateBody(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    next();
  };
}
```

### Error Handling Middleware

```typescript
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(err);

  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
```

## Best Practices

- Keep middleware focused on a single responsibility
- Use `next()` to pass control to the next middleware
- Handle errors properly with `next(error)`
- Add TypeScript types for custom request properties
- Document middleware purpose and usage
- Test middleware in isolation
