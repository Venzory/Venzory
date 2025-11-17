import { Badge, type BadgeVariant } from './badge';

type Status = 'draft' | 'sent' | 'received' | 'cancelled' | 'in-progress' | 'completed' | 'pending';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; variant: BadgeVariant }> = {
  draft: { label: 'Draft', variant: 'neutral' },
  sent: { label: 'Sent', variant: 'info' },
  received: { label: 'Received', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'error' },
  'in-progress': { label: 'In Progress', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  if (!config) {
    return null;
  }

  return (
    <Badge variant={config.variant} className={className} aria-label={`Status: ${config.label}`}>
      {config.label}
    </Badge>
  );
}

