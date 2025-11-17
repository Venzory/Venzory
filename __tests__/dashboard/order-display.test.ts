import { describe, it, expect } from 'vitest';
import { getOrderSupplierDisplay } from '@/app/(dashboard)/dashboard/_utils/order-display';

describe('getOrderSupplierDisplay', () => {
  it('should return custom label when available', () => {
    const order = {
      practiceSupplier: {
        id: 'ps-123',
        customLabel: 'My Custom Supplier Name',
        globalSupplier: {
          name: 'Global Supplier Inc',
        },
      },
    };

    const result = getOrderSupplierDisplay(order);

    expect(result.name).toBe('My Custom Supplier Name');
    expect(result.linkId).toBe('ps-123');
  });

  it('should return global supplier name when custom label is null', () => {
    const order = {
      practiceSupplier: {
        id: 'ps-456',
        customLabel: null,
        globalSupplier: {
          name: 'Global Supplier Inc',
        },
      },
    };

    const result = getOrderSupplierDisplay(order);

    expect(result.name).toBe('Global Supplier Inc');
    expect(result.linkId).toBe('ps-456');
  });

  it('should return global supplier name when custom label is empty string', () => {
    const order = {
      practiceSupplier: {
        id: 'ps-789',
        customLabel: '',
        globalSupplier: {
          name: 'Global Supplier Inc',
        },
      },
    };

    const result = getOrderSupplierDisplay(order);

    expect(result.name).toBe('Global Supplier Inc');
    expect(result.linkId).toBe('ps-789');
  });

  it('should return "Unknown Supplier" when practiceSupplier is null', () => {
    const order = {
      practiceSupplier: null,
    };

    const result = getOrderSupplierDisplay(order);

    expect(result.name).toBe('Unknown Supplier');
    expect(result.linkId).toBe('');
  });

  it('should return "Unknown Supplier" when practiceSupplier is undefined', () => {
    const order = {};

    const result = getOrderSupplierDisplay(order);

    expect(result.name).toBe('Unknown Supplier');
    expect(result.linkId).toBe('');
  });

  it('should return "Unknown Supplier" when globalSupplier is null', () => {
    const order = {
      practiceSupplier: {
        id: 'ps-999',
        customLabel: null,
        globalSupplier: null,
      },
    };

    const result = getOrderSupplierDisplay(order);

    expect(result.name).toBe('Unknown Supplier');
    expect(result.linkId).toBe('ps-999');
  });

  it('should handle missing globalSupplier gracefully', () => {
    const order = {
      practiceSupplier: {
        id: 'ps-111',
        customLabel: '',
      },
    };

    const result = getOrderSupplierDisplay(order);

    expect(result.name).toBe('Unknown Supplier');
    expect(result.linkId).toBe('ps-111');
  });
});

