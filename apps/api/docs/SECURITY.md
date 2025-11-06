# Security Documentation

## Overview

This document outlines the security measures implemented in FreeTimeChat API and
provides guidelines for maintaining security best practices.

**Last Security Audit**: Run `pnpm analyze:security` to verify current security
posture.

## Table of Contents

1. [Authentication](#authentication)
2. [Authorization](#authorization)
3. [Input Validation](#input-validation)
4. [Data Protection](#data-protection)
5. [API Security](#api-security)
6. [Infrastructure Security](#infrastructure-security)
7. [Security Checklist](#security-checklist)
8. [Incident Response](#incident-response)

---

## Authentication

### Password Security

**Implementation**:
[src/services/password.service.ts](../src/services/password.service.ts)

#### Hashing Algorithm

- **Library**: bcrypt
- **Rounds**: Configured via `BCRYPT_ROUNDS` environment variable
  - Development/Testing: 4 rounds (faster)
  - Production: 10-12 rounds (recommended)

```typescript
// password.service.ts
const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
const hash = await bcrypt.hash(password, saltRounds);
```

#### Password Requirements

- Minimum length: 8 characters
- Must contain:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character

### JWT (JSON Web Tokens)

**Implementation**:
[src/services/jwt.service.ts](../src/services/jwt.service.ts)

#### Token Types

1. **Access Token**: Short-lived (15 minutes), used for API requests
2. **Refresh Token**: Long-lived (7 days), used to obtain new access tokens

#### Security Features

**RS256 Algorithm** (Asymmetric)

- Private key signs tokens (kept server-side)
- Public key verifies tokens (can be shared)
- More secure than HS256 for distributed systems

```typescript
// Token structure
{
  "userId": "uuid",
  "email": "user@example.com",
  "clientId": "uuid",
  "jti": "unique-token-id",  // Prevents token reuse
  "iat": 1234567890,
  "exp": 1234567990,
  "iss": "freetimechat-api",
  "aud": "freetimechat-web"
}
```

**Key Features**:

- ✅ Unique token IDs (jti claim) for tracking/revocation
- ✅ Configurable expiration times
- ✅ Issuer and audience validation
- ✅ Keys loaded from files (not environment variables)

#### Token Storage

- Access tokens: Memory or session storage (client-side)
- Refresh tokens: HttpOnly cookies (prevents XSS)
- Token revocation: Database tracking with `isRevoked` flag

### Refresh Token Security

**Implementation**:
[src/services/auth.service.ts](../src/services/auth.service.ts)

#### Token Rotation

- Each refresh generates a new refresh token
- Old token is immediately invalidated
- Tracks token "families" to detect theft

```typescript
// Token family flow
Login → RefreshToken1 (familyId: A)
Refresh → RefreshToken2 (familyId: A) // RT1 revoked
Refresh → RefreshToken3 (familyId: A) // RT2 revoked

// If RT1 is used again (stolen!):
// → Revoke entire family (all tokens with familyId: A)
```

#### Features

- ✅ Automatic token rotation
- ✅ Family-based revocation for security
- ✅ Expiration tracking
- ✅ Device information logging (audit trail)

### OAuth 2.0 (Google)

**Implementation**: [src/routes/auth.routes.ts](../src/routes/auth.routes.ts)

#### Security Measures

- HTTPS-only callback URLs (production)
- State parameter for CSRF protection
- Client secret stored in environment variables
- User email verification via Google
- Account linking with existing users

```typescript
// OAuth callback URL validation
callbackURL: process.env.GOOGLE_CALLBACK_URL,  // Must use HTTPS in production
```

### Two-Factor Authentication (2FA)

**Implementation**:
[src/routes/two-factor.routes.ts](../src/routes/two-factor.routes.ts)

#### TOTP (Time-based One-Time Password)

- Library: speakeasy
- Algorithm: SHA-1 (TOTP standard)
- Time step: 30 seconds
- Tolerance: ±1 time step (prevents clock drift issues)

#### 2FA Flow

1. User enables 2FA: Generate secret, show QR code
2. User scans QR code with authenticator app
3. User enters verification code to confirm setup
4. Future logins require: password + TOTP code

#### Secret Storage

- Encrypted in database using `two_factor_secret` field
- Only accessible when user is authenticated
- Backed up with recovery codes (recommended)

---

## Authorization

### Role-Based Access Control (RBAC)

**Implementation**:
[src/middleware/permission.middleware.ts](../src/middleware/permission.middleware.ts)

#### Core Concepts

- **Roles**: Collections of capabilities (e.g., Admin, Manager, Employee)
- **Capabilities**: Specific permissions (e.g., `projects:read`,
  `timesheets:approve`)
- **Users**: Assigned one or more roles
- **Allow/Deny**: Explicit allow or deny rules per capability

#### Permission Model

```prisma
User ─── UserRole ─── Role ─── RoleCapability ─── Capability
                               (allow/deny)
```

#### Capability Naming Convention

```
resource:action
```

Examples:

- `projects:read` - View projects
- `projects:write` - Create/update projects
- `users:delete` - Delete users
- `admin:*` - All admin capabilities

#### Middleware Usage

```typescript
// Protect route with capability requirement
router.get(
  '/projects',
  authenticate,
  requireCapability('projects:read'),
  projectController.list
);

// Check multiple capabilities (any)
router.post(
  '/projects',
  authenticate,
  requireCapabilities(['projects:write', 'admin:*'], 'any'),
  projectController.create
);

// Check multiple capabilities (all)
router.delete(
  '/users/:id',
  authenticate,
  requireCapabilities(['users:delete', 'admin:users'], 'all'),
  userController.delete
);
```

### Multi-Tenant Isolation

**Implementation**: Database-per-tenant architecture

#### Isolation Levels

**1. Database Level**

- Each client has a separate PostgreSQL database
- Complete data isolation
- No cross-tenant queries possible
- Database routing via Client registry

**2. Application Level**

- User's `clientId` in JWT payload
- All queries automatically scoped to client
- Middleware validates client context

**3. API Level**

- Authentication required for all protected endpoints
- Client context extracted from JWT
- Database connection switched per request

```typescript
// Automatic client scoping
const clientPrisma = getClientPrisma(user.clientId);
const projects = await clientPrisma.project.findMany();
// ^ Only returns projects for user's client
```

### Admin Impersonation

**Implementation**:
[src/services/impersonation.service.ts](../src/services/impersonation.service.ts)

#### Security Features

- Admin-only capability required
- Audit log of all impersonation sessions
- Tracks: admin user, target user, start/end time, reason, IP, user agent
- JWT includes impersonation metadata
- Limited duration sessions
- Cannot impersonate other admins

```typescript
// Impersonation JWT payload
{
  "userId": "target-user-id",
  "impersonation": {
    "adminUserId": "admin-user-id",
    "startedAt": "2025-01-01T00:00:00Z"
  }
}
```

---

## Input Validation

### Validation Library

**Library**: Zod **Implementation**: Throughout routes and services

#### Validation Layers

**1. Route Level** (Primary)

```typescript
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

router.post('/projects', authenticate, (req, res) => {
  const data = createProjectSchema.parse(req.body); // Throws if invalid
  // ...
});
```

**2. Service Level** (Defense in depth)

```typescript
// Validate in service methods too
async createProject(data: unknown) {
  const validated = createProjectSchema.parse(data);
  // ...
}
```

### SQL Injection Protection

**Implementation**: Prisma ORM

#### Prisma Benefits

- Parameterized queries (all inputs escaped)
- Type-safe query building
- No raw SQL by default

```typescript
// ✅ Safe: Prisma automatically escapes
const user = await prisma.user.findUnique({
  where: { email: req.body.email }, // Automatically escaped
});

// ⚠️  Use with caution: Raw SQL
const result = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${email}
`; // Prisma still escapes tagged templates
```

### XSS Protection

**Implementation**: Multiple layers

**1. Content Security Policy** (Helmet)

```typescript
helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"], // No inline scripts
    styleSrc: ["'self'", "'unsafe-inline'"],
  },
});
```

**2. Input Sanitization**

- All inputs validated with Zod
- HTML tags stripped from user input
- JSON responses (not HTML) prevent many XSS attacks

**3. Output Encoding**

- Express automatically encodes JSON responses
- Client-side framework (Next.js) escapes by default

---

## Data Protection

### Encryption at Rest

**Database**:

- PostgreSQL with encrypted volumes (production)
- TDE (Transparent Data Encryption) recommended

**Secrets**:

- Environment variables (`.env` file, never committed)
- Secret management service (AWS Secrets Manager, etc.) for production

### Encryption in Transit

**HTTPS/TLS**:

- Required in production
- TLS 1.2+ only
- Strong cipher suites
- HSTS headers enforced

```typescript
// Helmet HSTS configuration
hsts: {
  maxAge: 31536000,  // 1 year
  includeSubDomains: true,
  preload: true,
}
```

### Sensitive Data Handling

**Password Hashing**:

- ✅ bcrypt with salt
- ❌ Never log passwords
- ❌ Never return password hashes in API responses

**PII (Personally Identifiable Information)**:

- Email, name, phone numbers
- Logged only in audit trails
- Never included in error messages
- Excluded from analytics

### Soft Deletes

**Implementation**: `deletedAt` timestamp

**Benefits**:

- Data recovery possible
- Audit trail maintained
- Regulatory compliance (GDPR, etc.)

```typescript
// Soft delete
await prisma.user.update({
  where: { id },
  data: { deletedAt: new Date() },
});

// Always filter out deleted items
const users = await prisma.user.findMany({
  where: { deletedAt: null },
});
```

---

## API Security

### Rate Limiting

**Implementation**:
[src/middleware/rate-limit.middleware.ts](../src/middleware/rate-limit.middleware.ts)

#### Configured Limits

| Endpoint         | Limit        | Window     | Notes                 |
| ---------------- | ------------ | ---------- | --------------------- |
| `/auth/login`    | 5 requests   | 15 minutes | Prevent brute force   |
| `/auth/register` | 3 requests   | 1 hour     | Prevent spam accounts |
| `/auth/refresh`  | 10 requests  | 15 minutes | Prevent token abuse   |
| General API      | 100 requests | 15 minutes | Prevent DoS           |

```typescript
// Example: Login rate limiter
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
```

### CORS (Cross-Origin Resource Sharing)

**Implementation**: [src/middleware/index.ts](../src/middleware/index.ts)

#### Configuration

- **Allowed Origins**: Environment variable `CORS_ORIGIN`
- **Credentials**: Configurable via `CORS_CREDENTIALS`
- **Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization

```typescript
cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',');
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
});
```

**⚠️ Never use** `origin: '*'` **with** `credentials: true`

### Security Headers (Helmet)

**Implementation**: [src/middleware/index.ts](../src/middleware/index.ts)

#### Headers Configured

- `X-Content-Type-Options: nosniff` - Prevent MIME sniffing
- `X-Frame-Options: DENY` - Prevent clickjacking
- `X-XSS-Protection: 1; mode=block` - XSS filter
- `Strict-Transport-Security` - Force HTTPS
- `Content-Security-Policy` - Restrict resource loading

### Request Size Limits

```typescript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

**Purpose**: Prevent DoS via large payloads

---

## Infrastructure Security

### Environment Variables

**Required Variables**:

```bash
# Cryptographic keys (NEVER commit these!)
JWT_PRIVATE_KEY_PATH=/path/to/private.key
JWT_PUBLIC_KEY_PATH=/path/to/public.key

# Database credentials
DATABASE_URL=postgresql://...
CLIENT_DATABASE_URL=postgresql://...

# OAuth secrets
GOOGLE_CLIENT_SECRET=...

# Session secrets
SESSION_SECRET=...
```

**Best Practices**:

- ✅ Use `.env` file (gitignored)
- ✅ Different secrets per environment
- ✅ Rotate secrets regularly
- ✅ Use secret management service in production
- ❌ Never commit `.env` to git
- ❌ Never log environment variables

### Database Security

**Connection Pooling**:

```bash
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=30"
```

**Access Control**:

- Principle of least privilege
- Application user has limited permissions
- Read-only user for reporting/analytics
- Admin user separate from application user

**Backup & Recovery**:

- Automated daily backups
- Encrypted backups
- Tested recovery procedures
- Off-site backup storage

### Redis Security

**Configuration**:

```bash
REDIS_PASSWORD=strong-password-here
```

**Access Control**:

- Require password authentication
- Bind to localhost or private network only
- No public internet access
- TLS for production connections

---

## Security Checklist

### Pre-Deployment

- [ ] All secrets in environment variables
- [ ] `.env` file not committed to git
- [ ] HTTPS enabled and enforced
- [ ] CORS configured with allowed origins (not `*`)
- [ ] Rate limiting enabled on all endpoints
- [ ] Helmet security headers configured
- [ ] Database backups automated
- [ ] Logs configured (but not logging sensitive data)
- [ ] Error messages don't expose system details
- [ ] Dependencies up to date (`pnpm audit`)
- [ ] Security analysis passing (`pnpm analyze:security`)

### Regular Maintenance

- [ ] Weekly: Review access logs for anomalies
- [ ] Monthly: Rotate JWT keys
- [ ] Monthly: Update dependencies
- [ ] Quarterly: Security audit
- [ ] Quarterly: Penetration testing
- [ ] Annually: Comprehensive security review

### Incident Response

- [ ] Incident response plan documented
- [ ] Security team contacts listed
- [ ] Token revocation procedure tested
- [ ] Data breach notification process
- [ ] Backup restoration tested

---

## Common Vulnerabilities & Mitigations

| Vulnerability          | Risk   | Mitigation                                 |
| ---------------------- | ------ | ------------------------------------------ |
| SQL Injection          | HIGH   | ✅ Prisma ORM with parameterized queries   |
| XSS                    | HIGH   | ✅ Input validation, CSP, JSON responses   |
| CSRF                   | MEDIUM | ✅ SameSite cookies, CORS, state parameter |
| Brute Force            | HIGH   | ✅ Rate limiting, account lockout          |
| Session Hijacking      | HIGH   | ✅ HttpOnly cookies, token rotation        |
| Man-in-the-Middle      | HIGH   | ✅ HTTPS/TLS, HSTS headers                 |
| Clickjacking           | MEDIUM | ✅ X-Frame-Options header                  |
| DoS                    | MEDIUM | ✅ Rate limiting, request size limits      |
| Information Disclosure | MEDIUM | ✅ Generic error messages, no stack traces |
| Insecure Dependencies  | HIGH   | ✅ Regular updates, `pnpm audit`           |

---

## Security Tools

### Static Analysis

```bash
# Run security analysis
pnpm analyze:security

# Check dependencies for vulnerabilities
pnpm audit

# Fix auto-fixable vulnerabilities
pnpm audit fix
```

### Dynamic Testing

```bash
# Load testing (detect DoS vulnerabilities)
pnpm benchmark

# Manual testing with Postman/curl
curl -X POST https://api.example.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

### Monitoring (Production)

- **APM**: Application Performance Monitoring (e.g., DataDog, New Relic)
- **SIEM**: Security Information and Event Management (e.g., Splunk)
- **IDS/IPS**: Intrusion Detection/Prevention System
- **WAF**: Web Application Firewall (e.g., Cloudflare, AWS WAF)

---

## Reporting Security Issues

If you discover a security vulnerability, please email security@freetimechat.com
with:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if known)

**Do not** create public GitHub issues for security vulnerabilities.

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [CWE Top 25 Most Dangerous Software Weaknesses](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

## Changelog

| Date       | Version | Changes                        |
| ---------- | ------- | ------------------------------ |
| 2025-01-05 | 1.0     | Initial security documentation |
