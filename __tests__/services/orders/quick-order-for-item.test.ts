import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/src/repositories/base', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/repositories/base')>();
  return {
    ...actual,
    withTransaction: (callback: any) => callback({}),
  };
});

import { OrderService } from '@/src/services/orders/order-service';

describe('OrderService.quickOrderForItem', () => {
  const ctx = {
    userId: 'user-1',
    practiceId: 'practice-1',
    role: 'STAFF',
    memberships: [{ practiceId: 'practice-1', role: 'STAFF', status: 'ACTIVE' }],
  } as any;

  const defaultSupplier = {
    id: 'ps-1',
    customLabel: 'Acme Supplies',
    globalSupplier: { name: 'Acme Global' },
  };

  const catalogItem = {
    id: 'item-1',
    name: 'Exam Gloves',
    defaultPracticeSupplier: defaultSupplier,
    practiceSupplierItems: [
      {
        practiceSupplierId: defaultSupplier.id,
        unitPrice: 4.5,
      },
    ],
  };

  let mockOrderRepository: any;
  let mockInventoryRepository: any;
  let service: OrderService;

  beforeEach(() => {
    mockOrderRepository = {
      findOrders: vi.fn(),
      createOrder: vi.fn(),
      addOrderItem: vi.fn(),
    };

    mockInventoryRepository = {
      findItems: vi.fn(),
    };

    service = new OrderService(
      mockOrderRepository,
      mockInventoryRepository,
      {} as any,
      {} as any,
      {} as any,
      { resolve: vi.fn(() => ({ send: vi.fn() })) } as any
    );
  });

  it('creates a new draft order when no reusable draft exists', async () => {
    mockInventoryRepository.findItems.mockResolvedValue([catalogItem]);
    mockOrderRepository.findOrders.mockResolvedValue([]);
    mockOrderRepository.createOrder.mockResolvedValue({ id: 'order-123' });

    const result = await service.quickOrderForItem(ctx, catalogItem.id);

    expect(result).toEqual({
      status: 'SUCCESS',
      orderId: 'order-123',
      createdNew: true,
    });
    expect(mockOrderRepository.createOrder).toHaveBeenCalledWith(
      ctx.userId,
      expect.objectContaining({
        practiceId: ctx.practiceId,
        practiceSupplierId: defaultSupplier.id,
        items: [
          expect.objectContaining({
            itemId: catalogItem.id,
            quantity: 1,
            unitPrice: 4.5,
          }),
        ],
      }),
      expect.any(Object)
    );
  });

  it('reuses an existing draft order and adds the item if not present', async () => {
    mockInventoryRepository.findItems.mockResolvedValue([catalogItem]);
    mockOrderRepository.findOrders.mockResolvedValue([
      { id: 'order-789', items: [] },
    ]);

    const result = await service.quickOrderForItem(ctx, catalogItem.id);

    expect(result).toEqual({
      status: 'SUCCESS',
      orderId: 'order-789',
      createdNew: false,
    });
    expect(mockOrderRepository.addOrderItem).toHaveBeenCalledWith(
      'order-789',
      ctx.practiceId,
      expect.objectContaining({
        itemId: catalogItem.id,
        quantity: 1,
        unitPrice: 4.5,
      }),
      expect.any(Object)
    );
    expect(mockOrderRepository.createOrder).not.toHaveBeenCalled();
  });

  it('does not duplicate the line when the draft already contains the item', async () => {
    mockInventoryRepository.findItems.mockResolvedValue([catalogItem]);
    mockOrderRepository.findOrders.mockResolvedValue([
      {
        id: 'order-111',
        items: [{ itemId: catalogItem.id }],
      },
    ]);

    const result = await service.quickOrderForItem(ctx, catalogItem.id);

    expect(result).toEqual({
      status: 'SUCCESS',
      orderId: 'order-111',
      createdNew: false,
    });
    expect(mockOrderRepository.addOrderItem).not.toHaveBeenCalled();
  });

  it('returns NO_DEFAULT_SUPPLIER when the item has no preferred supplier', async () => {
    mockInventoryRepository.findItems.mockResolvedValue([
      { ...catalogItem, defaultPracticeSupplier: null },
    ]);

    const result = await service.quickOrderForItem(ctx, catalogItem.id);

    expect(result).toEqual({ status: 'NO_DEFAULT_SUPPLIER' });
    expect(mockOrderRepository.createOrder).not.toHaveBeenCalled();
  });
});


