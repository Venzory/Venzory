import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Textarea component props
 */
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Label text for the textarea */
  label?: string;
  /** Error message to display below textarea */
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, required, name, id, className, ...props }, ref) => {
    const textareaId = id || name;

    const baseStyles = 'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500';

    // Determine border/ring colors based on error state
    const stateStyles = error
      ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30 dark:border-rose-500'
      : 'border-slate-300 focus:border-sky-500 focus:ring-sky-500/30 dark:border-slate-800';

    return (
      <div className="space-y-3">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {label}
            {required && <span className="text-rose-600 dark:text-rose-400"> *</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          name={name}
          required={required}
          className={cn(baseStyles, stateStyles, className)}
          {...props}
        />
        {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
