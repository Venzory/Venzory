import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  /** Alert variant */
  variant?: AlertVariant;
  /** Alert title */
  title?: string;
  /** Alert content */
  children: ReactNode;
  /** Whether the alert can be dismissed */
  dismissible?: boolean;
  /** Callback when alert is dismissed */
  onDismiss?: () => void;
  /** Custom icon */
  icon?: ReactNode;
  /** Additional class name */
  className?: string;
}

const variantConfig: Record<
  AlertVariant,
  { containerClass: string; iconClass: string; icon: typeof Info }
> = {
  info: {
    containerClass:
      'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
    iconClass: 'text-blue-600 dark:text-blue-400',
    icon: Info,
  },
  success: {
    containerClass:
      'bg-green-50 border-green-200 text-green-900 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
    iconClass: 'text-green-600 dark:text-green-400',
    icon: CheckCircle,
  },
  warning: {
    containerClass:
      'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200',
    iconClass: 'text-amber-600 dark:text-amber-400',
    icon: AlertTriangle,
  },
  error: {
    containerClass:
      'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-200',
    iconClass: 'text-rose-600 dark:text-rose-400',
    icon: XCircle,
  },
};

/**
 * Alert - Inline notification banner for important messages
 */
export function Alert({
  variant = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  icon,
  className,
}: AlertProps) {
  const config = variantConfig[variant];
  const IconComponent = config.icon;

  return (
    <div
      className={cn(
        'relative flex gap-3 rounded-xl border p-4',
        config.containerClass,
        className
      )}
      role="alert"
    >
      <div className={cn('flex-shrink-0', config.iconClass)}>
        {icon || <IconComponent className="h-5 w-5" />}
      </div>

      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="mb-1 font-semibold">{title}</h4>
        )}
        <div className="text-sm">{children}</div>
      </div>

      {dismissible && (
        <button
          onClick={onDismiss}
          className={cn(
            'flex-shrink-0 rounded-lg p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10',
            config.iconClass
          )}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export interface AlertDescriptionProps {
  children: ReactNode;
  className?: string;
}

/**
 * AlertDescription - Additional description text for alerts
 */
export function AlertDescription({ children, className }: AlertDescriptionProps) {
  return (
    <p className={cn('mt-1 text-sm opacity-90', className)}>{children}</p>
  );
}

export interface AlertActionsProps {
  children: ReactNode;
  className?: string;
}

/**
 * AlertActions - Action buttons within an alert
 */
export function AlertActions({ children, className }: AlertActionsProps) {
  return (
    <div className={cn('mt-3 flex gap-2', className)}>{children}</div>
  );
}

