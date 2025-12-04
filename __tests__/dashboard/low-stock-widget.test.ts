import { describe, it, expect } from 'vitest';
import { calculateItemStockInfo } from '@/lib/inventory-utils';
import { buildLowStockOrderHref } from '@/app/(clinic)/app/dashboard/_utils/low-stock-actions';

describe('Low Stock Widget Behavior', () => {
  describe('Empty state handling', () => {
    it('should identify items with no low-stock locations', () => {
      const item = {
        id: 'item-1',
        name: 'Test Item',
        inventory: [
          {
            locationId: 'loc-1',
            quantity: 50,
            reorderPoint: 10,
            reorderQuantity: 20,
            location: { id: 'loc-1', name: 'Main Storage', code: 'MS' },
          },
        ],
      };

      const stockInfo = calculateItemStockInfo(item);

      expect(stockInfo.isLowStock).toBe(false);
      expect(stockInfo.lowStockLocations).toHaveLength(0);
      expect(stockInfo.suggestedQuantity).toBe(0);
    });

    it('should handle items with no inventory locations', () => {
      const item = {
        id: 'item-2',
        name: 'No Inventory Item',
        inventory: [],
      };

      const stockInfo = calculateItemStockInfo(item);

      expect(stockInfo.isLowStock).toBe(false);
      expect(stockInfo.lowStockLocations).toHaveLength(0);
      expect(stockInfo.totalStock).toBe(0);
      expect(stockInfo.locationCount).toBe(0);
    });

    it('should handle items with null inventory', () => {
      const item = {
        id: 'item-3',
        name: 'Null Inventory Item',
        inventory: null,
      };

      const stockInfo = calculateItemStockInfo(item);

      expect(stockInfo.isLowStock).toBe(false);
      expect(stockInfo.lowStockLocations).toHaveLength(0);
      expect(stockInfo.totalStock).toBe(0);
    });

    it('should handle items with no reorder point set', () => {
      const item = {
        id: 'item-4',
        name: 'No Reorder Point',
        inventory: [
          {
            locationId: 'loc-1',
            quantity: 5,
            reorderPoint: null,
            reorderQuantity: null,
            location: { id: 'loc-1', name: 'Main Storage', code: 'MS' },
          },
        ],
      };

      const stockInfo = calculateItemStockInfo(item);

      expect(stockInfo.isLowStock).toBe(false);
      expect(stockInfo.lowStockLocations).toHaveLength(0);
    });
  });

  describe('Low stock detection', () => {
    it('should identify items below reorder point', () => {
      const item = {
        id: 'item-5',
        name: 'Low Stock Item',
        inventory: [
          {
            locationId: 'loc-1',
            quantity: 5,
            reorderPoint: 10,
            reorderQuantity: 20,
            location: { id: 'loc-1', name: 'Main Storage', code: 'MS' },
          },
        ],
      };

      const stockInfo = calculateItemStockInfo(item);

      expect(stockInfo.isLowStock).toBe(true);
      expect(stockInfo.lowStockLocations).toHaveLength(1);
      expect(stockInfo.suggestedQuantity).toBe(20);
    });

    it('should identify multiple low-stock locations', () => {
      const item = {
        id: 'item-6',
        name: 'Multi-Location Low Stock',
        inventory: [
          {
            locationId: 'loc-1',
            quantity: 3,
            reorderPoint: 10,
            reorderQuantity: 15,
            location: { id: 'loc-1', name: 'Main Storage', code: 'MS' },
          },
          {
            locationId: 'loc-2',
            quantity: 2,
            reorderPoint: 5,
            reorderQuantity: 10,
            location: { id: 'loc-2', name: 'Back Room', code: 'BR' },
          },
          {
            locationId: 'loc-3',
            quantity: 50,
            reorderPoint: 10,
            reorderQuantity: 20,
            location: { id: 'loc-3', name: 'Overflow', code: 'OF' },
          },
        ],
      };

      const stockInfo = calculateItemStockInfo(item);

      expect(stockInfo.isLowStock).toBe(true);
      expect(stockInfo.lowStockLocations).toHaveLength(2);
      expect(stockInfo.suggestedQuantity).toBe(25); // 15 + 10
    });
  });

  describe('Order link generation for low-stock items', () => {
    it('should build order link with supplier when available', () => {
      const item = {
        id: 'item-7',
        defaultPracticeSupplierId: 'ps-123',
      };

      const href = buildLowStockOrderHref(item);

      expect(href).toBe('/orders/new?supplierId=ps-123');
    });

    it('should build fallback order link when no supplier', () => {
      const item = {
        id: 'item-8',
        defaultPracticeSupplierId: null,
      };

      const href = buildLowStockOrderHref(item);

      expect(href).toBe('/orders/new');
    });

    it('should handle missing item gracefully', () => {
      const href = buildLowStockOrderHref(null);

      expect(href).toBe('/orders/new');
    });
  });

  describe('Widget display logic', () => {
    it('should show empty state when no low-stock items exist', () => {
      const items = [
        {
          id: 'item-1',
          name: 'Well Stocked Item 1',
          inventory: [
            {
              locationId: 'loc-1',
              quantity: 50,
              reorderPoint: 10,
              reorderQuantity: 20,
              location: { id: 'loc-1', name: 'Main', code: 'M' },
            },
          ],
        },
        {
          id: 'item-2',
          name: 'Well Stocked Item 2',
          inventory: [
            {
              locationId: 'loc-1',
              quantity: 100,
              reorderPoint: 20,
              reorderQuantity: 30,
              location: { id: 'loc-1', name: 'Main', code: 'M' },
            },
          ],
        },
      ];

      const itemsWithStockInfo = items.map((item) => ({
        item,
        stockInfo: calculateItemStockInfo(item),
      }));

      const lowStockItems = itemsWithStockInfo.filter(({ stockInfo }) => stockInfo.isLowStock);

      // Empty state should be shown
      expect(lowStockItems).toHaveLength(0);
    });

    it('should show items when low-stock items exist', () => {
      const items = [
        {
          id: 'item-1',
          name: 'Low Stock Item',
          inventory: [
            {
              locationId: 'loc-1',
              quantity: 2,
              reorderPoint: 10,
              reorderQuantity: 20,
              location: { id: 'loc-1', name: 'Main', code: 'M' },
            },
          ],
        },
        {
          id: 'item-2',
          name: 'Well Stocked Item',
          inventory: [
            {
              locationId: 'loc-1',
              quantity: 100,
              reorderPoint: 20,
              reorderQuantity: 30,
              location: { id: 'loc-1', name: 'Main', code: 'M' },
            },
          ],
        },
      ];

      const itemsWithStockInfo = items.map((item) => ({
        item,
        stockInfo: calculateItemStockInfo(item),
      }));

      const lowStockItems = itemsWithStockInfo.filter(({ stockInfo }) => stockInfo.isLowStock);

      // Widget should show 1 low-stock item
      expect(lowStockItems).toHaveLength(1);
      expect(lowStockItems[0].item.name).toBe('Low Stock Item');
    });
  });
});

