/**
 * Async Handler Utility
 *
 * Wraps async route handlers to catch errors and pass them to error middleware
 */

import { Request, Response, NextFunction } from 'express';

type AsyncFunction = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

/**
 * Wraps an async function to catch errors and pass them to next()
 *
 * @example
 * ```typescript
 * router.get('/', asyncHandler(async (req, res) => {
 *   const data = await someAsyncOperation();
 *   res.json(data);
 * }));
 * ```
 */
export function asyncHandler(fn: AsyncFunction) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
