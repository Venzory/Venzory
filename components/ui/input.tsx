import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, required, name, id, className, ...props }, ref) => {
    const inputId = id || name;

    const inputClasses = cn(
      'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500',
      error
        ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30 dark:border-rose-500'
        : 'border-slate-300 focus:border-sky-500 focus:ring-sky-500/30 dark:border-slate-800',
      className
    );

    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {label}
            {required && <span className="text-rose-600 dark:text-rose-400"> *</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          name={name}
          required={required}
          className={inputClasses}
          {...props}
        />
        {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

