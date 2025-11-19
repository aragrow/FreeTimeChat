# Security Guidelines for AfricAI Digital Books

## Overview

AfricAI Digital Books implements comprehensive security measures to protect against
common web vulnerabilities including XSS, SQL Injection, CSRF, and unauthorized
access.

## Table of Contents

1. [Input Sanitization](#input-sanitization)
2. [Output Encoding](#output-encoding)
3. [Authorization & Authentication](#authorization--authentication)
4. [SQL Injection Prevention](#sql-injection-prevention)
5. [XSS Prevention](#xss-prevention)
6. [CSRF Protection](#csrf-protection)
7. [Security Headers](#security-headers)
8. [Rate Limiting](#rate-limiting)
9. [Data Validation](#data-validation)
10. [Secure Coding Practices](#secure-coding-practices)

---

## Input Sanitization

### Automatic Sanitization

All user input is automatically sanitized through middleware:

```typescript
// Applied globally in apps/api/src/middleware/index.ts
app.use(sanitizeInput);
```

### Manual Sanitization

For special cases, use sanitization utilities:

```typescript
import {
  sanitizeString,
  sanitizeEmail,
  sanitizeSlug,
  sanitizeTenantData,
} from '../utils/sanitization.util';

// Sanitize tenant data before database operations
const sanitized = sanitizeTenantData(req.body);
```

### Sanitization Functions

| Function                | Purpose                          | Example                  |
| ----------------------- | -------------------------------- | ------------------------ |
| `sanitizeString()`      | Remove HTML/JS, trim whitespace  | User names, descriptions |
| `sanitizeEmail()`       | Validate and normalize email     | Email addresses          |
| `sanitizeSlug()`        | Lowercase alphanumeric + hyphens | URL slugs                |
| `sanitizeUrl()`         | Validate URL format              | External links           |
| `sanitizePhone()`       | Clean phone numbers              | Contact phones           |
| `sanitizeSearchQuery()` | Remove SQL injection patterns    | Search inputs            |
| `sanitizeUuid()`        | Validate UUID format             | IDs                      |

---

## Output Encoding

### HTML Escaping

Always escape user-generated content before rendering:

```typescript
import { escapeHtml } from '../utils/sanitization.util';

// For plain text rendering
const safe = escapeHtml(userInput);

// For rich text (allows safe HTML tags)
const safeHtml = sanitizeHtml(userRichText);
```

### JSON Responses

API responses are automatically encoded by Express JSON middleware.

---

## Authorization & Authentication

### Route Protection

All routes require proper authentication and authorization:

```typescript
// Admin-only routes
router.use(authenticate);
router.use(requireCapability('isadmin'));

// Capability-based access
router.use(requireCapability('users:read'));

// Role-based access
router.use(requireRole('admin'));
```

### Authorization Checklist

**✅ All CRUD Endpoints Include:**

1. **Authentication**: JWT token validation
2. **Authorization**: Role/capability check
3. **Resource Ownership**: Verify user owns resource (for tenant-specific data)
4. **Input Validation**: Check all required fields
5. **Output Sanitization**: Escape user content

### Authorization Matrix

| Endpoint                  | Authentication | Authorization   | Notes              |
| ------------------------- | -------------- | --------------- | ------------------ |
| `/api/v1/auth/*`          | ❌ Public      | ❌ Public       | Login, register    |
| `/api/v1/admin/tenants/*` | ✅ Required    | `isadmin`       | Admin only         |
| `/api/v1/admin/users/*`   | ✅ Required    | `isadmin`       | Admin only         |
| `/api/v1/admin/stats/*`   | ✅ Required    | `isadmin`       | Admin only         |
| `/api/v1/projects/*`      | ✅ Required    | Tenant-specific | User's tenant only |
| `/api/v1/time-entries/*`  | ✅ Required    | Tenant-specific | User's tenant only |

---

## SQL Injection Prevention

### Prisma ORM (Primary Defense)

Prisma uses parameterized queries automatically:

```typescript
// ✅ SAFE: Prisma parameterizes automatically
const user = await prisma.user.findUnique({
  where: { email: userInput }, // Automatically parameterized
});

// ✅ SAFE: Search with Prisma
const results = await prisma.tenant.findMany({
  where: {
    name: { contains: searchQuery, mode: 'insensitive' },
  },
});

// ❌ NEVER: Raw SQL without parameterization
await prisma.$queryRaw`SELECT * FROM users WHERE email = '${userInput}'`; // UNSAFE

// ✅ SAFE: Use parameterized raw queries
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${userInput}`; // Safe
```

### Search Query Sanitization

Search queries are sanitized to remove SQL keywords:

```typescript
import { sanitizeSearchQuery } from '../utils/sanitization.util';

const safe = sanitizeSearchQuery(userSearch);
// Removes: SELECT, INSERT, UPDATE, DELETE, DROP, etc.
```

---

## XSS Prevention

### Input Sanitization (Defense Layer 1)

All user input is sanitized on entry:

```typescript
// Automatic via middleware
app.use(sanitizeInput);

// Manual for special cases
const safe = sanitizeString(userInput);
```

### Output Encoding (Defense Layer 2)

Escape all user content before rendering:

```typescript
// In API responses (automatic via Express JSON)
res.json({ name: user.name }); // Automatically encoded

// In HTML rendering (use escapeHtml)
const safe = escapeHtml(user.bio);
```

### Content Security Policy (Defense Layer 3)

CSP headers prevent inline script execution:

```typescript
// Set in middleware/sanitization.middleware.ts
Content-Security-Policy: default-src 'self'; script-src 'self'
```

---

## CSRF Protection

### Token-Based Authentication

Using JWT tokens instead of cookies prevents CSRF attacks:

```typescript
// JWT in Authorization header
Authorization: Bearer<token>;
```

### SameSite Cookies

For any cookies used:

```typescript
res.cookie('token', jwt, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
});
```

---

## Security Headers

### Implemented Headers

```typescript
// Content Security Policy
Content-Security-Policy: default-src 'self'; script-src 'self'

// Prevent MIME Sniffing
X-Content-Type-Options: nosniff

// Prevent Clickjacking
X-Frame-Options: DENY

// XSS Protection (legacy browsers)
X-XSS-Protection: 1; mode=block

// Referrer Policy
Referrer-Policy: strict-origin-when-cross-origin

// Permissions Policy
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

---

## Rate Limiting

### Endpoints with Rate Limiting

```typescript
// Login endpoint: 5 requests per 15 minutes
POST /api/v1/auth/login

// Register endpoint: 3 requests per hour
POST /api/v1/auth/register

// API endpoints: 100 requests per 15 minutes
GET /api/v1/*
```

### Custom Rate Limits

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests',
});

router.use(limiter);
```

---

## Data Validation

### Input Validation Checklist

For every endpoint accepting user input:

1. **Type Validation**: Ensure correct data types
2. **Format Validation**: Validate email, URL, UUID formats
3. **Length Validation**: Limit string lengths
4. **Range Validation**: Check numeric ranges
5. **Enum Validation**: Validate against allowed values
6. **Required Fields**: Check all required fields present

### Example Validation

```typescript
// Tenant creation validation
if (!name || !slug || !tenantKey) {
  return res.status(400).json({
    status: 'error',
    message: 'Missing required fields: name, slug, tenantKey',
  });
}

// Slug format validation
const slugRegex = /^[a-z0-9-]+$/;
if (!slugRegex.test(slug)) {
  return res.status(400).json({
    status: 'error',
    message: 'Slug must be lowercase alphanumeric with hyphens only',
  });
}

// Email format validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (contactEmail && !emailRegex.test(contactEmail)) {
  return res.status(400).json({
    status: 'error',
    message: 'Invalid contact email format',
  });
}
```

---

## Secure Coding Practices

### DO's ✅

1. **Always sanitize user input**

   ```typescript
   const safe = sanitizeString(userInput);
   ```

2. **Use Prisma parameterized queries**

   ```typescript
   await prisma.user.findUnique({ where: { id } });
   ```

3. **Validate all input**

   ```typescript
   if (!validator.isEmail(email)) {
     throw new Error('Invalid email');
   }
   ```

4. **Escape output**

   ```typescript
   const safe = escapeHtml(userContent);
   ```

5. **Use HTTPS in production**

   ```typescript
   secure: process.env.NODE_ENV === 'production';
   ```

6. **Hash passwords**

   ```typescript
   const hash = await bcrypt.hash(password, 10);
   ```

7. **Use environment variables for secrets**

   ```typescript
   const secret = process.env.JWT_SECRET;
   ```

8. **Implement proper error handling**
   ```typescript
   try {
     // ...
   } catch (error) {
     console.error(error); // Log for debugging
     res.status(500).json({ message: 'Internal error' }); // Generic message
   }
   ```

### DON'Ts ❌

1. **Never trust user input**

   ```typescript
   // ❌ BAD
   const sql = `SELECT * FROM users WHERE name = '${userName}'`;

   // ✅ GOOD
   const user = await prisma.user.findMany({
     where: { name: userName },
   });
   ```

2. **Never expose sensitive data in responses**

   ```typescript
   // ❌ BAD
   res.json({ user: { ...user, passwordHash } });

   // ✅ GOOD
   res.json({ user: { id, name, email } });
   ```

3. **Never log sensitive information**

   ```typescript
   // ❌ BAD
   console.log('Password:', password);

   // ✅ GOOD
   console.log('Login attempt for:', email);
   ```

4. **Never use string concatenation for SQL**

   ```typescript
   // ❌ BAD
   await prisma.$queryRaw(`WHERE id = '${id}'`);

   // ✅ GOOD
   await prisma.$queryRaw`WHERE id = ${id}`;
   ```

5. **Never disable security features**

   ```typescript
   // ❌ BAD
   app.use(helmet({ contentSecurityPolicy: false }));

   // ✅ GOOD
   app.use(helmet());
   ```

---

## Testing Security

### Security Test Checklist

- [ ] Test XSS prevention with `<script>alert('XSS')</script>`
- [ ] Test SQL injection with `' OR '1'='1`
- [ ] Test authorization bypass attempts
- [ ] Test rate limiting with rapid requests
- [ ] Test CSRF with cross-origin requests
- [ ] Test password strength requirements
- [ ] Test session timeout
- [ ] Test JWT expiration
- [ ] Test input validation with edge cases
- [ ] Test file upload restrictions

### Example Security Tests

```typescript
describe('Security Tests', () => {
  it('should prevent XSS in tenant name', async () => {
    const xssAttempt = '<script>alert("XSS")</script>';
    const response = await request(app)
      .post('/api/v1/admin/tenants')
      .send({ name: xssAttempt, slug: 'test', tenantKey: 'TEST' });

    expect(response.body.data.tenant.name).not.toContain('<script>');
  });

  it('should prevent SQL injection in search', async () => {
    const sqlInjection = "' OR '1'='1";
    const response = await request(app).get(
      `/api/v1/admin/tenants?search=${sqlInjection}`
    );

    expect(response.status).toBe(200);
    expect(response.body.data.tenants).toBeArray();
  });

  it('should require authentication for admin endpoints', async () => {
    const response = await request(app).get('/api/v1/admin/tenants');

    expect(response.status).toBe(401);
  });
});
```

---

## Incident Response

### If a Security Issue is Discovered

1. **Assess Impact**: Determine scope and severity
2. **Contain**: Disable affected features if necessary
3. **Fix**: Implement and test fix
4. **Deploy**: Deploy fix to production ASAP
5. **Notify**: Inform affected users if data was compromised
6. **Document**: Record incident and lessons learned
7. **Review**: Audit similar code for same vulnerability

### Reporting Security Issues

Email security concerns to: security@freetimechat.com

**Please include:**

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Prisma Security Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

## Changelog

| Date       | Version | Changes                                    |
| ---------- | ------- | ------------------------------------------ |
| 2025-01-07 | 1.0.0   | Initial security documentation             |
| 2025-01-07 | 1.1.0   | Added comprehensive sanitization utilities |
| 2025-01-07 | 1.2.0   | Implemented security headers and CSP       |
