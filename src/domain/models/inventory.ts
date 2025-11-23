/**
 * Inventory domain models
 * These models represent the business entities for inventory management
 */

import type { BaseEntity, Location } from './common';
import type { Product } from './products';
import type { PracticeSupplier, PracticeSupplierWithRelations } from './suppliers';

/**
 * Item - Practice-specific view of a Product
 */
export interface Item extends BaseEntity {
  practiceId: string;
  productId: string;
  supplierItemId?: string | null; // Link to Global Supplier Item
  defaultPracticeSupplierId: string | null;
  name: string;
  sku: string | null;
  description: string | null;
  unit: string | null;
}

/**
 * Item with related entities for display
 */
export interface ItemWithRelations extends Item {
  product?: Product;
  defaultPracticeSupplier?: PracticeSupplierWithRelations | null;
  inventory?: LocationInventory[];
  practiceSupplierItems?: PracticeSupplierItem[];
}

/**
 * Location inventory tracking
 */
export interface LocationInventory {
  locationId: string;
  itemId: string;
  quantity: number;
  reorderPoint: number | null;
  reorderQuantity: number | null;
  maxStock: number | null;
  createdAt: Date;
  updatedAt: Date;
  location?: Location;
  item?: Item;
}

/**
 * Stock adjustment record
 */
export interface StockAdjustment extends BaseEntity {
  itemId: string;
  locationId: string;
  practiceId: string;
  quantity: number;
  reason: string | null;
  note: string | null;
  createdById: string;
  createdAt: Date;
  // Optional relations
  item?: { id: string; name: string; sku: string | null };
  location?: { id: string; name: string; code: string | null };
  createdBy?: { id: string; name: string | null; email: string };
}

/**
 * Inventory transfer between locations
 */
export interface InventoryTransfer extends BaseEntity {
  practiceId: string;
  itemId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  note: string | null;
  createdById: string;
  createdAt: Date;
}

/**
 * Practice Supplier item pricing and details (formerly SupplierItem)
 */
export interface PracticeSupplierItem extends BaseEntity {
  practiceSupplierId: string;
  itemId: string;
  supplierSku: string | null;
  unitPrice: number | null;
  currency: string | null;
  minOrderQty: number | null;
}

export interface UpsertPracticeSupplierItemInput {
  supplierSku?: string | null;
  unitPrice?: number | null;
  currency?: string | null;
  minOrderQty?: number | null;
  practiceSupplierId?: string;
}

/**
 * Input type for creating an item
 */
export interface CreateItemInput {
  practiceId: string;
  productId: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  unit?: string | null;
  defaultPracticeSupplierId?: string | null;
  supplierItemId?: string | null;
}

/**
 * Input type for updating an item
 */
export interface UpdateItemInput {
  name?: string;
  sku?: string | null;
  description?: string | null;
  unit?: string | null;
  defaultPracticeSupplierId?: string | null;
}

/**
 * Input type for stock adjustment
 */
export interface StockAdjustmentInput {
  itemId: string;
  locationId: string;
  quantity: number;
  reason?: string | null;
  note?: string | null;
}

/**
 * Input type for inventory transfer
 */
export interface InventoryTransferInput {
  itemId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  note?: string | null;
}

/**
 * Inventory query filters
 */
export interface InventoryFilters {
  practiceId: string;
  search?: string;
  locationId?: string;
  practiceSupplierId?: string;
  productId?: string;
  lowStockOnly?: boolean;
  itemIds?: string[];
}

/**
 * Low stock information
 */
export interface LowStockInfo {
  itemId: string;
  itemName: string;
  locationId: string;
  locationName: string;
  currentQuantity: number;
  reorderPoint: number;
  reorderQuantity: number | null;
  maxStock: number | null;
  suggestedOrderQuantity: number;
}

