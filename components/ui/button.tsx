import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', children, className, disabled, ...props }, ref) => {
    const baseStyles = 'rounded-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantStyles: Record<ButtonVariant, string> = {
      primary: 'bg-sky-600 text-white hover:bg-sky-700 active:scale-[0.98] focus:ring-sky-500 dark:bg-sky-600 dark:hover:bg-sky-700',
      secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
      danger: 'bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98] focus:ring-rose-500 dark:bg-rose-600 dark:hover:bg-rose-700',
      ghost: 'text-slate-700 hover:bg-slate-100 focus:ring-slate-500 dark:text-slate-300 dark:hover:bg-slate-800',
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-xs min-h-[36px]',
      md: 'px-4 py-2 text-sm min-h-[48px]',
      lg: 'px-6 py-3 text-base min-h-[52px]',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

