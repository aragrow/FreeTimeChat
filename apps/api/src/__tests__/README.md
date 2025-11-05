# FreeTimeChat API Tests

Comprehensive test suite for the FreeTimeChat API including unit tests, integration tests, and E2E tests.

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
**Passing**: 21/21 tests (100%)
- JWTService: 13/13 ✓
- PasswordService: 8/8 ✓

### Test Suites
- ✅ **Unit Tests**: JWT and Password services fully tested
- ✅ **Integration Tests**: Authentication flow test suite created
- ✅ **Test Infrastructure**: Complete with setup, mocks, and fixtures

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

### Jest Configuration
- **Preset**: ts-jest
- **Environment**: node
- **Coverage**: Enabled with text, lcov, and HTML reports
- **Timeout**: 10 seconds
- **Setup**: Automatic via setup.ts

### Test Environment Variables
All test environment variables are configured in `setup.ts`:
- NODE_ENV=test
- JWT_ACCESS_TOKEN_EXPIRY=15m
- JWT_REFRESH_TOKEN_EXPIRY=7d
- BCRYPT_ROUNDS=4 (faster tests)

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

**Last Updated**: 2025-11-05
**Maintainer**: FreeTimeChat Team
