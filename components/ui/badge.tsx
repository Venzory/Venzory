import type { ReactNode, HTMLAttributes } from 'react';

export type BadgeVariant = 'success' | 'error' | 'info' | 'warning' | 'neutral';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

export function Badge({ variant = 'neutral', children, className = '', ...props }: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    success: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
    error: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700',
    info: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600',
  };

  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

