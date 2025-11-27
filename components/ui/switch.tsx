'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'role' | 'size'> {
  /** Label text for the switch */
  label?: string;
  /** Description text below the label */
  description?: string;
  /** Size of the switch */
  size?: 'sm' | 'md' | 'lg';
  /** Visual variant */
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const sizeClasses = {
  sm: {
    track: 'h-5 w-9',
    thumb: 'h-4 w-4',
    translateChecked: 'translate-x-4',
    translateUnchecked: 'translate-x-0.5',
  },
  md: {
    track: 'h-6 w-11',
    thumb: 'h-5 w-5',
    translateChecked: 'translate-x-5',
    translateUnchecked: 'translate-x-0.5',
  },
  lg: {
    track: 'h-7 w-14',
    thumb: 'h-6 w-6',
    translateChecked: 'translate-x-7',
    translateUnchecked: 'translate-x-0.5',
  },
};

const variantClasses = {
  default: 'peer-checked:bg-sky-600 dark:peer-checked:bg-sky-600',
  success: 'peer-checked:bg-green-600 dark:peer-checked:bg-green-600',
  warning: 'peer-checked:bg-amber-500 dark:peer-checked:bg-amber-500',
  danger: 'peer-checked:bg-rose-600 dark:peer-checked:bg-rose-600',
};

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      label,
      description,
      size = 'md',
      variant = 'default',
      className,
      id,
      name,
      disabled,
      ...props
    },
    ref
  ) => {
    const switchId = id || name;
    const sizes = sizeClasses[size];

    const SwitchControl = (
      <label
        className={cn(
          'relative inline-flex cursor-pointer items-center',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          id={switchId}
          name={name}
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        {/* Track */}
        <div
          className={cn(
            'rounded-full bg-slate-300 transition-colors duration-200 dark:bg-slate-700',
            variantClasses[variant],
            sizes.track
          )}
        />
        {/* Thumb */}
        <div
          className={cn(
            'absolute rounded-full bg-white shadow-sm transition-transform duration-200',
            sizes.thumb,
            `peer-checked:${sizes.translateChecked}`,
            sizes.translateUnchecked,
            // Inline the transform for peer-checked since dynamic class won't work
            'peer-checked:translate-x-[var(--switch-translate)]'
          )}
          style={{
            '--switch-translate': size === 'sm' ? '1rem' : size === 'lg' ? '1.75rem' : '1.25rem',
          } as React.CSSProperties}
        />
      </label>
    );

    // Without label, return just the switch
    if (!label) {
      return <div className={className}>{SwitchControl}</div>;
    }

    // With label, return labeled version
    return (
      <div className={cn('flex items-start gap-3', className)}>
        {SwitchControl}
        <div className="flex-1">
          <label
            htmlFor={switchId}
            className={cn(
              'text-sm font-medium text-slate-900 dark:text-slate-100',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            {label}
          </label>
          {description && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Switch.displayName = 'Switch';

