# Authentication Architecture

This document outlines the complete authentication system for FreeTimeChat,
including username/password authentication, Google Sign-On, 2FA with
authenticator apps, and JWT token management.

## Overview

FreeTimeChat supports two authentication methods:

1. **Username/Password** with optional 2FA (TOTP authenticator app)
2. **Google OAuth 2.0** (no 2FA required as Google handles security)

Once authenticated, users receive a JWT token that maintains their session
across requests.

---

## Authentication Methods

### Method 1: Username & Password with 2FA

**Flow:**

1. User enters email and password
2. Backend verifies credentials
3. If 2FA is enabled for the user:
   - Prompt for TOTP code from authenticator app
   - Verify TOTP code
4. Issue JWT token upon successful authentication

**Security Features:**

- Passwords hashed with bcrypt (12 rounds minimum)
- 2FA using TOTP (Time-based One-Time Password)
- Rate limiting on login attempts (max 5 attempts per 15 minutes)
- Account lockout after 10 failed attempts
- Password requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number

### Method 2: Google OAuth 2.0

**Flow:**

1. User clicks "Sign in with Google"
2. Redirect to Google OAuth consent screen
3. User authorizes the application
4. Google redirects back with authorization code
5. Backend exchanges code for Google user info
6. Create or update user in database
7. Issue JWT token

**Benefits:**

- No password management needed
- Google handles security (including their 2FA if enabled)
- Faster onboarding

---

## Database Schema for Authentication

### Users Table (Updated)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,

  -- Password auth fields
  password_hash VARCHAR(255), -- NULL for Google OAuth users

  -- 2FA fields
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret VARCHAR(255), -- Base32 encoded TOTP secret
  backup_codes TEXT[], -- Array of backup codes (hashed)

  -- OAuth fields
  google_id VARCHAR(255) UNIQUE, -- Google user ID
  auth_provider VARCHAR(50) DEFAULT 'local', -- 'local' or 'google'

  -- Security fields
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  email_verification_expires TIMESTAMP,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  account_locked_until TIMESTAMP,
  last_login TIMESTAMP,

  -- Standard fields
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT password_or_google CHECK (
    (password_hash IS NOT NULL AND google_id IS NULL) OR
    (password_hash IS NULL AND google_id IS NOT NULL)
  )
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token);
```

### Refresh Tokens Table

```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked BOOLEAN DEFAULT false,
  device_info TEXT, -- Browser/device info for user visibility

  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

### Prisma Schema (Updated)

```prisma
model User {
  id                        String         @id @default(uuid())
  email                     String         @unique
  name                      String

  // Password auth
  passwordHash              String?        @map("password_hash")

  // 2FA
  twoFactorEnabled          Boolean        @default(false) @map("two_factor_enabled")
  twoFactorSecret           String?        @map("two_factor_secret")
  backupCodes               String[]       @map("backup_codes")

  // OAuth
  googleId                  String?        @unique @map("google_id")
  authProvider              AuthProvider   @default(LOCAL) @map("auth_provider")

  // Security
  emailVerified             Boolean        @default(false) @map("email_verified")
  emailVerificationToken    String?        @map("email_verification_token")
  emailVerificationExpires  DateTime?      @map("email_verification_expires")
  passwordResetToken        String?        @map("password_reset_token")
  passwordResetExpires      DateTime?      @map("password_reset_expires")
  failedLoginAttempts       Int            @default(0) @map("failed_login_attempts")
  accountLockedUntil        DateTime?      @map("account_locked_until")
  lastLogin                 DateTime?      @map("last_login")

  // Standard
  role                      Role           @default(USER)
  timeEntries               TimeEntry[]
  chatMessages              ChatMessage[]
  refreshTokens             RefreshToken[]
  createdAt                 DateTime       @default(now()) @map("created_at")
  updatedAt                 DateTime       @updatedAt @map("updated_at")

  @@map("users")
}

model RefreshToken {
  id         String    @id @default(uuid())
  userId     String    @map("user_id")
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  token      String    @unique
  expiresAt  DateTime  @map("expires_at")
  createdAt  DateTime  @default(now()) @map("created_at")
  revoked    Boolean   @default(false)
  deviceInfo String?   @map("device_info")

  @@index([userId])
  @@index([token])
  @@index([expiresAt])
  @@map("refresh_tokens")
}

enum AuthProvider {
  LOCAL
  GOOGLE
}

enum Role {
  USER
  ADMIN
}
```

---

## JWT Token Strategy (Industry Standards)

### Modern Approach: RS256 with Token Rotation

**Why RS256 over HS256:**

- Asymmetric keys allow token verification without the signing secret
- Better for distributed systems and microservices
- More secure: private key stays on auth server only
- Public key can be shared for token verification
- Industry standard for production applications

**Alternative: ES256 (More Modern)**

- Faster than RS256
- Smaller tokens
- Increasingly preferred by industry (Google, Auth0 use ES256)
- Supported by all modern JWT libraries

### Access Token (Short-lived)

**Payload:**

```typescript
{
  // Standard JWT claims
  sub: string;         // Subject (User UUID) - standard claim
  email: string;       // User email
  role: string;        // Primary role (for backward compatibility)
  roles: string[];     // All user roles (RBAC)
  clientId: string;    // Client ID for multi-tenancy
  databaseName: string; // Client database name for routing
  iat: number;         // Issued at (timestamp) - standard claim
  exp: number;         // Expires at (timestamp) - standard claim
  jti: string;         // JWT ID (unique token identifier) - for revocation
  iss: string;         // Issuer (e.g., "freetimechat.com")
  aud: string;         // Audience (e.g., "freetimechat-api")
}
```

**Configuration:**

- **Expiration**: 15 minutes (or 5-10 minutes for higher security)
- **Algorithm**: **RS256** (production) or ES256 (more modern)
- **Storage**: HTTP-only, Secure, SameSite=Strict cookie (preferred)
  - Alternative: Memory only in frontend (not localStorage/sessionStorage)
- **Transmission**: HTTP-only cookie (primary) or Authorization header
  (mobile/SPA)
- **Token Identifier (jti)**: Enables token revocation if needed

### Refresh Token (Long-lived)

**Purpose**: Generate new access tokens without re-authentication

**Configuration:**

- **Expiration**: 7 days (30 days for "remember me")
- **Storage**: Database + HTTP-only, Secure cookie
- **Rotation**: **Automatic rotation** - issue new refresh token on each use
  (modern best practice)
- **Revocation**: Can be revoked (logout, security breach, suspicious activity)
- **Format**: Cryptographically random string (not JWT)
- **Reuse Detection**: If old refresh token is used after rotation, revoke
  entire family

**Refresh Token Rotation (Modern Security Pattern):**

```
1. User logs in → Receive Access Token + Refresh Token A
2. Access token expires → Use Refresh Token A
3. Server issues: New Access Token + New Refresh Token B (invalidates A)
4. If attacker tries to use Refresh Token A → Entire token family revoked
5. User must re-authenticate
```

This protects against token theft by detecting when stolen tokens are used.

---

## API Endpoints

### Authentication Endpoints

#### 1. Register with Email/Password

```
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response 201:
{
  "message": "Registration successful. Please verify your email.",
  "userId": "uuid"
}
```

#### 2. Verify Email

```
GET /api/auth/verify-email?token=verification_token

Response 200:
{
  "message": "Email verified successfully. You can now log in."
}
```

#### 3. Login with Email/Password

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response 200 (without 2FA):
{
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "user",
    "twoFactorEnabled": false
  }
}

Response 200 (with 2FA):
{
  "requiresTwoFactor": true,
  "tempToken": "temporary_token" // Valid for 5 minutes
}
```

#### 4. Verify 2FA Code

```
POST /api/auth/verify-2fa
Content-Type: application/json

{
  "tempToken": "temporary_token",
  "code": "123456" // 6-digit TOTP code
}

Response 200:
{
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token",
  "user": { ... }
}
```

#### 5. Google OAuth - Initiate

```
GET /api/auth/google

Response 302:
Redirect to: https://accounts.google.com/o/oauth2/v2/auth?client_id=...
```

#### 6. Google OAuth - Callback

```
GET /api/auth/google/callback?code=authorization_code

Response 302:
Redirect to: http://localhost:3000/chat?token=jwt_token

Or set HTTP-only cookie and redirect
```

#### 7. Refresh Access Token

```
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "current_refresh_token"
}

Response 200:
{
  "accessToken": "new_jwt_token",
  "refreshToken": "new_refresh_token"
}
```

#### 8. Logout

```
POST /api/auth/logout
Authorization: Bearer {access_token}

{
  "refreshToken": "current_refresh_token"
}

Response 200:
{
  "message": "Logged out successfully"
}
```

#### 9. Logout All Devices

```
POST /api/auth/logout-all
Authorization: Bearer {access_token}

Response 200:
{
  "message": "Logged out from all devices"
}
```

### 2FA Management Endpoints

#### 1. Enable 2FA - Generate Secret

```
POST /api/auth/2fa/enable
Authorization: Bearer {access_token}

Response 200:
{
  "secret": "JBSWY3DPEHPK3PXP", // Base32 encoded
  "qrCode": "data:image/png;base64,...", // QR code image
  "backupCodes": [
    "12345678",
    "23456789",
    // ... 8 more codes
  ]
}
```

#### 2. Confirm 2FA Setup

```
POST /api/auth/2fa/confirm
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "code": "123456" // TOTP code from authenticator app
}

Response 200:
{
  "message": "2FA enabled successfully",
  "backupCodes": [ ... ] // Save these!
}
```

#### 3. Disable 2FA

```
POST /api/auth/2fa/disable
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "password": "user_password",
  "code": "123456" // Current TOTP code
}

Response 200:
{
  "message": "2FA disabled successfully"
}
```

#### 4. Regenerate Backup Codes

```
POST /api/auth/2fa/backup-codes/regenerate
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "password": "user_password"
}

Response 200:
{
  "backupCodes": [ ... ] // New set of 10 codes
}
```

### Password Management Endpoints

#### 1. Request Password Reset

```
POST /api/auth/password/reset-request
Content-Type: application/json

{
  "email": "john@example.com"
}

Response 200:
{
  "message": "Password reset email sent if account exists"
}
```

#### 2. Reset Password

```
POST /api/auth/password/reset
Content-Type: application/json

{
  "token": "reset_token",
  "newPassword": "NewSecurePass123!"
}

Response 200:
{
  "message": "Password reset successfully"
}
```

#### 3. Change Password (Authenticated)

```
POST /api/auth/password/change
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}

Response 200:
{
  "message": "Password changed successfully"
}
```

---

## Backend Implementation

### Tech Stack

- **JWT**: `jsonwebtoken` package
- **Password Hashing**: `bcrypt` or `argon2`
- **2FA/TOTP**: `otplib` or `speakeasy`
- **QR Code**: `qrcode` package
- **Google OAuth**: `passport-google-oauth20` or direct implementation
- **Rate Limiting**: `express-rate-limit`

### Directory Structure

```
apps/api/src/
├── services/
│   ├── auth/
│   │   ├── authService.ts          # Main auth logic
│   │   ├── jwtService.ts           # JWT generation/verification
│   │   ├── twoFactorService.ts     # 2FA/TOTP logic
│   │   ├── googleAuthService.ts    # Google OAuth logic
│   │   └── passwordService.ts      # Password hashing/validation
│   └── email/
│       └── emailService.ts         # Send verification/reset emails
│
├── routes/
│   └── auth/
│       ├── index.ts                # Auth route registration
│       ├── register.ts             # Registration routes
│       ├── login.ts                # Login routes
│       ├── oauth.ts                # OAuth routes
│       ├── twoFactor.ts            # 2FA routes
│       └── password.ts             # Password management routes
│
├── middleware/
│   ├── auth.ts                     # JWT verification middleware
│   ├── requireAuth.ts              # Protected route middleware
│   ├── requireAdmin.ts             # Admin-only middleware
│   └── rateLimiter.ts              # Rate limiting middleware
│
└── utils/
    ├── validation.ts               # Input validation schemas
    └── tokens.ts                   # Token generation utilities
```

### Example: JWT Service (RS256 with Token Rotation)

```typescript
// apps/api/src/services/auth/jwtService.ts
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Load RSA keys (generate these during setup)
const PRIVATE_KEY = fs.readFileSync(
  path.join(__dirname, '../../../keys/private.pem'),
  'utf8'
);
const PUBLIC_KEY = fs.readFileSync(
  path.join(__dirname, '../../../keys/public.pem'),
  'utf8'
);

const JWT_EXPIRES_IN = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days

interface JWTPayload {
  sub: string; // User ID (standard claim)
  email: string;
  role: string; // Primary role (for backward compatibility)
  roles: string[]; // All user roles (RBAC)
  clientId: string; // Client ID for multi-tenancy
  databaseName: string; // Client database name for routing
  jti?: string; // JWT ID for revocation
}

export class JWTService {
  /**
   * Generate access token with RS256
   */
  static generateAccessToken(payload: JWTPayload): string {
    const jti = crypto.randomUUID(); // Unique token ID

    return jwt.sign(
      {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        jti,
        iss: 'freetimechat.com',
        aud: 'freetimechat-api',
      },
      PRIVATE_KEY,
      {
        algorithm: 'RS256',
        expiresIn: JWT_EXPIRES_IN,
      }
    );
  }

  /**
   * Verify access token with public key
   */
  static verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, PUBLIC_KEY, {
        algorithms: ['RS256'],
        issuer: 'freetimechat.com',
        audience: 'freetimechat-api',
      }) as jwt.JwtPayload;

      return {
        sub: decoded.sub!,
        email: decoded.email,
        role: decoded.role,
        jti: decoded.jti,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      throw new Error('Invalid token');
    }
  }

  /**
   * Generate cryptographically secure refresh token
   */
  static generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Save refresh token with token family tracking
   */
  static async saveRefreshToken(
    userId: string,
    token: string,
    deviceInfo?: string,
    familyId?: string // For token rotation tracking
  ) {
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN);
    const tokenFamilyId = familyId || crypto.randomUUID();

    return prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
        deviceInfo,
        familyId: tokenFamilyId,
      },
    });
  }

  /**
   * Verify and rotate refresh token (modern security pattern)
   */
  static async verifyAndRotateRefreshToken(token: string) {
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    // Token doesn't exist or already revoked
    if (!refreshToken || refreshToken.revoked) {
      // Check if this token was part of a family
      if (refreshToken?.familyId) {
        // SECURITY: Token reuse detected! Revoke entire family
        await this.revokeTokenFamily(refreshToken.familyId);
        throw new Error('Token reuse detected. Please log in again.');
      }
      throw new Error('Invalid refresh token');
    }

    // Token expired
    if (refreshToken.expiresAt < new Date()) {
      throw new Error('Refresh token expired');
    }

    // Revoke the old token (it can't be used again)
    await prisma.refreshToken.update({
      where: { token },
      data: { revoked: true },
    });

    // Generate new refresh token (rotation)
    const newRefreshToken = this.generateRefreshToken();

    // Save new token with same family ID
    await this.saveRefreshToken(
      refreshToken.userId,
      newRefreshToken,
      refreshToken.deviceInfo || undefined,
      refreshToken.familyId
    );

    return {
      user: refreshToken.user,
      newRefreshToken,
      familyId: refreshToken.familyId,
    };
  }

  /**
   * Revoke entire token family (when reuse is detected)
   */
  static async revokeTokenFamily(familyId: string) {
    return prisma.refreshToken.updateMany({
      where: { familyId, revoked: false },
      data: { revoked: true },
    });
  }

  /**
   * Revoke single refresh token
   */
  static async revokeRefreshToken(token: string) {
    return prisma.refreshToken.update({
      where: { token },
      data: { revoked: true },
    });
  }

  /**
   * Revoke all user tokens (logout all devices)
   */
  static async revokeAllUserTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }

  /**
   * Clean up expired tokens (run as cron job)
   */
  static async cleanupExpiredTokens() {
    return prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            revoked: true,
            createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        ],
      },
    });
  }
}

/**
 * Generate RSA key pair (run once during setup)
 *
 * Terminal command:
 * openssl genrsa -out private.pem 2048
 * openssl rsa -in private.pem -outform PEM -pubout -out public.pem
 */
```

**Update Refresh Token Schema:**

```prisma
model RefreshToken {
  id         String    @id @default(uuid())
  userId     String    @map("user_id")
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  token      String    @unique
  familyId   String    @map("family_id") // Track token rotation family
  expiresAt  DateTime  @map("expires_at")
  createdAt  DateTime  @default(now()) @map("created_at")
  revoked    Boolean   @default(false)
  deviceInfo String?   @map("device_info")

  @@index([userId])
  @@index([token])
  @@index([familyId])
  @@index([expiresAt])
  @@map("refresh_tokens")
}
```

### Example: 2FA Service

```typescript
// apps/api/src/services/auth/twoFactorService.ts
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import bcrypt from 'bcrypt';

export class TwoFactorService {
  static generateSecret(email: string) {
    const secret = speakeasy.generateSecret({
      name: `FreeTimeChat (${email})`,
      issuer: 'FreeTimeChat',
      length: 32,
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
    };
  }

  static async generateQRCode(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl);
  }

  static verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 steps before/after for clock skew
    });
  }

  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  static async hashBackupCodes(codes: string[]): Promise<string[]> {
    return Promise.all(codes.map((code) => bcrypt.hash(code, 12)));
  }

  static async verifyBackupCode(
    code: string,
    hashedCodes: string[]
  ): Promise<number> {
    for (let i = 0; i < hashedCodes.length; i++) {
      const isMatch = await bcrypt.compare(code, hashedCodes[i]);
      if (isMatch) {
        return i; // Return index of used code
      }
    }
    return -1; // No match
  }
}
```

### Example: Auth Middleware

```typescript
// apps/api/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../services/auth/jwtService';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: 'user' | 'admin';
  };
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const payload = JWTService.verifyAccessToken(token);

    // Attach user info to request
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}
```

### Example: Google OAuth Setup

```typescript
// apps/api/src/services/auth/googleAuthService.ts
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;

export class GoogleAuthService {
  private static oauth2Client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );

  static getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
    });
  }

  static async getGoogleUser(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    const ticket = await this.oauth2Client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new Error('Invalid Google token');
    }

    return {
      googleId: payload.sub,
      email: payload.email!,
      name: payload.name!,
      emailVerified: payload.email_verified!,
    };
  }

  static async findOrCreateUser(googleUser: {
    googleId: string;
    email: string;
    name: string;
    emailVerified: boolean;
  }) {
    // Check if user exists by Google ID
    let user = await prisma.user.findUnique({
      where: { googleId: googleUser.googleId },
    });

    if (user) {
      // Update last login
      user = await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
      return user;
    }

    // Check if user exists by email (might have registered with password)
    user = await prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (user) {
      // Link Google account to existing user
      if (user.passwordHash) {
        throw new Error(
          'This email is already registered. Please log in with your password.'
        );
      }

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: googleUser.googleId,
          authProvider: 'GOOGLE',
          emailVerified: true,
          lastLogin: new Date(),
        },
      });
      return user;
    }

    // Create new user
    user = await prisma.user.create({
      data: {
        email: googleUser.email,
        name: googleUser.name,
        googleId: googleUser.googleId,
        authProvider: 'GOOGLE',
        emailVerified: true,
        lastLogin: new Date(),
      },
    });

    return user;
  }
}
```

---

## Frontend Implementation

### Tech Stack

- **HTTP Client**: `axios` or `fetch`
- **State Management**: React Context or Zustand
- **Form Handling**: `react-hook-form`
- **Validation**: `zod`

### Directory Structure

```
apps/web/
├── app/
│   ├── (auth)/                     # Auth route group
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   ├── verify-email/
│   │   │   └── page.tsx
│   │   ├── forgot-password/
│   │   │   └── page.tsx
│   │   └── reset-password/
│   │       └── page.tsx
│   │
│   ├── settings/
│   │   └── security/
│   │       └── page.tsx            # 2FA setup page
│   │
│   └── layout.tsx
│
├── components/
│   └── auth/
│       ├── LoginForm.tsx
│       ├── RegisterForm.tsx
│       ├── TwoFactorPrompt.tsx
│       ├── GoogleSignInButton.tsx
│       ├── Setup2FA.tsx
│       └── ProtectedRoute.tsx
│
├── lib/
│   ├── api-client/
│   │   └── auth-client.ts          # Auth API calls
│   │
│   ├── auth/
│   │   ├── AuthContext.tsx         # Auth state management
│   │   └── useAuth.ts              # Auth hook
│   │
│   └── utils/
│       └── tokenStorage.ts         # Token management
```

### Example: Auth Context

```typescript
// apps/web/lib/auth/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authClient } from '../api-client/auth-client';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  twoFactorEnabled: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => void;
  verify2FA: (tempToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated on mount
    const checkAuth = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
          // Verify token and get user info
          const userData = await authClient.getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        localStorage.removeItem('accessToken');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authClient.login(email, password);

    if (response.requiresTwoFactor) {
      // Return to trigger 2FA prompt
      throw { requiresTwoFactor: true, tempToken: response.tempToken };
    }

    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    setUser(response.user);
  };

  const verify2FA = async (tempToken: string, code: string) => {
    const response = await authClient.verify2FA(tempToken, code);
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    setUser(response.user);
  };

  const loginWithGoogle = () => {
    // Redirect to backend Google OAuth endpoint
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await authClient.logout(refreshToken);
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const register = async (name: string, email: string, password: string) => {
    await authClient.register(name, email, password);
    // User needs to verify email before logging in
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, loginWithGoogle, verify2FA, logout, register }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Example: Login Form Component

```typescript
// apps/web/components/auth/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/useAuth';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, verify2FA, loginWithGoogle } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/chat');
    } catch (err: any) {
      if (err.requiresTwoFactor) {
        setTempToken(err.tempToken);
        setShowTwoFactor(true);
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verify2FA(tempToken, twoFactorCode);
      router.push('/chat');
    } catch (err: any) {
      setError(err.message || '2FA verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (showTwoFactor) {
    return (
      <form onSubmit={handle2FASubmit} className="space-y-4">
        <h2>Enter 2FA Code</h2>
        <input
          type="text"
          value={twoFactorCode}
          onChange={(e) => setTwoFactorCode(e.target.value)}
          placeholder="123456"
          maxLength={6}
          className="input"
        />
        {error && <p className="text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary">
          Verify
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2>Login</h2>

        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input"
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input"
          />
        </div>

        {error && <p className="text-red-500">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <button
        onClick={loginWithGoogle}
        className="btn-secondary w-full flex items-center justify-center gap-2"
      >
        <GoogleIcon />
        Sign in with Google
      </button>
    </div>
  );
}
```

---

## Security Best Practices

### 1. Password Security

- ✅ Use bcrypt or argon2 with minimum 12 rounds
- ✅ Enforce strong password requirements
- ✅ Never log passwords
- ✅ Use timing-safe comparison for password checks

### 2. Token Security

- ✅ Use HTTP-only cookies for tokens (preferred over localStorage)
- ✅ Set SameSite=Strict on cookies
- ✅ Use HTTPS in production
- ✅ Short expiration for access tokens (15 min)
- ✅ Rotate refresh tokens on each use
- ✅ Store refresh tokens in database for revocation

### 3. 2FA Security

- ✅ Use time-based window for TOTP validation (account for clock skew)
- ✅ Provide backup codes (hashed)
- ✅ Allow backup code to be used only once
- ✅ Rate limit 2FA attempts
- ✅ Require password confirmation to disable 2FA

### 4. Rate Limiting

- ✅ Login: 5 attempts per 15 minutes per IP
- ✅ Registration: 3 attempts per hour per IP
- ✅ Password reset: 3 attempts per hour per email
- ✅ 2FA verification: 5 attempts per token

### 5. General Security

- ✅ Sanitize all inputs
- ✅ Use parameterized queries (Prisma handles this)
- ✅ Implement CORS properly
- ✅ Log security events (failed logins, 2FA changes)
- ✅ Email notifications for security events
- ✅ Account lockout after repeated failed attempts

---

## Environment Variables

### Backend (.env)

```env
# JWT (RS256 - no secret needed, uses RSA keys)
JWT_EXPIRES_IN=15m
JWT_ISSUER=freetimechat.com
JWT_AUDIENCE=freetimechat-api

# RSA Keys (paths to key files)
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback

# Email (for verification/password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@freetimechat.com

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/freetimechat
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

---

## Admin Impersonation (Sign In As Client)

Admin impersonation allows administrators to access the application as if they
were a specific client/user, without needing to know the client's password. This
is useful for:

- Troubleshooting user-reported issues
- Providing support and debugging
- Testing features from the user's perspective
- Understanding user workflows

### Security Considerations

**IMPORTANT**: Impersonation is a powerful feature that must be implemented with
strict security controls:

1. **Authorization**: Only users with `admin.impersonate` capability can
   impersonate
2. **Audit Logging**: Every impersonation session must be logged with:
   - Who impersonated whom
   - When the session started and ended
   - What actions were taken during impersonation
3. **Session Isolation**: The original admin session must be preserved
4. **Visual Indicators**: Clear UI indication when in impersonation mode
5. **Limited Scope**: Impersonation should not allow password changes or
   security settings modifications
6. **Time Limits**: Optional timeout for impersonation sessions

### Database Schema

Add impersonation tracking to the main database:

```prisma
// prisma/schema-main.prisma

model ImpersonationSession {
  id                String    @id @default(uuid())
  adminUserId       String    @map("admin_user_id")
  adminUser         User      @relation("ImpersonatorSessions", fields: [adminUserId], references: [id])
  targetUserId      String    @map("target_user_id")
  targetUser        User      @relation("ImpersonatedSessions", fields: [targetUserId], references: [id])
  targetClientId    String    @map("target_client_id")
  originalToken     String    @map("original_token") // Encrypted admin token
  impersonationToken String   @unique @map("impersonation_token")
  startedAt         DateTime  @default(now()) @map("started_at")
  endedAt           DateTime? @map("ended_at")
  ipAddress         String?   @map("ip_address")
  userAgent         String?   @map("user_agent")

  @@index([adminUserId])
  @@index([targetUserId])
  @@index([impersonationToken])
  @@map("impersonation_sessions")
}

// Update User model to include impersonation relations
model User {
  // ... existing fields ...

  // Impersonation relations
  impersonatorSessions  ImpersonationSession[] @relation("ImpersonatorSessions")
  impersonatedSessions  ImpersonationSession[] @relation("ImpersonatedSessions")
}
```

### JWT Payload for Impersonation

The impersonation JWT includes special claims:

```typescript
interface ImpersonationJWTPayload extends JWTPayload {
  sub: string; // Target user ID
  email: string; // Target user email
  role: string; // Target user role
  roles: string[]; // Target user roles
  clientId: string; // Target client ID
  databaseName: string; // Target client database name

  // Impersonation metadata
  impersonation: {
    isImpersonating: true;
    adminUserId: string; // Original admin user ID
    adminEmail: string; // Original admin email
    sessionId: string; // Impersonation session ID
    startedAt: number; // Unix timestamp
  };
}
```

### Backend Implementation

#### Impersonation Service

```typescript
// apps/api/src/services/auth/ImpersonationService.ts
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWTService } from './jwtService';
import { AuthorizationService } from '../AuthorizationService';
import { AuditService } from '../AuditService';

const prisma = new PrismaClient();

export class ImpersonationService {
  /**
   * Start impersonation session
   */
  static async startImpersonation(
    adminUserId: string,
    targetUserId: string,
    metadata: {
      ipAddress?: string;
      userAgent?: string;
    }
  ) {
    // 1. Verify admin has impersonation capability
    const hasPermission = await AuthorizationService.userHasCapability(
      adminUserId,
      'admin.impersonate'
    );

    if (!hasPermission) {
      throw new Error('User does not have permission to impersonate');
    }

    // 2. Get target user details
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        client: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!targetUser) {
      throw new Error('Target user not found');
    }

    // 3. Get admin details
    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!adminUser) {
      throw new Error('Admin user not found');
    }

    // 4. Generate impersonation token
    const sessionId = crypto.randomUUID();
    const impersonationToken = jwt.sign(
      {
        sub: targetUser.id,
        email: targetUser.email,
        role: targetUser.roles[0]?.role.name || 'user',
        clientId: targetUser.clientId,
        impersonation: {
          isImpersonating: true,
          adminUserId: adminUser.id,
          adminEmail: adminUser.email,
          sessionId,
          startedAt: Date.now(),
        },
        iss: 'freetimechat.com',
        aud: 'freetimechat-api',
      },
      process.env.JWT_PRIVATE_KEY!,
      {
        algorithm: 'RS256',
        expiresIn: '4h', // Impersonation sessions expire after 4 hours
      }
    );

    // 5. Create impersonation session record
    const session = await prisma.impersonationSession.create({
      data: {
        id: sessionId,
        adminUserId: adminUser.id,
        targetUserId: targetUser.id,
        targetClientId: targetUser.clientId,
        originalToken: '', // Will be set from frontend
        impersonationToken,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
    });

    // 6. Log impersonation start
    await AuditService.log({
      userId: adminUser.id,
      action: 'admin.impersonation.start',
      resourceType: 'user',
      resourceId: targetUser.id,
      metadata: {
        targetEmail: targetUser.email,
        targetClient: targetUser.client.name,
        sessionId,
      },
      ipAddress: metadata.ipAddress,
    });

    return {
      impersonationToken,
      sessionId,
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        client: {
          id: targetUser.client.id,
          name: targetUser.client.name,
        },
      },
    };
  }

  /**
   * End impersonation session
   */
  static async endImpersonation(sessionId: string, adminUserId: string) {
    // 1. Find impersonation session
    const session = await prisma.impersonationSession.findUnique({
      where: { id: sessionId },
      include: {
        adminUser: true,
        targetUser: true,
      },
    });

    if (!session) {
      throw new Error('Impersonation session not found');
    }

    // 2. Verify admin owns this session
    if (session.adminUserId !== adminUserId) {
      throw new Error('Unauthorized to end this session');
    }

    // 3. Mark session as ended
    await prisma.impersonationSession.update({
      where: { id: sessionId },
      data: {
        endedAt: new Date(),
      },
    });

    // 4. Log impersonation end
    await AuditService.log({
      userId: adminUserId,
      action: 'admin.impersonation.end',
      resourceType: 'user',
      resourceId: session.targetUserId,
      metadata: {
        sessionId,
        duration: Date.now() - session.startedAt.getTime(),
      },
    });

    // 5. Return original admin token (decrypted from session)
    return {
      success: true,
      message: 'Impersonation ended successfully',
    };
  }

  /**
   * Verify impersonation token and extract metadata
   */
  static async verifyImpersonationToken(token: string) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_PUBLIC_KEY!, {
        algorithms: ['RS256'],
      }) as any;

      if (!decoded.impersonation?.isImpersonating) {
        throw new Error('Not an impersonation token');
      }

      return {
        userId: decoded.sub,
        email: decoded.email,
        clientId: decoded.clientId,
        impersonation: decoded.impersonation,
      };
    } catch (error) {
      throw new Error('Invalid impersonation token');
    }
  }

  /**
   * Get active impersonation sessions for admin
   */
  static async getActiveSessions(adminUserId: string) {
    return prisma.impersonationSession.findMany({
      where: {
        adminUserId,
        endedAt: null,
      },
      include: {
        targetUser: {
          select: {
            id: true,
            email: true,
            name: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });
  }

  /**
   * List all impersonation sessions (for audit)
   */
  static async listSessions(filters: {
    adminUserId?: string;
    targetUserId?: string;
    startDate?: Date;
    endDate?: Date;
    active?: boolean;
  }) {
    const where: any = {};

    if (filters.adminUserId) {
      where.adminUserId = filters.adminUserId;
    }

    if (filters.targetUserId) {
      where.targetUserId = filters.targetUserId;
    }

    if (filters.active !== undefined) {
      where.endedAt = filters.active ? null : { not: null };
    }

    if (filters.startDate || filters.endDate) {
      where.startedAt = {};
      if (filters.startDate) {
        where.startedAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.startedAt.lte = filters.endDate;
      }
    }

    return prisma.impersonationSession.findMany({
      where,
      include: {
        adminUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });
  }
}
```

#### API Endpoints

```typescript
// apps/api/src/routes/admin/impersonation.ts
import { Router } from 'express';
import { authenticateJWT } from '@/middleware/auth';
import { requireCapability } from '@/middleware/authorization';
import { ImpersonationService } from '@/services/auth/ImpersonationService';

const router = Router();

// All routes require authentication and impersonation permission
router.use(authenticateJWT);
router.use(requireCapability('admin.impersonate'));

/**
 * POST /admin/impersonate/start
 * Start impersonation session
 */
router.post('/start', async (req, res, next) => {
  try {
    const { targetUserId } = req.body;
    const adminUserId = req.user!.id;

    const result = await ImpersonationService.startImpersonation(
      adminUserId,
      targetUserId,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /admin/impersonate/end
 * End impersonation session
 */
router.post('/end', async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const adminUserId = req.user!.id;

    const result = await ImpersonationService.endImpersonation(
      sessionId,
      adminUserId
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/impersonate/sessions
 * List impersonation sessions
 */
router.get('/sessions', async (req, res, next) => {
  try {
    const adminUserId = req.user!.id;

    const sessions = await ImpersonationService.getActiveSessions(adminUserId);

    res.json({ sessions });
  } catch (error) {
    next(error);
  }
});

export default router;
```

### Frontend Implementation

#### Impersonation Context

```typescript
// apps/web/lib/auth/ImpersonationContext.tsx
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface ImpersonationState {
  isImpersonating: boolean;
  targetUser?: {
    id: string;
    email: string;
    name: string;
  };
  adminUser?: {
    id: string;
    email: string;
  };
  sessionId?: string;
}

interface ImpersonationContextType {
  impersonation: ImpersonationState;
  startImpersonation: (targetUserId: string) => Promise<void>;
  endImpersonation: () => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(
  undefined
);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonation, setImpersonation] = useState<ImpersonationState>({
    isImpersonating: false,
  });

  const startImpersonation = async (targetUserId: string) => {
    // 1. Save current admin token to localStorage
    const currentToken = localStorage.getItem('access_token');
    if (currentToken) {
      localStorage.setItem('admin_token', currentToken);
    }

    // 2. Request impersonation token from backend
    const response = await fetch('/api/admin/impersonate/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentToken}`,
      },
      body: JSON.stringify({ targetUserId }),
    });

    if (!response.ok) {
      throw new Error('Failed to start impersonation');
    }

    const data = await response.json();

    // 3. Store impersonation token
    localStorage.setItem('access_token', data.impersonationToken);
    localStorage.setItem('impersonation_session_id', data.sessionId);

    // 4. Update context
    setImpersonation({
      isImpersonating: true,
      targetUser: data.targetUser,
      sessionId: data.sessionId,
    });

    // 5. Reload page to target user's view
    window.location.href = '/chat';
  };

  const endImpersonation = async () => {
    const sessionId = localStorage.getItem('impersonation_session_id');
    const adminToken = localStorage.getItem('admin_token');

    if (!sessionId || !adminToken) {
      throw new Error('No active impersonation session');
    }

    // 1. End impersonation on backend
    await fetch('/api/admin/impersonate/end', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      },
      body: JSON.stringify({ sessionId }),
    });

    // 2. Restore admin token
    localStorage.setItem('access_token', adminToken);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('impersonation_session_id');

    // 3. Update context
    setImpersonation({
      isImpersonating: false,
    });

    // 4. Redirect back to admin dashboard
    window.location.href = '/admin';
  };

  return (
    <ImpersonationContext.Provider
      value={{
        impersonation,
        startImpersonation,
        endImpersonation,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error('useImpersonation must be used within ImpersonationProvider');
  }
  return context;
}
```

#### Impersonation Banner

```typescript
// apps/web/components/admin/ImpersonationBanner.tsx
'use client';

import { useImpersonation } from '@/lib/auth/ImpersonationContext';

export function ImpersonationBanner() {
  const { impersonation, endImpersonation } = useImpersonation();

  if (!impersonation.isImpersonating) {
    return null;
  }

  return (
    <div className="bg-yellow-500 text-black px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="font-semibold">⚠️ IMPERSONATION MODE</span>
        <span>
          Viewing as: <strong>{impersonation.targetUser?.email}</strong>
        </span>
      </div>
      <button
        onClick={endImpersonation}
        className="bg-white px-4 py-2 rounded font-semibold hover:bg-gray-100"
      >
        Exit Impersonation
      </button>
    </div>
  );
}
```

#### User List with Impersonate Button

```typescript
// apps/web/app/admin/users/components/UserList.tsx
'use client';

import { useState } from 'react';
import { useImpersonation } from '@/lib/auth/ImpersonationContext';

interface User {
  id: string;
  email: string;
  name: string;
  client: {
    name: string;
  };
}

export function UserList({ users }: { users: User[] }) {
  const { startImpersonation } = useImpersonation();
  const [impersonating, setImpersonating] = useState<string | null>(null);

  const handleImpersonate = async (userId: string) => {
    if (!confirm('Are you sure you want to sign in as this user?')) {
      return;
    }

    try {
      setImpersonating(userId);
      await startImpersonation(userId);
      // Page will reload automatically
    } catch (error) {
      console.error('Failed to impersonate:', error);
      setImpersonating(null);
      alert('Failed to impersonate user');
    }
  };

  return (
    <table className="w-full">
      <thead>
        <tr>
          <th>Email</th>
          <th>Name</th>
          <th>Client</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>{user.email}</td>
            <td>{user.name}</td>
            <td>{user.client.name}</td>
            <td>
              <button
                onClick={() => handleImpersonate(user.id)}
                disabled={impersonating === user.id}
                className="btn-secondary"
              >
                {impersonating === user.id ? 'Signing in...' : 'Sign in as'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Middleware for Impersonation Detection

```typescript
// apps/api/src/middleware/impersonation.ts
import { Request, Response, NextFunction } from 'express';

export function detectImpersonation(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Check if current token is an impersonation token
  if (req.user && (req.user as any).impersonation) {
    const impersonation = (req.user as any).impersonation;

    // Attach impersonation metadata to request
    req.impersonation = {
      isImpersonating: true,
      adminUserId: impersonation.adminUserId,
      adminEmail: impersonation.adminEmail,
      sessionId: impersonation.sessionId,
      startedAt: new Date(impersonation.startedAt),
    };

    // Log impersonated actions
    console.log(
      `[IMPERSONATION] Admin ${impersonation.adminEmail} acting as ${req.user.email}`
    );
  }

  next();
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      impersonation?: {
        isImpersonating: boolean;
        adminUserId: string;
        adminEmail: string;
        sessionId: string;
        startedAt: Date;
      };
    }
  }
}
```

### Restrictions During Impersonation

Certain actions should be restricted during impersonation:

```typescript
// apps/api/src/middleware/restrictImpersonation.ts
import { Request, Response, NextFunction } from 'express';

const RESTRICTED_ACTIONS = [
  '/api/auth/change-password',
  '/api/auth/2fa/enable',
  '/api/auth/2fa/disable',
  '/api/users/delete-account',
];

export function restrictImpersonation(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Check if impersonating
  if (req.impersonation?.isImpersonating) {
    // Block sensitive operations
    if (RESTRICTED_ACTIONS.some((path) => req.path.startsWith(path))) {
      return res.status(403).json({
        error: 'This action is not allowed during impersonation',
      });
    }
  }

  next();
}
```

### Audit Logging for Impersonation

All actions during impersonation should be logged with special metadata:

```typescript
// Enhanced audit logging
await AuditService.log({
  userId: req.user!.id,
  action: 'project.create',
  resourceType: 'project',
  resourceId: project.id,
  before: null,
  after: project,
  ipAddress: req.ip,
  // Add impersonation metadata if present
  metadata: req.impersonation
    ? {
        impersonation: {
          adminUserId: req.impersonation.adminUserId,
          adminEmail: req.impersonation.adminEmail,
          sessionId: req.impersonation.sessionId,
        },
      }
    : undefined,
});
```

### Usage Flow

1. **Admin starts impersonation**:
   - Admin goes to user list in admin dashboard
   - Clicks "Sign in as" button next to user
   - Confirms the action
   - System saves admin token to localStorage
   - System requests impersonation token from API
   - System stores impersonation token
   - Page redirects to chat interface (user view)

2. **Admin views as client**:
   - Yellow banner at top shows "IMPERSONATION MODE"
   - Admin sees exactly what the user sees
   - All actions are logged with impersonation metadata
   - Sensitive operations are blocked

3. **Admin exits impersonation**:
   - Admin clicks "Exit Impersonation" in banner
   - System ends impersonation session on backend
   - System restores original admin token
   - Page redirects back to admin dashboard

### Security Best Practices

1. **Capability-Based Access**: Only users with `admin.impersonate` capability
   can impersonate
2. **Complete Audit Trail**: Log every impersonation session and all actions
   taken
3. **Visual Indicators**: Always show impersonation banner
4. **Restricted Actions**: Block password changes, 2FA changes, account deletion
5. **Session Timeout**: Impersonation sessions expire after 4 hours
6. **Confirmation**: Require confirmation before starting impersonation
7. **Monitoring**: Alert on excessive impersonation activity
8. **Regular Audits**: Review impersonation logs regularly

---

## Testing Checklist

### Registration & Login

- [ ] User can register with email/password
- [ ] Password validation works
- [ ] Email verification is sent
- [ ] User cannot login without verifying email
- [ ] User can login with correct credentials
- [ ] Login fails with incorrect password
- [ ] Account locks after 10 failed attempts
- [ ] User can login with Google OAuth
- [ ] Google OAuth creates new account if email doesn't exist
- [ ] Google OAuth links account if email already exists

### 2FA

- [ ] User can enable 2FA
- [ ] QR code is generated correctly
- [ ] Backup codes are generated (10 codes)
- [ ] 2FA prompt appears on login when enabled
- [ ] Valid TOTP code allows login
- [ ] Invalid TOTP code is rejected
- [ ] Backup code can be used once
- [ ] User can disable 2FA with password + current code
- [ ] User can regenerate backup codes

### JWT & Sessions

- [ ] Access token expires after 15 minutes
- [ ] Refresh token works to get new access token
- [ ] New refresh token is issued on refresh
- [ ] Logout revokes refresh token
- [ ] Logout all devices revokes all refresh tokens
- [ ] Expired tokens are rejected

### Password Management

- [ ] Password reset email is sent
- [ ] Password can be reset with valid token
- [ ] Reset token expires after 1 hour
- [ ] User can change password when authenticated
- [ ] Old password must be provided to change password

### Security

- [ ] Rate limiting prevents brute force
- [ ] Passwords are hashed (never stored in plain text)
- [ ] SQL injection is prevented (use Prisma)
- [ ] XSS is prevented (sanitize inputs)
- [ ] CSRF protection is in place

---

## Future Enhancements

1. **Biometric Authentication** (WebAuthn/FIDO2)
2. **SMS-based 2FA** (as alternative to TOTP)
3. **Social Login** (GitHub, Microsoft, Apple)
4. **Session Management UI** (view and revoke active sessions)
5. **Login History** (track IP, device, location)
6. **Suspicious Activity Alerts**
7. **Magic Link Login** (passwordless via email)
8. **OAuth Provider for Third-party Apps** (if building an API platform)
