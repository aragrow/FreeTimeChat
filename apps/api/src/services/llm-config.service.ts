/**
 * LLM Configuration Service
 *
 * Manages LLM provider configurations with support for:
 * - System-wide configurations (admin users)
 * - Tenant-specific configurations (tenantadmin users)
 * - Encrypted API key storage
 * - Configuration validation and testing
 */

import crypto from 'crypto';
import { createLLMProvider } from '../integrations/llm/llm.factory';
import { getDatabaseService } from './database.service';
import type { LLMProvider } from '../generated/prisma-main';
import type { BaseLLMProvider } from '../integrations/llm/base-provider';

// Get database service singleton
const databaseService = getDatabaseService();

// Environment variable for encryption key (should be 32 bytes for AES-256)
const ENCRYPTION_KEY =
  process.env.LLM_CONFIG_ENCRYPTION_KEY || 'default-key-change-in-production-32b';
const ALGORITHM = 'aes-256-cbc';

interface LLMConfigCreateInput {
  provider: LLMProvider;
  apiKey: string; // Plain text - will be encrypted
  defaultModel: string;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;
  organization?: string;
  timeout?: number;
}

interface LLMConfigUpdateInput {
  apiKey?: string; // Plain text - will be encrypted if provided
  defaultModel?: string;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;
  organization?: string;
  timeout?: number;
  isActive?: boolean;
}

interface LLMConfigResponse {
  id: string;
  provider: LLMProvider;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  baseUrl: string | null;
  organization: string | null;
  timeout: number;
  isActive: boolean;
  tenantId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  // API key is NEVER returned in responses
}

export class LLMConfigService {
  /**
   * Encrypt an API key for storage
   */
  private encryptApiKey(apiKey: string): string {
    // Create a 16-byte initialization vector
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0')),
      iv
    );

    // Encrypt the API key
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV + encrypted data (separated by :)
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt an API key from storage
   */
  private decryptApiKey(encryptedApiKey: string): string {
    // Split IV and encrypted data
    const parts = encryptedApiKey.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];

    // Create decipher
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0')),
      iv
    );

    // Decrypt the API key
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Format config for response (removes sensitive data)
   */
  private formatConfigResponse(config: any): LLMConfigResponse {
    return {
      id: config.id,
      provider: config.provider,
      defaultModel: config.defaultModel,
      temperature: Number(config.temperature),
      maxTokens: config.maxTokens,
      baseUrl: config.baseUrl,
      organization: config.organization,
      timeout: config.timeout,
      isActive: config.isActive,
      tenantId: config.tenantId || null,
      createdBy: config.createdBy,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Create a new LLM configuration
   * @param userId - User ID creating the configuration
   * @param tenantId - Tenant ID (null for system-wide, UUID for tenant-specific)
   * @param input - Configuration data
   */
  async createConfig(
    userId: string,
    tenantId: string | null,
    input: LLMConfigCreateInput
  ): Promise<LLMConfigResponse> {
    const encryptedApiKey = this.encryptApiKey(input.apiKey);

    const configData = {
      provider: input.provider,
      apiKeyEncrypted: encryptedApiKey,
      defaultModel: input.defaultModel,
      temperature: input.temperature || 0.7,
      maxTokens: input.maxTokens || 2000,
      baseUrl: input.baseUrl || null,
      organization: input.organization || null,
      timeout: input.timeout || 30000,
      isActive: true,
      createdBy: userId,
    };

    let config;

    if (tenantId) {
      // Tenant-specific configuration - use tenant database
      const prismaClient = await databaseService.getTenantDatabase(tenantId);

      // Deactivate all existing configs for this tenant
      await prismaClient.lLMConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });

      // Create new config
      config = await prismaClient.lLMConfig.create({
        data: configData,
      });
    } else {
      // System-wide configuration - use main database
      const prismaMain = databaseService.getMainDatabase();

      // Deactivate all existing system-wide configs
      await prismaMain.lLMConfig.updateMany({
        where: { tenantId: null, isActive: true },
        data: { isActive: false },
      });

      // Create new config
      config = await prismaMain.lLMConfig.create({
        data: {
          ...configData,
          tenantId: null,
        },
      });
    }

    return this.formatConfigResponse(config);
  }

  /**
   * Update an existing LLM configuration
   * @param configId - Configuration ID to update
   * @param tenantId - Tenant ID (null for system-wide)
   * @param input - Updated configuration data
   */
  async updateConfig(
    configId: string,
    tenantId: string | null,
    input: LLMConfigUpdateInput
  ): Promise<LLMConfigResponse> {
    const updateData: any = {};

    if (input.apiKey) {
      updateData.apiKeyEncrypted = this.encryptApiKey(input.apiKey);
    }
    if (input.defaultModel !== undefined) updateData.defaultModel = input.defaultModel;
    if (input.temperature !== undefined) updateData.temperature = input.temperature;
    if (input.maxTokens !== undefined) updateData.maxTokens = input.maxTokens;
    if (input.baseUrl !== undefined) updateData.baseUrl = input.baseUrl;
    if (input.organization !== undefined) updateData.organization = input.organization;
    if (input.timeout !== undefined) updateData.timeout = input.timeout;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    let config;

    if (tenantId) {
      // Tenant-specific configuration
      const prismaClient = await databaseService.getTenantDatabase(tenantId);
      config = await prismaClient.lLMConfig.update({
        where: { id: configId },
        data: updateData,
      });
    } else {
      // System-wide configuration
      const prismaMain = databaseService.getMainDatabase();
      config = await prismaMain.lLMConfig.update({
        where: { id: configId },
        data: updateData,
      });
    }

    return this.formatConfigResponse(config);
  }

  /**
   * Get the active LLM configuration
   * @param tenantId - Tenant ID (null for system-wide)
   */
  async getActiveConfig(tenantId: string | null): Promise<LLMConfigResponse | null> {
    let config;

    if (tenantId) {
      // Get tenant-specific active config
      const prismaClient = await databaseService.getTenantDatabase(tenantId);
      config = await prismaClient.lLMConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Get system-wide active config
      const prismaMain = databaseService.getMainDatabase();
      config = await prismaMain.lLMConfig.findFirst({
        where: { tenantId: null, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    return config ? this.formatConfigResponse(config) : null;
  }

  /**
   * Get all LLM configurations
   * @param tenantId - Tenant ID (null for system-wide)
   */
  async getAllConfigs(tenantId: string | null): Promise<LLMConfigResponse[]> {
    let configs;

    if (tenantId) {
      // Get all tenant-specific configs
      const prismaClient = await databaseService.getTenantDatabase(tenantId);
      configs = await prismaClient.lLMConfig.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Get all system-wide configs
      const prismaMain = databaseService.getMainDatabase();
      configs = await prismaMain.lLMConfig.findMany({
        where: { tenantId: null },
        orderBy: { createdAt: 'desc' },
      });
    }

    return configs.map((config) => this.formatConfigResponse(config));
  }

  /**
   * Delete an LLM configuration
   * @param configId - Configuration ID to delete
   * @param tenantId - Tenant ID (null for system-wide)
   */
  async deleteConfig(configId: string, tenantId: string | null): Promise<void> {
    if (tenantId) {
      // Delete tenant-specific config
      const prismaClient = await databaseService.getTenantDatabase(tenantId);
      await prismaClient.lLMConfig.delete({
        where: { id: configId },
      });
    } else {
      // Delete system-wide config
      const prismaMain = databaseService.getMainDatabase();
      await prismaMain.lLMConfig.delete({
        where: { id: configId },
      });
    }
  }

  /**
   * Test an LLM configuration by attempting a simple API call
   * @param configId - Configuration ID to test
   * @param tenantId - Tenant ID (null for system-wide)
   */
  async testConfig(
    configId: string,
    tenantId: string | null
  ): Promise<{ success: boolean; message: string }> {
    let config;

    if (tenantId) {
      // Get tenant-specific config
      const prismaClient = await databaseService.getTenantDatabase(tenantId);
      config = await prismaClient.lLMConfig.findUnique({
        where: { id: configId },
      });
    } else {
      // Get system-wide config
      const prismaMain = databaseService.getMainDatabase();
      config = await prismaMain.lLMConfig.findUnique({
        where: { id: configId },
      });
    }

    if (!config) {
      return { success: false, message: 'Configuration not found' };
    }

    try {
      // Decrypt API key
      const apiKey = this.decryptApiKey(config.apiKeyEncrypted);

      // Create provider instance
      const provider = createLLMProvider({
        provider: config.provider.toLowerCase() as any,
        apiKey,
        defaultModel: config.defaultModel,
        baseUrl: config.baseUrl || undefined,
        organization: config.organization || undefined,
        defaultTemperature: Number(config.temperature),
        defaultMaxTokens: config.maxTokens,
        timeout: config.timeout,
      });

      // Validate configuration
      await provider.validateConfig();

      // Test with a simple completion
      const response = await provider.complete([
        {
          role: 'user' as any,
          content: 'Say "Hello" in one word.',
        },
      ]);

      if (response && response.content) {
        return {
          success: true,
          message: `Successfully connected to ${config.provider}. Response: ${response.content.slice(0, 50)}`,
        };
      }

      return { success: false, message: 'No response received from LLM provider' };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to connect: ${error.message}`,
      };
    }
  }

  /**
   * Get the active provider instance for use by the LLM service
   * @param tenantId - Tenant ID (null for system-wide)
   */
  async getActiveProvider(tenantId: string | null): Promise<BaseLLMProvider | null> {
    let config;

    if (tenantId) {
      // Get tenant-specific active config
      const prismaClient = await databaseService.getTenantDatabase(tenantId);
      config = await prismaClient.lLMConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Get system-wide active config
      const prismaMain = databaseService.getMainDatabase();
      config = await prismaMain.lLMConfig.findFirst({
        where: { tenantId: null, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!config) {
      return null;
    }

    try {
      // Decrypt API key
      const apiKey = this.decryptApiKey(config.apiKeyEncrypted);

      // Create and return provider instance
      return createLLMProvider({
        provider: config.provider.toLowerCase() as any,
        apiKey,
        defaultModel: config.defaultModel,
        baseUrl: config.baseUrl || undefined,
        organization: config.organization || undefined,
        defaultTemperature: Number(config.temperature),
        defaultMaxTokens: config.maxTokens,
        timeout: config.timeout,
      });
    } catch (error) {
      console.error('Failed to create LLM provider from config:', error);
      return null;
    }
  }
}

// Export singleton instance
export const llmConfigService = new LLMConfigService();
