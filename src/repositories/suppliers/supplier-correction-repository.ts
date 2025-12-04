import { CorrectionStatus, Prisma } from '@prisma/client';
import { BaseRepository, type FindOptions, type RepositoryOptions } from '../base';

/**
 * Input for creating or updating a supplier correction
 */
export interface CreateCorrectionInput {
  supplierItemId: string;
  globalSupplierId: string;
  originalData: Prisma.InputJsonValue;
  proposedData: Prisma.InputJsonValue;
}

export interface UpdateCorrectionInput {
  proposedData?: Prisma.InputJsonValue;
  status?: CorrectionStatus;
  submittedAt?: Date | null;
  reviewedAt?: Date | null;
  reviewedBy?: string | null;
  reviewNotes?: string | null;
}

/**
 * Correction with relations
 */
export interface CorrectionWithRelations {
  id: string;
  supplierItemId: string;
  globalSupplierId: string;
  originalData: Prisma.JsonValue;
  proposedData: Prisma.JsonValue;
  status: CorrectionStatus;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  reviewNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  supplierItem?: {
    id: string;
    supplierSku: string | null;
    supplierName: string | null;
    supplierDescription: string | null;
    unitPrice: Prisma.Decimal | null;
    minOrderQty: number | null;
    product?: {
      id: string;
      name: string;
      gtin: string | null;
      brand: string | null;
    };
  };
  globalSupplier?: {
    id: string;
    name: string;
    email: string | null;
  };
}

/**
 * Repository for managing supplier corrections
 */
export class SupplierCorrectionRepository extends BaseRepository {
  /**
   * Create a new correction
   */
  async create(
    input: CreateCorrectionInput,
    options?: RepositoryOptions
  ): Promise<CorrectionWithRelations> {
    const client = this.getClient(options?.tx);

    const correction = await client.supplierCorrection.create({
      data: {
        supplierItemId: input.supplierItemId,
        globalSupplierId: input.globalSupplierId,
        originalData: input.originalData,
        proposedData: input.proposedData,
        status: 'DRAFT',
      },
      include: {
        supplierItem: {
          select: {
            id: true,
            supplierSku: true,
            supplierName: true,
            supplierDescription: true,
            unitPrice: true,
            minOrderQty: true,
            product: {
              select: {
                id: true,
                name: true,
                gtin: true,
                brand: true,
              },
            },
          },
        },
        globalSupplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return correction as CorrectionWithRelations;
  }

  /**
   * Find existing draft correction for a supplier item
   */
  async findDraftBySupplierItemId(
    supplierItemId: string,
    globalSupplierId: string,
    options?: FindOptions
  ): Promise<CorrectionWithRelations | null> {
    const client = this.getClient(options?.tx);

    const correction = await client.supplierCorrection.findFirst({
      where: {
        supplierItemId,
        globalSupplierId,
        status: 'DRAFT',
      },
      include: {
        supplierItem: {
          select: {
            id: true,
            supplierSku: true,
            supplierName: true,
            supplierDescription: true,
            unitPrice: true,
            minOrderQty: true,
            product: {
              select: {
                id: true,
                name: true,
                gtin: true,
                brand: true,
              },
            },
          },
        },
        globalSupplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return correction as CorrectionWithRelations | null;
  }

  /**
   * Update an existing correction
   */
  async update(
    id: string,
    input: UpdateCorrectionInput,
    options?: RepositoryOptions
  ): Promise<CorrectionWithRelations> {
    const client = this.getClient(options?.tx);

    const correction = await client.supplierCorrection.update({
      where: { id },
      data: {
        proposedData: input.proposedData,
        status: input.status,
        submittedAt: input.submittedAt,
        reviewedAt: input.reviewedAt,
        reviewedBy: input.reviewedBy,
        reviewNotes: input.reviewNotes,
      },
      include: {
        supplierItem: {
          select: {
            id: true,
            supplierSku: true,
            supplierName: true,
            supplierDescription: true,
            unitPrice: true,
            minOrderQty: true,
            product: {
              select: {
                id: true,
                name: true,
                gtin: true,
                brand: true,
              },
            },
          },
        },
        globalSupplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return correction as CorrectionWithRelations;
  }

  /**
   * Find all draft corrections for a supplier
   */
  async findDraftsBySupplier(
    globalSupplierId: string,
    options?: FindOptions
  ): Promise<CorrectionWithRelations[]> {
    const client = this.getClient(options?.tx);

    const corrections = await client.supplierCorrection.findMany({
      where: {
        globalSupplierId,
        status: 'DRAFT',
      },
      include: {
        supplierItem: {
          select: {
            id: true,
            supplierSku: true,
            supplierName: true,
            supplierDescription: true,
            unitPrice: true,
            minOrderQty: true,
            product: {
              select: {
                id: true,
                name: true,
                gtin: true,
                brand: true,
              },
            },
          },
        },
        globalSupplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return corrections as CorrectionWithRelations[];
  }

  /**
   * Find all corrections for a supplier with filtering
   */
  async findBySupplier(
    globalSupplierId: string,
    filters?: {
      status?: CorrectionStatus | CorrectionStatus[];
    },
    options?: FindOptions
  ): Promise<CorrectionWithRelations[]> {
    const client = this.getClient(options?.tx);

    const statusFilter = filters?.status
      ? Array.isArray(filters.status)
        ? { in: filters.status }
        : filters.status
      : undefined;

    const corrections = await client.supplierCorrection.findMany({
      where: {
        globalSupplierId,
        ...(statusFilter && { status: statusFilter }),
      },
      include: {
        supplierItem: {
          select: {
            id: true,
            supplierSku: true,
            supplierName: true,
            supplierDescription: true,
            unitPrice: true,
            minOrderQty: true,
            product: {
              select: {
                id: true,
                name: true,
                gtin: true,
                brand: true,
              },
            },
          },
        },
        globalSupplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return corrections as CorrectionWithRelations[];
  }

  /**
   * Find all pending corrections (for admin review queue)
   */
  async findPendingForReview(
    limit: number = 50,
    options?: FindOptions
  ): Promise<CorrectionWithRelations[]> {
    const client = this.getClient(options?.tx);

    const corrections = await client.supplierCorrection.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        supplierItem: {
          select: {
            id: true,
            supplierSku: true,
            supplierName: true,
            supplierDescription: true,
            unitPrice: true,
            minOrderQty: true,
            product: {
              select: {
                id: true,
                name: true,
                gtin: true,
                brand: true,
              },
            },
          },
        },
        globalSupplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { submittedAt: 'asc' },
      take: limit,
    });

    return corrections as CorrectionWithRelations[];
  }

  /**
   * Count corrections by status
   */
  async countByStatus(
    globalSupplierId: string,
    options?: FindOptions
  ): Promise<{ draft: number; pending: number; approved: number; rejected: number }> {
    const client = this.getClient(options?.tx);

    const [draft, pending, approved, rejected] = await Promise.all([
      client.supplierCorrection.count({
        where: { globalSupplierId, status: 'DRAFT' },
      }),
      client.supplierCorrection.count({
        where: { globalSupplierId, status: 'PENDING' },
      }),
      client.supplierCorrection.count({
        where: { globalSupplierId, status: 'APPROVED' },
      }),
      client.supplierCorrection.count({
        where: { globalSupplierId, status: 'REJECTED' },
      }),
    ]);

    return { draft, pending, approved, rejected };
  }

  /**
   * Count pending corrections (for admin badge)
   */
  async countPending(options?: FindOptions): Promise<number> {
    const client = this.getClient(options?.tx);

    return client.supplierCorrection.count({
      where: { status: 'PENDING' },
    });
  }

  /**
   * Submit all draft corrections for a supplier
   */
  async submitDrafts(
    globalSupplierId: string,
    options?: RepositoryOptions
  ): Promise<number> {
    const client = this.getClient(options?.tx);

    const result = await client.supplierCorrection.updateMany({
      where: {
        globalSupplierId,
        status: 'DRAFT',
      },
      data: {
        status: 'PENDING',
        submittedAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Find a correction by ID
   */
  async findById(
    id: string,
    options?: FindOptions
  ): Promise<CorrectionWithRelations | null> {
    const client = this.getClient(options?.tx);

    const correction = await client.supplierCorrection.findUnique({
      where: { id },
      include: {
        supplierItem: {
          select: {
            id: true,
            supplierSku: true,
            supplierName: true,
            supplierDescription: true,
            unitPrice: true,
            minOrderQty: true,
            product: {
              select: {
                id: true,
                name: true,
                gtin: true,
                brand: true,
              },
            },
          },
        },
        globalSupplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return correction as CorrectionWithRelations | null;
  }

  /**
   * Delete a draft correction
   */
  async deleteDraft(
    id: string,
    globalSupplierId: string,
    options?: RepositoryOptions
  ): Promise<boolean> {
    const client = this.getClient(options?.tx);

    const result = await client.supplierCorrection.deleteMany({
      where: {
        id,
        globalSupplierId,
        status: 'DRAFT',
      },
    });

    return result.count > 0;
  }
}

// Singleton instance
let supplierCorrectionRepositoryInstance: SupplierCorrectionRepository | null = null;

export function getSupplierCorrectionRepository(
  prisma?: any
): SupplierCorrectionRepository {
  if (!supplierCorrectionRepositoryInstance) {
    supplierCorrectionRepositoryInstance = new SupplierCorrectionRepository(prisma);
  }
  return supplierCorrectionRepositoryInstance;
}

