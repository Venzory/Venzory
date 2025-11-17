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
    const baseStyles = 'rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none dark:focus:ring-offset-slate-900';
    
    const variantStyles: Record<ButtonVariant, string> = {
      primary: 'bg-sky-600 text-white hover:bg-sky-700 hover:shadow-md active:scale-[0.98] focus:ring-sky-500 disabled:hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700 dark:disabled:hover:bg-sky-600',
      secondary: 'border-2 border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-400 hover:shadow-sm active:scale-[0.98] focus:ring-slate-500 disabled:hover:bg-transparent disabled:hover:border-slate-300 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800/50 dark:hover:border-slate-500 dark:disabled:hover:bg-transparent dark:disabled:hover:border-slate-600',
      danger: 'bg-rose-600 text-white hover:bg-rose-700 hover:shadow-md active:scale-[0.98] focus:ring-rose-500 disabled:hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 dark:disabled:hover:bg-rose-600',
      ghost: 'text-slate-700 hover:bg-slate-100 hover:shadow-sm active:scale-[0.98] focus:ring-slate-500 disabled:hover:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800 dark:disabled:hover:bg-transparent',
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-xs min-h-[36px]',
      md: 'px-4 py-2 text-sm min-h-[44px]',
      lg: 'px-6 py-3 text-base min-h-[48px]',
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

