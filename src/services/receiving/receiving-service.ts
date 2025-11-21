/**
 * Receiving Service
 * Business logic for goods receiving workflow
 */

import { ReceivingRepository } from '@/src/repositories/receiving';
import { InventoryRepository } from '@/src/repositories/inventory';
import { UserRepository } from '@/src/repositories/users';
import { OrderRepository } from '@/src/repositories/orders';
import { getPracticeSupplierRepository } from '@/src/repositories/suppliers';
import { AuditService, getAuditService } from '../audit/audit-service';
import type { RequestContext } from '@/src/lib/context/request-context';
import { requireRole } from '@/src/lib/context/context-builder';
import { withTransaction } from '@/src/repositories/base';
import {
  CreateGoodsReceiptInput,
  AddGoodsReceiptLineInput,
  UpdateGoodsReceiptLineInput,
  GoodsReceiptFilters,
  GoodsReceiptWithRelations,
  GoodsReceiptSummary,
  ConfirmGoodsReceiptResult,
} from '@/src/domain/models';
import {
  ValidationError,
  BusinessRuleViolationError,
} from '@/src/domain/errors';
import {
  validatePositiveQuantity,
  validateReceiptCanBeConfirmed,
  validateExpiryDate,
} from '@/src/domain/validators';
import { prisma } from '@/lib/prisma';
import { checkAndCreateLowStockNotification } from '@/lib/notifications';

export class ReceivingService {
  constructor(
    private receivingRepository: ReceivingRepository,
    private inventoryRepository: InventoryRepository,
    private userRepository: UserRepository,
    private orderRepository: OrderRepository,
    private auditService: AuditService
  ) {}

  /**
   * Find goods receipts with filters
   */
  async findGoodsReceipts(
    ctx: RequestContext,
    filters?: Partial<GoodsReceiptFilters>
  ): Promise<GoodsReceiptWithRelations[]> {
    return this.receivingRepository.findGoodsReceipts(ctx.practiceId, filters);
  }

  /**
   * Get goods receipt summaries (for list views)
   */
  async getGoodsReceiptSummaries(
    ctx: RequestContext,
    filters?: Partial<GoodsReceiptFilters>
  ): Promise<GoodsReceiptSummary[]> {
    return this.receivingRepository.getGoodsReceiptSummaries(ctx.practiceId, filters);
  }

  /**
   * Get goods receipt by ID
   */
  async getGoodsReceiptById(
    ctx: RequestContext,
    receiptId: string
  ): Promise<GoodsReceiptWithRelations> {
    return this.receivingRepository.findGoodsReceiptById(receiptId, ctx.practiceId);
  }

  /**
   * Create new goods receipt
   */
  async createGoodsReceipt(
    ctx: RequestContext,
    input: Omit<CreateGoodsReceiptInput, 'practiceId'>
  ): Promise<GoodsReceiptWithRelations> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    // Verify location exists
    await this.userRepository.findLocationById(input.locationId, ctx.practiceId);

    // Verify practice supplier exists if provided
    if (input.practiceSupplierId) {
      const practiceSupplierRepo = getPracticeSupplierRepository();
      await practiceSupplierRepo.findPracticeSupplierById(input.practiceSupplierId, ctx.practiceId);
    }

    return withTransaction(async (tx) => {
      // Create receipt
      const receipt = await this.receivingRepository.createGoodsReceipt(
        ctx.userId,
        {
          ...input,
          practiceId: ctx.practiceId,
        },
        { tx }
      );

      // Return receipt with relations
      return this.receivingRepository.findGoodsReceiptById(
        receipt.id,
        ctx.practiceId,
        { tx }
      );
    });
  }

  /**
   * Add line to goods receipt
   */
  async addReceiptLine(
    ctx: RequestContext,
    receiptId: string,
    input: AddGoodsReceiptLineInput
  ): Promise<GoodsReceiptWithRelations> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    // Validate input
    if (!input.skipped) {
      validatePositiveQuantity(input.quantity);
    }
    if (input.expiryDate) {
      validateExpiryDate(input.expiryDate);
    }

    return withTransaction(async (tx) => {
      // Verify receipt exists and is DRAFT
      const receipt = await this.receivingRepository.findGoodsReceiptById(
        receiptId,
        ctx.practiceId,
        { tx }
      );

      if (receipt.status !== 'DRAFT') {
        throw new BusinessRuleViolationError('Cannot edit confirmed receipt');
      }

      // Verify item exists
      await this.inventoryRepository.findItemById(input.itemId, ctx.practiceId, { tx });

      // Add or update line (if item already exists, increment quantity)
      await this.receivingRepository.upsertReceiptLine(receiptId, input.itemId, input, { tx });

      // Return updated receipt
      return this.receivingRepository.findGoodsReceiptById(
        receiptId,
        ctx.practiceId,
        { tx }
      );
    });
  }

  /**
   * Update receipt line
   */
  async updateReceiptLine(
    ctx: RequestContext,
    lineId: string,
    input: UpdateGoodsReceiptLineInput
  ): Promise<GoodsReceiptWithRelations> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    // Validate input
    if (input.quantity !== undefined) {
      validatePositiveQuantity(input.quantity);
    }
    if (input.expiryDate) {
      validateExpiryDate(input.expiryDate);
    }

    return withTransaction(async (tx) => {
      // Get line with receipt
      const line = await this.receivingRepository.findReceiptLineById(lineId, ctx.practiceId, { tx });

      if (!line.receipt) {
        throw new BusinessRuleViolationError('Receipt not found');
      }

      // Verify receipt is DRAFT
      if (line.receipt.status !== 'DRAFT') {
        throw new BusinessRuleViolationError('Cannot edit confirmed receipt');
      }

      // Verify practice access
      if (line.receipt.practiceId !== ctx.practiceId) {
        throw new BusinessRuleViolationError('Receipt not found');
      }

      // Update line
      await this.receivingRepository.updateReceiptLine(lineId, ctx.practiceId, input, { tx });

      // Return updated receipt
      return this.receivingRepository.findGoodsReceiptById(
        line.receiptId,
        ctx.practiceId,
        { tx }
      );
    });
  }

  /**
   * Remove line from goods receipt
   */
  async removeReceiptLine(
    ctx: RequestContext,
    lineId: string
  ): Promise<GoodsReceiptWithRelations> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    return withTransaction(async (tx) => {
      // Get line with receipt
      const line = await this.receivingRepository.findReceiptLineById(lineId, ctx.practiceId, { tx });

      if (!line.receipt) {
        throw new BusinessRuleViolationError('Receipt not found');
      }

      // Verify receipt is DRAFT
      if (line.receipt.status !== 'DRAFT') {
        throw new BusinessRuleViolationError('Cannot edit confirmed receipt');
      }

      // Verify practice access
      if (line.receipt.practiceId !== ctx.practiceId) {
        throw new BusinessRuleViolationError('Receipt not found');
      }

      const receiptId = line.receiptId;

      // Remove line
      await this.receivingRepository.removeReceiptLine(lineId, ctx.practiceId, { tx });

      // Return updated receipt
      return this.receivingRepository.findGoodsReceiptById(
        receiptId,
        ctx.practiceId,
        { tx }
      );
    });
  }

  /**
   * Confirm goods receipt (updates inventory)
   */
  async confirmGoodsReceipt(
    ctx: RequestContext,
    receiptId: string
  ): Promise<ConfirmGoodsReceiptResult> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    return withTransaction(async (tx) => {
      // Get full receipt with lines
      const receipt = await this.receivingRepository.findGoodsReceiptById(
        receiptId,
        ctx.practiceId,
        { tx }
      );

      // Validate receipt can be confirmed
      validateReceiptCanBeConfirmed({
        status: receipt.status,
        lines: receipt.lines ?? [],
      });

      const lowStockNotifications: string[] = [];

      // Batch fetch current inventory for all line items (avoids N+1)
      const lineItemIds = (receipt.lines ?? []).map(line => line.itemId);
      const inventoryMap = await this.inventoryRepository.getLocationInventoryBatch(
        lineItemIds,
        receipt.locationId,
        ctx.practiceId,
        { tx }
      );

      // Process each line: update inventory and create stock adjustments
      for (const line of receipt.lines ?? []) {
        // Get current inventory from batch-fetched map
        const currentInventory = inventoryMap.get(line.itemId) ?? null;

        const newQuantity = (currentInventory?.quantity ?? 0) + line.quantity;

        // Update inventory
        await this.inventoryRepository.upsertLocationInventory(
          receipt.locationId,
          line.itemId,
          newQuantity,
          currentInventory?.reorderPoint,
          currentInventory?.reorderQuantity,
          ctx.practiceId,
          currentInventory?.maxStock,
          { tx }
        );

        // Create stock adjustment record
        await this.inventoryRepository.createStockAdjustment(
          ctx.practiceId,
          ctx.userId,
          {
            itemId: line.itemId,
            locationId: receipt.locationId,
            quantity: line.quantity,
            reason: 'Goods Receipt',
            note: `Receipt #${receiptId.slice(0, 8)}${line.batchNumber ? ` - Batch: ${line.batchNumber}` : ''}`,
          },
          { tx }
        );

        // Check for low stock notification (guard against null/undefined)
        if (
          currentInventory?.reorderPoint !== null &&
          currentInventory?.reorderPoint !== undefined &&
          newQuantity < currentInventory.reorderPoint
        ) {
          lowStockNotifications.push(line.item?.name ?? 'Unknown item');

          // Persist notification
          await checkAndCreateLowStockNotification(
            {
              practiceId: ctx.practiceId,
              itemId: line.itemId,
              locationId: receipt.locationId,
              newQuantity,
              reorderPoint: currentInventory.reorderPoint,
            },
            tx
          );
        }
      }

      // Update receipt status to CONFIRMED
      await this.receivingRepository.updateGoodsReceiptStatus(
        receiptId,
        ctx.practiceId,
        'CONFIRMED',
        new Date(),
        { tx }
      );

      // If receipt is linked to an order, update order status
      if (receipt.orderId) {
        await this.updateOrderStatusAfterReceiving(
          receipt.orderId,
          ctx.practiceId,
          tx
        );
      }

      // Log audit event
      await this.auditService.logGoodsReceiptConfirmed(
        ctx,
        receiptId,
        {
          lineCount: receipt.lines?.length ?? 0,
          totalQuantity: receipt.lines?.reduce((sum, line) => sum + line.quantity, 0) ?? 0,
          items: (receipt.lines ?? []).map((line) => ({
            itemId: line.itemId,
            itemName: line.item?.name ?? 'Unknown',
            quantity: line.quantity,
            batchNumber: line.batchNumber,
            expiryDate: line.expiryDate,
          })),
        },
        {
          locationId: receipt.locationId,
          orderId: receipt.orderId,
          practiceSupplierId: receipt.practiceSupplierId ?? null,
        },
        tx
      );

      return {
        receiptId,
        linesProcessed: receipt.lines?.length ?? 0,
        inventoryUpdated: true,
        lowStockNotifications,
        orderId: receipt.orderId,
      };
    });
  }

  /**
   * Cancel goods receipt
   */
  async cancelGoodsReceipt(
    ctx: RequestContext,
    receiptId: string
  ): Promise<void> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    return withTransaction(async (tx) => {
      // Verify receipt exists and is DRAFT
      const receipt = await this.receivingRepository.findGoodsReceiptById(
        receiptId,
        ctx.practiceId,
        { tx }
      );

      if (receipt.status !== 'DRAFT') {
        throw new BusinessRuleViolationError('Can only cancel draft receipts');
      }

      // Update status to CANCELLED
      await this.receivingRepository.updateGoodsReceiptStatus(
        receiptId,
        ctx.practiceId,
        'CANCELLED',
        undefined,
        { tx }
      );

      // Log audit event
      await this.auditService.logGoodsReceiptCancelled(ctx, receiptId, tx);
    });
  }

  /**
   * Delete goods receipt (admin only, non-confirmed only)
   */
  async deleteGoodsReceipt(
    ctx: RequestContext,
    receiptId: string
  ): Promise<void> {
    // Check permissions (admin only)
    requireRole(ctx, 'ADMIN');

    return withTransaction(async (tx) => {
      // Verify receipt exists and is not CONFIRMED
      const receipt = await this.receivingRepository.findGoodsReceiptById(
        receiptId,
        ctx.practiceId,
        { tx }
      );

      if (receipt.status === 'CONFIRMED') {
        throw new BusinessRuleViolationError('Cannot delete confirmed receipt');
      }

      // Delete receipt
      await this.receivingRepository.deleteGoodsReceipt(receiptId, ctx.practiceId, { tx });
    });
  }

  /**
   * Update order status based on received quantities
   * Called within transaction after confirming a receipt
   */
  private async updateOrderStatusAfterReceiving(
    orderId: string,
    practiceId: string,
    tx: any
  ): Promise<void> {
    // Get the order with its items
    const order = await this.orderRepository.findOrderById(
      orderId,
      practiceId,
      { tx }
    );

    // Get all CONFIRMED receipts for this order
    const confirmedReceipts = await this.receivingRepository.findGoodsReceipts(
      practiceId,
      {
        orderId,
        status: 'CONFIRMED',
      },
      { tx }
    );

    // Calculate total received quantities per item
    const receivedQuantities = new Map<string, number>();
    // Also track if any items were skipped across all receipts
    const skippedItems = new Set<string>();
    
    for (const receipt of confirmedReceipts) {
      for (const line of receipt.lines ?? []) {
        const current = receivedQuantities.get(line.itemId) || 0;
        receivedQuantities.set(line.itemId, current + line.quantity);
        
        if (line.skipped) {
          skippedItems.add(line.itemId);
        }
      }
    }

    // Check if all items are fully received
    let allItemsFullyReceived = true;
    let anyItemReceived = false;

    for (const orderItem of order.items ?? []) {
      const receivedQty = receivedQuantities.get(orderItem.itemId) || 0;
      
      if (receivedQty > 0) {
        anyItemReceived = true;
      } else if (skippedItems.has(orderItem.itemId)) {
        // If item was skipped, we count it as "interacted with" (so order isn't just SENT)
        // but it definitely prevents full completion automatically
        anyItemReceived = true; 
      }
      
      if (receivedQty < orderItem.quantity) {
        // If quantity is less than ordered, it's not fully received.
        // Even if skipped, we treat it as partial unless manually closed.
        allItemsFullyReceived = false;
      }
    }

    // Determine new order status
    // Note: Skipped items prevent automatic 'RECEIVED' status because 
    // receivedQty < orderedQty remains true.
    let newStatus: 'PARTIALLY_RECEIVED' | 'RECEIVED';
    if (allItemsFullyReceived) {
      newStatus = 'RECEIVED';
    } else if (anyItemReceived) {
      newStatus = 'PARTIALLY_RECEIVED';
    } else {
      // No items received yet (shouldn't happen but be safe)
      return;
    }

    // Update order status
    await this.orderRepository.updateOrderStatus(
      orderId,
      practiceId,
      newStatus,
      {
        receivedAt: new Date(),
      },
      { tx }
    );
  }

  /**
   * Search item by GTIN (for barcode scanning)
   */
  async searchItemByGtin(
    ctx: RequestContext,
    gtin: string
  ): Promise<{ id: string; name: string; sku: string | null; unit: string | null } | null> {
    // Use dedicated GTIN lookup to bypass pagination limits
    const matchingItem = await this.inventoryRepository.findItemByProductGtin(
      gtin,
      ctx.practiceId
    );

    if (!matchingItem) {
      return null;
    }

    return {
      id: matchingItem.id,
      name: matchingItem.name,
      sku: matchingItem.sku,
      unit: matchingItem.unit,
    };
  }

  /**
   * Get receiving mismatches (orders with quantity discrepancies)
   */
  async getReceivingMismatches(ctx: RequestContext) {
    // Fetch potential mismatch orders (PARTIALLY_RECEIVED or RECEIVED)
    const candidates = await prisma.order.findMany({
      where: {
        practiceId: ctx.practiceId,
        status: { in: ['PARTIALLY_RECEIVED', 'RECEIVED'] },
      },
      include: {
        items: {
          include: { item: { select: { name: true, unit: true } } },
        },
        goodsReceipts: {
          where: { status: 'CONFIRMED' },
          include: { lines: true },
        },
        practiceSupplier: {
          include: { globalSupplier: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50, // Limit to recent 50 active/recent orders
    });

    const mismatches = [];

    for (const order of candidates) {
      const itemStats = new Map<
        string,
        { name: string; ordered: number; received: number; unit: string | null }
      >();

      // Initialize with ordered items
      for (const orderItem of order.items) {
        itemStats.set(orderItem.itemId, {
          name: orderItem.item.name,
          ordered: orderItem.quantity,
          received: 0,
          unit: orderItem.item.unit,
        });
      }

      // Aggregate received quantities
      for (const receipt of order.goodsReceipts) {
        for (const line of receipt.lines) {
          const stats = itemStats.get(line.itemId);
          if (stats) {
            stats.received += line.quantity;
          }
        }
      }

      // Identify mismatched items
      const mismatchedItems = [];
      let isOrderMismatched = false;

      for (const stats of itemStats.values()) {
        if (stats.ordered !== stats.received) {
          mismatchedItems.push(stats);
          isOrderMismatched = true;
        }
      }

      // Include if status is PARTIALLY_RECEIVED (always interesting)
      // OR if status is RECEIVED but counts don't match
      if (order.status === 'PARTIALLY_RECEIVED' || (order.status === 'RECEIVED' && isOrderMismatched)) {
        mismatches.push({
          id: order.id,
          reference: order.reference,
          supplierName:
            order.practiceSupplier?.customLabel ||
            order.practiceSupplier?.globalSupplier?.name ||
            'Unknown Supplier',
          status: order.status,
          updatedAt: order.updatedAt,
          items: mismatchedItems,
        });
      }
    }

    return mismatches;
  }
}

// Singleton instance
let receivingServiceInstance: ReceivingService | null = null;

export function getReceivingService(): ReceivingService {
  if (!receivingServiceInstance) {
    receivingServiceInstance = new ReceivingService(
      new ReceivingRepository(),
      new InventoryRepository(),
      new UserRepository(),
      new OrderRepository(),
      getAuditService()
    );
  }
  return receivingServiceInstance;
}

