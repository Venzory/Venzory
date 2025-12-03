/**
 * Server Actions CSRF Protection Tests
 * 
 * Tests that server actions properly reject requests without valid CSRF tokens
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
  requireActivePractice: vi.fn(),
}));

// Mock context builder
vi.mock('@/src/lib/context/context-builder', () => ({
  buildRequestContext: vi.fn(),
  buildRequestContextFromSession: vi.fn(),
}));

// Mock services
vi.mock('@/src/services/inventory', () => ({
  getInventoryService: vi.fn(() => ({
    createItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
  })),
  getItemService: vi.fn(() => ({
    createItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
  })),
}));

vi.mock('@/src/services/orders', () => ({
  getOrderService: vi.fn(() => ({
    createOrder: vi.fn(),
    updateOrder: vi.fn(),
    deleteOrder: vi.fn(),
  })),
}));

describe('Server Actions CSRF Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CSRF_SECRET = 'test-secret-key-for-testing-purposes-only';
  });

  describe('Missing CSRF Token', () => {
    it('should reject action when cookie is missing', async () => {
      const { headers } = await import('next/headers');
      
      // Mock headers with no CSRF cookie
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn((name: string) => {
          if (name === 'cookie') return null;
          if (name === 'x-csrf-token') return 'some-token';
          return null;
        }),
      } as any);

      const { upsertItemAction } = await import('@/app/(dashboard)/inventory/actions');
      
      const formData = new FormData();
      formData.append('name', 'Test Item');
      
      await expect(upsertItemAction({}, formData)).rejects.toThrow('Invalid request');
    });

    it('should reject action when header token is missing', async () => {
      const { headers } = await import('next/headers');
      const signedToken = await createSignedCsrfToken();
      
      // Mock headers with cookie but no header token
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn((name: string) => {
          if (name === 'cookie') return `__Host-csrf=${encodeURIComponent(signedToken)}`;
          if (name === 'x-csrf-token') return null;
          return null;
        }),
      } as any);

      const { upsertItemAction } = await import('@/app/(dashboard)/inventory/actions');
      
      const formData = new FormData();
      formData.append('name', 'Test Item');
      
      await expect(upsertItemAction({}, formData)).rejects.toThrow('Invalid request');
    });

    it('should reject action when both cookie and header are missing', async () => {
      const { headers } = await import('next/headers');
      
      // Mock headers with nothing
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn(() => null),
      } as any);

      const { createDraftOrderAction } = await import('@/app/(dashboard)/orders/actions');
      
      const formData = new FormData();
      formData.append('supplierId', 'test-supplier-id');
      formData.append('items', JSON.stringify([{ itemId: 'test', quantity: 1 }]));
      
      await expect(createDraftOrderAction({}, formData)).rejects.toThrow('Invalid request');
    });
  });

  describe('Invalid CSRF Token', () => {
    it('should reject action when tokens do not match', async () => {
      const { headers } = await import('next/headers');
      const signedToken = await createSignedCsrfToken();
      const wrongToken = 'wrong-token';
      
      // Mock headers with mismatched tokens
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn((name: string) => {
          if (name === 'cookie') return `__Host-csrf=${encodeURIComponent(signedToken)}`;
          if (name === 'x-csrf-token') return wrongToken;
          return null;
        }),
      } as any);

      const { deleteItemAction } = await import('@/app/(dashboard)/inventory/actions');
      
      await expect(deleteItemAction('test-item-id')).rejects.toThrow('Invalid request');
    });

    it('should reject action with tampered cookie token', async () => {
      const { headers } = await import('next/headers');
      const tamperedToken = 'tampered.token.signature';
      
      // Mock headers with tampered cookie
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn((name: string) => {
          if (name === 'cookie') return `__Host-csrf=${encodeURIComponent(tamperedToken)}`;
          if (name === 'x-csrf-token') return 'some-raw-token';
          return null;
        }),
      } as any);

      const { createStockAdjustmentAction } = await import('@/app/(dashboard)/inventory/actions');
      
      const formData = new FormData();
      formData.append('itemId', 'test-item');
      formData.append('locationId', 'test-location');
      formData.append('quantity', '5');
      
      await expect(createStockAdjustmentAction({}, formData)).rejects.toThrow('Invalid request');
    });
  });

  describe('Multiple Actions Coverage', () => {
    it('should protect inventory actions', async () => {
      const { headers } = await import('next/headers');
      
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn(() => null),
      } as any);

      const { upsertLocationAction } = await import('@/app/(dashboard)/inventory/actions');
      const { updatePracticeSupplierAction } = await import('@/app/(dashboard)/suppliers/actions');
      
      const formData = new FormData();
      formData.append('name', 'Test');
      
      await expect(upsertLocationAction({}, formData)).rejects.toThrow('Invalid request');
      await expect(updatePracticeSupplierAction({}, formData)).rejects.toThrow('Invalid request');
    });

    it('should protect order actions', async () => {
      const { headers } = await import('next/headers');
      
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn(() => null),
      } as any);

      const { updateOrderAction, deleteOrderAction, sendOrderAction } = await import('@/app/(dashboard)/orders/actions');
      
      const formData = new FormData();
      formData.append('orderId', 'test-order-id');
      
      await expect(updateOrderAction(formData)).rejects.toThrow('Invalid request');
      
      // These actions now return error objects instead of throwing
      const deleteResult = await deleteOrderAction('test-order-id').catch(e => ({ success: false, error: e.message }));
      expect(deleteResult.success).toBe(false);
      
      const sendResult = await sendOrderAction('test-order-id').catch(e => ({ success: false, error: e.message }));
      expect(sendResult.success).toBe(false);
    });

    it('should protect receiving actions', async () => {
      const { headers } = await import('next/headers');
      
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn(() => null),
      } as any);

      const { 
        createGoodsReceiptAction, 
        confirmGoodsReceiptAction,
        deleteGoodsReceiptAction 
      } = await import('@/app/(dashboard)/receiving/actions');
      
      const formData = new FormData();
      formData.append('locationId', 'test-location');
      
      await expect(createGoodsReceiptAction({}, formData)).rejects.toThrow('Invalid request');
      await expect(confirmGoodsReceiptAction('test-receipt-id')).rejects.toThrow();
      await expect(deleteGoodsReceiptAction('test-receipt-id')).rejects.toThrow();
    });

    it('should protect stock count actions', async () => {
      const { headers } = await import('next/headers');
      
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn(() => null),
      } as any);

      const { 
        createStockCountSessionAction,
        completeStockCountAction,
        deleteStockCountSessionAction
      } = await import('@/app/(dashboard)/stock-count/actions');
      
      const formData = new FormData();
      formData.append('locationId', 'test-location');
      
      await expect(createStockCountSessionAction({}, formData)).rejects.toThrow('Invalid request');
      await expect(completeStockCountAction('test-session-id', true)).rejects.toThrow();
      await expect(deleteStockCountSessionAction('test-session-id')).rejects.toThrow();
    });

    it('should protect product actions', async () => {
      const { headers } = await import('next/headers');
      
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn(() => null),
      } as any);

      const { 
        createProductAction,
        updateProductAction,
        deleteProductAction
      } = await import('@/app/(dashboard)/admin/product-master/actions');
      
      const formData = new FormData();
      formData.append('name', 'Test Product');
      
      await expect(createProductAction({}, formData)).rejects.toThrow('Invalid request');
      await expect(updateProductAction({}, formData)).rejects.toThrow('Invalid request');
      await expect(deleteProductAction('test-product-id')).rejects.toThrow('Invalid request');
    });

    it('should protect settings actions', async () => {
      const { headers } = await import('next/headers');
      
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn(() => null),
      } as any);

      const { 
        updatePracticeSettingsAction,
        updateUserRoleAction,
        removeUserAction
      } = await import('@/app/(dashboard)/settings/actions');
      
      const formData = new FormData();
      formData.append('name', 'Test Practice');
      
      await expect(updatePracticeSettingsAction({}, formData)).rejects.toThrow('Invalid request');
      await expect(updateUserRoleAction({}, formData)).rejects.toThrow('Invalid request');
      await expect(removeUserAction('test-user-id')).rejects.toThrow('Invalid request');
    });

    it('should protect supplier actions', async () => {
      const { headers } = await import('next/headers');
      
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn(() => null),
      } as any);

      const { 
        updatePracticeSupplierAction,
        linkGlobalSupplierAction,
        unlinkPracticeSupplierAction
      } = await import('@/app/(dashboard)/suppliers/actions');
      
      const formData = new FormData();
      formData.append('practiceSupplierId', 'test-supplier-id');
      
      await expect(updatePracticeSupplierAction({}, formData)).rejects.toThrow('Invalid request');
      await expect(linkGlobalSupplierAction({}, formData)).rejects.toThrow('Invalid request');
      await expect(unlinkPracticeSupplierAction('test-supplier-id')).rejects.toThrow();
    });
  });

  describe('CSRF Token Format', () => {
    it('should reject malformed cookie token', async () => {
      const { headers } = await import('next/headers');
      
      // Mock headers with malformed cookie
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn((name: string) => {
          if (name === 'cookie') return '__Host-csrf=not-a-valid-token-format';
          if (name === 'x-csrf-token') return 'some-token';
          return null;
        }),
      } as any);

      const { upsertItemAction } = await import('@/app/(dashboard)/inventory/actions');
      
      const formData = new FormData();
      formData.append('name', 'Test Item');
      
      await expect(upsertItemAction({}, formData)).rejects.toThrow('Invalid request');
    });

    it('should reject empty token strings', async () => {
      const { headers } = await import('next/headers');
      
      // Mock headers with empty tokens
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn((name: string) => {
          if (name === 'cookie') return '__Host-csrf=';
          if (name === 'x-csrf-token') return '';
          return null;
        }),
      } as any);

      const { deleteItemAction } = await import('@/app/(dashboard)/inventory/actions');
      
      await expect(deleteItemAction('test-item-id')).rejects.toThrow('Invalid request');
    });
  });
});

