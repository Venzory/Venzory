import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Select component props
 */
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Label text for the select */
  label?: string;
  /** Error message to display below select */
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, required, name, id, className, children, ...props }, ref) => {
    const selectId = id || name;

    const baseStyles = 'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:text-slate-100';
    
    // Determine border/ring colors based on error state
    const stateStyles = error
      ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30 dark:border-rose-500'
      : 'border-slate-300 focus:border-sky-500 focus:ring-sky-500/30 dark:border-slate-800';

    return (
      <div className="space-y-3">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {label}
            {required && <span className="text-rose-600 dark:text-rose-400"> *</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          name={name}
          required={required}
          className={cn(baseStyles, stateStyles, className)}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
