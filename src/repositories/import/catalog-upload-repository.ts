/**
 * Catalog Upload Repository
 * Handles data access for supplier catalog upload audit records
 */

import { UploadStatus } from '@prisma/client';
import { BaseRepository, type FindOptions, type RepositoryOptions } from '../base';

export interface CreateCatalogUploadInput {
  globalSupplierId: string;
  filename: string;
  rawContent: string;
  rowCount: number;
  uploadedBy?: string;
}

export interface UpdateCatalogUploadInput {
  successCount?: number;
  failedCount?: number;
  reviewCount?: number;
  enrichedCount?: number;
  status?: UploadStatus;
  errorMessage?: string;
  completedAt?: Date;
}

export interface CatalogUpload {
  id: string;
  globalSupplierId: string;
  filename: string;
  rawContent: string;
  rowCount: number;
  successCount: number;
  failedCount: number;
  reviewCount: number;
  enrichedCount: number;
  status: UploadStatus;
  errorMessage: string | null;
  uploadedBy: string | null;
  completedAt: Date | null;
  createdAt: Date;
  globalSupplier?: {
    id: string;
    name: string;
  };
}

export class CatalogUploadRepository extends BaseRepository {
  /**
   * Create a new catalog upload record
   */
  async create(
    input: CreateCatalogUploadInput,
    options?: RepositoryOptions
  ): Promise<CatalogUpload> {
    const client = this.getClient(options?.tx);

    const upload = await client.supplierCatalogUpload.create({
      data: {
        globalSupplierId: input.globalSupplierId,
        filename: input.filename,
        rawContent: input.rawContent,
        rowCount: input.rowCount,
        uploadedBy: input.uploadedBy,
        status: 'PROCESSING',
      },
      include: {
        globalSupplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return upload as CatalogUpload;
  }

  /**
   * Update a catalog upload record
   */
  async update(
    id: string,
    input: UpdateCatalogUploadInput,
    options?: RepositoryOptions
  ): Promise<CatalogUpload> {
    const client = this.getClient(options?.tx);

    const upload = await client.supplierCatalogUpload.update({
      where: { id },
      data: {
        successCount: input.successCount,
        failedCount: input.failedCount,
        reviewCount: input.reviewCount,
        enrichedCount: input.enrichedCount,
        status: input.status,
        errorMessage: input.errorMessage,
        completedAt: input.completedAt,
      },
      include: {
        globalSupplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return upload as CatalogUpload;
  }

  /**
   * Mark upload as completed with results
   */
  async markCompleted(
    id: string,
    results: {
      successCount: number;
      failedCount: number;
      reviewCount: number;
      enrichedCount: number;
    },
    options?: RepositoryOptions
  ): Promise<CatalogUpload> {
    return this.update(
      id,
      {
        ...results,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      options
    );
  }

  /**
   * Mark upload as failed
   */
  async markFailed(
    id: string,
    errorMessage: string,
    options?: RepositoryOptions
  ): Promise<CatalogUpload> {
    return this.update(
      id,
      {
        status: 'FAILED',
        errorMessage,
        completedAt: new Date(),
      },
      options
    );
  }

  /**
   * Find upload by ID
   */
  async findById(
    id: string,
    options?: FindOptions
  ): Promise<CatalogUpload | null> {
    const client = this.getClient(options?.tx);

    const upload = await client.supplierCatalogUpload.findUnique({
      where: { id },
      include: {
        globalSupplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return upload as CatalogUpload | null;
  }

  /**
   * Find recent uploads (for history display)
   */
  async findRecent(
    limit: number = 20,
    options?: FindOptions
  ): Promise<CatalogUpload[]> {
    const client = this.getClient(options?.tx);

    const uploads = await client.supplierCatalogUpload.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        globalSupplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return uploads as CatalogUpload[];
  }

  /**
   * Find uploads by supplier
   */
  async findBySupplierId(
    globalSupplierId: string,
    limit: number = 10,
    options?: FindOptions
  ): Promise<CatalogUpload[]> {
    const client = this.getClient(options?.tx);

    const uploads = await client.supplierCatalogUpload.findMany({
      where: { globalSupplierId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        globalSupplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return uploads as CatalogUpload[];
  }
}

// Singleton instance
let catalogUploadRepositoryInstance: CatalogUploadRepository | null = null;

export function getCatalogUploadRepository(): CatalogUploadRepository {
  if (!catalogUploadRepositoryInstance) {
    catalogUploadRepositoryInstance = new CatalogUploadRepository();
  }
  return catalogUploadRepositoryInstance;
}

