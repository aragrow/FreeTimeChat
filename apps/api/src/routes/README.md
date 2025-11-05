# Routes

API route handlers organized by feature/resource.

## Structure

Routes should be organized by resource or feature:

```
routes/
├── auth.routes.ts      # Authentication routes
├── users.routes.ts     # User management routes
├── projects.routes.ts  # Project routes
├── time.routes.ts      # Time entry routes
└── index.ts            # Route aggregator
```

## Usage

### Creating a Route

```typescript
// routes/example.routes.ts
import { Router } from 'express';

const router = Router();

// GET /api/example
router.get('/', (req, res) => {
  res.json({ message: 'Example route' });
});

// POST /api/example
router.post('/', (req, res) => {
  // Handle POST
});

export default router;
```

### Registering Routes

```typescript
// routes/index.ts
import { Application } from 'express';
import exampleRoutes from './example.routes';

export function registerRoutes(app: Application) {
  app.use('/api/example', exampleRoutes);
}
```

## Best Practices

- Use descriptive route names
- Group related endpoints together
- Use proper HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Add route-level middleware as needed
- Keep route handlers thin - delegate to services
- Document routes with comments
