/**
 * Shared Prisma Decimal transformation utilities
 * 
 * Centralizes Decimal → number conversions to eliminate duplication
 * across pages, components, and services.
 */

import type { Decimal } from '@prisma/client/runtime/library';

/**
 * Convert Prisma Decimal to number or null
 * 
 * @param value - Prisma Decimal value (can be null or undefined)
 * @returns number if value exists, null otherwise
 */
export function decimalToNumber(value: Decimal | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return parseFloat(value.toString());
}

/**
 * Helper type for entities with a Decimal unitPrice field
 * Used to constrain transform functions while remaining flexible
 */
export type WithDecimalUnitPrice = {
  unitPrice: Decimal | null | undefined;
};

/**
 * Transform a SupplierItem for client consumption
 * Converts Decimal unitPrice to number
 * 
 * @param supplierItem - Raw SupplierItem from Prisma
 * @returns Transformed object with unitPrice as number
 */
export function transformSupplierItemForClient<T extends WithDecimalUnitPrice>(
  supplierItem: T,
): Omit<T, 'unitPrice'> & { unitPrice: number | null } {
  return {
    ...supplierItem,
    unitPrice: decimalToNumber(supplierItem.unitPrice),
  };
}

/**
 * Transform an OrderItem for client consumption
 * Converts Decimal unitPrice to number
 * 
 * @param orderItem - Raw OrderItem from Prisma
 * @returns Transformed object with unitPrice as number
 */
export function transformOrderItemForClient<T extends WithDecimalUnitPrice>(
  orderItem: T,
): Omit<T, 'unitPrice'> & { unitPrice: number | null } {
  return {
    ...orderItem,
    unitPrice: decimalToNumber(orderItem.unitPrice),
  };
}

/**
 * Transform a SupplierCatalog entry for client consumption
 * Converts Decimal unitPrice to number
 * 
 * @param catalogEntry - Raw SupplierCatalog from Prisma
 * @returns Transformed object with unitPrice as number
 */
export function transformSupplierCatalogForClient<T extends WithDecimalUnitPrice>(
  catalogEntry: T,
): Omit<T, 'unitPrice'> & { unitPrice: number | null } {
  return {
    ...catalogEntry,
    unitPrice: decimalToNumber(catalogEntry.unitPrice),
  };
}

/**
 * Calculate order total from items with Decimal or number unitPrice
 * 
 * @param items - Array of order items with unitPrice (Decimal or number) and quantity
 * @returns Total amount as number
 */
export function calculateOrderTotal(items: Array<{ unitPrice: Decimal | number | null | undefined; quantity: number }>): number {
  return items.reduce((sum, item) => {
    const price = typeof item.unitPrice === 'number' 
      ? item.unitPrice 
      : (decimalToNumber(item.unitPrice) || 0);
    return sum + price * item.quantity;
  }, 0);
}

