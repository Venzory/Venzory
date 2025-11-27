import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, type TooltipPlacement } from './tooltip';

export type IconButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The icon to display */
  icon: ReactNode;
  /** Accessible label for the button (required for accessibility) */
  'aria-label': string;
  /** Tooltip text (uses aria-label if not provided) */
  tooltip?: string;
  /** Tooltip placement */
  tooltipPlacement?: TooltipPlacement;
  /** Visual variant */
  variant?: IconButtonVariant;
  /** Button size */
  size?: IconButtonSize;
  /** Show loading state */
  loading?: boolean;
}

const variantClasses: Record<IconButtonVariant, string> = {
  primary:
    'bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-500 disabled:hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700',
  secondary:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
  destructive:
    'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 disabled:hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700',
};

const sizeClasses: Record<IconButtonSize, { button: string; icon: string }> = {
  sm: {
    button: 'h-8 w-8',
    icon: 'h-4 w-4',
  },
  md: {
    button: 'h-10 w-10',
    icon: 'h-5 w-5',
  },
  lg: {
    button: 'h-12 w-12',
    icon: 'h-6 w-6',
  },
};

/**
 * IconButton - A button that displays only an icon with an accessible label
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      'aria-label': ariaLabel,
      tooltip,
      tooltipPlacement = 'top',
      variant = 'ghost',
      size = 'md',
      loading = false,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const sizes = sizeClasses[size];
    const tooltipText = tooltip || ariaLabel;

    const button = (
      <button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        aria-label={ariaLabel}
        className={cn(
          'inline-flex items-center justify-center rounded-lg transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'dark:focus:ring-offset-slate-900',
          variantClasses[variant],
          sizes.button,
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className={cn('animate-spin', sizes.icon)} />
        ) : (
          <span className={sizes.icon}>{icon}</span>
        )}
      </button>
    );

    // Wrap with tooltip if not disabled and not loading
    if (!disabled && !loading && tooltipText) {
      return (
        <Tooltip content={tooltipText} placement={tooltipPlacement}>
          {button}
        </Tooltip>
      );
    }

    return button;
  }
);

IconButton.displayName = 'IconButton';

