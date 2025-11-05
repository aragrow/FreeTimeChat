/**
 * API Response Types
 *
 * Standard response formats for all API endpoints
 */

/**
 * Standard API success response
 */
export interface ApiResponse<T = any> {
  status: 'success';
  data: T;
  message?: string;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  status: 'error';
  message: string;
  errors?: any;
  stack?: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T = any> {
  status: 'success';
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  message: string;
  version: string;
  environment: string;
  timestamp: string;
  uptime: number;
  services?: {
    database?: 'connected' | 'disconnected' | 'unknown';
    redis?: 'connected' | 'disconnected' | 'unknown';
  };
}
