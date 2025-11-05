# Services

Business logic and data access layer.

## Structure

Services contain the core business logic of the application:

```
services/
├── auth.service.ts       # Authentication logic
├── user.service.ts       # User business logic
├── project.service.ts    # Project business logic
├── time.service.ts       # Time entry logic
└── database.service.ts   # Database connection management
```

## Usage

### Creating a Service

```typescript
// services/example.service.ts

export class ExampleService {
  /**
   * Get all examples
   */
  static async getAll() {
    // Business logic here
    return [];
  }

  /**
   * Get example by ID
   */
  static async getById(id: string) {
    // Business logic here
    return null;
  }

  /**
   * Create new example
   */
  static async create(data: any) {
    // Business logic here
    return data;
  }

  /**
   * Update example
   */
  static async update(id: string, data: any) {
    // Business logic here
    return data;
  }

  /**
   * Delete example
   */
  static async delete(id: string) {
    // Business logic here
    return true;
  }
}
```

### Using Services in Routes

```typescript
// routes/example.routes.ts
import { ExampleService } from '@/services/example.service';

router.get('/', async (req, res) => {
  const examples = await ExampleService.getAll();
  res.json(examples);
});
```

## Best Practices

- Keep services focused on a single domain/resource
- Use static methods for stateless operations
- Handle errors and throw custom exceptions
- Add JSDoc comments for complex methods
- Use TypeScript types for parameters and return values
- Keep database operations in services, not routes
- Services should be testable in isolation
