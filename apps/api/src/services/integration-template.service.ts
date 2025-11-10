/**
 * Integration Template Service
 *
 * Manages integration templates for external services
 */

import type { IntegrationCategory, PrismaClient } from '../generated/prisma-main';
import type { IntegrationTemplate } from '../generated/prisma-main';

export interface CreateIntegrationTemplateInput {
  name: string;
  slug: string;
  category: IntegrationCategory;
  description?: string;
  provider: string;
  iconUrl?: string;
  documentationUrl?: string;
  configSchema: any; // JSON schema
  defaultConfig?: any; // JSON object
  requiredCapabilities?: string[];
  isActive?: boolean;
}

export interface UpdateIntegrationTemplateInput {
  name?: string;
  slug?: string;
  category?: IntegrationCategory;
  description?: string;
  provider?: string;
  iconUrl?: string;
  documentationUrl?: string;
  configSchema?: any;
  defaultConfig?: any;
  requiredCapabilities?: string[];
  isActive?: boolean;
}

export interface ListIntegrationTemplatesOptions {
  category?: IntegrationCategory;
  isActive?: boolean;
  includeDeleted?: boolean;
  skip?: number;
  take?: number;
}

export class IntegrationTemplateService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new integration template
   */
  async create(data: CreateIntegrationTemplateInput): Promise<IntegrationTemplate> {
    // Check if slug already exists
    const existing = await this.prisma.integrationTemplate.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw new Error(`Integration template with slug "${data.slug}" already exists`);
    }

    return this.prisma.integrationTemplate.create({
      data: {
        name: data.name,
        slug: data.slug,
        category: data.category,
        description: data.description,
        provider: data.provider,
        iconUrl: data.iconUrl,
        documentationUrl: data.documentationUrl,
        configSchema: data.configSchema,
        defaultConfig: data.defaultConfig || null,
        requiredCapabilities: data.requiredCapabilities || [],
        isActive: data.isActive ?? true,
        isSeeded: false,
      },
    });
  }

  /**
   * Get an integration template by ID
   */
  async getById(id: string): Promise<IntegrationTemplate | null> {
    return this.prisma.integrationTemplate.findUnique({
      where: { id },
    });
  }

  /**
   * Get an integration template by slug
   */
  async getBySlug(slug: string): Promise<IntegrationTemplate | null> {
    return this.prisma.integrationTemplate.findUnique({
      where: { slug },
    });
  }

  /**
   * List integration templates with optional filters
   */
  async list(options: ListIntegrationTemplatesOptions = {}): Promise<IntegrationTemplate[]> {
    const { category, isActive, includeDeleted = false, skip = 0, take = 50 } = options;

    return this.prisma.integrationTemplate.findMany({
      where: {
        ...(category && { category }),
        ...(isActive !== undefined && { isActive }),
        ...(!includeDeleted && { deletedAt: null }),
      },
      skip,
      take,
      orderBy: [{ isSeeded: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Update an integration template
   */
  async update(id: string, data: UpdateIntegrationTemplateInput): Promise<IntegrationTemplate> {
    // Check if template exists
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Integration template with ID "${id}" not found`);
    }

    // Don't allow modifying seeded templates' core properties
    if (existing.isSeeded && (data.slug || data.category)) {
      throw new Error('Cannot modify slug or category of seeded templates');
    }

    // If slug is being updated, check for conflicts
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await this.getBySlug(data.slug);
      if (slugExists) {
        throw new Error(`Integration template with slug "${data.slug}" already exists`);
      }
    }

    return this.prisma.integrationTemplate.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.slug && { slug: data.slug }),
        ...(data.category && { category: data.category }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.provider && { provider: data.provider }),
        ...(data.iconUrl !== undefined && { iconUrl: data.iconUrl }),
        ...(data.documentationUrl !== undefined && {
          documentationUrl: data.documentationUrl,
        }),
        ...(data.configSchema && { configSchema: data.configSchema }),
        ...(data.defaultConfig !== undefined && { defaultConfig: data.defaultConfig }),
        ...(data.requiredCapabilities !== undefined && {
          requiredCapabilities: data.requiredCapabilities,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  /**
   * Soft delete an integration template
   */
  async delete(id: string): Promise<IntegrationTemplate> {
    // Check if template exists
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Integration template with ID "${id}" not found`);
    }

    // Don't allow deleting seeded templates
    if (existing.isSeeded) {
      throw new Error('Cannot delete seeded templates');
    }

    return this.prisma.integrationTemplate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Restore a soft-deleted integration template
   */
  async restore(id: string): Promise<IntegrationTemplate> {
    return this.prisma.integrationTemplate.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  /**
   * Get count of integration templates by category
   */
  async countByCategory(): Promise<{ category: IntegrationCategory; count: number }[]> {
    const result = await this.prisma.integrationTemplate.groupBy({
      by: ['category'],
      where: { deletedAt: null },
      _count: { id: true },
    });

    return result.map((item) => ({
      category: item.category,
      count: item._count.id,
    }));
  }
}
