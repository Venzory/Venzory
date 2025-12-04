import { Star, Ban } from 'lucide-react';

interface SupplierStatusBadgesProps {
  isPreferred: boolean;
  isBlocked: boolean;
}

export function SupplierStatusBadges({ isPreferred, isBlocked }: SupplierStatusBadgesProps) {
  if (!isPreferred && !isBlocked) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {isPreferred && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          <Star className="h-3 w-3" />
          Preferred
        </span>
      )}
      {isBlocked && (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
          <Ban className="h-3 w-3" />
          Blocked
        </span>
      )}
    </div>
  );
}

