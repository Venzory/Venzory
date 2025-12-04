/**
 * Utility functions for displaying order information on the dashboard
 */

/**
 * Get supplier display information from an order
 * Uses PracticeSupplier with fallback to "Unknown Supplier"
 */
export function getOrderSupplierDisplay(order: {
  practiceSupplier?: {
    id: string;
    customLabel?: string | null;
    globalSupplier?: {
      name: string;
    } | null;
  } | null;
}): {
  name: string;
  linkId: string;
} {
  const supplierName = 
    order.practiceSupplier?.customLabel || 
    order.practiceSupplier?.globalSupplier?.name || 
    'Unknown Supplier';
  
  const supplierLinkId = order.practiceSupplier?.id || '';

  return {
    name: supplierName,
    linkId: supplierLinkId,
  };
}

