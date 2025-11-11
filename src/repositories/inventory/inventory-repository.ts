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

    // Filter by supplier
    if (filters?.supplierId) {
      where.defaultSupplierId = filters.supplierId;
    }

    // Filter by practice supplier (Phase 2)
    if (filters?.practiceSupplierId) {
      where.defaultPracticeSupplierId = filters.practiceSupplierId;
    }

    // Filter by product (Phase 2: Catalog management)
    if (filters?.productId) {
      where.productId = filters.productId;
    }

    const items = await client.item.findMany({
      where,
      include: {
        product: true,
        defaultSupplier: {
          select: { id: true, name: true, email: true, phone: true },
        },
        defaultPracticeSupplier: {
          include: {
            globalSupplier: true,
          },
        },
        supplierItems: {
          select: {
            id: true,
            supplierId: true,
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
        defaultSupplier: true,
        defaultPracticeSupplier: {
          include: {
            globalSupplier: true,
          },
        },
        supplierItems: {
          select: {
            id: true,
            supplierId: true,
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
        defaultSupplierId: input.defaultSupplierId ?? null,
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
        defaultSupplierId: input.defaultSupplierId,
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
    options?: FindOptions
  ): Promise<LocationInventory | null> {
    const client = this.getClient(options?.tx);

    const inventory = await client.locationInventory.findUnique({
      where: {
        locationId_itemId: { locationId, itemId },
      },
      include: options?.include ?? undefined,
    });

    return inventory as LocationInventory | null;
  }

  /**
   * Upsert location inventory
   */
  async upsertLocationInventory(
    locationId: string,
    itemId: string,
    quantity: number,
    reorderPoint?: number | null,
    reorderQuantity?: number | null,
    options?: RepositoryOptions
  ): Promise<LocationInventory> {
    const client = this.getClient(options?.tx);

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
      },
      update: {
        quantity,
        ...(reorderPoint !== undefined && { reorderPoint }),
        ...(reorderQuantity !== undefined && { reorderQuantity }),
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
    options?: RepositoryOptions
  ): Promise<{ previousQuantity: number; newQuantity: number }> {
    const client = this.getClient(options?.tx);

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
    } catch (error: any) {
      // If record doesn't exist, create it
      if (error.code === 'P2025' || error.message?.includes('Record to update not found')) {
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

    return lowStockInventory.map((inv) => ({
      itemId: inv.itemId,
      itemName: inv.item.name,
      locationId: inv.locationId,
      locationName: inv.location.name,
      currentQuantity: inv.quantity,
      reorderPoint: inv.reorderPoint!,
      reorderQuantity: inv.reorderQuantity,
      suggestedOrderQuantity: inv.reorderQuantity ?? inv.reorderPoint!,
    }));
  }

  /**
   * Get or create supplier item pricing
   */
  async upsertSupplierItem(
    supplierId: string,
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
        supplierId_itemId: { supplierId, itemId },
      },
      create: {
        supplierId,
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
   * Find supplier items
   */
  async findSupplierItems(
    supplierId: string,
    options?: FindOptions
  ): Promise<SupplierItem[]> {
    const client = this.getClient(options?.tx);

    const supplierItems = await client.supplierItem.findMany({
      where: { supplierId },
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
}

