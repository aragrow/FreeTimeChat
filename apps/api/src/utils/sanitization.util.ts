/**
 * Sanitization Utilities
 *
 * Comprehensive input/output sanitization to prevent:
 * - XSS (Cross-Site Scripting)
 * - SQL Injection (via Prisma parameterized queries)
 * - NoSQL Injection
 * - Command Injection
 * - Path Traversal
 *
 * IMPORTANT: Use these utilities for ALL user input before:
 * - Storing in database
 * - Rendering in responses
 * - Using in file operations
 * - Executing commands
 */

import validator from 'validator';
import xss from 'xss';

/**
 * Sanitize string input to prevent XSS
 * Removes HTML tags and JavaScript
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove any HTML tags and JavaScript
  let sanitized = xss(input, {
    whiteList: {}, // No HTML tags allowed
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style'],
  });

  // Trim whitespace
  sanitized = sanitized.trim();

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized;
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }

  const sanitized = validator.normalizeEmail(email.trim().toLowerCase()) || '';

  // Validate email format
  if (sanitized && !validator.isEmail(sanitized)) {
    throw new Error('Invalid email format');
  }

  return sanitized;
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') {
    return '';
  }

  const sanitized = url.trim();

  // Validate URL format
  if (
    sanitized &&
    !validator.isURL(sanitized, { protocols: ['http', 'https'], require_protocol: true })
  ) {
    throw new Error('Invalid URL format');
  }

  return sanitized;
}

/**
 * Sanitize slug (lowercase alphanumeric with hyphens)
 */
export function sanitizeSlug(slug: string): string {
  if (typeof slug !== 'string') {
    return '';
  }

  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '') // Remove invalid characters
    .replace(/--+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Sanitize alphanumeric string (letters and numbers only)
 */
export function sanitizeAlphanumeric(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input.trim().replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Sanitize phone number (digits, spaces, hyphens, parentheses, plus)
 */
export function sanitizePhone(phone: string): string {
  if (typeof phone !== 'string') {
    return '';
  }

  return phone.trim().replace(/[^0-9\s()+-]/g, '');
}

/**
 * Sanitize integer
 */
export function sanitizeInteger(input: any): number | null {
  const num = parseInt(String(input), 10);
  return isNaN(num) ? null : num;
}

/**
 * Sanitize float
 */
export function sanitizeFloat(input: any): number | null {
  const num = parseFloat(String(input));
  return isNaN(num) ? null : num;
}

/**
 * Sanitize boolean
 */
export function sanitizeBoolean(input: any): boolean {
  if (typeof input === 'boolean') {
    return input;
  }

  const str = String(input).toLowerCase().trim();
  return str === 'true' || str === '1' || str === 'yes';
}

/**
 * Sanitize file path to prevent path traversal
 */
export function sanitizeFilePath(path: string): string {
  if (typeof path !== 'string') {
    return '';
  }

  // Remove path traversal attempts
  let sanitized = path.replace(/\.\./g, '').replace(/\/\//g, '/');

  // Remove any non-alphanumeric except forward slash, hyphen, underscore, dot
  sanitized = sanitized.replace(/[^a-zA-Z0-9/\-_.]/g, '');

  return sanitized;
}

/**
 * Sanitize object recursively
 * Applies string sanitization to all string values in an object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized: any = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (value && typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized as T;
}

/**
 * Escape HTML entities for safe rendering
 * Use this when displaying user-generated content in HTML
 */
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Sanitize HTML while allowing safe tags
 * Use for rich text content (e.g., descriptions, comments)
 */
export function sanitizeHtml(html: string): string {
  if (typeof html !== 'string') {
    return '';
  }

  return xss(html, {
    whiteList: {
      p: [],
      br: [],
      strong: [],
      b: [],
      em: [],
      i: [],
      u: [],
      ul: [],
      ol: [],
      li: [],
      a: ['href', 'title'],
      blockquote: [],
      code: [],
      pre: [],
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style', 'iframe'],
  });
}

/**
 * Validate and sanitize UUID
 */
export function sanitizeUuid(uuid: string): string {
  if (typeof uuid !== 'string') {
    throw new Error('Invalid UUID');
  }

  const sanitized = uuid.trim();

  if (!validator.isUUID(sanitized)) {
    throw new Error('Invalid UUID format');
  }

  return sanitized;
}

/**
 * Sanitize search query
 * Prevents SQL injection and removes special characters
 */
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') {
    return '';
  }

  // Remove SQL keywords and special characters
  let sanitized = query.trim();

  // Remove common SQL injection patterns
  sanitized = sanitized.replace(
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|OR|AND|WHERE|FROM|JOIN)\b)/gi,
    ''
  );

  // Remove special SQL characters except space, hyphen, apostrophe
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-']/g, '');

  // Limit length
  sanitized = sanitized.substring(0, 100);

  return sanitized.trim();
}

/**
 * Sanitize tenant data before storage
 */
export function sanitizeTenantData(data: any): any {
  return {
    name: data.name ? sanitizeString(data.name) : undefined,
    slug: data.slug ? sanitizeSlug(data.slug) : undefined,
    tenantKey: data.tenantKey
      ? data.tenantKey
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9-]/g, '')
      : undefined,
    databaseName: data.databaseName
      ? sanitizeAlphanumeric(data.databaseName.toLowerCase())
      : undefined,
    databaseHost: data.databaseHost ? sanitizeString(data.databaseHost) : undefined,
    contactName: data.contactName ? sanitizeString(data.contactName) : undefined,
    contactEmail: data.contactEmail ? sanitizeEmail(data.contactEmail) : undefined,
    contactPhone: data.contactPhone ? sanitizePhone(data.contactPhone) : undefined,
    billingStreet: data.billingStreet ? sanitizeString(data.billingStreet) : undefined,
    billingCity: data.billingCity ? sanitizeString(data.billingCity) : undefined,
    billingState: data.billingState ? sanitizeString(data.billingState) : undefined,
    billingZip: data.billingZip ? sanitizeString(data.billingZip) : undefined,
    billingCountry: data.billingCountry ? sanitizeString(data.billingCountry) : undefined,
    billingEmail: data.billingEmail ? sanitizeEmail(data.billingEmail) : undefined,
    isActive: data.isActive !== undefined ? sanitizeBoolean(data.isActive) : undefined,
  };
}

/**
 * Sanitize user data before storage
 */
export function sanitizeUserData(data: any): any {
  return {
    name: data.name ? sanitizeString(data.name) : undefined,
    email: data.email ? sanitizeEmail(data.email) : undefined,
    // Password is hashed separately, no sanitization needed
  };
}

/**
 * Rate limit key sanitization
 */
export function sanitizeRateLimitKey(key: string): string {
  return sanitizeAlphanumeric(key);
}
