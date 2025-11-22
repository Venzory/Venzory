/**
 * Inventory Repository
 * Handles all data access for inventory-related entities
 */

import { Prisma } from '@prisma/client';
import { BaseRepository, type FindOptions, type RepositoryOptions } from '../base';
import type { TransactionClient } from '../base/transaction';
import {
  Item,
  ItemWithRelations,
  LocationInventory,
  StockAdjustment,
  InventoryTransfer,
  SupplierItem,
  CreateItemInput,
  UpdateItemInput,
  StockAdjustmentInput,
  InventoryTransferInput,
  InventoryFilters,
  LowStockInfo,
} from '@/src/domain/models';
import { NotFoundError } from '@/src/domain/errors';

export class InventoryRepository extends BaseRepository {
  /**
   * Find items by practice with optional filters
   */
  async findItems(
    practiceId: string,
    filters?: Partial<InventoryFilters>,
    options?: FindOptions
  ): Promise<ItemWithRelations[]> {
    const client = this.getClient(options?.tx);

    const where: Prisma.ItemWhereInput = {
      ...this.scopeToPractice(practiceId),
    };

    // Apply search filter
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Filter by location (items with stock in that location)
    if (filters?.locationId) {
      where.inventory = {
        some: { locationId: filters.locationId },
      };
    }

    // Filter by practice supplier
    if (filters?.practiceSupplierId) {
      where.defaultPracticeSupplierId = filters.practiceSupplierId;
    }

    // Filter by product
    if (filters?.productId) {
      where.productId = filters.productId;
    }

    // Filter by item IDs
    if (filters?.itemIds && filters.itemIds.length > 0) {
      where.id = { in: filters.itemIds };
    }

    const items = await client.item.findMany({
      where,
      include: {
        product: true,
        defaultPracticeSupplier: {
          include: {
            globalSupplier: true,
          },
        },
        supplierItems: {
          select: {
            id: true,
            practiceSupplierId: true,
            unitPrice: true,
            currency: true,
            minOrderQty: true,
            supplierSku: true,
          },
        },
        inventory: {
          include: {
            location: true,
          },
          orderBy: { location: { name: 'asc' } },
        },
      },
      orderBy: options?.orderBy ?? { name: 'asc' },
      ...this.buildPagination(options?.pagination),
    });

    return items as any as ItemWithRelations[];
  }

  /**
   * Count items by practice with optional filters
   * Uses same filter logic as findItems for consistency
   */
  async countItems(
    practiceId: string,
    filters?: Partial<InventoryFilters>,
    options?: FindOptions
  ): Promise<number> {
    const client = this.getClient(options?.tx);

    const where: Prisma.ItemWhereInput = {
      ...this.scopeToPractice(practiceId),
    };

    // Apply search filter
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Filter by location (items with stock in that location)
    if (filters?.locationId) {
      where.inventory = {
        some: { locationId: filters.locationId },
      };
    }

    // Filter by practice supplier
    if (filters?.practiceSupplierId) {
      where.defaultPracticeSupplierId = filters.practiceSupplierId;
    }

    // Filter by product
    if (filters?.productId) {
      where.productId = filters.productId;
    }

    return client.item.count({ where });
  }

  /**
   * Find item by ID
   */
  async findItemById(
    itemId: string,
    practiceId: string,
    options?: FindOptions
  ): Promise<ItemWithRelations> {
    const client = this.getClient(options?.tx);

    const item = await client.item.findUnique({
      where: { id: itemId, practiceId },
      include: {
        product: true,
        defaultPracticeSupplier: {
          include: {
            globalSupplier: true,
          },
        },
        supplierItems: {
          select: {
            id: true,
            practiceSupplierId: true,
            unitPrice: true,
            currency: true,
            minOrderQty: true,
            supplierSku: true,
          },
        },
        inventory: {
          include: {
            location: true,
          },
        },
      },
    });

    return this.ensureExists(Promise.resolve(item as any), 'Item', itemId);
  }

  /**
   * Batch check if items exist by IDs (avoids N+1)
   * Returns array of found item IDs
   */
  async findItemIdsByIds(
    itemIds: string[],
    practiceId: string,
    options?: FindOptions
  ): Promise<string[]> {
    const client = this.getClient(options?.tx);

    if (itemIds.length === 0) {
      return [];
    }

    const items = await client.item.findMany({
      where: {
        id: { in: itemIds },
        practiceId,
      },
      select: {
        id: true,
      },
    });

    return items.map(item => item.id);
  }

  /**
   * Create new item
   */
  async createItem(
    input: CreateItemInput,
    options?: RepositoryOptions
  ): Promise<Item> {
    const client = this.getClient(options?.tx);

    const item = await client.item.create({
      data: {
        practiceId: input.practiceId,
        productId: input.productId,
        name: input.name,
        sku: input.sku ?? null,
        description: input.description ?? null,
        unit: input.unit ?? null,
        defaultPracticeSupplierId: input.defaultPracticeSupplierId ?? null,
      },
    });

    return item as Item;
  }

  /**
   * Update existing item
   */
  async updateItem(
    itemId: string,
    practiceId: string,
    input: UpdateItemInput,
    options?: RepositoryOptions
  ): Promise<Item> {
    const client = this.getClient(options?.tx);

    const item = await client.item.update({
      where: { id: itemId, practiceId },
      data: {
        name: input.name,
        sku: input.sku,
        description: input.description,
        unit: input.unit,
        defaultPracticeSupplierId: input.defaultPracticeSupplierId,
      },
    });

    return item as Item;
  }

  /**
   * Delete item
   */
  async deleteItem(
    itemId: string,
    practiceId: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.item.delete({
      where: { id: itemId, practiceId },
    });
  }

  /**
   * Get location inventory for an item at a specific location
   */
  async getLocationInventory(
    itemId: string,
    locationId: string,
    practiceId: string,
    options?: FindOptions
  ): Promise<LocationInventory | null> {
    const client = this.getClient(options?.tx);

    const inventory = await client.locationInventory.findUnique({
      where: {
        locationId_itemId: { locationId, itemId },
      },
      include: {
        location: true,
        item: true,
        ...(options?.include ?? {}),
      },
    });

    // Validate both location and item belong to practice
    if (inventory) {
      if ((inventory.location as any).practiceId !== practiceId || (inventory.item as any).practiceId !== practiceId) {
        return null; // Treat as not found for wrong practice
      }
    }

    return inventory as LocationInventory | null;
  }

  /**
   * Batch get location inventory for multiple items (avoids N+1)
   * Returns a Map keyed by itemId for efficient lookups
   */
  async getLocationInventoryBatch(
    itemIds: string[],
    locationId: string,
    practiceId: string,
    options?: FindOptions
  ): Promise<Map<string, LocationInventory>> {
    const client = this.getClient(options?.tx);

    if (itemIds.length === 0) {
      return new Map();
    }

    const inventories = await client.locationInventory.findMany({
      where: {
        locationId,
        itemId: { in: itemIds },
        item: { practiceId },
        location: { practiceId },
      },
      include: {
        location: true,
        item: true,
        ...(options?.include ?? {}),
      },
    });

    const map = new Map<string, LocationInventory>();
    for (const inventory of inventories) {
      map.set(inventory.itemId, inventory as LocationInventory);
    }

    return map;
  }

  /**
   * Upsert location inventory
   */
  async upsertLocationInventory(
    locationId: string,
    itemId: string,
    quantity: number,
    reorderPoint: number | null | undefined,
    reorderQuantity: number | null | undefined,
    practiceId: string,
    maxStock?: number | null,
    options?: RepositoryOptions
  ): Promise<LocationInventory> {
    const client = this.getClient(options?.tx);

    // Validate location ownership
    const location = await client.location.findUnique({
      where: { id: locationId, practiceId },
    });
    if (!location) {
      throw new Error(`Location not found or does not belong to practice`);
    }

    // Validate item ownership
    const item = await client.item.findUnique({
      where: { id: itemId, practiceId },
    });
    if (!item) {
      throw new Error(`Item not found or does not belong to practice`);
    }

    const inventory = await client.locationInventory.upsert({
      where: {
        locationId_itemId: { locationId, itemId },
      },
      create: {
        locationId,
        itemId,
        quantity,
        reorderPoint: reorderPoint ?? null,
        reorderQuantity: reorderQuantity ?? null,
        maxStock: maxStock ?? null,
      },
      update: {
        quantity,
        ...(reorderPoint !== undefined && { reorderPoint }),
        ...(reorderQuantity !== undefined && { reorderQuantity }),
        ...(maxStock !== undefined && { maxStock }),
      },
    });

    return inventory as LocationInventory;
  }

  /**
   * Adjust stock quantity
   */
  async adjustStock(
    locationId: string,
    itemId: string,
    adjustment: number,
    practiceId: string,
    options?: RepositoryOptions
  ): Promise<{ previousQuantity: number; newQuantity: number }> {
    const client = this.getClient(options?.tx);

    // Validate location ownership
    const location = await client.location.findUnique({
      where: { id: locationId, practiceId },
    });
    if (!location) {
      throw new Error(`Location not found or does not belong to practice`);
    }

    // Validate item ownership
    const item = await client.item.findUnique({
      where: { id: itemId, practiceId },
    });
    if (!item) {
      throw new Error(`Item not found or does not belong to practice`);
    }

    // Try atomic update first
    try {
      const updated = await client.locationInventory.update({
        where: {
          locationId_itemId: {
            locationId,
            itemId,
          },
        },
        data: {
          quantity: {
            increment: adjustment,
          },
        },
      });

      // Check for negative quantity after atomic increment
      if (updated.quantity < 0) {
        // Rollback by decrementing back
        await client.locationInventory.update({
          where: {
            locationId_itemId: {
              locationId,
              itemId,
            },
          },
          data: {
            quantity: {
              increment: -adjustment,
            },
          },
        });
        throw new Error('Cannot adjust stock to negative quantity');
      }

      return {
        previousQuantity: updated.quantity - adjustment,
        newQuantity: updated.quantity,
      };
    } catch (error: unknown) {
      // If record doesn't exist, create it
      if (
        (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') ||
        (error instanceof Error && error.message.includes('Record to update not found'))
      ) {
        const initialQuantity = adjustment;

        if (initialQuantity < 0) {
          throw new Error('Cannot adjust stock to negative quantity');
        }

        await client.locationInventory.create({
          data: {
            locationId,
            itemId,
            quantity: initialQuantity,
          },
        });

        return {
          previousQuantity: 0,
          newQuantity: initialQuantity,
        };
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Create stock adjustment record
   */
  async createStockAdjustment(
    practiceId: string,
    createdById: string,
    input: StockAdjustmentInput,
    options?: RepositoryOptions
  ): Promise<StockAdjustment> {
    const client = this.getClient(options?.tx);

    const adjustment = await client.stockAdjustment.create({
      data: {
        practiceId,
        itemId: input.itemId,
        locationId: input.locationId,
        quantity: input.quantity,
        reason: input.reason ?? null,
        note: input.note ?? null,
        createdById,
      },
    });

    return adjustment as StockAdjustment;
  }

  /**
   * Find stock adjustments for a practice
   */
  async findStockAdjustments(
    practiceId: string,
    filters?: {
      itemId?: string;
      locationId?: string;
      limit?: number;
    },
    options?: FindOptions
  ): Promise<StockAdjustment[]> {
    const client = this.getClient(options?.tx);

    const where: Prisma.StockAdjustmentWhereInput = {
      ...this.scopeToPractice(practiceId),
    };

    if (filters?.itemId) {
      where.itemId = filters.itemId;
    }

    if (filters?.locationId) {
      where.locationId = filters.locationId;
    }

    const adjustments = await client.stockAdjustment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 50,
      include: {
        item: {
          select: { id: true, name: true, sku: true },
        },
        location: {
          select: { id: true, name: true, code: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return adjustments as any;
  }

  /**
   * Create inventory transfer
   */
  async createInventoryTransfer(
    practiceId: string,
    createdById: string,
    input: InventoryTransferInput,
    options?: RepositoryOptions
  ): Promise<InventoryTransfer> {
    const client = this.getClient(options?.tx);

    const transfer = await client.inventoryTransfer.create({
      data: {
        practiceId,
        itemId: input.itemId,
        fromLocationId: input.fromLocationId,
        toLocationId: input.toLocationId,
        quantity: input.quantity,
        note: input.note ?? null,
        createdById,
      },
    });

    return transfer as InventoryTransfer;
  }

  /**
   * Find low stock items
   */
  async findLowStockItems(
    practiceId: string,
    options?: FindOptions
  ): Promise<LowStockInfo[]> {
    const client = this.getClient(options?.tx);

    // Find all inventory records where quantity < reorderPoint
    const lowStockInventory = await client.locationInventory.findMany({
      where: {
        item: {
          practiceId,
        },
        reorderPoint: {
          not: null,
        },
        quantity: {
          lt: client.locationInventory.fields.reorderPoint,
        },
      },
      include: {
        item: {
          select: { id: true, name: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
    });

    return lowStockInventory.map((inv) => {
      // Suggested order calculation:
      // 1. If maxStock is set, order enough to reach maxStock
      // 2. If maxStock is not set, use reorderQuantity if set
      // 3. If neither set, default to fill up to reorderPoint (or min 1)
      let suggestedOrderQuantity = 0;
      
      if (inv.maxStock) {
        suggestedOrderQuantity = Math.max(0, inv.maxStock - inv.quantity);
      } else if (inv.reorderQuantity) {
        suggestedOrderQuantity = inv.reorderQuantity;
      } else {
        // Default: order enough to reach reorderPoint if no other instruction
        // Or typically companies might want a Fixed Order Quantity (FOQ)
        // Here we'll assume simple replenishment to safety stock if no other info
        suggestedOrderQuantity = Math.max(0, inv.reorderPoint! - inv.quantity); 
        // But usually reorderQuantity defaults to reorderPoint in previous logic
        suggestedOrderQuantity = inv.reorderQuantity ?? inv.reorderPoint!; 
      }

      return {
        itemId: inv.itemId,
        itemName: inv.item.name,
        locationId: inv.locationId,
        locationName: inv.location.name,
        currentQuantity: inv.quantity,
        reorderPoint: inv.reorderPoint!,
        reorderQuantity: inv.reorderQuantity,
        maxStock: inv.maxStock,
        suggestedOrderQuantity,
      };
    });
  }

  /**
   * Get or create supplier item pricing
   */
  async upsertSupplierItem(
    practiceSupplierId: string,
    itemId: string,
    data: {
      supplierSku?: string | null;
      unitPrice?: number | null;
      currency?: string | null;
      minOrderQty?: number | null;
    },
    options?: RepositoryOptions
  ): Promise<SupplierItem> {
    const client = this.getClient(options?.tx);

    const supplierItem = await client.supplierItem.upsert({
      where: {
        practiceSupplierId_itemId: { practiceSupplierId, itemId },
      },
      create: {
        practiceSupplierId,
        itemId,
        supplierSku: data.supplierSku ?? null,
        unitPrice: data.unitPrice ?? null,
        currency: data.currency ?? 'EUR',
        minOrderQty: data.minOrderQty ?? 1,
      },
      update: {
        supplierSku: data.supplierSku,
        unitPrice: data.unitPrice,
        currency: data.currency,
        minOrderQty: data.minOrderQty,
      },
    });

    return supplierItem as SupplierItem;
  }

  /**
   * Find supplier item by practice supplier and item
   */
  async findSupplierItemByPracticeSupplier(
    itemId: string,
    practiceSupplierId: string,
    options?: FindOptions
  ): Promise<SupplierItem | null> {
    const client = this.getClient(options?.tx);

    const supplierItem = await client.supplierItem.findFirst({
      where: {
        itemId,
        practiceSupplierId,
      },
      include: options?.include ?? undefined,
    });

    return supplierItem as SupplierItem | null;
  }

  /**
   * Delete a specific supplier item
   */
  async deleteSupplierItem(
    supplierItemId: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.supplierItem.delete({
      where: { id: supplierItemId },
    });
  }

  /**
   * Delete all supplier items for an item
   */
  async deleteSupplierItemsForItem(
    itemId: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.supplierItem.deleteMany({
      where: { itemId },
    });
  }

  /**
   * Find supplier items
   */
  async findSupplierItems(
    practiceSupplierId: string,
    options?: FindOptions
  ): Promise<SupplierItem[]> {
    const client = this.getClient(options?.tx);

    const supplierItems = await client.supplierItem.findMany({
      where: { practiceSupplierId },
      include: options?.include ?? undefined,
    });

    return supplierItems as SupplierItem[];
  }

  /**
   * Count items by product ID
   */
  async countItemsByProductId(
    productId: string,
    options?: RepositoryOptions
  ): Promise<number> {
    const client = this.getClient(options?.tx);

    return client.item.count({
      where: { productId },
    });
  }

  /**
   * Find item by product GTIN (for barcode scanning)
   * Bypasses pagination to ensure reliable lookup
   */
  async findItemByProductGtin(
    gtin: string,
    practiceId: string,
    options?: FindOptions
  ): Promise<ItemWithRelations | null> {
    const client = this.getClient(options?.tx);

    const item = await client.item.findFirst({
      where: {
        practiceId,
        product: {
          gtin,
        },
      },
      include: {
        product: true,
        defaultPracticeSupplier: {
          include: {
            globalSupplier: true,
          },
        },
        supplierItems: {
          select: {
            id: true,
            practiceSupplierId: true,
            unitPrice: true,
            currency: true,
            minOrderQty: true,
            supplierSku: true,
          },
        },
        inventory: {
          include: {
            location: true,
          },
        },
      },
    });

    return item as ItemWithRelations | null;
  }
}

