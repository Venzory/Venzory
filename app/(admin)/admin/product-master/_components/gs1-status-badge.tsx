import type { Gs1VerificationStatus } from '@prisma/client';

interface Gs1StatusBadgeProps {
  status: Gs1VerificationStatus | string | null;
}

export function Gs1StatusBadge({ status }: Gs1StatusBadgeProps) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    VERIFIED: {
      label: 'Verified',
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    PENDING: {
      label: 'Pending',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
    UNVERIFIED: {
      label: 'Unverified',
      className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
    },
    FAILED: {
      label: 'Failed',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    },
    EXPIRED: {
      label: 'Expired',
      className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    },
  };

  const config = status ? statusConfig[status] : statusConfig.UNVERIFIED;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config?.className ?? statusConfig.UNVERIFIED.className}`}>
      {config?.label ?? 'Unknown'}
    </span>
  );
}

