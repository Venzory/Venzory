/**
 * Order status badge component for consistent status display
 * Provides type-safe mapping from Prisma OrderStatus to Badge variants
 */

import { OrderStatus } from '@prisma/client';
import { Badge, type BadgeVariant } from '@/components/ui/badge';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const statusConfig: Record<OrderStatus, { label: string; variant: BadgeVariant }> = {
  [OrderStatus.DRAFT]: { label: 'Draft', variant: 'neutral' },
  [OrderStatus.SENT]: { label: 'Sent', variant: 'info' },
  [OrderStatus.PARTIALLY_RECEIVED]: { label: 'Partially Received', variant: 'warning' },
  [OrderStatus.RECEIVED]: { label: 'Received', variant: 'success' },
  [OrderStatus.CANCELLED]: { label: 'Cancelled', variant: 'error' },
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = statusConfig[status];

  if (!config) {
    return (
      <Badge variant="neutral" className={className}>
        {String(status)}
      </Badge>
    );
  }

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

