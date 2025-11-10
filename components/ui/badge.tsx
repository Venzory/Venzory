import type { ReactNode, HTMLAttributes } from 'react';

export type BadgeVariant = 'success' | 'error' | 'info' | 'warning' | 'neutral';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

export function Badge({ variant = 'neutral', children, className = '', ...props }: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    success: 'bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
    error: 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700',
    info: 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    warning: 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
    neutral: 'bg-slate-200 text-slate-800 border border-slate-400 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600',
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

