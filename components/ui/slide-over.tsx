'use client';

import { useEffect, useCallback, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SlideOverProps {
  /** Whether the slide-over is open */
  isOpen: boolean;
  /** Callback when the slide-over should close */
  onClose: () => void;
  /** Slide-over title */
  title?: string;
  /** Slide-over description */
  description?: string;
  /** Slide-over content */
  children: ReactNode;
  /** Footer content (typically action buttons) */
  footer?: ReactNode;
  /** Side from which the panel slides in */
  side?: 'left' | 'right';
  /** Size of the slide-over */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Whether to show the close button */
  showCloseButton?: boolean;
  /** Whether clicking the backdrop closes the slide-over */
  closeOnBackdropClick?: boolean;
  /** Whether pressing Escape closes the slide-over */
  closeOnEscape?: boolean;
  /** Additional class name for the panel */
  className?: string;
}

const sizeClasses: Record<NonNullable<SlideOverProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-2xl',
};

/**
 * SlideOver - Side panel drawer for workflows and forms
 */
export function SlideOver({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'right',
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className,
}: SlideOverProps) {
  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && closeOnEscape) {
        onClose();
      }
    },
    [isOpen, onClose, closeOnEscape]
  );

  // Prevent body scroll when slide-over is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Add escape key listener
  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleEscape]);

  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (closeOnBackdropClick) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={handleBackdropClick}
      />

      {/* Panel */}
      <div
        className={cn(
          'absolute inset-y-0 flex max-w-full',
          side === 'right' ? 'right-0' : 'left-0'
        )}
      >
        <div
          className={cn(
            'relative w-screen',
            sizeClasses[size],
            side === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'
          )}
        >
          <div
            className={cn(
              'flex h-full flex-col bg-white shadow-2xl dark:bg-slate-900 dark:border-l dark:border-slate-800',
              side === 'left' && 'dark:border-l-0 dark:border-r',
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                <div className="flex-1">
                  {title && (
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {description}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
                    aria-label="Close panel"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

