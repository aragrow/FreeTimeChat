/**
 * Permission Middleware
 *
 * Checks if authenticated user has required capabilities/permissions
 */

import { getCapabilityService } from '../services/capability.service';
import { getRoleService } from '../services/role.service';
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
      const hasCapability = await capabilityService.userHasCapability(req.user.sub, capabilityName);

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
      const hasAnyCapability = await capabilityService.userHasAnyCapability(
        req.user.sub,
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
      const hasAllCapabilities = await capabilityService.userHasAllCapabilities(
        req.user.sub,
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
      const hasRole = await roleService.userHasRole(req.user.sub, roleName);

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
      const hasAnyRole = await roleService.userHasAnyRole(req.user.sub, roleNames);

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
