/**
 * KPI calculation utilities for the dashboard
 */

import { OrderStatus } from '@prisma/client';

export const AWAITING_RECEIPT_LINK = '/receiving';

/**
 * Calculate count of orders awaiting receipt (SENT or PARTIALLY_RECEIVED)
 * Null-safe: returns 0 if orders is undefined/null
 */
export function calculateAwaitingReceiptCount(
  orders?: Array<{ status: OrderStatus }> | null
): number {
  if (!orders || !Array.isArray(orders)) {
    return 0;
  }

  return orders.filter(
    (order) =>
      order.status === OrderStatus.SENT ||
      order.status === OrderStatus.PARTIALLY_RECEIVED
  ).length;
}

