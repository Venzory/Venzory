/**
 * Receiving domain models
 * These models represent the business entities for goods receiving
 */

import type { BaseEntity, Location } from './common';
import type { Item } from './inventory';
import type { Order } from './orders';
import type { PracticeSupplierWithRelations } from './suppliers';

export type GoodsReceiptStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

/**
 * Goods receipt - record of received goods
 */
export interface GoodsReceipt extends BaseEntity {
  practiceId: string;
  locationId: string;
  orderId: string | null;
  practiceSupplierId: string | null;
  status: GoodsReceiptStatus;
  createdById: string | null;
  receivedAt: Date | null;
  notes: string | null;
}

/**
 * Goods receipt with related entities
 */
export interface GoodsReceiptWithRelations extends GoodsReceipt {
  location?: Location;
  order?: Order | null;
  practiceSupplier?: PracticeSupplierWithRelations | null;
  lines?: GoodsReceiptLine[];
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

/**
 * Goods receipt line - individual item received
 */
export interface GoodsReceiptLine {
  id: string;
  receiptId: string;
  itemId: string;
  quantity: number;
  batchNumber: string | null;
  expiryDate: Date | null;
  notes: string | null;
  scannedGtin: string | null;
  skipped: boolean;
  createdAt: Date;
  item?: Item;
  receipt?: GoodsReceipt;
}

/**
 * Input type for creating a goods receipt
 */
export interface CreateGoodsReceiptInput {
  practiceId: string;
  locationId: string;
  orderId?: string | null;
  practiceSupplierId?: string | null;
  notes?: string | null;
}

/**
 * Input type for adding a line to a goods receipt
 */
export interface AddGoodsReceiptLineInput {
  itemId: string;
  quantity: number;
  batchNumber?: string | null;
  expiryDate?: Date | null;
  notes?: string | null;
  scannedGtin?: string | null;
  skipped?: boolean;
}

/**
 * Input type for updating a goods receipt line
 */
export interface UpdateGoodsReceiptLineInput {
  quantity?: number;
  batchNumber?: string | null;
  expiryDate?: Date | null;
  notes?: string | null;
}

/**
 * Goods receipt query filters
 */
export interface GoodsReceiptFilters {
  practiceId: string;
  locationId?: string;
  orderId?: string;
  practiceSupplierId?: string;
  status?: GoodsReceiptStatus;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Goods receipt summary for display
 */
export interface GoodsReceiptSummary {
  id: string;
  locationName: string;
  supplierName: string | null;
  status: GoodsReceiptStatus;
  lineCount: number;
  totalQuantity: number;
  createdAt: Date;
  receivedAt: Date | null;
}

/**
 * Result of confirming a goods receipt
 */
export interface ConfirmGoodsReceiptResult {
  receiptId: string;
  linesProcessed: number;
  inventoryUpdated: boolean;
  lowStockNotifications: string[];
  orderId?: string | null;
}

