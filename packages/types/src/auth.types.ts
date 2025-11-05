/**
 * Authentication Type Definitions
 *
 * Types for authentication, JWT, and session management
 */

import { UserPublic } from './user.types';

/**
 * JWT Access Token Payload
 */
export interface JWTPayload {
  sub: string; // User ID
  email: string;
  role: string;
  clientId: string;
  iat: number; // Issued at
  exp: number; // Expiration
  impersonation?: ImpersonationMetadata;
}

/**
 * Impersonation metadata in JWT
 */
export interface ImpersonationMetadata {
  isImpersonating: boolean;
  adminUserId: string;
  adminEmail: string;
  sessionId: string;
  startedAt: number;
}

/**
 * Refresh Token entity
 */
export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  familyId: string; // For token rotation
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Login request
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserPublic;
  requiresTwoFactor?: boolean;
}

/**
 * Register request
 */
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  clientId?: string;
}

/**
 * Refresh token request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Refresh token response
 */
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Two-factor authentication enable request
 */
export interface TwoFactorEnableRequest {
  password: string;
}

/**
 * Two-factor authentication enable response
 */
export interface TwoFactorEnableResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

/**
 * Two-factor authentication verify request
 */
export interface TwoFactorVerifyRequest {
  token: string;
}

/**
 * Two-factor authentication disable request
 */
export interface TwoFactorDisableRequest {
  password: string;
  token: string;
}

/**
 * Google OAuth user info
 */
export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}
