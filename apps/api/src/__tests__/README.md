# FreeTimeChat API Tests

Comprehensive test suite for the FreeTimeChat API including unit tests,
integration tests, and E2E tests.

## Test Structure

```
src/__tests__/
├── setup.ts                 # Global test setup
├── TEST_STATUS.md          # Test status tracking
├── README.md               # This file
├── helpers/
│   └── test-data.ts        # Mock data and test helpers
├── fixtures/
│   ├── test-private.pem    # Test RSA private key
│   └── test-public.pem     # Test RSA public key
├── unit/
│   └── services/
│       ├── jwt.service.test.ts           # JWT tests (13 tests ✓)
│       ├── password.service.test.ts      # Password tests (8 tests ✓)
│       ├── two-factor.service.test.ts    # 2FA tests
│       └── capability.service.test.ts    # Permission tests
└── integration/
    └── auth-flow.test.ts   # Complete auth flow tests
```

## Running Tests

### All Tests

```bash
pnpm test
```

### Unit Tests Only

```bash
pnpm test:unit
```

### Integration Tests Only

```bash
pnpm test:integration
```

**Note**: Integration tests require a running database. See
[Integration Tests](#integration-tests) section below.

### Watch Mode (for development)

```bash
pnpm test:watch
```

### Coverage Report

```bash
pnpm test:coverage
```

## Test Results

### Current Status

**Unit Tests**: 45/45 tests passing (100%)

- JWTService: 13/13 ✓
- PasswordService: 8/8 ✓
- TwoFactorService: 12/12 ✓
- CapabilityService: 12/12 ✓

**Integration Tests**: Conditional (requires database)

- Authentication Flow: 13 tests (skipped without database)

### Test Suites

- ✅ **Unit Tests**: All core services fully tested (45 tests)
- ✅ **Integration Tests**: Conditional - skip gracefully without database
- ✅ **Test Infrastructure**: Complete with setup, mocks, and fixtures

## Integration Tests

Integration tests require a running PostgreSQL database. They are
**conditionally skipped** if:

- Database connection fails
- `SKIP_INTEGRATION_TESTS=true` environment variable is set

### Running Integration Tests

**Option 1: With Docker (Recommended)**

```bash
# Start database
docker-compose up -d

# Run migrations
pnpm --filter @freetimechat/api prisma:migrate:deploy:main
pnpm --filter @freetimechat/api prisma:migrate:deploy:client

# Run integration tests
pnpm test:integration
```

**Option 2: With Local PostgreSQL**

```bash
# Create test databases (if using local PostgreSQL)
createdb freetimechat_main
createdb freetimechat_client_dev

# Set environment variable
export DATABASE_URL="postgresql://user:password@localhost:5432/freetimechat_main"

# Run migrations
pnpm --filter @freetimechat/api prisma:migrate:deploy:main

# Run integration tests
pnpm test:integration
```

**Option 3: Skip Integration Tests**

```bash
# Explicitly skip integration tests
SKIP_INTEGRATION_TESTS=true pnpm test
```

### Integration Test Behavior

- **With Database**: All integration tests run normally
- **Without Database**: Tests skip gracefully with message:
  ```
  ⏭️  Database not available - integration tests will be skipped
  💡 To run integration tests, start the database with: docker-compose up -d
  ```
- **Unit Tests**: Always run regardless of database availability ✅

## Writing Tests

### Unit Test Example

```typescript
describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  it('should do something', async () => {
    const result = await service.doSomething();
    expect(result).toBe(expected);
  });
});
```

### Integration Test Example

```typescript
import request from 'supertest';
import { app } from '../../app';

describe('POST /api/v1/resource', () => {
  it('should create resource', async () => {
    const response = await request(app)
      .post('/api/v1/resource')
      .send({ data })
      .expect(201);

    expect(response.body.status).toBe('success');
  });
});
```

## Test Configuration

### Port-Agnostic Testing ✨

**The test suite is completely port-agnostic** - tests work regardless of which
port the API uses!

#### How It Works

Tests use supertest's `request(app)` pattern which invokes the Express app
directly:

```typescript
import request from 'supertest';
import { app } from '../../app';

// No server needed - app is invoked directly!
const response = await request(app)
  .post('/api/v1/auth/login')
  .send({ email: 'user@example.com', password: 'password' });
```

**Benefits:**

- ✅ No port conflicts
- ✅ No need to start a server
- ✅ Faster test execution
- ✅ Works in any environment (local, CI, Docker)

#### Environment Variables

All configuration respects environment variables with sensible defaults:

```bash
# API Configuration (auto-adapts, not directly used by tests)
PORT=3001              # API port (default: 3001)
API_URL=http://...     # Full API URL (auto-generated)

# Database Configuration (respects env vars)
DATABASE_URL=postgresql://...           # Main database
CLIENT_DATABASE_URL=postgresql://...    # Client database

# Redis Configuration (respects env vars)
REDIS_HOST=localhost                    # Redis host (default: localhost)
REDIS_PORT=6379                         # Redis port (default: 6379)
REDIS_PASSWORD=your_password            # Redis password
REDIS_DB=1                              # Redis database (default: 1 for tests)
```

#### Adaptive Timeouts

Test timeouts automatically adjust for CI environments:

- **Local**: 10 seconds
- **CI** (GitHub Actions): 30 seconds

See [`helpers/test-config.ts`](./helpers/test-config.ts) for configuration
utilities.

### Jest Configuration

- **Preset**: ts-jest
- **Environment**: node
- **Coverage**: Enabled with text, lcov, and HTML reports
- **Timeout**: Adaptive (10s local, 30s CI)
- **Setup**: Automatic via setup.ts

### Test Environment Variables

All test environment variables are configured in `setup.ts`:

- NODE_ENV=test
- PORT=3001 (or from env)
- API_URL=http://localhost:3001 (or from env)
- JWT_ACCESS_TOKEN_EXPIRY=15m
- JWT_REFRESH_TOKEN_EXPIRY=7d
- BCRYPT_ROUNDS=4 (faster tests)
- DATABASE_URL=postgresql://... (Docker defaults with env override)
- REDIS_HOST/PORT/PASSWORD (Docker defaults with env override)

## Best Practices

1. **Isolation**: Each test should be independent
2. **Mocking**: Mock external dependencies (database, APIs)
3. **Clarity**: Use descriptive test names
4. **Fast**: Unit tests should run in <100ms
5. **Coverage**: Aim for 80%+ code coverage
6. **Clean**: Clean up resources after tests

## Test Data

Test helpers and mock data are available in:

- `helpers/test-data.ts` - Mock users, JWT payloads, etc.

Example usage:

```typescript
import { mockUser, mockJWTPayload } from '../helpers/test-data';
```

## Debugging Tests

### Run Single Test File

```bash
pnpm test jwt.service.test.ts
```

### Run Tests Matching Pattern

```bash
pnpm test --testNamePattern="should verify"
```

### Enable Verbose Output

```bash
pnpm test --verbose
```

### Debug in VS Code

Add breakpoints and use the Jest extension or:

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## CI/CD Integration

Tests run automatically on:

- Pull requests
- Push to main/dev branches
- Pre-commit hooks (via Husky)

### Required Checks

- All unit tests must pass
- Integration tests must pass
- Code coverage must be >70%

## Contributing

When adding new features:

1. Write tests first (TDD)
2. Ensure all tests pass
3. Update TEST_STATUS.md
4. Add integration tests for new flows
5. Run coverage report

## Troubleshooting

### Tests Timing Out

- Increase timeout in jest.config.js
- Check for async operations without await
- Ensure database connections are closed

### Mock Issues

- Clear mocks between tests with jest.clearAllMocks()
- Reset modules with jest.resetModules()
- Check mock implementation matches actual service

### Database Tests

- Use test database or in-memory database
- Clean up data after each test
- Use transactions for isolation

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)

---

**Last Updated**: 2025-11-05 **Maintainer**: FreeTimeChat Team
