import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FormSectionProps {
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Form fields */
  children: ReactNode;
  /** Additional class name */
  className?: string;
}

/**
 * FormSection - Groups related form fields with an optional title and description
 */
export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export interface FormActionsProps {
  /** Action buttons */
  children: ReactNode;
  /** Alignment of actions */
  align?: 'left' | 'center' | 'right' | 'between';
  /** Additional class name */
  className?: string;
}

const alignClasses = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
  between: 'justify-between',
};

/**
 * FormActions - Container for form action buttons
 */
export function FormActions({
  children,
  align = 'right',
  className,
}: FormActionsProps) {
  return (
    <div className={cn('flex items-center gap-3 pt-4', alignClasses[align], className)}>
      {children}
    </div>
  );
}

export interface FormDividerProps {
  /** Optional label for the divider */
  label?: string;
  /** Additional class name */
  className?: string;
}

/**
 * FormDivider - Visual separator between form sections
 */
export function FormDivider({ label, className }: FormDividerProps) {
  if (label) {
    return (
      <div className={cn('relative py-4', className)}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-800" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            {label}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'my-6 border-t border-slate-200 dark:border-slate-800',
        className
      )}
    />
  );
}

