/**
 * Database Constraint Error Handler
 * Maps Prisma constraint violation errors to user-friendly messages
 */

import { Prisma } from '@prisma/client';
import { ValidationError, BusinessRuleViolationError } from '@/src/domain/errors';

/**
 * Extract constraint name from Prisma error
 */
function getConstraintName(error: Prisma.PrismaClientKnownRequestError): string | null {
  // Prisma includes constraint name in error metadata
  if (error.meta && typeof error.meta === 'object' && 'constraint' in error.meta) {
    return error.meta.constraint as string;
  }
  
  // Try to extract from error message as fallback
  const match = error.message.match(/constraint [`"']([^`"']+)[`"']/i);
  return match ? match[1] : null;
}

/**
 * Map constraint names to user-friendly error messages
 */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  // Negative inventory prevention
  'check_quantity_non_negative': 'Inventory quantity cannot be negative',
  
  // Positive quantity enforcement
  'check_quantity_positive': 'Quantity must be greater than zero',
  'check_quantity_not_zero': 'Quantity cannot be zero',
  
  // Same-location transfer prevention
  'check_different_locations': 'Cannot transfer inventory to the same location',
  
  // Status-dependent fields
  'check_sent_has_sentAt': 'Order status inconsistency: SENT orders must have a sent date',
  'check_received_has_receivedAt': 'Order status inconsistency: RECEIVED orders must have a received date',
  'check_partially_received_has_receivedAt': 'Order status inconsistency: partially received orders must have a received date',
  'check_confirmed_has_receivedAt': 'Receipt status inconsistency: CONFIRMED receipts must have a received date',
  
  // Reorder settings validation
  'check_reorder_point_non_negative': 'Reorder point must be zero or greater',
  'check_reorder_quantity_positive': 'Reorder quantity must be greater than zero',
  
  // Price validation
  'check_unitPrice_non_negative': 'Price cannot be negative',
  
  // Min order quantity validation
  'check_minOrderQty_positive': 'Minimum order quantity must be greater than zero',
  
  // Unique constraints
  'GlobalSupplier_name_key': 'A global supplier with this name already exists',
  'Supplier_practiceId_name_key': 'A supplier with this name already exists in your practice',
  'Product_gtin_key': 'A product with this GTIN already exists',
  'PracticeSupplier_practiceId_globalSupplierId_key': 'This supplier is already linked to your practice',
  'OrderItem_orderId_itemId_key': 'This item is already in the order',
  'SupplierItem_supplierId_itemId_key': 'This supplier-item relationship already exists',
  'SupplierCatalog_supplierId_productId_key': 'This supplier already offers this product',
  'OrderTemplateItem_templateId_itemId_key': 'This item is already in the template',
  
  // Foreign key constraints (onDelete: Restrict)
  'Location_items_fkey': 'Cannot delete location that has inventory items',
  'Location_goodsReceipts_fkey': 'Cannot delete location that has goods receipts',
  'Location_stockCountSessions_fkey': 'Cannot delete location that has stock count sessions',
  'Product_items_fkey': 'Cannot delete product that is used by inventory items',
  'InventoryTransfer_fromLocationId_fkey': 'Cannot delete location that has transfer history',
  'InventoryTransfer_toLocationId_fkey': 'Cannot delete location that has transfer history',
};

/**
 * Handle Prisma constraint violation errors
 * Converts database constraint errors to user-friendly validation errors
 * 
 * @param error - The error to handle
 * @throws ValidationError or BusinessRuleViolationError with user-friendly message
 * @throws Original error if not a constraint violation
 */
export function handleConstraintError(error: unknown): never {
  // Check if it's a Prisma known request error (constraint violations are P2002, P2003, P2025)
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const constraintName = getConstraintName(error);
    
    // P2002: Unique constraint violation
    if (error.code === 'P2002') {
      const message = constraintName && CONSTRAINT_MESSAGES[constraintName]
        ? CONSTRAINT_MESSAGES[constraintName]
        : 'A record with this value already exists';
      throw new BusinessRuleViolationError(message);
    }
    
    // P2003: Foreign key constraint violation
    if (error.code === 'P2003') {
      const message = constraintName && CONSTRAINT_MESSAGES[constraintName]
        ? CONSTRAINT_MESSAGES[constraintName]
        : 'Cannot perform this action due to related records';
      throw new BusinessRuleViolationError(message);
    }
    
    // P2004: CHECK constraint violation
    if (error.code === 'P2004') {
      const message = constraintName && CONSTRAINT_MESSAGES[constraintName]
        ? CONSTRAINT_MESSAGES[constraintName]
        : 'The provided value violates a database constraint';
      throw new ValidationError(message);
    }
    
    // P2025: Record not found
    if (error.code === 'P2025') {
      throw new ValidationError('The requested record was not found');
    }
  }
  
  // Not a constraint error, rethrow original
  throw error;
}

/**
 * Wrap a function with constraint error handling
 * Useful for wrapping repository methods
 * 
 * @example
 * const result = await withConstraintErrorHandling(() => 
 *   repository.createItem(data)
 * );
 */
export async function withConstraintErrorHandling<T>(
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    handleConstraintError(error);
  }
}

/**
 * Check if an error is a specific constraint violation
 * Useful for custom error handling
 * 
 * @example
 * if (isConstraintError(error, 'check_quantity_positive')) {
 *   // Handle specifically
 * }
 */
export function isConstraintError(
  error: unknown,
  constraintName: string
): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }
  
  const name = getConstraintName(error);
  return name === constraintName;
}

/**
 * Get the constraint name from an error
 * Returns null if not a constraint error
 */
export function getErrorConstraintName(error: unknown): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }
  
  return getConstraintName(error);
}

