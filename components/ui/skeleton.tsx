import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

/**
 * Base Skeleton component - an animated loading placeholder
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-slate-200 dark:bg-slate-700',
        className
      )}
    />
  );
}

interface SkeletonTextProps {
  /** Number of lines to display */
  lines?: number;
  /** Width of the last line (percentage or Tailwind class) */
  lastLineWidth?: string;
  className?: string;
}

/**
 * SkeletonText - Multiple lines of skeleton text
 */
export function SkeletonText({
  lines = 3,
  lastLineWidth = 'w-3/4',
  className,
}: SkeletonTextProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 ? lastLineWidth : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

interface SkeletonCircleProps {
  /** Size of the circle */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const circleSizes = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

/**
 * SkeletonCircle - Circular skeleton for avatars and icons
 */
export function SkeletonCircle({ size = 'md', className }: SkeletonCircleProps) {
  return (
    <Skeleton
      className={cn('rounded-full', circleSizes[size], className)}
    />
  );
}

interface SkeletonCardProps {
  /** Whether to show a header section */
  showHeader?: boolean;
  /** Number of content lines */
  contentLines?: number;
  /** Whether to show a footer/action section */
  showFooter?: boolean;
  className?: string;
}

/**
 * SkeletonCard - A complete card skeleton with header, content, and footer
 */
export function SkeletonCard({
  showHeader = true,
  contentLines = 3,
  showFooter = false,
  className,
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60',
        className
      )}
    >
      {showHeader && (
        <div className="mb-4 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      )}

      <SkeletonText lines={contentLines} />

      {showFooter && (
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      )}
    </div>
  );
}

interface SkeletonTableProps {
  /** Number of rows */
  rows?: number;
  /** Number of columns */
  columns?: number;
  /** Whether to show a header row */
  showHeader?: boolean;
  className?: string;
}

/**
 * SkeletonTable - A table skeleton with configurable rows and columns
 */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
}: SkeletonTableProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60',
        className
      )}
    >
      <table className="w-full">
        {showHeader && (
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <Skeleton
                    className={cn(
                      'h-4',
                      colIndex === 0 ? 'w-32' : 'w-24'
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface SkeletonListProps {
  /** Number of items */
  items?: number;
  /** Whether to show an avatar/icon on each item */
  showAvatar?: boolean;
  className?: string;
}

/**
 * SkeletonList - A list of skeleton items
 */
export function SkeletonList({
  items = 5,
  showAvatar = true,
  className,
}: SkeletonListProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {showAvatar && <SkeletonCircle size="md" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface SkeletonKPIProps {
  className?: string;
}

/**
 * SkeletonKPI - A KPI card skeleton
 */
export function SkeletonKPI({ className }: SkeletonKPIProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-4 w-28" />
        </div>
        <SkeletonCircle size="lg" />
      </div>
    </div>
  );
}

interface SkeletonPageHeaderProps {
  /** Whether to show the action button */
  showAction?: boolean;
  className?: string;
}

/**
 * SkeletonPageHeader - A page header skeleton matching PageHeader component
 */
export function SkeletonPageHeader({
  showAction = true,
  className,
}: SkeletonPageHeaderProps) {
  return (
    <header className={cn('space-y-4', className)}>
      <Skeleton className="h-3 w-20" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        {showAction && <Skeleton className="h-11 w-32 rounded-xl" />}
      </div>
    </header>
  );
}

