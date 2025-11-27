/**
 * ProductPackaging Repository (GS1 Foundation - Phase 1)
 * Handles data access for product packaging hierarchy
 */

import { Prisma, PackagingLevel } from '@prisma/client';
import { BaseRepository, type FindOptions, type RepositoryOptions } from '../base';

// Domain types for packaging
export interface ProductPackaging {
  id: string;
  productId: string;
  level: PackagingLevel;
  gtin: string | null;
  parentId: string | null;
  childCount: number | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  dimensionUom: string | null;
  grossWeight: number | null;
  weightUom: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePackagingInput {
  productId: string;
  level: PackagingLevel;
  gtin?: string | null;
  parentId?: string | null;
  childCount?: number | null;
  height?: number | null;
  width?: number | null;
  depth?: number | null;
  dimensionUom?: string | null;
  grossWeight?: number | null;
  weightUom?: string | null;
}

export interface UpdatePackagingInput {
  level?: PackagingLevel;
  gtin?: string | null;
  parentId?: string | null;
  childCount?: number | null;
  height?: number | null;
  width?: number | null;
  depth?: number | null;
  dimensionUom?: string | null;
  grossWeight?: number | null;
  weightUom?: string | null;
}

export class PackagingRepository extends BaseRepository {
  /**
   * Find all packaging levels for a product
   */
  async findByProductId(
    productId: string,
    options?: FindOptions
  ): Promise<ProductPackaging[]> {
    const client = this.getClient(options?.tx);

    const packaging = await client.productPackaging.findMany({
      where: { productId },
      orderBy: { level: 'asc' },
      include: options?.include ?? undefined,
    });

    return packaging as ProductPackaging[];
  }

  /**
   * Find packaging by ID
   */
  async findById(
    id: string,
    options?: FindOptions
  ): Promise<ProductPackaging | null> {
    const client = this.getClient(options?.tx);

    const packaging = await client.productPackaging.findUnique({
      where: { id },
      include: options?.include ?? undefined,
    });

    return packaging as ProductPackaging | null;
  }

  /**
   * Find packaging by GTIN
   */
  async findByGtin(
    gtin: string,
    options?: FindOptions
  ): Promise<ProductPackaging | null> {
    const client = this.getClient(options?.tx);

    const packaging = await client.productPackaging.findFirst({
      where: { gtin },
      include: options?.include ?? undefined,
    });

    return packaging as ProductPackaging | null;
  }

  /**
   * Create packaging level
   */
  async create(
    input: CreatePackagingInput,
    options?: RepositoryOptions
  ): Promise<ProductPackaging> {
    const client = this.getClient(options?.tx);

    const packaging = await client.productPackaging.create({
      data: {
        productId: input.productId,
        level: input.level,
        gtin: input.gtin ?? null,
        parentId: input.parentId ?? null,
        childCount: input.childCount ?? null,
        height: input.height ?? null,
        width: input.width ?? null,
        depth: input.depth ?? null,
        dimensionUom: input.dimensionUom ?? 'cm',
        grossWeight: input.grossWeight ?? null,
        weightUom: input.weightUom ?? 'kg',
      },
    });

    return packaging as ProductPackaging;
  }

  /**
   * Update packaging level
   */
  async update(
    id: string,
    input: UpdatePackagingInput,
    options?: RepositoryOptions
  ): Promise<ProductPackaging> {
    const client = this.getClient(options?.tx);

    const packaging = await client.productPackaging.update({
      where: { id },
      data: {
        level: input.level,
        gtin: input.gtin,
        parentId: input.parentId,
        childCount: input.childCount,
        height: input.height,
        width: input.width,
        depth: input.depth,
        dimensionUom: input.dimensionUom,
        grossWeight: input.grossWeight,
        weightUom: input.weightUom,
      },
    });

    return packaging as ProductPackaging;
  }

  /**
   * Upsert packaging by product + level
   */
  async upsertByProductLevel(
    productId: string,
    level: PackagingLevel,
    input: Omit<CreatePackagingInput, 'productId' | 'level'>,
    options?: RepositoryOptions
  ): Promise<ProductPackaging> {
    const client = this.getClient(options?.tx);

    // Find existing by product + level
    const existing = await client.productPackaging.findFirst({
      where: { productId, level },
    });

    if (existing) {
      return this.update(existing.id, { ...input, level }, options);
    }

    return this.create({ ...input, productId, level }, options);
  }

  /**
   * Delete packaging level
   */
  async delete(
    id: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.productPackaging.delete({
      where: { id },
    });
  }

  /**
   * Delete all packaging for a product
   */
  async deleteByProductId(
    productId: string,
    options?: RepositoryOptions
  ): Promise<number> {
    const client = this.getClient(options?.tx);

    const result = await client.productPackaging.deleteMany({
      where: { productId },
    });

    return result.count;
  }

  /**
   * Get packaging hierarchy (with children) for a product
   */
  async findHierarchy(
    productId: string,
    options?: FindOptions
  ): Promise<ProductPackaging[]> {
    const client = this.getClient(options?.tx);

    const packaging = await client.productPackaging.findMany({
      where: { productId },
      include: {
        children: true,
        parent: true,
      },
      orderBy: { level: 'asc' },
    });

    return packaging as ProductPackaging[];
  }
}

