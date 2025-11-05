# Contributing to FreeTimeChat

Thank you for your interest in contributing to FreeTimeChat! This document provides guidelines and instructions for contributing.

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL 16+
- Redis (optional, for caching)

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd FreeTimeChat
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Generate RSA keys for JWT**
   ```bash
   mkdir -p apps/api/keys
   openssl genrsa -out apps/api/keys/private.pem 2048
   openssl rsa -in apps/api/keys/private.pem -outform PEM -pubout -out apps/api/keys/public.pem
   ```

5. **Set up database**
   ```bash
   # Create main database
   createdb freetimechat_main

   # Run migrations
   pnpm db:migrate

   # Seed database
   pnpm db:seed
   ```

6. **Start development servers**
   ```bash
   pnpm dev
   ```

Visit:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `dev-N` - Auto-generated development branches (dev-1, dev-2, etc.)
- `feature/*` - Feature branches (for team collaboration)

### Making Changes

1. **Create a branch** (or use automated commit script)
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Test your changes**
   ```bash
   pnpm test
   pnpm lint
   pnpm type-check
   ```

4. **Commit your changes**
   ```bash
   # Option 1: Use automated commit script
   pnpm commit

   # Option 2: Manual commit
   git add .
   git commit -m "feat: your feature description"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Coding Standards

### TypeScript

- Use TypeScript for all code
- Enable strict mode
- Avoid `any` types (use `unknown` if needed)
- Add JSDoc comments for complex functions

### Naming Conventions

- **Files**: kebab-case (`user-service.ts`)
- **Components**: PascalCase (`UserProfile.tsx`)
- **Functions**: camelCase (`getUserById`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Interfaces**: PascalCase with `I` prefix optional (`User` or `IUser`)

### Code Organization

- Break large files into smaller modules
- One component per file
- Group related functionality
- Use barrel exports (`index.ts`)

See [.claude/code.md](.claude/code.md) for complete coding standards.

## Testing

### Running Tests

```bash
# All tests
pnpm test

# Unit tests only
pnpm test:unit

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### Writing Tests

- Write tests for all new features
- Aim for 80% code coverage minimum
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

See [.claude/test.md](.claude/test.md) for complete testing guidelines.

## Commit Message Format

We follow Conventional Commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

**Examples:**
```
feat(auth): add 2FA support

Implemented TOTP-based 2FA with QR code generation
and backup codes.

Closes #123
```

```
fix(api): resolve token refresh race condition

Added mutex lock to prevent concurrent refresh token usage.
```

## Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Ensure all tests pass**
4. **Update CHANGELOG** (if applicable)
5. **Request review** from maintainers
6. **Address review comments**
7. **Squash commits** if requested
8. **Merge** after approval

### PR Checklist

- [ ] Code follows style guidelines
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] No console.logs or debug code
- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] Prettier formatted

## Database Changes

### Creating Migrations

```bash
# Create migration
pnpm db:migrate

# Apply to production
pnpm db:migrate:deploy

# Reset database (dev only)
pnpm db:migrate:reset
```

### Multi-Tenant Considerations

- Main database changes: Update `schema-main.prisma`
- Client database changes: Update `schema-client.prisma`
- Test migrations on both database types
- Consider migration rollback strategy

## Security

### Reporting Vulnerabilities

**DO NOT** create public issues for security vulnerabilities.

Email security concerns to: security@freetimechat.com

### Security Best Practices

- Never commit secrets or API keys
- Use environment variables for configuration
- Validate and sanitize all inputs
- Use parameterized queries (Prisma handles this)
- Keep dependencies updated
- Follow OWASP Top 10 guidelines

## Documentation

### Where to Document

- **Code comments**: Complex logic, algorithms
- **JSDoc**: Public APIs, exported functions
- **README**: Setup and quick start
- **`.claude/` directory**: Architecture and design decisions
- **Wiki**: Tutorials and guides

### Documentation Standards

- Write clear, concise documentation
- Include code examples
- Keep documentation up-to-date with code changes
- Use diagrams for complex concepts

## Getting Help

- **Documentation**: Check `.claude/` directory
- **Issues**: Search existing issues
- **Discussions**: Use GitHub Discussions
- **Chat**: Join our Discord (if available)

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism
- Focus on what's best for the community
- Show empathy towards others

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md
- Release notes
- Annual contributor report

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to FreeTimeChat! 🎉
