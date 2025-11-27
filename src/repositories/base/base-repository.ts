/**
 * Base Repository
 * Provides common functionality for all repositories including tenant scoping
 */

import { PrismaClient, Prisma } from '@prisma/client';
import type { TransactionClient } from './transaction';
import { getPrismaClient } from './transaction';
import { NotFoundError } from '@/src/domain/errors';
import logger from '@/lib/logger';

/**
 * Base repository class with tenant scoping and common operations
 */
export abstract class BaseRepository {
  protected readonly prisma: PrismaClient | TransactionClient;

  constructor(prisma?: PrismaClient | TransactionClient) {
    this.prisma = prisma ?? getPrismaClient();
  }

  /**
   * Get Prisma client (supports transactions)
   */
  protected getClient(tx?: TransactionClient): PrismaClient | TransactionClient {
    return tx ?? this.prisma;
  }

  /**
   * Build tenant scope filter
   * Automatically adds practiceId to WHERE clauses
   */
  protected scopeToPractice(practiceId: string): { practiceId: string } {
    return { practiceId };
  }

  /**
   * Build tenant scope with additional filters
   */
  protected scopeToPracticeWith<T extends Record<string, any>>(
    practiceId: string,
    filters: T
  ): T & { practiceId: string } {
    return {
      ...filters,
      practiceId,
    };
  }

  /**
   * Build location scope filter
   */
  protected scopeToLocation(locationId: string): { locationId: string } {
    return { locationId };
  }

  /**
   * Build combined practice and location scope
   */
  protected scopeToPracticeAndLocation(
    practiceId: string,
    locationId: string
  ): { practiceId: string; locationId: string } {
    return { practiceId, locationId };
  }

  /**
   * Build location filter for allowed locations
   * Returns undefined if locationIds is null (user has access to all)
   * Returns { in: locationIds } if specific locations are provided
   */
  protected buildLocationFilter(
    locationIds: string[] | null
  ): { in: string[] } | undefined {
    if (locationIds === null) {
      return undefined; // User has access to all locations
    }
    return { in: locationIds };
  }

  /**
   * Build scope with optional location filtering
   * Useful for queries that should filter by allowed locations
   */
  protected scopeToPracticeWithLocations<T extends Record<string, any>>(
    practiceId: string,
    allowedLocationIds: string[] | null,
    filters?: T
  ): T & { practiceId: string; locationId?: { in: string[] } } {
    const locationFilter = this.buildLocationFilter(allowedLocationIds);
    return {
      ...(filters as T),
      practiceId,
      ...(locationFilter && { locationId: locationFilter }),
    };
  }

  /**
   * Ensure entity exists and belongs to practice
   * Throws NotFoundError if not found
   */
  protected async ensureExists<T>(
    findOperation: Promise<T | null>,
    entityName: string,
    id?: string
  ): Promise<T> {
    const entity = await findOperation;
    if (!entity) {
      throw new NotFoundError(entityName, id);
    }
    return entity;
  }

  /**
   * Build pagination parameters
   */
  protected buildPagination(params?: {
    page?: number;
    limit?: number;
    offset?: number;
  }): { skip?: number; take?: number } {
    if (!params) return {};

    if (params.offset !== undefined) {
      return {
        skip: params.offset,
        take: params.limit,
      };
    }

    if (params.page !== undefined && params.limit !== undefined) {
      return {
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      };
    }

    return {
      take: params.limit,
    };
  }

  /**
   * Build sort parameters
   */
  protected buildSort<T extends string>(
    field?: T,
    direction?: 'asc' | 'desc'
  ): Record<T, 'asc' | 'desc'> | undefined {
    if (!field) return undefined;
    return { [field]: direction ?? 'asc' } as Record<T, 'asc' | 'desc'>;
  }

  /**
   * Build search filter for multiple fields
   */
  protected buildSearchFilter<T extends string>(
    search: string | undefined,
    fields: T[]
  ): { OR: Array<Record<T, { contains: string; mode: 'insensitive' }>> } | undefined {
    if (!search || !search.trim()) return undefined;

    const searchTerm = search.trim();
    return {
      OR: fields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive' as const,
        },
      })) as Array<Record<T, { contains: string; mode: 'insensitive' }>>,
    };
  }

  /**
   * Count total records for pagination
   */
  protected async countTotal<T>(
    countOperation: Promise<number>
  ): Promise<number> {
    return countOperation;
  }

  /**
   * Build paginated result
   */
  protected buildPaginatedResult<T>(
    items: T[],
    total: number,
    page: number = 1,
    limit: number = 50
  ): {
    items: T[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    totalPages: number;
  } {
    return {
      items,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Execute operation with automatic error handling
   */
  protected async execute<T>(
    operation: () => Promise<T>,
    errorMessage?: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      // Log error for debugging
      logger.error({
        module: 'BaseRepository',
        operation: 'execute',
        errorMessage: errorMessage ?? 'Unknown error',
        error: error instanceof Error ? error.message : String(error),
      }, 'Repository operation failed');
      throw error;
    }
  }
}

/**
 * Repository options that can be passed to methods
 */
export interface RepositoryOptions {
  /**
   * Transaction client for atomic operations
   */
  tx?: TransactionClient;

  /**
   * Include soft-deleted records
   */
  includeDeleted?: boolean;

  /**
   * Skip tenant scope check (use with caution)
   */
  skipTenantScope?: boolean;
}

/**
 * Find options for repository queries
 */
export interface FindOptions<T = any> extends RepositoryOptions {
  /**
   * Include relations
   */
  include?: T;

  /**
   * Select specific fields
   */
  select?: T;

  /**
   * Sort order
   */
  orderBy?: T;

  /**
   * Pagination
   */
  pagination?: {
    page?: number;
    limit?: number;
    offset?: number;
  };
}

