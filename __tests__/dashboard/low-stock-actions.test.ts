import { describe, it, expect } from 'vitest';
import { buildLowStockOrderHref } from '@/app/(clinic)/app/dashboard/_utils/low-stock-actions';

describe('buildLowStockOrderHref', () => {
  it('should return order URL with supplierId when defaultPracticeSupplierId is present', () => {
    const item = {
      id: 'item-123',
      defaultPracticeSupplierId: 'ps-456',
    };

    const result = buildLowStockOrderHref(item);

    expect(result).toBe('/orders/new?supplierId=ps-456');
  });

  it('should encode supplierId in URL', () => {
    const item = {
      id: 'item-123',
      defaultPracticeSupplierId: 'ps-with-special-chars-&=?',
    };

    const result = buildLowStockOrderHref(item);

    expect(result).toBe('/orders/new?supplierId=ps-with-special-chars-%26%3D%3F');
  });

  it('should return fallback URL when defaultPracticeSupplierId is null', () => {
    const item = {
      id: 'item-123',
      defaultPracticeSupplierId: null,
    };

    const result = buildLowStockOrderHref(item);

    expect(result).toBe('/orders/new');
  });

  it('should return fallback URL when defaultPracticeSupplierId is undefined', () => {
    const item = {
      id: 'item-123',
      defaultPracticeSupplierId: undefined,
    };

    const result = buildLowStockOrderHref(item);

    expect(result).toBe('/orders/new');
  });

  it('should return fallback URL when defaultPracticeSupplierId is empty string', () => {
    const item = {
      id: 'item-123',
      defaultPracticeSupplierId: '',
    };

    const result = buildLowStockOrderHref(item);

    expect(result).toBe('/orders/new');
  });

  it('should return fallback URL when item is missing defaultPracticeSupplierId field', () => {
    const item = {
      id: 'item-123',
    };

    const result = buildLowStockOrderHref(item);

    expect(result).toBe('/orders/new');
  });

  it('should return fallback URL when item is null', () => {
    const result = buildLowStockOrderHref(null);

    expect(result).toBe('/orders/new');
  });

  it('should return fallback URL when item is undefined', () => {
    const result = buildLowStockOrderHref(undefined);

    expect(result).toBe('/orders/new');
  });

  it('should return fallback URL when item is empty object', () => {
    const result = buildLowStockOrderHref({});

    expect(result).toBe('/orders/new');
  });
});

