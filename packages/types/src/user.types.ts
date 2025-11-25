/**
 * User Type Definitions
 *
 * Types for users, roles, and capabilities (RBAC system)
 */

/**
 * User entity
 */
export interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  passwordHash?: string; // Optional, not included in responses
  twoFactorEnabled: boolean;
  twoFactorSecret?: string; // Optional, not included in responses
  googleId?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  compensationType?: 'HOURLY' | 'SALARY';
  hourlyRate?: number;
  trackingMode?: 'CLOCK' | 'MANUAL';
  naturalHoursPerWeek?: number; // Default 10
  highlyCompensated?: number; // 0 = no, 1 = yes
  overtimePolicy?: 'ALLOW' | 'AUTO_SPLIT' | 'BLOCK'; // Default ALLOW
  createdAt: Date;
  updatedAt: Date;
  roles?: UserRole[];
}

/**
 * User without sensitive fields (for API responses)
 */
export type UserPublic = Omit<User, 'passwordHash' | 'twoFactorSecret'>;

/**
 * Client entity (Tenant)
 */
export interface Client {
  id: string;
  name: string;
  slug: string;
  tenantKey: string;
  databaseId?: string;
  databaseName?: string;
  databaseHost: string;
  isActive: boolean;
  isSeeded: boolean;

  // Contact Information
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;

  // Billing Address
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  billingCountry?: string;
  billingEmail?: string;

  // Invoice Address
  invoiceContact?: string;
  invoiceEmail?: string;
  invoicePhone?: string;
  invoiceStreet?: string;
  invoiceCity?: string;
  invoiceState?: string;
  invoiceZip?: string;
  invoiceCountry?: string;
  taxId?: string;

  // Invoice Settings
  currency: string;
  invoicePrefix?: string;
  nextInvoiceNumber: number;
  logoUrl?: string;

  // Localization Settings
  language: string;
  dateFormat: string;
  timeZone: string;

  // Payment Methods
  enableStripe: boolean;
  enablePaypal: boolean;
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  paypalClientId?: string;
  paypalClientSecret?: string;
  paypalSandbox: boolean;
  defaultPaymentMethod?: string;

  // Navigation Settings
  navigationConfig?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Role entity
 */
export interface Role {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  capabilities?: RoleCapability[];
}

/**
 * Capability entity
 */
export interface Capability {
  id: string;
  name: string;
  description?: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User-Role junction
 */
export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  user?: User;
  role?: Role;
  createdAt: Date;
}

/**
 * Role-Capability junction with allow/deny
 */
export interface RoleCapability {
  id: string;
  roleId: string;
  capabilityId: string;
  role?: Role;
  capability?: Capability;
  isAllowed: boolean; // true = allow, false = explicit deny
  createdAt: Date;
}

/**
 * Impersonation session
 */
export interface ImpersonationSession {
  id: string;
  adminUserId: string;
  targetUserId: string;
  adminUser?: User;
  targetUser?: User;
  startedAt: Date;
  endedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}
