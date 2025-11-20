/**
 * Server Actions Integration Tests (Happy Path)
 * 
 * Tests that server actions work correctly when provided with valid CSRF tokens
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSignedCsrfToken, parseAndVerifySignedToken } from '@/lib/csrf';

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  requireActivePractice: vi.fn(() => ({
    session: {
      user: {
        id: 'test-user-id',
        memberships: [],
      },
    },
    practiceId: 'test-practice-id',
  })),
}));

// Mock context builder
vi.mock('@/src/lib/context/context-builder', () => ({
  buildRequestContext: vi.fn(() => ({
    userId: 'test-user-id',
    practiceId: 'test-practice-id',
  })),
  buildRequestContextFromSession: vi.fn((session: any) => ({
    userId: session?.user?.id || 'test-user-id',
    practiceId: 'test-practice-id',
  })),
}));

// Mock integrations
vi.mock('@/lib/integrations', () => ({
  getOrCreateProductForItem: vi.fn(() => 'test-product-id'),
  enrichProductWithGs1Data: vi.fn(),
  isValidGtin: vi.fn(() => true),
}));

// Mock repositories
vi.mock('@/src/repositories/users', () => ({
  UserRepository: vi.fn().mockImplementation(() => ({
    createLocation: vi.fn(() => ({ id: 'test-location-id' })),
    updateLocation: vi.fn(),
    deleteLocation: vi.fn(),
    createSupplier: vi.fn(() => ({ id: 'test-supplier-id' })),
    updateSupplier: vi.fn(),
    deleteSupplier: vi.fn(),
  })),
}));

vi.mock('@/src/repositories/suppliers', () => ({
  getPracticeSupplierRepository: vi.fn(() => ({
    updatePracticeSupplier: vi.fn(),
    unlinkPracticeSupplier: vi.fn(),
    linkPracticeToGlobalSupplier: vi.fn(),
  })),
}));

// Mock services
vi.mock('@/src/services/inventory', () => ({
  getInventoryService: vi.fn(() => ({
    createItem: vi.fn(() => ({ id: 'test-item-id', name: 'Test Item' })),
    updateItem: vi.fn(() => ({ id: 'test-item-id', name: 'Updated Item' })),
    deleteItem: vi.fn(),
    adjustStock: vi.fn(),
    createStockCountSession: vi.fn(() => ({ id: 'test-session-id' })),
    addCountLine: vi.fn(() => ({ lineId: 'test-line-id', variance: 0 })),
    updateCountLine: vi.fn(() => ({ variance: 0 })),
    removeCountLine: vi.fn(),
    completeStockCount: vi.fn(() => ({ adjustedItems: [], warnings: [] })),
    cancelStockCount: vi.fn(),
    deleteStockCountSession: vi.fn(),
  })),
  getItemService: vi.fn(() => ({
    createItem: vi.fn(() => ({ id: 'test-item-id', name: 'Test Item' })),
    updateItem: vi.fn(() => ({ id: 'test-item-id', name: 'Updated Item' })),
    deleteItem: vi.fn(),
  })),
}));

vi.mock('@/src/services/orders', () => ({
  getOrderService: vi.fn(() => ({
    createOrder: vi.fn(() => ({ id: 'test-order-id' })),
    updateOrder: vi.fn(() => ({ id: 'test-order-id' })),
    deleteOrder: vi.fn(() => ({ success: true })),
    sendOrder: vi.fn(() => ({ 
      id: 'test-order-id', 
      status: 'SENT',
      reference: 'REF-123',
      notes: 'Test notes',
      practiceSupplier: {
        customLabel: 'Test Supplier',
        globalSupplier: {
          name: 'Global Supplier',
          email: 'supplier@example.com'
        }
      },
      items: [
        {
          quantity: 10,
          unitPrice: 10.00,
          total: 100.00,
          item: {
            name: 'Test Item',
            sku: 'SKU-123'
          }
        }
      ]
    })),
    addOrderItem: vi.fn(() => ({ success: true })),
    updateOrderItem: vi.fn(() => ({ success: true })),
    removeOrderItem: vi.fn(() => ({ success: true })),
  })),
}));

vi.mock('@/src/services/receiving', () => ({
  getReceivingService: vi.fn(() => ({
    createGoodsReceipt: vi.fn(() => ({ id: 'test-receipt-id' })),
    addReceiptLine: vi.fn(() => ({ id: 'test-line-id' })),
    updateReceiptLine: vi.fn(() => ({ id: 'test-receipt-id' })),
    removeReceiptLine: vi.fn(() => ({ id: 'test-receipt-id' })),
    confirmGoodsReceipt: vi.fn(() => ({ 
      id: 'test-receipt-id', 
      lowStockNotifications: [] 
    })),
    getGoodsReceiptById: vi.fn(() => ({ 
      id: 'test-receipt-id',
      orderId: null 
    })),
    cancelGoodsReceipt: vi.fn(() => ({ id: 'test-receipt-id' })),
    deleteGoodsReceipt: vi.fn(() => ({ success: true })),
  })),
}));

vi.mock('@/src/services/products', () => ({
  getProductService: vi.fn(() => ({
    createProduct: vi.fn(() => ({ id: 'test-product-id', name: 'Test Product' })),
    updateProduct: vi.fn(() => ({ id: 'test-product-id' })),
    deleteProduct: vi.fn(),
    triggerGs1Lookup: vi.fn(),
  })),
}));

vi.mock('@/src/services/settings', () => ({
  getSettingsService: vi.fn(() => ({
    updatePracticeSettings: vi.fn(),
    updateUserRole: vi.fn(),
    removeUser: vi.fn(),
    cancelInvite: vi.fn(),
  })),
}));

// Mock RBAC
vi.mock('@/lib/rbac', () => ({
  hasRole: vi.fn(() => true),
}));

// Mock error helpers
vi.mock('@/src/domain/errors', () => ({
  isDomainError: vi.fn(() => false),
}));

// Mock order email service
vi.mock('@/src/lib/email/sendOrderEmail', () => ({
  sendOrderEmail: vi.fn(() => Promise.resolve({ success: true })),
}));

describe('Server Actions Integration (Valid CSRF)', () => {
  let signedToken: string;
  let rawToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.CSRF_SECRET = 'test-secret-key-for-testing-purposes-only';
    
    // Generate valid CSRF token pair
    signedToken = await createSignedCsrfToken();
    rawToken = (await parseAndVerifySignedToken(signedToken))!;
  });

  /**
   * Helper to mock valid CSRF headers
   * Uses development cookie name (csrf-token) for test environment
   */
  async function mockValidCsrfHeaders() {
    const { headers } = await import('next/headers');
    vi.mocked(headers).mockResolvedValue({
      get: vi.fn((name: string) => {
        // Use development cookie name in tests (csrf-token)
        if (name === 'cookie') return `csrf-token=${encodeURIComponent(signedToken)}`;
        if (name === 'x-csrf-token') return rawToken;
        return null;
      }),
    } as any);
  }

  describe('Inventory Actions', () => {
    it('should create item with valid CSRF token', async () => {
      await mockValidCsrfHeaders();

      const { upsertItemAction } = await import('@/app/(dashboard)/inventory/actions');
      
      const formData = new FormData();
      formData.append('name', 'Test Item');
      formData.append('sku', 'TEST-001');
      formData.append('unit', 'piece');
      
      const result = await upsertItemAction(null, formData);
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe('Item created');
    });

    it('should update item with valid CSRF token', async () => {
      await mockValidCsrfHeaders();

      const { upsertItemAction } = await import('@/app/(dashboard)/inventory/actions');
      
      const formData = new FormData();
      formData.append('itemId', 'test-item-id');
      formData.append('name', 'Updated Item');
      
      const result = await upsertItemAction(null, formData);
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe('Item updated');
    });

    it('should create stock adjustment with valid CSRF token', async () => {
      await mockValidCsrfHeaders();

      const { createStockAdjustmentAction } = await import('@/app/(dashboard)/inventory/actions');
      
      const formData = new FormData();
      formData.append('itemId', 'test-item-id');
      formData.append('locationId', 'test-location-id');
      formData.append('quantity', '5');
      formData.append('reason', 'Inventory correction');
      
      const result = await createStockAdjustmentAction(null, formData);
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe('Stock adjustment recorded');
    });

    it('should create location with valid CSRF token', async () => {
      await mockValidCsrfHeaders();

      const { upsertLocationAction } = await import('@/app/(dashboard)/inventory/actions');
      
      const formData = new FormData();
      formData.append('name', 'Test Location');
      formData.append('code', 'LOC-001');
      
      const result = await upsertLocationAction(null, formData);
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe('Location created');
    });
  });

  describe('Order Actions', () => {
    it('should create draft order with indexed FormData format', async () => {
      await mockValidCsrfHeaders();

      const { createDraftOrderAction } = await import('@/app/(dashboard)/orders/actions');
      
      const formData = new FormData();
      formData.append('practiceSupplierId', 'test-practice-supplier-id');
      formData.append('items[0].itemId', 'test-item-id-1');
      formData.append('items[0].quantity', '10');
      formData.append('items[0].unitPrice', '5.99');
      formData.append('items[1].itemId', 'test-item-id-2');
      formData.append('items[1].quantity', '5');
      formData.append('items[1].unitPrice', '3.50');
      
      // Should redirect on success
      await expect(createDraftOrderAction(null, formData)).rejects.toThrow('NEXT_REDIRECT');
    });


    it('should add order item with valid CSRF token', async () => {
      await mockValidCsrfHeaders();

      const { addOrderItemAction } = await import('@/app/(dashboard)/orders/actions');
      
      const formData = new FormData();
      formData.append('orderId', 'test-order-id');
      formData.append('itemId', 'test-item-id');
      formData.append('quantity', '5');
      
      const result = await addOrderItemAction({}, formData);
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe('Item added to order');
    });

    it('should send order and return success', async () => {
      await mockValidCsrfHeaders();

      const { sendOrderAction } = await import('@/app/(dashboard)/orders/actions');
      
      const result = await sendOrderAction('test-order-id');
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    });

    it('should send order, mark it SENT, and trigger purchase order email', async () => {
      await mockValidCsrfHeaders();

      const { sendOrderAction } = await import('@/app/(dashboard)/orders/actions');
      const { sendOrderEmail } = await import('@/src/lib/email/sendOrderEmail');
      
      // Clear previous calls
      vi.clearAllMocks();
      
      const result = await sendOrderAction('test-order-id');
      
      // Verify action succeeded
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
      
      // Verify email service was called
      expect(sendOrderEmail).toHaveBeenCalledTimes(1);
    });

    it('should delete order and return success', async () => {
      await mockValidCsrfHeaders();

      const { deleteOrderAction } = await import('@/app/(dashboard)/orders/actions');
      
      const result = await deleteOrderAction('test-order-id');
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    });
  });

  describe('Receiving Actions', () => {
    it('should create goods receipt with valid CSRF token', async () => {
      await mockValidCsrfHeaders();

      const { createGoodsReceiptAction } = await import('@/app/(dashboard)/receiving/actions');
      
      const formData = new FormData();
      formData.append('locationId', 'test-location-id');
      formData.append('supplierId', 'test-supplier-id');
      
      // Should redirect on success
      await expect(createGoodsReceiptAction(null, formData)).rejects.toThrow('NEXT_REDIRECT');
    });

    it('should add receipt line with valid CSRF token', async () => {
      await mockValidCsrfHeaders();

      const { addReceiptLineAction } = await import('@/app/(dashboard)/receiving/actions');
      
      const formData = new FormData();
      formData.append('receiptId', 'test-receipt-id');
      formData.append('itemId', 'test-item-id');
      formData.append('quantity', '10');
      
      const result = await addReceiptLineAction(null, formData);
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe('Item added to receipt');
    });
  });

  describe('Stock Count Actions', () => {
    it('should create stock count session with valid CSRF token', async () => {
      await mockValidCsrfHeaders();

      const { createStockCountSessionAction } = await import('@/app/(dashboard)/stock-count/actions');
      
      const formData = new FormData();
      formData.append('locationId', 'test-location-id');
      formData.append('notes', 'Monthly stock count');
      
      const result = await createStockCountSessionAction(null, formData);
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('sessionId');
    });

    it('should add count line with valid CSRF token', async () => {
      await mockValidCsrfHeaders();

      const { addCountLineAction } = await import('@/app/(dashboard)/stock-count/actions');
      
      const formData = new FormData();
      formData.append('sessionId', 'test-session-id');
      formData.append('itemId', 'test-item-id');
      formData.append('countedQuantity', '50');
      
      const result = await addCountLineAction(null, formData);
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    });
  });

  describe('Product Actions', () => {
    it('should create product with valid CSRF token', async () => {
      await mockValidCsrfHeaders();

      const { createProductAction } = await import('@/app/(dashboard)/settings/products/actions');
      
      const formData = new FormData();
      formData.append('name', 'Test Product');
      formData.append('brand', 'Test Brand');
      
      const result = await createProductAction(null, formData);
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe('Product created successfully');
      expect(result).toHaveProperty('productId');
    });

    it('should update product with valid CSRF token', async () => {
      await mockValidCsrfHeaders();

      const { updateProductAction } = await import('@/app/(dashboard)/settings/products/actions');
      
      const formData = new FormData();
      formData.append('productId', 'test-product-id');
      formData.append('name', 'Updated Product');
      
      const result = await updateProductAction(null, formData);
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe('Product updated successfully');
    });
  });

  describe('Settings Actions', () => {
    it('should update practice settings with valid CSRF token', async () => {
      await mockValidCsrfHeaders();

      const { updatePracticeSettingsAction } = await import('@/app/(dashboard)/settings/actions');
      
      const formData = new FormData();
      formData.append('name', 'Updated Practice Name');
      formData.append('city', 'Test City');
      
      const result = await updatePracticeSettingsAction(null, formData);
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe('Practice settings updated');
    });

    it('should update user role with valid CSRF token', async () => {
      await mockValidCsrfHeaders();

      const { updateUserRoleAction } = await import('@/app/(dashboard)/settings/actions');
      
      const formData = new FormData();
      formData.append('userId', 'test-user-id');
      formData.append('role', 'STAFF');
      
      const result = await updateUserRoleAction(null, formData);
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe('User role updated');
    });
  });

  describe('Supplier Actions', () => {
    it('should update practice supplier with valid CSRF token', async () => {
      await mockValidCsrfHeaders();

      const { updatePracticeSupplierAction } = await import('@/app/(dashboard)/suppliers/actions');
      
      const formData = new FormData();
      formData.append('practiceSupplierId', 'test-supplier-id');
      formData.append('accountNumber', 'ACC-12345');
      formData.append('isPreferred', 'true');
      
      const result = await updatePracticeSupplierAction(null, formData);
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe('Supplier settings updated successfully.');
    });

    it('should link global supplier with valid CSRF token', async () => {
      await mockValidCsrfHeaders();

      const { linkGlobalSupplierAction } = await import('@/app/(dashboard)/suppliers/actions');
      
      const formData = new FormData();
      formData.append('globalSupplierId', 'test-global-supplier-id');
      
      const result = await linkGlobalSupplierAction(null, formData);
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe('Supplier linked successfully.');
    });
  });

  describe('Supplier Catalog Actions', () => {
    it('should add to catalog with valid CSRF token', async () => {
      await mockValidCsrfHeaders();

      const { addToCatalogAction } = await import('@/app/(dashboard)/supplier-catalog/actions');
      
      const formData = new FormData();
      formData.append('productId', 'test-product-id');
      formData.append('practiceSupplierId', 'test-supplier-id');
      formData.append('name', 'Test Catalog Item');
      
      const result = await addToCatalogAction(null, formData);
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe('Product added to your catalog successfully');
      expect(result).toHaveProperty('itemId');
    });
  });

  describe('CSRF Token Preservation', () => {
    it('should accept same valid token across multiple actions', async () => {
      await mockValidCsrfHeaders();

      const { upsertItemAction } = await import('@/app/(dashboard)/inventory/actions');
      const { createProductAction } = await import('@/app/(dashboard)/settings/products/actions');
      
      // First action
      const formData1 = new FormData();
      formData1.append('name', 'Item 1');
      const result1 = await upsertItemAction(null, formData1);
      expect(result1).toHaveProperty('success');
      
      // Second action with same token
      const formData2 = new FormData();
      formData2.append('name', 'Product 1');
      const result2 = await createProductAction(null, formData2);
      expect(result2).toHaveProperty('success');
    });
  });
});

