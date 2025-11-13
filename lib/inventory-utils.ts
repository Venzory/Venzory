/**
 * Shared inventory calculation utilities
 * Centralizes low-stock calculations used across multiple pages
 */

export interface InventoryLocation {
  locationId?: string;
  quantity: number;
  reorderPoint: number | null;
  reorderQuantity: number | null;
  location?: {
    id: string;
    name: string;
    code?: string | null;
  };
}

export interface ItemWithInventory {
  id: string;
  name: string;
  inventory?: InventoryLocation[] | null;
}

export interface ItemStockInfo {
  totalStock: number;
  locationCount: number;
  isLowStock: boolean;
  suggestedQuantity: number;
  lowStockLocations: string[];
}

/**
 * Calculate stock information for an item
 * 
 * Determines:
 * - Total stock across all locations
 * - Whether item is below reorder point in any location
 * - Suggested reorder quantity based on low-stock locations
 * - List of location IDs where stock is low
 * 
 * @param item - Item with inventory relations
 * @returns Stock information object
 */
export function calculateItemStockInfo(item: ItemWithInventory): ItemStockInfo {
  const inventory = item.inventory || [];
  
  // Calculate total stock across all locations
  const totalStock = inventory.reduce((sum, inv) => sum + inv.quantity, 0);
  
  // Find locations where quantity is below reorder point
  const lowStockLocations = inventory.filter(
    (inv) => inv.reorderPoint !== null && inv.quantity < inv.reorderPoint
  );
  
  // Calculate suggested order quantity for low-stock locations
  const suggestedQuantity = lowStockLocations.reduce((sum, inv) => {
    return sum + (inv.reorderQuantity || inv.reorderPoint || 1);
  }, 0);
  
  return {
    totalStock,
    locationCount: inventory.length,
    isLowStock: lowStockLocations.length > 0,
    suggestedQuantity,
    lowStockLocations: lowStockLocations.map((inv) => inv.locationId || inv.location?.id || '').filter(Boolean),
  };
}

