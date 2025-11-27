import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  /** Label to display */
  label: string;
  /** URL to link to (if clickable) */
  href?: string;
}

export interface BreadcrumbProps {
  /** Breadcrumb items */
  items: BreadcrumbItem[];
  /** Whether to show home icon as first item */
  showHome?: boolean;
  /** Home URL */
  homeHref?: string;
  /** Additional class name */
  className?: string;
}

/**
 * Breadcrumb - Navigation trail showing the current location
 */
export function Breadcrumb({
  items,
  showHome = true,
  homeHref = '/dashboard',
  className,
}: BreadcrumbProps) {
  if (items.length === 0 && !showHome) {
    return null;
  }

  return (
    <nav
      className={cn('flex items-center gap-1 text-sm', className)}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center gap-1">
        {showHome && (
          <li className="flex items-center">
            <Link
              href={homeHref}
              className="flex items-center text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              aria-label="Home"
            >
              <Home className="h-4 w-4" />
            </Link>
          </li>
        )}

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center">
              <ChevronRight className="mx-1 h-4 w-4 text-slate-400 dark:text-slate-600" />
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    isLast
                      ? 'font-medium text-slate-900 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * BreadcrumbSeparator - Standalone separator for custom breadcrumb layouts
 */
export function BreadcrumbSeparator({ className }: { className?: string }) {
  return (
    <ChevronRight
      className={cn('h-4 w-4 text-slate-400 dark:text-slate-600', className)}
      aria-hidden="true"
    />
  );
}

