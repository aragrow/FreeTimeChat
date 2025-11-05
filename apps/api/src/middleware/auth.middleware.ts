/**
 * Authentication Middleware
 *
 * Verifies JWT tokens and attaches user information to requests
 */

import { getJWTService } from '../services/jwt.service';
import type { NextFunction, Request, Response } from 'express';

/**
 * Middleware to authenticate requests using JWT
 *
 * Extracts the token from the Authorization header, verifies it,
 * and attaches the decoded user information to req.user
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        status: 'error',
        message: 'No authorization header provided',
      });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid authorization header format. Expected: Bearer <token>',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      res.status(401).json({
        status: 'error',
        message: 'No token provided',
      });
      return;
    }

    // Verify token
    const jwtService = getJWTService();
    const decoded = jwtService.verifyAccessToken(token);

    // Attach user info to request
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Token expired') {
        res.status(401).json({
          status: 'error',
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
        });
        return;
      }

      if (error.message === 'Invalid token') {
        res.status(401).json({
          status: 'error',
          message: 'Invalid token',
          code: 'INVALID_TOKEN',
        });
        return;
      }
    }

    res.status(500).json({
      status: 'error',
      message: 'Authentication failed',
    });
  }
}

/**
 * Optional authentication middleware
 *
 * Similar to authenticate, but doesn't fail if no token is provided.
 * Useful for endpoints that work both with and without authentication.
 */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  // If no auth header, just continue without setting req.user
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.substring(7);

  if (!token) {
    next();
    return;
  }

  try {
    const jwtService = getJWTService();
    const decoded = jwtService.verifyAccessToken(token);
    req.user = decoded;
  } catch {
    // Ignore errors for optional auth
  }

  next();
}
