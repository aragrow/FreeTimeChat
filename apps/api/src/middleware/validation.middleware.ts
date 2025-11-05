/**
 * Validation Middleware
 *
 * Generic middleware for validating requests using Zod schemas
 */

import { type ZodError, type ZodSchema } from 'zod';
import type { NextFunction, Request, Response } from 'express';

/**
 * Validate request against a Zod schema
 *
 * @param schema Zod schema to validate against
 * @returns Express middleware function
 */
export const validate =
  (schema: ZodSchema) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request data
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      next();
    } catch (error) {
      // Handle validation errors
      if (isZodError(error)) {
        const errors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors,
        });
        return;
      }

      // Unknown error
      console.error('Validation middleware error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error during validation',
      });
    }
  };

/**
 * Type guard to check if error is a Zod error
 */
function isZodError(error: unknown): error is ZodError {
  return (error as ZodError).issues !== undefined;
}
