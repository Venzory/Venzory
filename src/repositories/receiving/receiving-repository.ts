/**
 * Receiving Repository
 * Handles all data access for goods receiving entities
 */

import { Prisma, GoodsReceiptStatus } from '@prisma/client';
import { BaseRepository, type FindOptions, type RepositoryOptions } from '../base';
import {
  GoodsReceipt,
  GoodsReceiptWithRelations,
  GoodsReceiptLine,
  CreateGoodsReceiptInput,
  AddGoodsReceiptLineInput,
  UpdateGoodsReceiptLineInput,
  GoodsReceiptFilters,
  GoodsReceiptSummary,
} from '@/src/domain/models';
import { NotFoundError } from '@/src/domain/errors';

export class ReceivingRepository extends BaseRepository {
  /**
   * Find goods receipts by practice with optional filters
   */
  async findGoodsReceipts(
    practiceId: string,
    filters?: Partial<GoodsReceiptFilters>,
    options?: FindOptions
  ): Promise<GoodsReceiptWithRelations[]> {
    const client = this.getClient(options?.tx);

    const where: Prisma.GoodsReceiptWhereInput = {
      ...this.scopeToPractice(practiceId),
    };

    if (filters?.locationId) {
      where.locationId = filters.locationId;
    }

    if (filters?.orderId) {
      where.orderId = filters.orderId;
    }

    if (filters?.practiceSupplierId) {
      where.practiceSupplierId = filters.practiceSupplierId;
    }

    if (filters?.status) {
      where.status = filters.status;
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

    const receipts = await client.goodsReceipt.findMany({
      where,
      include: {
        location: {
          select: { id: true, name: true, code: true },
        },
        order: {
          select: { id: true, reference: true },
        },
        practiceSupplier: {
          include: {
            globalSupplier: true,
          },
        },
        lines: {
          include: {
            item: {
              select: { id: true, name: true, sku: true, unit: true },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
      ...this.buildPagination(options?.pagination),
    });

    return receipts as GoodsReceiptWithRelations[];
  }

  /**
   * Find goods receipt by ID
   */
  async findGoodsReceiptById(
    receiptId: string,
    practiceId: string,
    options?: FindOptions
  ): Promise<GoodsReceiptWithRelations> {
    const client = this.getClient(options?.tx);

    const receipt = await client.goodsReceipt.findUnique({
      where: { id: receiptId, practiceId },
      include: {
        location: true,
        order: {
          include: {
            items: {
              include: {
                item: true,
              },
            },
          },
        },
        practiceSupplier: {
          include: {
            globalSupplier: true,
          },
        },
        lines: {
          include: {
            item: {
              include: {
                product: true,
              },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return this.ensureExists(Promise.resolve(receipt), 'GoodsReceipt', receiptId);
  }

  /**
   * Create new goods receipt
   */
  async createGoodsReceipt(
    createdById: string,
    input: CreateGoodsReceiptInput,
    options?: RepositoryOptions
  ): Promise<GoodsReceipt> {
    const client = this.getClient(options?.tx);

    const receipt = await client.goodsReceipt.create({
      data: {
        practiceId: input.practiceId,
        locationId: input.locationId,
        orderId: input.orderId ?? null,
        practiceSupplierId: input.practiceSupplierId ?? null,
        status: GoodsReceiptStatus.DRAFT,
        createdById,
        notes: input.notes ?? null,
      },
    });

    return receipt as GoodsReceipt;
  }

  /**
   * Update goods receipt status
   */
  async updateGoodsReceiptStatus(
    receiptId: string,
    practiceId: string,
    status: GoodsReceiptStatus,
    receivedAt?: Date,
    options?: RepositoryOptions
  ): Promise<GoodsReceipt> {
    const client = this.getClient(options?.tx);

    const receipt = await client.goodsReceipt.update({
      where: { id: receiptId, practiceId },
      data: {
        status,
        ...(receivedAt && { receivedAt }),
      },
    });

    return receipt as GoodsReceipt;
  }

  /**
   * Delete goods receipt
   */
  async deleteGoodsReceipt(
    receiptId: string,
    practiceId: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.goodsReceipt.delete({
      where: { id: receiptId, practiceId },
    });
  }

  /**
   * Find receipt line by item
   */
  async findReceiptLineByItem(
    receiptId: string,
    itemId: string,
    options?: FindOptions
  ): Promise<GoodsReceiptLine | null> {
    const client = this.getClient(options?.tx);

    const line = await client.goodsReceiptLine.findFirst({
      where: {
        receiptId,
        itemId,
      },
      include: options?.include ?? undefined,
    });

    return line as GoodsReceiptLine | null;
  }

  /**
   * Add line to goods receipt
   */
  async addReceiptLine(
    receiptId: string,
    input: AddGoodsReceiptLineInput,
    options?: RepositoryOptions
  ): Promise<GoodsReceiptLine> {
    const client = this.getClient(options?.tx);

    const line = await client.goodsReceiptLine.create({
      data: {
        receiptId,
        itemId: input.itemId,
        quantity: input.quantity,
        batchNumber: input.batchNumber ?? null,
        expiryDate: input.expiryDate ?? null,
        notes: input.notes ?? null,
        scannedGtin: input.scannedGtin ?? null,
        skipped: input.skipped ?? false,
      },
    });

    return line as GoodsReceiptLine;
  }

  /**
   * Update receipt line
   */
  async updateReceiptLine(
    lineId: string,
    practiceId: string,
    input: UpdateGoodsReceiptLineInput,
    options?: RepositoryOptions
  ): Promise<GoodsReceiptLine> {
    const client = this.getClient(options?.tx);

    // Validate receipt ownership first
    await this.findReceiptLineById(lineId, practiceId, options);

    const line = await client.goodsReceiptLine.update({
      where: { id: lineId },
      data: {
        quantity: input.quantity,
        batchNumber: input.batchNumber,
        expiryDate: input.expiryDate,
        notes: input.notes,
      },
    });

    return line as GoodsReceiptLine;
  }

  /**
   * Update or add receipt line (if exists, increment quantity)
   */
  async upsertReceiptLine(
    receiptId: string,
    itemId: string,
    input: AddGoodsReceiptLineInput,
    options?: RepositoryOptions
  ): Promise<GoodsReceiptLine> {
    const client = this.getClient(options?.tx);

    // Check if line already exists (include receipt to get practiceId)
    const existing = await this.findReceiptLineByItem(receiptId, itemId, { 
      tx: options?.tx,
      include: { receipt: true }
    });

    if (existing) {
      // Update existing line (increment quantity)
      if (!existing.receipt) {
        throw new Error('Receipt not found for existing line');
      }
      
      return this.updateReceiptLine(
        existing.id,
        existing.receipt.practiceId,
        {
          quantity: existing.quantity + input.quantity,
          batchNumber: input.batchNumber ?? existing.batchNumber,
          expiryDate: input.expiryDate ?? existing.expiryDate,
          notes: input.notes ?? existing.notes,
        },
        options
      );
    }

    // Create new line
    return this.addReceiptLine(receiptId, input, options);
  }

  /**
   * Remove line from goods receipt
   */
  async removeReceiptLine(
    lineId: string,
    practiceId: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    // Validate receipt ownership first
    await this.findReceiptLineById(lineId, practiceId, options);

    await client.goodsReceiptLine.delete({
      where: { id: lineId },
    });
  }

  /**
   * Get goods receipt summaries (for lists)
   */
  async getGoodsReceiptSummaries(
    practiceId: string,
    filters?: Partial<GoodsReceiptFilters>,
    options?: FindOptions
  ): Promise<GoodsReceiptSummary[]> {
    const receipts = await this.findGoodsReceipts(practiceId, filters, options);

    return receipts.map((receipt) => ({
      id: receipt.id,
      locationName: receipt.location?.name ?? 'Unknown',
      supplierName: receipt.practiceSupplier?.customLabel || receipt.practiceSupplier?.globalSupplier?.name || null,
      status: receipt.status,
      lineCount: receipt.lines?.length ?? 0,
      totalQuantity: receipt.lines?.reduce((sum, line) => sum + line.quantity, 0) ?? 0,
      createdAt: receipt.createdAt,
      receivedAt: receipt.receivedAt,
    }));
  }

  /**
   * Find receipt line by ID
   */
  async findReceiptLineById(
    lineId: string,
    practiceId: string,
    options?: FindOptions
  ): Promise<GoodsReceiptLine> {
    const client = this.getClient(options?.tx);

    const line = await client.goodsReceiptLine.findUnique({
      where: { id: lineId },
      include: {
        receipt: {
          select: { id: true, practiceId: true, status: true, locationId: true },
        },
        item: true,
      },
    });

    // Validate receipt belongs to practice
    if (!line || (line.receipt as any).practiceId !== practiceId) {
      throw new NotFoundError('GoodsReceiptLine', lineId);
    }

    return line as GoodsReceiptLine;
  }
}

