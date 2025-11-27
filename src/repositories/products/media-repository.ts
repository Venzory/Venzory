/**
 * ProductMedia Repository (GS1 Foundation - Phase 1)
 * Handles data access for product media assets (images, videos, etc.)
 */

import { Prisma, MediaType } from '@prisma/client';
import { BaseRepository, type FindOptions, type RepositoryOptions } from '../base';

// Domain types for media
export interface ProductMedia {
  id: string;
  productId: string;
  type: MediaType;
  url: string;
  filename: string | null;
  mimeType: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  isPrimary: boolean;
  angle: string | null;
  gs1DigitalLink: string | null;
  storageProvider: string | null;
  storageKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMediaInput {
  productId: string;
  type: MediaType;
  url: string;
  filename?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  isPrimary?: boolean;
  angle?: string | null;
  gs1DigitalLink?: string | null;
  storageProvider?: string | null;
  storageKey?: string | null;
}

export interface UpdateMediaInput {
  type?: MediaType;
  url?: string;
  filename?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  isPrimary?: boolean;
  angle?: string | null;
  gs1DigitalLink?: string | null;
  storageProvider?: string | null;
  storageKey?: string | null;
}

export interface MediaFilters {
  productId?: string;
  type?: MediaType;
  isPrimary?: boolean;
}

export class MediaRepository extends BaseRepository {
  /**
   * Find all media for a product
   */
  async findByProductId(
    productId: string,
    options?: FindOptions
  ): Promise<ProductMedia[]> {
    const client = this.getClient(options?.tx);

    const media = await client.productMedia.findMany({
      where: { productId },
      orderBy: [
        { isPrimary: 'desc' },
        { type: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return media as ProductMedia[];
  }

  /**
   * Find media by ID
   */
  async findById(
    id: string,
    options?: FindOptions
  ): Promise<ProductMedia | null> {
    const client = this.getClient(options?.tx);

    const media = await client.productMedia.findUnique({
      where: { id },
    });

    return media as ProductMedia | null;
  }

  /**
   * Find primary media for a product
   */
  async findPrimary(
    productId: string,
    options?: FindOptions
  ): Promise<ProductMedia | null> {
    const client = this.getClient(options?.tx);

    const media = await client.productMedia.findFirst({
      where: { productId, isPrimary: true },
    });

    return media as ProductMedia | null;
  }

  /**
   * Find media by type
   */
  async findByType(
    productId: string,
    type: MediaType,
    options?: FindOptions
  ): Promise<ProductMedia[]> {
    const client = this.getClient(options?.tx);

    const media = await client.productMedia.findMany({
      where: { productId, type },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    return media as ProductMedia[];
  }

  /**
   * Find media with filters
   */
  async findWithFilters(
    filters: MediaFilters,
    options?: FindOptions
  ): Promise<ProductMedia[]> {
    const client = this.getClient(options?.tx);

    const where: Prisma.ProductMediaWhereInput = {};

    if (filters.productId) {
      where.productId = filters.productId;
    }
    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.isPrimary !== undefined) {
      where.isPrimary = filters.isPrimary;
    }

    const media = await client.productMedia.findMany({
      where,
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' },
      ],
      ...this.buildPagination(options?.pagination),
    });

    return media as ProductMedia[];
  }

  /**
   * Create media
   */
  async create(
    input: CreateMediaInput,
    options?: RepositoryOptions
  ): Promise<ProductMedia> {
    const client = this.getClient(options?.tx);

    // If setting as primary, unset other primaries first
    if (input.isPrimary) {
      await client.productMedia.updateMany({
        where: { productId: input.productId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const media = await client.productMedia.create({
      data: {
        productId: input.productId,
        type: input.type,
        url: input.url,
        filename: input.filename ?? null,
        mimeType: input.mimeType ?? null,
        fileSize: input.fileSize ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
        isPrimary: input.isPrimary ?? false,
        angle: input.angle ?? null,
        gs1DigitalLink: input.gs1DigitalLink ?? null,
        storageProvider: input.storageProvider ?? 'local',
        storageKey: input.storageKey ?? null,
      },
    });

    return media as ProductMedia;
  }

  /**
   * Update media
   */
  async update(
    id: string,
    input: UpdateMediaInput,
    options?: RepositoryOptions
  ): Promise<ProductMedia> {
    const client = this.getClient(options?.tx);

    // If setting as primary, unset other primaries first
    if (input.isPrimary) {
      const existing = await client.productMedia.findUnique({ where: { id } });
      if (existing) {
        await client.productMedia.updateMany({
          where: { productId: existing.productId, isPrimary: true, NOT: { id } },
          data: { isPrimary: false },
        });
      }
    }

    const media = await client.productMedia.update({
      where: { id },
      data: {
        type: input.type,
        url: input.url,
        filename: input.filename,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        width: input.width,
        height: input.height,
        isPrimary: input.isPrimary,
        angle: input.angle,
        gs1DigitalLink: input.gs1DigitalLink,
        storageProvider: input.storageProvider,
        storageKey: input.storageKey,
      },
    });

    return media as ProductMedia;
  }

  /**
   * Delete media
   */
  async delete(
    id: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.productMedia.delete({
      where: { id },
    });
  }

  /**
   * Delete all media for a product
   */
  async deleteByProductId(
    productId: string,
    options?: RepositoryOptions
  ): Promise<number> {
    const client = this.getClient(options?.tx);

    const result = await client.productMedia.deleteMany({
      where: { productId },
    });

    return result.count;
  }

  /**
   * Set primary media for a product
   */
  async setPrimary(
    id: string,
    options?: RepositoryOptions
  ): Promise<ProductMedia> {
    const client = this.getClient(options?.tx);

    const media = await client.productMedia.findUnique({ where: { id } });
    if (!media) {
      throw new Error('Media not found');
    }

    // Unset other primaries
    await client.productMedia.updateMany({
      where: { productId: media.productId, isPrimary: true },
      data: { isPrimary: false },
    });

    // Set this one as primary
    const updated = await client.productMedia.update({
      where: { id },
      data: { isPrimary: true },
    });

    return updated as ProductMedia;
  }

  /**
   * Count media for a product
   */
  async countByProductId(
    productId: string,
    options?: FindOptions
  ): Promise<number> {
    const client = this.getClient(options?.tx);

    return client.productMedia.count({
      where: { productId },
    });
  }
}

