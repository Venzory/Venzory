import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FormFieldProps {
  /** Field label */
  label?: string;
  /** Field description/help text */
  description?: string;
  /** Error message */
  error?: string;
  /** Whether the field is required */
  required?: boolean;
  /** ID for the input (used for label's htmlFor) */
  htmlFor?: string;
  /** The form control (input, select, textarea, etc.) */
  children: ReactNode;
  /** Additional class name */
  className?: string;
}

/**
 * FormField - Wrapper for consistent form field layout with label, description, and error
 */
export function FormField({
  label,
  description,
  error,
  required,
  htmlFor,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          {label}
          {required && (
            <span className="ml-1 text-rose-600 dark:text-rose-400">*</span>
          )}
        </label>
      )}
      {description && !error && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
      {children}
      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      )}
    </div>
  );
}

export interface FormFieldGroupProps {
  /** Field labels/controls to render side by side */
  children: ReactNode;
  /** Number of columns */
  columns?: 2 | 3 | 4;
  /** Additional class name */
  className?: string;
}

const columnClasses = {
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

/**
 * FormFieldGroup - Render multiple fields in a row
 */
export function FormFieldGroup({
  children,
  columns = 2,
  className,
}: FormFieldGroupProps) {
  return (
    <div className={cn('grid gap-4', columnClasses[columns], className)}>
      {children}
    </div>
  );
}

