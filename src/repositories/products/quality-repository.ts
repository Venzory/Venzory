/**
 * ProductQualityScore Repository (GS1 Foundation - Phase 1)
 * Handles data access for product data quality scores
 */

import { Prisma } from '@prisma/client';
import { BaseRepository, type FindOptions, type RepositoryOptions } from '../base';

// Domain types for quality scores
export interface ProductQualityScore {
  id: string;
  productId: string;
  overallScore: number;
  basicDataScore: number;
  gs1DataScore: number;
  mediaScore: number;
  documentScore: number;
  regulatoryScore: number;
  packagingScore: number;
  missingFields: string[];
  warnings: string[];
  calculatedAt: Date;
}

export interface CreateQualityScoreInput {
  productId: string;
  overallScore?: number;
  basicDataScore?: number;
  gs1DataScore?: number;
  mediaScore?: number;
  documentScore?: number;
  regulatoryScore?: number;
  packagingScore?: number;
  missingFields?: string[];
  warnings?: string[];
}

export interface UpdateQualityScoreInput {
  overallScore?: number;
  basicDataScore?: number;
  gs1DataScore?: number;
  mediaScore?: number;
  documentScore?: number;
  regulatoryScore?: number;
  packagingScore?: number;
  missingFields?: string[];
  warnings?: string[];
}

export interface QualityScoreFilters {
  minOverallScore?: number;
  maxOverallScore?: number;
  hasMissingFields?: boolean;
  hasWarnings?: boolean;
}

export class QualityRepository extends BaseRepository {
  /**
   * Find quality score for a product
   */
  async findByProductId(
    productId: string,
    options?: FindOptions
  ): Promise<ProductQualityScore | null> {
    const client = this.getClient(options?.tx);

    const score = await client.productQualityScore.findUnique({
      where: { productId },
    });

    return score as ProductQualityScore | null;
  }

  /**
   * Find quality score by ID
   */
  async findById(
    id: string,
    options?: FindOptions
  ): Promise<ProductQualityScore | null> {
    const client = this.getClient(options?.tx);

    const score = await client.productQualityScore.findUnique({
      where: { id },
    });

    return score as ProductQualityScore | null;
  }

  /**
   * Find scores with filters
   */
  async findWithFilters(
    filters: QualityScoreFilters,
    options?: FindOptions
  ): Promise<ProductQualityScore[]> {
    const client = this.getClient(options?.tx);

    const where: Prisma.ProductQualityScoreWhereInput = {};

    if (filters.minOverallScore !== undefined) {
      where.overallScore = { gte: filters.minOverallScore };
    }
    if (filters.maxOverallScore !== undefined) {
      where.overallScore = {
        ...((where.overallScore as Prisma.IntFilter) ?? {}),
        lte: filters.maxOverallScore,
      };
    }
    if (filters.hasMissingFields !== undefined) {
      if (filters.hasMissingFields) {
        where.missingFields = { isEmpty: false };
      } else {
        where.missingFields = { isEmpty: true };
      }
    }
    if (filters.hasWarnings !== undefined) {
      if (filters.hasWarnings) {
        where.warnings = { isEmpty: false };
      } else {
        where.warnings = { isEmpty: true };
      }
    }

    const scores = await client.productQualityScore.findMany({
      where,
      orderBy: { overallScore: 'asc' },
      ...this.buildPagination(options?.pagination),
    });

    return scores as ProductQualityScore[];
  }

  /**
   * Create quality score
   */
  async create(
    input: CreateQualityScoreInput,
    options?: RepositoryOptions
  ): Promise<ProductQualityScore> {
    const client = this.getClient(options?.tx);

    const score = await client.productQualityScore.create({
      data: {
        productId: input.productId,
        overallScore: input.overallScore ?? 0,
        basicDataScore: input.basicDataScore ?? 0,
        gs1DataScore: input.gs1DataScore ?? 0,
        mediaScore: input.mediaScore ?? 0,
        documentScore: input.documentScore ?? 0,
        regulatoryScore: input.regulatoryScore ?? 0,
        packagingScore: input.packagingScore ?? 0,
        missingFields: input.missingFields ?? [],
        warnings: input.warnings ?? [],
        calculatedAt: new Date(),
      },
    });

    return score as ProductQualityScore;
  }

  /**
   * Update quality score
   */
  async update(
    id: string,
    input: UpdateQualityScoreInput,
    options?: RepositoryOptions
  ): Promise<ProductQualityScore> {
    const client = this.getClient(options?.tx);

    const score = await client.productQualityScore.update({
      where: { id },
      data: {
        overallScore: input.overallScore,
        basicDataScore: input.basicDataScore,
        gs1DataScore: input.gs1DataScore,
        mediaScore: input.mediaScore,
        documentScore: input.documentScore,
        regulatoryScore: input.regulatoryScore,
        packagingScore: input.packagingScore,
        missingFields: input.missingFields,
        warnings: input.warnings,
        calculatedAt: new Date(),
      },
    });

    return score as ProductQualityScore;
  }

  /**
   * Upsert quality score by product ID (one-to-one relation)
   */
  async upsert(
    productId: string,
    input: Omit<CreateQualityScoreInput, 'productId'>,
    options?: RepositoryOptions
  ): Promise<ProductQualityScore> {
    const client = this.getClient(options?.tx);

    const score = await client.productQualityScore.upsert({
      where: { productId },
      create: {
        productId,
        overallScore: input.overallScore ?? 0,
        basicDataScore: input.basicDataScore ?? 0,
        gs1DataScore: input.gs1DataScore ?? 0,
        mediaScore: input.mediaScore ?? 0,
        documentScore: input.documentScore ?? 0,
        regulatoryScore: input.regulatoryScore ?? 0,
        packagingScore: input.packagingScore ?? 0,
        missingFields: input.missingFields ?? [],
        warnings: input.warnings ?? [],
        calculatedAt: new Date(),
      },
      update: {
        overallScore: input.overallScore ?? 0,
        basicDataScore: input.basicDataScore ?? 0,
        gs1DataScore: input.gs1DataScore ?? 0,
        mediaScore: input.mediaScore ?? 0,
        documentScore: input.documentScore ?? 0,
        regulatoryScore: input.regulatoryScore ?? 0,
        packagingScore: input.packagingScore ?? 0,
        missingFields: input.missingFields ?? [],
        warnings: input.warnings ?? [],
        calculatedAt: new Date(),
      },
    });

    return score as ProductQualityScore;
  }

  /**
   * Delete quality score
   */
  async delete(
    id: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.productQualityScore.delete({
      where: { id },
    });
  }

  /**
   * Delete quality score by product ID
   */
  async deleteByProductId(
    productId: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.productQualityScore.delete({
      where: { productId },
    }).catch(() => {
      // Ignore if not exists
    });
  }

  /**
   * Find low-quality products (below threshold)
   */
  async findLowQuality(
    threshold: number = 50,
    options?: FindOptions
  ): Promise<ProductQualityScore[]> {
    const client = this.getClient(options?.tx);

    const scores = await client.productQualityScore.findMany({
      where: { overallScore: { lt: threshold } },
      orderBy: { overallScore: 'asc' },
      ...this.buildPagination(options?.pagination),
    });

    return scores as ProductQualityScore[];
  }

  /**
   * Find products needing attention (missing required data)
   */
  async findNeedingAttention(
    options?: FindOptions
  ): Promise<ProductQualityScore[]> {
    const client = this.getClient(options?.tx);

    const scores = await client.productQualityScore.findMany({
      where: {
        OR: [
          { missingFields: { isEmpty: false } },
          { overallScore: { lt: 30 } },
        ],
      },
      orderBy: { overallScore: 'asc' },
      ...this.buildPagination(options?.pagination),
    });

    return scores as ProductQualityScore[];
  }

  /**
   * Get quality score statistics
   */
  async getStatistics(
    options?: FindOptions
  ): Promise<{
    total: number;
    averageScore: number;
    minScore: number;
    maxScore: number;
    lowQualityCount: number;
    highQualityCount: number;
  }> {
    const client = this.getClient(options?.tx);

    const [aggregate, lowCount, highCount] = await Promise.all([
      client.productQualityScore.aggregate({
        _count: true,
        _avg: { overallScore: true },
        _min: { overallScore: true },
        _max: { overallScore: true },
      }),
      client.productQualityScore.count({
        where: { overallScore: { lt: 50 } },
      }),
      client.productQualityScore.count({
        where: { overallScore: { gte: 80 } },
      }),
    ]);

    return {
      total: aggregate._count ?? 0,
      averageScore: aggregate._avg.overallScore ?? 0,
      minScore: aggregate._min.overallScore ?? 0,
      maxScore: aggregate._max.overallScore ?? 0,
      lowQualityCount: lowCount,
      highQualityCount: highCount,
    };
  }

  /**
   * Batch update quality scores for recalculation
   */
  async markStale(
    productIds: string[],
    options?: RepositoryOptions
  ): Promise<number> {
    const client = this.getClient(options?.tx);

    // Reset scores to trigger recalculation
    const result = await client.productQualityScore.updateMany({
      where: { productId: { in: productIds } },
      data: {
        overallScore: 0,
        calculatedAt: new Date(0), // Mark as stale
      },
    });

    return result.count;
  }
}

