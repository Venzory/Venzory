/**
 * Inventory Service
 * Business logic for inventory management
 */

import { InventoryRepository } from '@/src/repositories/inventory';
import { ProductRepository } from '@/src/repositories/products';
import { LocationRepository } from '@/src/repositories/locations';
import { StockCountRepository } from '@/src/repositories/stock-count';
import { UserRepository } from '@/src/repositories/users';
import { AuditService } from '../audit/audit-service';
import type { RequestContext } from '@/src/lib/context/request-context';
import { requireRole } from '@/src/lib/context/context-builder';
import { withTransaction, type TransactionClient } from '@/src/repositories/base';
import {
  CreateItemInput,
  UpdateItemInput,
  StockAdjustmentInput,
  InventoryTransferInput,
  InventoryFilters,
  ItemWithRelations,
  LowStockInfo,
} from '@/src/domain/models';
import {
  ValidationError,
  BusinessRuleViolationError,
  NotFoundError,
} from '@/src/domain/errors';
import {
  validatePositiveQuantity,
  validateNonNegativeResult,
  validateStringLength,
  validateTransferLocations,
} from '@/src/domain/validators';

export class InventoryService {
  constructor(
    private inventoryRepository: InventoryRepository,
    private productRepository: ProductRepository,
    private locationRepository: LocationRepository,
    private stockCountRepository: StockCountRepository,
    private userRepository: UserRepository,
    private auditService: AuditService
  ) {}

  /**
   * Find items with filters
   */
  async findItems(
    ctx: RequestContext,
    filters?: Partial<InventoryFilters>,
    pagination?: { page?: number; limit?: number }
  ): Promise<ItemWithRelations[]> {
    return this.inventoryRepository.findItems(ctx.practiceId, filters, {
      pagination: {
        page: pagination?.page ?? 1,
        limit: pagination?.limit ?? 50,
      },
    });
  }

  /**
   * Get item by ID
   */
  async getItemById(
    ctx: RequestContext,
    itemId: string
  ): Promise<ItemWithRelations> {
    return this.inventoryRepository.findItemById(itemId, ctx.practiceId);
  }

  /**
   * Create new item
   */
  async createItem(
    ctx: RequestContext,
    input: Omit<CreateItemInput, 'practiceId'>
  ): Promise<ItemWithRelations> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    // Validate input
    validateStringLength(input.name, 'Item name', 1, 255);
    if (input.sku) {
      validateStringLength(input.sku, 'SKU', 1, 64);
    }

    // Verify product exists
    await this.productRepository.findProductById(input.productId);

    return withTransaction(async (tx) => {
      // Create item
      const item = await this.inventoryRepository.createItem(
        {
          ...input,
          practiceId: ctx.practiceId,
        },
        { tx }
      );

      // Log audit event
      await this.auditService.logItemCreated(
        ctx,
        item.id,
        {
          name: item.name,
          sku: item.sku,
          productId: item.productId,
        },
        tx
      );

      // Return item with relations
      return this.inventoryRepository.findItemById(item.id, ctx.practiceId, { tx });
    });
  }

  /**
   * Update existing item
   */
  async updateItem(
    ctx: RequestContext,
    itemId: string,
    input: UpdateItemInput
  ): Promise<ItemWithRelations> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    // Validate input
    if (input.name) {
      validateStringLength(input.name, 'Item name', 1, 255);
    }
    if (input.sku) {
      validateStringLength(input.sku, 'SKU', 1, 64);
    }

    return withTransaction(async (tx) => {
      // Verify item exists
      const existingItem = await this.inventoryRepository.findItemById(
        itemId,
        ctx.practiceId,
        { tx }
      );

      // Update item
      const item = await this.inventoryRepository.updateItem(
        itemId,
        ctx.practiceId,
        input,
        { tx }
      );

      // Log audit event
      await this.auditService.logItemUpdated(ctx, itemId, input, tx);

      // Return updated item with relations
      return this.inventoryRepository.findItemById(item.id, ctx.practiceId, { tx });
    });
  }

  /**
   * Delete item
   */
  async deleteItem(ctx: RequestContext, itemId: string): Promise<void> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    return withTransaction(async (tx) => {
      // Verify item exists
      await this.inventoryRepository.findItemById(itemId, ctx.practiceId, { tx });

      // Delete item
      await this.inventoryRepository.deleteItem(itemId, ctx.practiceId, { tx });

      // Log audit event
      await this.auditService.logItemDeleted(ctx, itemId, tx);
    });
  }

  /**
   * Adjust stock at a location
   */
  async adjustStock(
    ctx: RequestContext,
    input: StockAdjustmentInput
  ): Promise<{
    previousQuantity: number;
    newQuantity: number;
    reorderPoint: number | null;
  }> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    // Validate input
    if (input.quantity === 0) {
      throw new ValidationError('Adjustment quantity cannot be zero');
    }

    return withTransaction(async (tx) => {
      // Verify item exists
      const item = await this.inventoryRepository.findItemById(
        input.itemId,
        ctx.practiceId,
        { tx }
      );

      // Fetch location for audit logging
      const location = await this.locationRepository.findLocationById(
        input.locationId,
        ctx.practiceId,
        { tx }
      );

      // Get current inventory
      const currentInventory = await this.inventoryRepository.getLocationInventory(
        input.itemId,
        input.locationId,
        { tx }
      );

      const previousQuantity = currentInventory?.quantity ?? 0;

      // Validate adjustment won't result in negative quantity
      validateNonNegativeResult(previousQuantity, input.quantity);

      // Perform adjustment
      const { newQuantity } = await this.inventoryRepository.adjustStock(
        input.locationId,
        input.itemId,
        input.quantity,
        { tx }
      );

      // Create adjustment record
      const adjustment = await this.inventoryRepository.createStockAdjustment(
        ctx.practiceId,
        ctx.userId,
        input,
        { tx }
      );

      // Log audit event
      await this.auditService.logStockAdjustment(
        ctx,
        adjustment.id,
        {
          itemId: input.itemId,
          itemName: item.name,
          locationId: input.locationId,
          locationName: location.name,
          quantity: input.quantity,
          reason: input.reason,
        },
        tx
      );

      return {
        previousQuantity,
        newQuantity,
        reorderPoint: currentInventory?.reorderPoint ?? null,
      };
    });
  }

  /**
   * Transfer inventory between locations
   */
  async transferInventory(
    ctx: RequestContext,
    input: InventoryTransferInput
  ): Promise<void> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    // Validate input
    validatePositiveQuantity(input.quantity);
    validateTransferLocations(input.fromLocationId, input.toLocationId);

    return withTransaction(async (tx) => {
      // Verify item exists
      const item = await this.inventoryRepository.findItemById(
        input.itemId,
        ctx.practiceId,
        { tx }
      );

      // Check source location has enough stock
      const sourceInventory = await this.inventoryRepository.getLocationInventory(
        input.itemId,
        input.fromLocationId,
        { tx }
      );

      if (!sourceInventory || sourceInventory.quantity < input.quantity) {
        throw new BusinessRuleViolationError(
          `Insufficient stock at source location (available: ${sourceInventory?.quantity ?? 0}, required: ${input.quantity})`
        );
      }

      // Reduce stock at source location
      await this.inventoryRepository.adjustStock(
        input.fromLocationId,
        input.itemId,
        -input.quantity,
        { tx }
      );

      // Increase stock at destination location
      await this.inventoryRepository.adjustStock(
        input.toLocationId,
        input.itemId,
        input.quantity,
        { tx }
      );

      // Create transfer record
      await this.inventoryRepository.createInventoryTransfer(
        ctx.practiceId,
        ctx.userId,
        input,
        { tx }
      );
    });
  }

  /**
   * Get low stock items
   */
  async getLowStockItems(ctx: RequestContext): Promise<LowStockInfo[]> {
    return this.inventoryRepository.findLowStockItems(ctx.practiceId);
  }

  /**
   * Get recent stock adjustments
   */
  async getRecentAdjustments(
    ctx: RequestContext,
    filters?: {
      itemId?: string;
      locationId?: string;
      limit?: number;
    } | number
  ) {
    // Handle legacy number parameter for limit
    const filterObj = typeof filters === 'number' 
      ? { limit: filters } 
      : filters;
    
    return this.inventoryRepository.findStockAdjustments(
      ctx.practiceId,
      filterObj
    );
  }

  /**
   * Update reorder settings for an item at a location
   */
  async updateReorderSettings(
    ctx: RequestContext,
    itemId: string,
    locationId: string,
    reorderPoint: number | null,
    reorderQuantity: number | null
  ): Promise<void> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    // Validate input
    if (reorderPoint !== null && reorderPoint < 0) {
      throw new ValidationError('Reorder point cannot be negative');
    }
    if (reorderQuantity !== null && reorderQuantity <= 0) {
      throw new ValidationError('Reorder quantity must be positive');
    }

    // Verify item exists
    await this.inventoryRepository.findItemById(itemId, ctx.practiceId);

    // Get current inventory
    const inventory = await this.inventoryRepository.getLocationInventory(
      itemId,
      locationId
    );

    // Update reorder settings
    await this.inventoryRepository.upsertLocationInventory(
      locationId,
      itemId,
      inventory?.quantity ?? 0,
      reorderPoint,
      reorderQuantity
    );
  }

  /**
   * Create stock count session
   */
  async createStockCountSession(
    ctx: RequestContext,
    locationId: string,
    notes?: string | null
  ): Promise<{ id: string }> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    return withTransaction(async (tx) => {
      // Verify location exists
      const location = await this.locationRepository.findLocationById(
        locationId,
        ctx.practiceId,
        { tx }
      );

      // Create session
      const session = await this.stockCountRepository.createStockCountSession(
        ctx.practiceId,
        locationId,
        notes ?? null,
        ctx.userId,
        { tx }
      );

      // Log audit event
      await this.auditService.logStockCountSessionCreated(
        ctx,
        session.id,
        { locationId, locationName: location.name },
        tx
      );

      return { id: session.id };
    });
  }

  /**
   * Add count line to session
   */
  async addCountLine(
    ctx: RequestContext,
    sessionId: string,
    itemId: string,
    countedQuantity: number,
    notes?: string | null
  ): Promise<{ lineId: string; variance: number }> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    // Validate input
    if (countedQuantity < 0) {
      throw new ValidationError('Counted quantity cannot be negative');
    }

    return withTransaction(async (tx) => {
      // Verify session exists and is IN_PROGRESS
      const session = await this.stockCountRepository.findStockCountSessionById(
        sessionId,
        ctx.practiceId,
        { tx }
      );

      if (session.status !== 'IN_PROGRESS') {
        throw new BusinessRuleViolationError('Cannot edit completed session');
      }

      // Verify item exists
      const item = await this.inventoryRepository.findItemById(
        itemId,
        ctx.practiceId,
        { tx }
      );

      // Get current system quantity
      const inventory = await this.inventoryRepository.getLocationInventory(
        itemId,
        session.locationId,
        { tx }
      );

      const systemQuantity = inventory?.quantity ?? 0;
      const variance = countedQuantity - systemQuantity;

      // Check if line already exists
      const existingLine = await this.stockCountRepository.findStockCountLineBySessionAndItem(
        sessionId,
        itemId,
        { tx }
      );

      let line;
      if (existingLine) {
        // Update existing line
        line = await this.stockCountRepository.updateStockCountLine(
          existingLine.id,
          countedQuantity,
          variance,
          notes ?? existingLine.notes,
          { tx }
        );

        await this.auditService.logStockCountLineUpdated(
          ctx,
          line.id,
          {
            itemId,
            itemName: item.name,
            countedQuantity,
            systemQuantity,
            variance,
          },
          tx
        );
      } else {
        // Create new line
        line = await this.stockCountRepository.createStockCountLine(
          sessionId,
          itemId,
          countedQuantity,
          systemQuantity,
          variance,
          notes ?? null,
          { tx }
        );

        await this.auditService.logStockCountLineAdded(
          ctx,
          line.id,
          {
            itemId,
            itemName: item.name,
            countedQuantity,
            systemQuantity,
            variance,
          },
          tx
        );
      }

      return { lineId: line.id, variance };
    });
  }

  /**
   * Update count line
   */
  async updateCountLine(
    ctx: RequestContext,
    lineId: string,
    countedQuantity: number,
    notes?: string | null
  ): Promise<{ variance: number }> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    // Validate input
    if (countedQuantity < 0) {
      throw new ValidationError('Counted quantity cannot be negative');
    }

    return withTransaction(async (tx) => {
      // Verify line exists and session is IN_PROGRESS
      const line = await this.stockCountRepository.findStockCountLineById(
        lineId,
        { tx }
      );

      if (!line || line.session.practiceId !== ctx.practiceId) {
        throw new NotFoundError('Count line not found');
      }

      if (line.session.status !== 'IN_PROGRESS') {
        throw new BusinessRuleViolationError('Cannot edit completed session');
      }

      // Recalculate variance
      const variance = countedQuantity - line.systemQuantity;

      // Update line
      await this.stockCountRepository.updateStockCountLine(
        lineId,
        countedQuantity,
        variance,
        notes ?? line.notes,
        { tx }
      );

      await this.auditService.logStockCountLineUpdated(
        ctx,
        lineId,
        {
          itemId: line.itemId,
          itemName: line.item.name,
          countedQuantity,
          systemQuantity: line.systemQuantity,
          variance,
        },
        tx
      );

      return { variance };
    });
  }

  /**
   * Remove count line
   */
  async removeCountLine(ctx: RequestContext, lineId: string): Promise<void> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    return withTransaction(async (tx) => {
      // Verify line exists and session is IN_PROGRESS
      const line = await this.stockCountRepository.findStockCountLineById(
        lineId,
        { tx }
      );

      if (!line || line.session.practiceId !== ctx.practiceId) {
        throw new NotFoundError('Count line not found');
      }

      if (line.session.status !== 'IN_PROGRESS') {
        throw new BusinessRuleViolationError('Cannot edit completed session');
      }

      // Delete line
      await this.stockCountRepository.deleteStockCountLine(lineId, { tx });

      await this.auditService.logStockCountLineRemoved(
        ctx,
        lineId,
        {
          itemId: line.itemId,
          itemName: line.item.name,
        },
        tx
      );
    });
  }

  /**
   * Complete stock count session
   */
  async completeStockCount(
    ctx: RequestContext,
    sessionId: string,
    applyAdjustments: boolean
  ): Promise<{ adjustedItems: number }> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    return withTransaction(async (tx) => {
      // Fetch session with lines
      const session = await this.stockCountRepository.findStockCountSessionById(
        sessionId,
        ctx.practiceId,
        { tx }
      );

      if (session.status !== 'IN_PROGRESS') {
        throw new BusinessRuleViolationError('Session is not in progress');
      }

      if (!session.lines || session.lines.length === 0) {
        throw new ValidationError('Session must have at least one line');
      }

      let adjustedItems = 0;

      if (applyAdjustments) {
        // Process adjustments
        for (const line of session.lines) {
          if (line.variance === 0) {
            continue; // Skip items with no variance
          }

          // Get existing inventory for reorder point
          const existingInventory = await this.inventoryRepository.getLocationInventory(
            line.itemId,
            session.locationId,
            { tx }
          );

          // Update LocationInventory with counted quantity
          await this.inventoryRepository.upsertLocationInventory(
            session.locationId,
            line.itemId,
            line.countedQuantity,
            existingInventory?.reorderPoint,
            existingInventory?.reorderQuantity,
            { tx }
          );

          // Create StockAdjustment
          await this.inventoryRepository.createStockAdjustment(
            ctx.practiceId,
            ctx.userId,
            {
              itemId: line.itemId,
              locationId: session.locationId,
              quantity: line.variance,
              reason: 'Stock Count',
              note: `Count session #${sessionId.slice(0, 8)}${line.notes ? ` - ${line.notes}` : ''}`,
            },
            { tx }
          );

          // Check for low stock notifications
          const checkNotifications = require('@/lib/notifications').checkAndCreateLowStockNotification;
          await checkNotifications(
            {
              practiceId: ctx.practiceId,
              itemId: line.itemId,
              locationId: session.locationId,
              newQuantity: line.countedQuantity,
              reorderPoint: existingInventory?.reorderPoint ?? null,
            },
            tx
          );

          adjustedItems++;
        }
      }

      // Mark session as COMPLETED
      await this.stockCountRepository.updateStockCountSessionStatus(
        sessionId,
        ctx.practiceId,
        'COMPLETED',
        new Date(),
        { tx }
      );

      // Log audit event
      const totalVariance = session.lines.reduce(
        (sum, line) => sum + Math.abs(line.variance),
        0
      );

      await this.auditService.logStockCountCompleted(
        ctx,
        sessionId,
        {
          locationId: session.locationId,
          locationName: session.location?.name ?? '',
          lineCount: session.lines.length,
          adjustmentsApplied: applyAdjustments,
          adjustedItemCount: adjustedItems,
          totalVariance,
        },
        tx
      );

      return { adjustedItems };
    });
  }

  /**
   * Cancel stock count session
   */
  async cancelStockCount(ctx: RequestContext, sessionId: string): Promise<void> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    return withTransaction(async (tx) => {
      // Verify session exists and is IN_PROGRESS
      const session = await this.stockCountRepository.findStockCountSessionById(
        sessionId,
        ctx.practiceId,
        { tx }
      );

      if (session.status !== 'IN_PROGRESS') {
        throw new BusinessRuleViolationError('Can only cancel in-progress sessions');
      }

      // Cancel session
      await this.stockCountRepository.updateStockCountSessionStatus(
        sessionId,
        ctx.practiceId,
        'CANCELLED',
        undefined,
        { tx }
      );

      await this.auditService.logStockCountCancelled(ctx, sessionId, tx);
    });
  }

  /**
   * Delete stock count session
   */
  async deleteStockCountSession(ctx: RequestContext, sessionId: string): Promise<void> {
    // Check permissions
    requireRole(ctx, 'ADMIN');

    return withTransaction(async (tx) => {
      // Verify session exists and is not COMPLETED
      const session = await this.stockCountRepository.findStockCountSessionById(
        sessionId,
        ctx.practiceId,
        { tx }
      );

      if (session.status === 'COMPLETED') {
        throw new BusinessRuleViolationError('Cannot delete completed session');
      }

      // Delete session
      await this.stockCountRepository.deleteStockCountSession(
        sessionId,
        ctx.practiceId,
        { tx }
      );

      await this.auditService.logStockCountDeleted(ctx, sessionId, tx);
    });
  }

  // ===========================
  // GETTER METHODS FOR PAGES
  // ===========================

  /**
   * Get suppliers for the practice
   */
  async getSuppliers(ctx: RequestContext): Promise<any[]> {
    return this.userRepository.findSuppliers(ctx.practiceId);
  }

  /**
   * Get suppliers with their associated items
   */
  async getSuppliersWithItems(ctx: RequestContext): Promise<any[]> {
    return this.userRepository.findSuppliersWithItems(ctx.practiceId);
  }

  /**
   * Get locations for the practice
   */
  async getLocations(ctx: RequestContext): Promise<any[]> {
    return this.locationRepository.findLocations(ctx.practiceId);
  }

  /**
   * Get locations with inventory details
   */
  async getLocationsWithInventory(ctx: RequestContext): Promise<any[]> {
    return this.locationRepository.findLocations(ctx.practiceId, {
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
        inventory: {
          include: {
            item: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });
  }


  /**
   * Get stock count sessions
   */
  async getStockCountSessions(
    ctx: RequestContext,
    pagination?: { page?: number; limit?: number }
  ): Promise<any[]> {
    return this.stockCountRepository.findStockCountSessions(ctx.practiceId, {
      pagination: {
        page: pagination?.page ?? 1,
        limit: pagination?.limit ?? 50,
      },
    });
  }

  /**
   * Get single stock count session with details
   */
  async getStockCountSession(ctx: RequestContext, sessionId: string): Promise<any> {
    return this.stockCountRepository.findStockCountSessionById(
      sessionId,
      ctx.practiceId
    );
  }
}

// Singleton instance
let inventoryServiceInstance: InventoryService | null = null;

export function getInventoryService(): InventoryService {
  if (!inventoryServiceInstance) {
    const { getAuditService } = require('../audit/audit-service');
    inventoryServiceInstance = new InventoryService(
      new InventoryRepository(),
      new ProductRepository(),
      new LocationRepository(),
      new StockCountRepository(),
      new UserRepository(),
      getAuditService()
    );
  }
  return inventoryServiceInstance;
}

