/**
 * Permission Middleware
 *
 * Checks if authenticated user has required capabilities/permissions
 */

import { getCapabilityService } from '../services/capability.service';
import { getRoleService } from '../services/role.service';
import type { JWTPayload } from '@freetimechat/types';
import type { NextFunction, Request, Response } from 'express';

/**
 * Middleware factory to check if user has a specific capability
 */
export function requireCapability(capabilityName: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required',
        });
        return;
      }

      const capabilityService = getCapabilityService();
      const userId = (req.user as JWTPayload).sub;
      const hasCapability = await capabilityService.userHasCapability(userId, capabilityName);

      if (!hasCapability) {
        res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions',
          required: capabilityName,
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Permission check failed',
      });
    }
  };
}

/**
 * Middleware factory to check if user has any of the specified capabilities
 */
export function requireAnyCapability(capabilityNames: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required',
        });
        return;
      }

      const capabilityService = getCapabilityService();
      const userId = (req.user as JWTPayload).sub;
      const hasAnyCapability = await capabilityService.userHasAnyCapability(
        userId,
        capabilityNames
      );

      if (!hasAnyCapability) {
        res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions',
          requiredAny: capabilityNames,
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Permission check failed',
      });
    }
  };
}

/**
 * Middleware factory to check if user has all of the specified capabilities
 */
export function requireAllCapabilities(capabilityNames: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required',
        });
        return;
      }

      const capabilityService = getCapabilityService();
      const userId = (req.user as JWTPayload).sub;
      const hasAllCapabilities = await capabilityService.userHasAllCapabilities(
        userId,
        capabilityNames
      );

      if (!hasAllCapabilities) {
        res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions',
          requiredAll: capabilityNames,
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Permission check failed',
      });
    }
  };
}

/**
 * Middleware factory to check if user has a specific role
 */
export function requireRole(roleName: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required',
        });
        return;
      }

      const roleService = getRoleService();
      const userId = (req.user as JWTPayload).sub;
      const hasRole = await roleService.userHasRole(userId, roleName);

      if (!hasRole) {
        res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions',
          requiredRole: roleName,
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Permission check failed',
      });
    }
  };
}

/**
 * Middleware factory to check if user has any of the specified roles
 */
export function requireAnyRole(roleNames: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required',
        });
        return;
      }

      const roleService = getRoleService();
      const userId = (req.user as JWTPayload).sub;
      const hasAnyRole = await roleService.userHasAnyRole(userId, roleNames);

      if (!hasAnyRole) {
        res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions',
          requiredAnyRole: roleNames,
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Permission check failed',
      });
    }
  };
}
