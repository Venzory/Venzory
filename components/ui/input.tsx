import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type InputVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

/**
 * Input component props
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Label text for the input */
  label?: string;
  /** Error message to display below input */
  error?: string;
  /** Visual variant of the input */
  variant?: InputVariant;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, variant = 'primary', required, name, id, className, ...props }, ref) => {
    const inputId = id || name;

    // Force destructive variant if there's an error
    const effectiveVariant = error ? 'destructive' : variant;

    const baseStyles = 'w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50';

    const variantStyles: Record<InputVariant, string> = {
      primary: 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-sky-500/30 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500',
      secondary: 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:ring-slate-400/30 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100',
      destructive: 'bg-white border-rose-500 text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:ring-rose-500/30 dark:bg-slate-900 dark:border-rose-500 dark:text-slate-100',
      ghost: 'bg-transparent border-transparent text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-500 focus:ring-sky-500/30 dark:text-slate-100 dark:focus:bg-slate-900',
    };

    return (
      <div className="space-y-3">
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
          className={cn(baseStyles, variantStyles[effectiveVariant], className)}
          {...props}
        />
        {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
