/**
 * Error Handling Middleware
 *
 * Centralized error handling for the API
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@/utils/errors';
import type { ApiErrorResponse } from '@freetimechat/types';

/**
 * Global error handler middleware
 * Must be the last middleware in the chain
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Default to 500 if not an ApiError
  let statusCode = 500;
  let message = 'Internal server error';
  let errors: any = undefined;

  // Handle ApiError instances
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;

    // Include validation errors if present
    if ('errors' in err) {
      errors = err.errors;
    }
  }

  // Log error (in production, this would go to a logging service)
  const isOperational = err instanceof ApiError ? err.isOperational : false;
  if (statusCode === 500 || !isOperational) {
    console.error('❌ Error:', err);
  } else {
    console.warn('⚠️  Operational error:', message);
  }

  // Build error response
  const errorResponse: ApiErrorResponse = {
    status: 'error',
    message: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : message,
  };

  // Include validation errors if present
  if (errors) {
    errorResponse.errors = errors;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Not Found handler
 * Should be placed before the error handler
 */
export function notFoundHandler(_req: Request, res: Response<ApiErrorResponse>): void {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
}
