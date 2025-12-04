'use client';

import {
  useState,
  useRef,
  useEffect,
  type ReactNode,
  type ReactElement,
  cloneElement,
  isValidElement,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface SidebarTooltipProps {
  /** Tooltip content (label text) */
  content: ReactNode;
  /** Element that triggers the tooltip */
  children: ReactElement;
  /** Whether the tooltip is disabled (e.g., when sidebar is expanded) */
  disabled?: boolean;
  /** Additional class name for the tooltip */
  className?: string;
}

/**
 * SidebarTooltip - Floating label tooltip for collapsed sidebar items
 * Uses fixed positioning with portal for true overlay behavior (no layout shift)
 */
export function SidebarTooltip({
  content,
  children,
  disabled = false,
  className,
}: SidebarTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);

  // Ensure we only render portal on client
  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top + rect.height / 2,
        left: rect.right + 8, // 8px gap from the icon
      });
    }
  };

  const showTooltip = () => {
    if (disabled) return;
    updatePosition();
    setIsVisible(true);
  };

  const hideTooltip = () => {
    setIsVisible(false);
  };

  // Clone child to add event handlers and ref
  const childProps = children.props as Record<string, unknown>;
  const trigger = isValidElement(children)
    ? cloneElement(children, {
        ...childProps,
        ref: triggerRef,
        onMouseEnter: (e: React.MouseEvent) => {
          showTooltip();
          if (typeof childProps.onMouseEnter === 'function') {
            childProps.onMouseEnter(e);
          }
        },
        onMouseLeave: (e: React.MouseEvent) => {
          hideTooltip();
          if (typeof childProps.onMouseLeave === 'function') {
            childProps.onMouseLeave(e);
          }
        },
      } as Record<string, unknown>)
    : children;

  const tooltipElement = isVisible && content && mounted && (
    <div
      className={cn(
        'fixed z-[9999] whitespace-nowrap rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow-lg dark:bg-slate-700',
        'animate-fade-in',
        className
      )}
      style={{
        top: position.top,
        left: position.left,
        transform: 'translateY(-50%)',
      }}
      role="tooltip"
    >
      {content}
    </div>
  );

  return (
    <>
      {trigger}
      {mounted && tooltipElement && createPortal(tooltipElement, document.body)}
    </>
  );
}

