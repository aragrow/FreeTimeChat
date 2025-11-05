/**
 * API Response Type Definitions
 *
 * Standard response formats for all API endpoints
 */

/**
 * Standard API success response wrapper
 */
export interface ApiResponse<T = any> {
  status: 'success';
  data: T;
  message?: string;
  meta?: Record<string, any>;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  status: 'error';
  message: string;
  errors?: Array<{
    field?: string;
    message: string;
    code?: string;
  }> | Record<string, any>;
  stack?: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T = any> {
  status: 'success';
  data: T[];
  pagination: PaginationMeta;
  meta?: Record<string, any>;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'ok' | 'error' | 'degraded';
  message: string;
  version: string;
  environment: string;
  timestamp: string;
  uptime: number;
  services?: {
    database?: ServiceStatus;
    redis?: ServiceStatus;
    [key: string]: ServiceStatus | undefined;
  };
}

/**
 * Service status for health checks
 */
export type ServiceStatus = 'connected' | 'disconnected' | 'degraded' | 'unknown';

/**
 * Pagination query parameters
 */
export interface PaginationParams {
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Filter query parameters
 */
export interface FilterParams {
  search?: string;
  filters?: Record<string, any>;
}

/**
 * Standard list query parameters
 */
export interface ListQueryParams extends PaginationParams, FilterParams {
  include?: string[];
}
