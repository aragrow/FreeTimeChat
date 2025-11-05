/**
 * Unit Tests for CapabilityService
 *
 * Tests permission checking, explicit deny logic, and caching
 */

import { CapabilityService } from '../../../services/capability.service';
import type { PrismaClient as MainPrismaClient } from '../../../generated/prisma-main';

// Mock Prisma
jest.mock('../../../generated/prisma-main', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    capability: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    roleCapability: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
  })),
}));

describe('CapabilityService', () => {
  let capabilityService: CapabilityService;
  let mockPrisma: jest.Mocked<MainPrismaClient>;

  beforeEach(() => {
    const { PrismaClient } = require('../../../generated/prisma-main');
    mockPrisma = new PrismaClient() as jest.Mocked<MainPrismaClient>;
    capabilityService = new CapabilityService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all capabilities', async () => {
      const mockCapabilities = [
        { id: '1', name: 'users:read', description: 'View users', createdAt: new Date() },
        { id: '2', name: 'users:create', description: 'Create users', createdAt: new Date() },
      ];

      (mockPrisma.capability.findMany as jest.Mock).mockResolvedValue(mockCapabilities);

      const result = await capabilityService.getAll();

      expect(result).toEqual(mockCapabilities);
      expect(mockPrisma.capability.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('getByName', () => {
    it('should return capability by name', async () => {
      const mockCapability = {
        id: '1',
        name: 'users:read',
        description: 'View users',
        createdAt: new Date(),
      };

      (mockPrisma.capability.findUnique as jest.Mock).mockResolvedValue(mockCapability);

      const result = await capabilityService.getByName('users:read');

      expect(result).toEqual(mockCapability);
      expect(mockPrisma.capability.findUnique).toHaveBeenCalledWith({
        where: { name: 'users:read' },
      });
    });

    it('should return null for non-existent capability', async () => {
      (mockPrisma.capability.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await capabilityService.getByName('non:existent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new capability', async () => {
      const mockCapability = {
        id: '1',
        name: 'users:read',
        description: 'View users',
        createdAt: new Date(),
      };

      (mockPrisma.capability.create as jest.Mock).mockResolvedValue(mockCapability);

      const result = await capabilityService.create('users:read', 'View users');

      expect(result).toEqual(mockCapability);
      expect(mockPrisma.capability.create).toHaveBeenCalledWith({
        data: {
          name: 'users:read',
          description: 'View users',
        },
      });
    });
  });

  describe('assignToRole', () => {
    it('should assign capability to role with allow=true', async () => {
      const mockRoleCapability = {
        id: '1',
        roleId: 'role-123',
        capabilityId: 'cap-456',
        isAllowed: true,
        createdAt: new Date(),
        role: { id: 'role-123', name: 'Admin', description: 'Admin role', createdAt: new Date() },
        capability: {
          id: 'cap-456',
          name: 'users:read',
          description: 'View users',
          createdAt: new Date(),
        },
      };

      (mockPrisma.roleCapability.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.roleCapability.create as jest.Mock).mockResolvedValue(mockRoleCapability);

      const result = await capabilityService.assignToRole('role-123', 'cap-456', true);

      expect(result).toEqual(mockRoleCapability);
      expect(mockPrisma.roleCapability.create).toHaveBeenCalledWith({
        data: {
          roleId: 'role-123',
          capabilityId: 'cap-456',
          isAllowed: true,
        },
        include: {
          role: true,
          capability: true,
        },
      });
    });

    it('should update existing assignment', async () => {
      const existingAssignment = {
        id: '1',
        roleId: 'role-123',
        capabilityId: 'cap-456',
        isAllowed: false,
        createdAt: new Date(),
      };

      const updatedAssignment = {
        ...existingAssignment,
        isAllowed: true,
        role: { id: 'role-123', name: 'Admin', description: 'Admin role', createdAt: new Date() },
        capability: {
          id: 'cap-456',
          name: 'users:read',
          description: 'View users',
          createdAt: new Date(),
        },
      };

      (mockPrisma.roleCapability.findUnique as jest.Mock).mockResolvedValue(existingAssignment);
      (mockPrisma.roleCapability.update as jest.Mock).mockResolvedValue(updatedAssignment);

      const result = await capabilityService.assignToRole('role-123', 'cap-456', true);

      expect(result).toEqual(updatedAssignment);
      expect(mockPrisma.roleCapability.update).toHaveBeenCalled();
    });
  });

  describe('removeFromRole', () => {
    it('should remove capability from role', async () => {
      (mockPrisma.roleCapability.delete as jest.Mock).mockResolvedValue({});

      await capabilityService.removeFromRole('role-123', 'cap-456');

      expect(mockPrisma.roleCapability.delete).toHaveBeenCalledWith({
        where: {
          roleId_capabilityId: {
            roleId: 'role-123',
            capabilityId: 'cap-456',
          },
        },
      });
    });
  });

  describe('getRoleCapabilities', () => {
    it('should return capabilities for a role', async () => {
      const mockRoleCapabilities = [
        {
          id: '1',
          roleId: 'role-123',
          capabilityId: 'cap-1',
          isAllowed: true,
          createdAt: new Date(),
          capability: {
            id: 'cap-1',
            name: 'users:read',
            description: 'View users',
            createdAt: new Date(),
          },
        },
        {
          id: '2',
          roleId: 'role-123',
          capabilityId: 'cap-2',
          isAllowed: false,
          createdAt: new Date(),
          capability: {
            id: 'cap-2',
            name: 'users:delete',
            description: 'Delete users',
            createdAt: new Date(),
          },
        },
      ];

      (mockPrisma.roleCapability.findMany as jest.Mock).mockResolvedValue(mockRoleCapabilities);

      const result = await capabilityService.getRoleCapabilities('role-123');

      expect(result).toEqual(mockRoleCapabilities);
      expect(mockPrisma.roleCapability.findMany).toHaveBeenCalledWith({
        where: { roleId: 'role-123' },
        include: { capability: true },
      });
    });
  });

  describe('checkPermission - Explicit Deny Logic', () => {
    it('should allow when capability is explicitly allowed', async () => {
      const mockRoleCapabilities = [
        {
          id: '1',
          roleId: 'role-123',
          capabilityId: 'cap-1',
          isAllowed: true,
          createdAt: new Date(),
        },
      ];

      (mockPrisma.roleCapability.findMany as jest.Mock).mockResolvedValue(mockRoleCapabilities);

      const result = await capabilityService.checkPermission(['role-123'], 'cap-1');

      expect(result).toBe(true);
    });

    it('should deny when capability is explicitly denied', async () => {
      const mockRoleCapabilities = [
        {
          id: '1',
          roleId: 'role-123',
          capabilityId: 'cap-1',
          isAllowed: false,
          createdAt: new Date(),
        },
      ];

      (mockPrisma.roleCapability.findMany as jest.Mock).mockResolvedValue(mockRoleCapabilities);

      const result = await capabilityService.checkPermission(['role-123'], 'cap-1');

      expect(result).toBe(false);
    });

    it('should deny when explicit deny exists even with allow in another role', async () => {
      const mockRoleCapabilities = [
        {
          id: '1',
          roleId: 'role-allow',
          capabilityId: 'cap-1',
          isAllowed: true,
          createdAt: new Date(),
        },
        {
          id: '2',
          roleId: 'role-deny',
          capabilityId: 'cap-1',
          isAllowed: false,
          createdAt: new Date(),
        },
      ];

      (mockPrisma.roleCapability.findMany as jest.Mock).mockResolvedValue(mockRoleCapabilities);

      const result = await capabilityService.checkPermission(
        ['role-allow', 'role-deny'],
        'cap-1'
      );

      expect(result).toBe(false); // Explicit deny overrides allow
    });

    it('should deny when no capabilities found', async () => {
      (mockPrisma.roleCapability.findMany as jest.Mock).mockResolvedValue([]);

      const result = await capabilityService.checkPermission(['role-123'], 'cap-1');

      expect(result).toBe(false);
    });
  });
});
