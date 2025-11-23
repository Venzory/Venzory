/**
 * Item Service
 * Business logic for item management (create, update, supplier linking)
 * Separated from InventoryService to focus on Item entity operations
 */

import { InventoryRepository } from '@/src/repositories/inventory';
import { ProductRepository } from '@/src/repositories/products';
import { PracticeSupplierRepository } from '@/src/repositories/suppliers';
import { AuditService } from '../audit/audit-service';
import type { RequestContext } from '@/src/lib/context/request-context';
import { requireRole } from '@/src/lib/context/context-builder';
import { withTransaction, type TransactionClient } from '@/src/repositories/base';
import {
  CreateItemInput,
  UpdateItemInput,
  ItemWithRelations,
} from '@/src/domain/models';
import {
  ValidationError,
  BusinessRuleViolationError,
  NotFoundError,
} from '@/src/domain/errors';
import {
  validateStringLength,
  validatePrice,
} from '@/src/domain/validators';

/**
 * Extended input for creating items with supplier and pricing information
 */
export interface CreateItemWithSupplierInput extends Omit<CreateItemInput, 'practiceId'> {
  // Optional pricing fields for the default supplier
  supplierSku?: string | null;
  unitPrice?: number | null;
  currency?: string | null;
  minOrderQty?: number | null;
}

/**
 * Extended input for updating items with supplier changes
 */
export interface UpdateItemWithSupplierInput extends UpdateItemInput {
  // Optional pricing fields for updating default supplier pricing
  supplierSku?: string | null;
  unitPrice?: number | null;
  currency?: string | null;
  minOrderQty?: number | null;
}

/**
 * Input for attaching a supplier to an item
 */
export interface AttachSupplierInput {
  practiceSupplierId: string;
  supplierSku?: string | null;
  unitPrice?: number | null;
  currency?: string | null;
  minOrderQty?: number | null;
  setAsDefault?: boolean; // Whether to also set as item's default supplier
}

export class ItemService {
  constructor(
    private inventoryRepository: InventoryRepository,
    private productRepository: ProductRepository,
    private practiceSupplierRepository: PracticeSupplierRepository,
    private auditService: AuditService
  ) {}

  /**
   * Create new item with optional supplier and pricing
   */
  async createItem(
    ctx: RequestContext,
    input: CreateItemWithSupplierInput
  ): Promise<ItemWithRelations> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    // Validate input
    validateStringLength(input.name, 'Item name', 1, 255);
    if (input.sku) {
      validateStringLength(input.sku, 'SKU', 1, 64);
    }
    if (input.unitPrice !== undefined && input.unitPrice !== null) {
      validatePrice(input.unitPrice);
    }

    // Verify product exists
    await this.productRepository.findProductById(input.productId);

    return withTransaction(async (tx) => {
      const defaultPracticeSupplierId = input.defaultPracticeSupplierId ?? null;

      // If defaultPracticeSupplierId is provided, validate it
      if (defaultPracticeSupplierId) {
        const practiceSupplier = await this.practiceSupplierRepository.findPracticeSupplierById(
          defaultPracticeSupplierId,
          ctx.practiceId,
          { tx }
        );

        if (practiceSupplier.isBlocked) {
          throw new BusinessRuleViolationError('Cannot create item with blocked supplier');
        }
      }

      // Create item
      const item = await this.inventoryRepository.createItem(
        {
          practiceId: ctx.practiceId,
          productId: input.productId,
          name: input.name,
          sku: input.sku ?? null,
          description: input.description ?? null,
          unit: input.unit ?? null,
          defaultPracticeSupplierId,
        },
        { tx }
      );

      // If supplier is provided, create/update SupplierItem with pricing
      if (defaultPracticeSupplierId) {
        await this.inventoryRepository.upsertSupplierItem(
          defaultPracticeSupplierId,
          item.id,
          {
            supplierSku: input.supplierSku ?? null,
            unitPrice: input.unitPrice ?? null,
            currency: input.currency ?? 'EUR',
            minOrderQty: input.minOrderQty ?? 1,
          },
          { tx }
        );
      }

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
   * Add item from catalog (Phase 2: Catalog management)
   * Creates an Item from a Product that exists in the global SupplierItem
   */
  async addItemFromCatalog(
    ctx: RequestContext,
    input: {
      productId: string;
      globalSupplierId: string;
      name: string;
      sku?: string | null;
      unit?: string | null;
      description?: string | null;
    }
  ): Promise<ItemWithRelations> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    // Validate input
    validateStringLength(input.name, 'Item name', 1, 255);
    if (input.sku) {
      validateStringLength(input.sku, 'SKU', 1, 64);
    }

    return withTransaction(async (tx) => {
      // Verify product exists
      await this.productRepository.findProductById(input.productId, { tx });

      // Verify the product is available from this global supplier
      const catalogEntry = await this.productRepository.findSupplierCatalog(
        input.globalSupplierId,
        input.productId,
        { tx }
      );

      if (!catalogEntry) {
        throw new BusinessRuleViolationError(
          'This product is not available from the selected supplier'
        );
      }

      // Find if we have a practice supplier linked to this global supplier
      const practiceSupplier = await tx.practiceSupplier.findUnique({
        where: {
          practiceId_globalSupplierId: {
            practiceId: ctx.practiceId,
            globalSupplierId: input.globalSupplierId
          }
        }
      });

      if (!practiceSupplier) {
         throw new BusinessRuleViolationError(
           'You are not linked to this supplier'
         );
      }

      if (practiceSupplier.isBlocked) {
         throw new BusinessRuleViolationError(
           'Cannot add items from a blocked supplier'
         );
      }

      // Check if item already exists for this product in the practice
      const existingItems = await this.inventoryRepository.findItems(
        ctx.practiceId,
        { productId: input.productId },
        { tx }
      );

      if (existingItems.length > 0) {
        throw new BusinessRuleViolationError(
          'An item for this product already exists in My Items'
        );
      }

      // Create item
      const item = await this.inventoryRepository.createItem(
        {
          practiceId: ctx.practiceId,
          productId: input.productId,
          name: input.name,
          sku: input.sku ?? null,
          unit: input.unit ?? null,
          description: input.description ?? null,
          defaultPracticeSupplierId: practiceSupplier.id,
          supplierItemId: catalogEntry.id // Link to global supplier item
        },
        { tx }
      );

      // Create PracticeSupplierItem with pricing from catalog (snapshot)
      await this.inventoryRepository.upsertSupplierItem(
        practiceSupplier.id,
        item.id,
        {
          supplierSku: catalogEntry.supplierSku ?? null,
          unitPrice: catalogEntry.unitPrice ? Number(catalogEntry.unitPrice) : null,
          currency: catalogEntry.currency ?? 'EUR',
          minOrderQty: catalogEntry.minOrderQty ?? 1,
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
   * Update existing item with optional supplier changes
   */
  async updateItem(
    ctx: RequestContext,
    itemId: string,
    input: UpdateItemWithSupplierInput
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
    if (input.unitPrice !== undefined && input.unitPrice !== null) {
      validatePrice(input.unitPrice);
    }

    return withTransaction(async (tx) => {
      // Verify item exists
      const existingItem = await this.inventoryRepository.findItemById(
        itemId,
        ctx.practiceId,
        { tx }
      );

      const defaultPracticeSupplierId = input.defaultPracticeSupplierId;

      // Handle supplier changes
      if (defaultPracticeSupplierId !== undefined && defaultPracticeSupplierId !== null) {
        // Supplier is being set or changed
        const practiceSupplier = await this.practiceSupplierRepository.findPracticeSupplierById(
          defaultPracticeSupplierId,
          ctx.practiceId,
          { tx }
        );

        if (practiceSupplier.isBlocked) {
          throw new BusinessRuleViolationError('Cannot set blocked supplier as default');
        }

        // Create or update SupplierItem for the new default supplier
        await this.inventoryRepository.upsertSupplierItem(
          defaultPracticeSupplierId,
          itemId,
          {
            supplierSku: input.supplierSku ?? null,
            unitPrice: input.unitPrice ?? null,
            currency: input.currency ?? 'EUR',
            minOrderQty: input.minOrderQty ?? 1,
          },
          { tx }
        );
      }

      // Update item
      const item = await this.inventoryRepository.updateItem(
        itemId,
        ctx.practiceId,
        {
          name: input.name,
          sku: input.sku,
          description: input.description,
          unit: input.unit,
          defaultPracticeSupplierId,
        },
        { tx }
      );

      // Log audit event
      await this.auditService.logItemUpdated(ctx, itemId, input, tx);

      // Return updated item with relations
      return this.inventoryRepository.findItemById(item.id, ctx.practiceId, { tx });
    });
  }

  /**
   * Attach a supplier to an item with optional pricing
   */
  async attachSupplierToItem(
    ctx: RequestContext,
    itemId: string,
    input: AttachSupplierInput
  ): Promise<ItemWithRelations> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    // Validate pricing if provided
    if (input.unitPrice !== undefined && input.unitPrice !== null) {
      validatePrice(input.unitPrice);
    }

    return withTransaction(async (tx) => {
      // Verify item exists
      const item = await this.inventoryRepository.findItemById(
        itemId,
        ctx.practiceId,
        { tx }
      );

      // Verify practice supplier exists and is not blocked
      const practiceSupplier = await this.practiceSupplierRepository.findPracticeSupplierById(
        input.practiceSupplierId,
        ctx.practiceId,
        { tx }
      );

      if (practiceSupplier.isBlocked) {
        throw new BusinessRuleViolationError('Cannot attach blocked supplier to item');
      }

      // Create or update SupplierItem
      await this.inventoryRepository.upsertSupplierItem(
        input.practiceSupplierId,
        itemId,
        {
          supplierSku: input.supplierSku ?? null,
          unitPrice: input.unitPrice ?? null,
          currency: input.currency ?? 'EUR',
          minOrderQty: input.minOrderQty ?? 1,
        },
        { tx }
      );

      // Optionally set as default supplier
      if (input.setAsDefault) {
        await this.inventoryRepository.updateItem(
          itemId,
          ctx.practiceId,
          {
            defaultPracticeSupplierId: input.practiceSupplierId,
          },
          { tx }
        );
      }

      // Return updated item with relations
      return this.inventoryRepository.findItemById(itemId, ctx.practiceId, { tx });
    });
  }

  /**
   * Detach a supplier from an item
   */
  async detachSupplierFromItem(
    ctx: RequestContext,
    itemId: string,
    practiceSupplierId: string
  ): Promise<ItemWithRelations> {
    // Check permissions
    requireRole(ctx, 'STAFF');

    return withTransaction(async (tx) => {
      // Verify item exists
      const item = await this.inventoryRepository.findItemById(
        itemId,
        ctx.practiceId,
        { tx }
      );

      // Find and delete the PracticeSupplierItem
      const supplierItem = await tx.practiceSupplierItem.findUnique({
        where: {
          practiceSupplierId_itemId: {
            practiceSupplierId,
            itemId,
          },
        },
      });

      if (supplierItem) {
        await tx.practiceSupplierItem.delete({
          where: {
            practiceSupplierId_itemId: {
              practiceSupplierId,
              itemId,
            },
          },
        });
      }

      // If this was the default supplier, clear it
      if (item.defaultPracticeSupplierId === practiceSupplierId) {
        await this.inventoryRepository.updateItem(
          itemId,
          ctx.practiceId,
          {
            defaultPracticeSupplierId: null,
          },
          { tx }
        );
      }

      // Return updated item with relations
      return this.inventoryRepository.findItemById(itemId, ctx.practiceId, { tx });
    });
  }
}

// Singleton instance
let itemServiceInstance: ItemService | null = null;

export function getItemService(): ItemService {
  if (!itemServiceInstance) {
    // Dynamic imports to avoid circular dependencies
    // These are lazy-loaded only when the service is first accessed
    const { getAuditService } = require('@/src/services/audit/audit-service') as typeof import('@/src/services/audit/audit-service');
    const { getPracticeSupplierRepository } = require('@/src/repositories/suppliers') as typeof import('@/src/repositories/suppliers');
    itemServiceInstance = new ItemService(
      new InventoryRepository(),
      new ProductRepository(),
      getPracticeSupplierRepository(),
      getAuditService()
    );
  }
  return itemServiceInstance;
}

