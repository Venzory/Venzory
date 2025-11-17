/**
 * Low-stock action utilities for the dashboard
 */

/**
 * Build order creation href for a low-stock item
 * Preselects supplier when defaultPracticeSupplierId is available
 * Null-safe: returns fallback "/orders/new" when data is missing
 */
export function buildLowStockOrderHref(item?: {
  id?: string;
  defaultPracticeSupplierId?: string | null;
} | null): string {
  if (!item || !item.defaultPracticeSupplierId) {
    return '/orders/new';
  }

  return `/orders/new?supplierId=${encodeURIComponent(item.defaultPracticeSupplierId)}`;
}

