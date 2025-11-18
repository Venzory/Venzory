/**
 * Shared order status badge component for consistent status display
 */

import { OrderStatus } from '@prisma/client';
import { Badge } from '@/components/ui/badge';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const variantMap = {
    [OrderStatus.DRAFT]: 'neutral' as const,
    [OrderStatus.SENT]: 'info' as const,
    [OrderStatus.PARTIALLY_RECEIVED]: 'warning' as const,
    [OrderStatus.RECEIVED]: 'success' as const,
    [OrderStatus.CANCELLED]: 'error' as const,
  };

  return <Badge variant={variantMap[status]}>{status.replace('_', ' ')}</Badge>;
}

