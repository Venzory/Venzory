import { describe, it, expect } from 'vitest';
import { OrderStatus } from '@prisma/client';
import {
  calculateAwaitingReceiptCount,
  AWAITING_RECEIPT_LINK,
} from '@/app/(clinic)/app/dashboard/_utils/kpi-utils';

describe('calculateAwaitingReceiptCount', () => {
  it('should count only SENT orders', () => {
    const orders = [
      { status: OrderStatus.SENT },
      { status: OrderStatus.SENT },
      { status: OrderStatus.DRAFT },
    ];

    const result = calculateAwaitingReceiptCount(orders);

    expect(result).toBe(2);
  });

  it('should count SENT and PARTIALLY_RECEIVED orders', () => {
    const orders = [
      { status: OrderStatus.SENT },
      { status: OrderStatus.PARTIALLY_RECEIVED },
      { status: OrderStatus.PARTIALLY_RECEIVED },
      { status: OrderStatus.DRAFT },
    ];

    const result = calculateAwaitingReceiptCount(orders);

    expect(result).toBe(3);
  });

  it('should not count DRAFT, RECEIVED, or CANCELLED orders', () => {
    const orders = [
      { status: OrderStatus.DRAFT },
      { status: OrderStatus.RECEIVED },
      { status: OrderStatus.CANCELLED },
    ];

    const result = calculateAwaitingReceiptCount(orders);

    expect(result).toBe(0);
  });

  it('should return 0 for empty array', () => {
    const result = calculateAwaitingReceiptCount([]);

    expect(result).toBe(0);
  });

  it('should return 0 for undefined input', () => {
    const result = calculateAwaitingReceiptCount(undefined);

    expect(result).toBe(0);
  });

  it('should return 0 for null input', () => {
    const result = calculateAwaitingReceiptCount(null);

    expect(result).toBe(0);
  });

  it('should handle mixed order statuses correctly', () => {
    const orders = [
      { status: OrderStatus.SENT },
      { status: OrderStatus.DRAFT },
      { status: OrderStatus.PARTIALLY_RECEIVED },
      { status: OrderStatus.RECEIVED },
      { status: OrderStatus.SENT },
      { status: OrderStatus.CANCELLED },
    ];

    const result = calculateAwaitingReceiptCount(orders);

    expect(result).toBe(3); // 2 SENT + 1 PARTIALLY_RECEIVED
  });
});

describe('AWAITING_RECEIPT_LINK', () => {
  it('should equal "/receiving"', () => {
    expect(AWAITING_RECEIPT_LINK).toBe('/receiving');
  });
});

