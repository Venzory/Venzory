/**
 * Receiving Mismatch Repository
 * Handles all data access for receiving mismatch tracking
 */

import { Prisma, MismatchType, MismatchStatus } from '@prisma/client';
import { BaseRepository, type FindOptions, type RepositoryOptions } from '../base';
import { NotFoundError } from '@/src/domain/errors';

// Domain types for receiving mismatches
export interface ReceivingMismatch {
  id: string;
  practiceId: string;
  orderId: string | null;
  goodsReceiptId: string;
  itemId: string;
  practiceSupplierId: string | null;
  type: MismatchType;
  status: MismatchStatus;
  orderedQuantity: number;
  receivedQuantity: number;
  varianceQuantity: number;
  note: string | null;
  resolutionNote: string | null;
  resolvedById: string | null;
  resolvedAt: Date | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceivingMismatchWithRelations extends ReceivingMismatch {
  order?: {
    id: string;
    reference: string | null;
  } | null;
  goodsReceipt: {
    id: string;
    receivedAt: Date | null;
    location?: { id: string; name: string };
  };
  item: {
    id: string;
    name: string;
    sku: string | null;
    unit: string | null;
  };
  practiceSupplier?: {
    id: string;
    customLabel: string | null;
    globalSupplier?: {
      id: string;
      name: string;
    };
  } | null;
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  resolvedBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export interface CreateMismatchInput {
  practiceId: string;
  orderId?: string | null;
  goodsReceiptId: string;
  itemId: string;
  practiceSupplierId?: string | null;
  type: MismatchType;
  orderedQuantity: number;
  receivedQuantity: number;
  note?: string | null;
  createdById: string;
}

export interface MismatchFilters {
  status?: MismatchStatus;
  type?: MismatchType;
  practiceSupplierId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  goodsReceiptId?: string;
  orderId?: string;
}

export class ReceivingMismatchRepository extends BaseRepository {
  /**
   * Create a single mismatch record
   */
  async createMismatch(
    input: CreateMismatchInput,
    options?: RepositoryOptions
  ): Promise<ReceivingMismatch> {
    const client = this.getClient(options?.tx);

    const varianceQuantity = input.receivedQuantity - input.orderedQuantity;

    const mismatch = await client.receivingMismatch.create({
      data: {
        practiceId: input.practiceId,
        orderId: input.orderId ?? null,
        goodsReceiptId: input.goodsReceiptId,
        itemId: input.itemId,
        practiceSupplierId: input.practiceSupplierId ?? null,
        type: input.type,
        status: MismatchStatus.OPEN,
        orderedQuantity: input.orderedQuantity,
        receivedQuantity: input.receivedQuantity,
        varianceQuantity,
        note: input.note ?? null,
        createdById: input.createdById,
      },
    });

    return mismatch as ReceivingMismatch;
  }

  /**
   * Batch create multiple mismatch records
   */
  async createMismatches(
    inputs: CreateMismatchInput[],
    options?: RepositoryOptions
  ): Promise<ReceivingMismatch[]> {
    const client = this.getClient(options?.tx);

    const data = inputs.map((input) => ({
      practiceId: input.practiceId,
      orderId: input.orderId ?? null,
      goodsReceiptId: input.goodsReceiptId,
      itemId: input.itemId,
      practiceSupplierId: input.practiceSupplierId ?? null,
      type: input.type,
      status: MismatchStatus.OPEN,
      orderedQuantity: input.orderedQuantity,
      receivedQuantity: input.receivedQuantity,
      varianceQuantity: input.receivedQuantity - input.orderedQuantity,
      note: input.note ?? null,
      createdById: input.createdById,
    }));

    // Use createMany for efficiency, then fetch the created records
    await client.receivingMismatch.createMany({ data });

    // Fetch the created mismatches by goodsReceiptId (all in same batch will have same receipt)
    if (inputs.length > 0) {
      const mismatches = await client.receivingMismatch.findMany({
        where: {
          goodsReceiptId: inputs[0].goodsReceiptId,
          practiceId: inputs[0].practiceId,
        },
        orderBy: { createdAt: 'desc' },
        take: inputs.length,
      });
      return mismatches as ReceivingMismatch[];
    }

    return [];
  }

  /**
   * Find mismatches with filters
   */
  async findMismatches(
    practiceId: string,
    filters?: Partial<MismatchFilters>,
    options?: FindOptions
  ): Promise<ReceivingMismatchWithRelations[]> {
    const client = this.getClient(options?.tx);

    const where: Prisma.ReceivingMismatchWhereInput = {
      ...this.scopeToPractice(practiceId),
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.practiceSupplierId) {
      where.practiceSupplierId = filters.practiceSupplierId;
    }

    if (filters?.goodsReceiptId) {
      where.goodsReceiptId = filters.goodsReceiptId;
    }

    if (filters?.orderId) {
      where.orderId = filters.orderId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    const mismatches = await client.receivingMismatch.findMany({
      where,
      include: {
        order: {
          select: { id: true, reference: true },
        },
        goodsReceipt: {
          select: {
            id: true,
            receivedAt: true,
            location: { select: { id: true, name: true } },
          },
        },
        item: {
          select: { id: true, name: true, sku: true, unit: true },
        },
        practiceSupplier: {
          select: {
            id: true,
            customLabel: true,
            globalSupplier: { select: { id: true, name: true } },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        resolvedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
      ...this.buildPagination(options?.pagination),
    });

    return mismatches as ReceivingMismatchWithRelations[];
  }

  /**
   * Find mismatch by ID
   */
  async findMismatchById(
    mismatchId: string,
    practiceId: string,
    options?: FindOptions
  ): Promise<ReceivingMismatchWithRelations> {
    const client = this.getClient(options?.tx);

    const mismatch = await client.receivingMismatch.findUnique({
      where: { id: mismatchId, practiceId },
      include: {
        order: {
          select: { id: true, reference: true },
        },
        goodsReceipt: {
          select: {
            id: true,
            receivedAt: true,
            location: { select: { id: true, name: true } },
          },
        },
        item: {
          select: { id: true, name: true, sku: true, unit: true },
        },
        practiceSupplier: {
          select: {
            id: true,
            customLabel: true,
            globalSupplier: { select: { id: true, name: true } },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        resolvedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return this.ensureExists(Promise.resolve(mismatch), 'ReceivingMismatch', mismatchId);
  }

  /**
   * Update mismatch status (resolve or flag for supplier)
   */
  async updateMismatchStatus(
    mismatchId: string,
    practiceId: string,
    status: MismatchStatus,
    resolvedById?: string,
    resolutionNote?: string,
    options?: RepositoryOptions
  ): Promise<ReceivingMismatch> {
    const client = this.getClient(options?.tx);

    // Verify mismatch exists and belongs to practice
    await this.findMismatchById(mismatchId, practiceId, options);

    const updateData: Prisma.ReceivingMismatchUpdateInput = {
      status,
    };

    // Set resolution fields if resolving
    if (status === MismatchStatus.RESOLVED || status === MismatchStatus.NEEDS_SUPPLIER_CORRECTION) {
      updateData.resolvedAt = new Date();
      if (resolvedById) {
        updateData.resolvedBy = { connect: { id: resolvedById } };
      }
      if (resolutionNote) {
        updateData.resolutionNote = resolutionNote;
      }
    }

    const mismatch = await client.receivingMismatch.update({
      where: { id: mismatchId },
      data: updateData,
    });

    return mismatch as ReceivingMismatch;
  }

  /**
   * Append note to existing mismatch (updates resolutionNote)
   */
  async appendNote(
    mismatchId: string,
    practiceId: string,
    note: string,
    options?: RepositoryOptions
  ): Promise<ReceivingMismatch> {
    const client = this.getClient(options?.tx);

    // Get current mismatch
    const current = await this.findMismatchById(mismatchId, practiceId, options);

    // Append note with timestamp
    const timestamp = new Date().toISOString();
    const existingNote = current.resolutionNote || '';
    const newNote = existingNote
      ? `${existingNote}\n\n[${timestamp}]\n${note}`
      : `[${timestamp}]\n${note}`;

    const mismatch = await client.receivingMismatch.update({
      where: { id: mismatchId },
      data: { resolutionNote: newNote },
    });

    return mismatch as ReceivingMismatch;
  }

  /**
   * Count mismatches by status for dashboard
   */
  async countByStatus(
    practiceId: string,
    options?: RepositoryOptions
  ): Promise<{ open: number; resolved: number; needsSupplierCorrection: number }> {
    const client = this.getClient(options?.tx);

    const [open, resolved, needsSupplierCorrection] = await Promise.all([
      client.receivingMismatch.count({
        where: { practiceId, status: MismatchStatus.OPEN },
      }),
      client.receivingMismatch.count({
        where: { practiceId, status: MismatchStatus.RESOLVED },
      }),
      client.receivingMismatch.count({
        where: { practiceId, status: MismatchStatus.NEEDS_SUPPLIER_CORRECTION },
      }),
    ]);

    return { open, resolved, needsSupplierCorrection };
  }

  /**
   * Get total count for pagination
   */
  async countMismatches(
    practiceId: string,
    filters?: Partial<MismatchFilters>,
    options?: RepositoryOptions
  ): Promise<number> {
    const client = this.getClient(options?.tx);

    const where: Prisma.ReceivingMismatchWhereInput = {
      ...this.scopeToPractice(practiceId),
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.practiceSupplierId) {
      where.practiceSupplierId = filters.practiceSupplierId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    return client.receivingMismatch.count({ where });
  }
}

