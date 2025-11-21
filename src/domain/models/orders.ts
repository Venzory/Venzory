/**
 * Orders domain models
 * These models represent the business entities for order management
 */

import type { BaseEntity } from './common';
import type { Item } from './inventory';
import type { PracticeSupplierWithRelations } from './suppliers';

export type OrderStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

/**
 * Order - Purchase order to a supplier
 */
export interface Order extends BaseEntity {
  practiceId: string;
  practiceSupplierId: string | null;
  status: OrderStatus;
  createdById: string | null;
  reference: string | null;
  notes: string | null;
  sentAt: Date | null;
  expectedAt: Date | null;
  receivedAt: Date | null;
}

/**
 * Order with related entities
 */
export interface OrderWithRelations extends Order {
  practiceSupplier?: PracticeSupplierWithRelations;
  items?: OrderItem[];
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
  };
  practice?: {
    id: string;
    name: string;
    street: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
  };
}

/**
 * Order item - line item in an order
 */
export interface OrderItem {
  id: string;
  orderId: string;
  itemId: string;
  quantity: number;
  unitPrice: number | null;
  notes: string | null;
  item?: Item;
}

/**
 * Order template for recurring orders
 */
export interface OrderTemplate extends BaseEntity {
  practiceId: string;
  name: string;
  description: string | null;
  createdById: string | null;
}

/**
 * Order template item
 */
export interface OrderTemplateItem {
  id: string;
  templateId: string;
  itemId: string;
  defaultQuantity: number;
  practiceSupplierId: string | null;
  createdAt: Date;
  item?: Item;
  practiceSupplier?: PracticeSupplierWithRelations | null;
}

/**
 * Input type for creating an order
 */
export interface CreateOrderInput {
  practiceId: string;
  practiceSupplierId: string;
  reference?: string | null;
  notes?: string | null;
  expectedAt?: Date | null;
  items: CreateOrderItemInput[];
}

/**
 * Input type for creating an order item
 */
export interface CreateOrderItemInput {
  itemId: string;
  quantity: number;
  unitPrice?: number | null;
  notes?: string | null;
}

/**
 * Input type for updating an order
 */
export interface UpdateOrderInput {
  reference?: string | null;
  notes?: string | null;
  expectedAt?: Date | null;
}

/**
 * Input type for updating an order item
 */
export interface UpdateOrderItemInput {
  quantity: number;
  unitPrice?: number | null;
  notes?: string | null;
}

/**
 * Input type for adding an item to an order
 */
export interface AddOrderItemInput {
  itemId: string;
  quantity: number;
  unitPrice?: number | null;
}

/**
 * Order query filters
 */
export interface OrderFilters {
  practiceId: string;
  practiceSupplierId?: string;
  status?: OrderStatus | OrderStatus[];
  createdById?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Order summary for display
 */
export interface OrderSummary {
  id: string;
  reference: string | null;
  supplierName: string;
  status: OrderStatus;
  itemCount: number;
  totalAmount: number;
  createdAt: Date;
  sentAt: Date | null;
}

