'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DropdownContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const DropdownContext = createContext<DropdownContextValue | undefined>(undefined);

function useDropdownContext() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error('Dropdown components must be used within a DropdownMenu component');
  }
  return context;
}

interface DropdownMenuProps {
  children: ReactNode;
}

/**
 * Root dropdown component that manages open/closed state
 */
export function DropdownMenu({ children }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  );
}

interface DropdownMenuTriggerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Trigger element that toggles the dropdown
 */
export function DropdownMenuTrigger({ children, className }: DropdownMenuTriggerProps) {
  const { isOpen, setIsOpen } = useDropdownContext();

  return (
    <div onClick={() => setIsOpen(!isOpen)} className={className}>
      {children}
    </div>
  );
}

interface DropdownMenuContentProps {
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

/**
 * Container for dropdown items
 */
export function DropdownMenuContent({ children, align = 'right', className }: DropdownMenuContentProps) {
  const { isOpen, setIsOpen } = useDropdownContext();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 mt-2 min-w-[12rem] rounded-lg border border-border bg-card shadow-lg animate-scale-in',
        align === 'right' ? 'right-0' : 'left-0',
        className
      )}
    >
      <div className="py-1">{children}</div>
    </div>
  );
}

interface DropdownMenuItemProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Individual item within a dropdown menu
 */
export function DropdownMenuItem({ children, onClick, className, disabled }: DropdownMenuItemProps) {
  const { setIsOpen } = useDropdownContext();

  const handleClick = () => {
    if (disabled) return;
    onClick?.();
    setIsOpen(false);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'w-full px-4 py-2 text-left text-sm transition',
        disabled
          ? 'cursor-not-allowed text-slate-400 dark:text-slate-600'
          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
        className
      )}
    >
      {children}
    </button>
  );
}

interface DropdownMenuSeparatorProps {
  className?: string;
}

/**
 * Visual separator for dropdown items
 */
export function DropdownMenuSeparator({ className }: DropdownMenuSeparatorProps) {
  return <div className={cn('my-1 border-t border-border', className)} />;
}
