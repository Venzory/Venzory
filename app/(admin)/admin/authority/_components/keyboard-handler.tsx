'use client';

import { useEffect, useCallback } from 'react';

interface KeyboardHandlerProps {
  /** Array of item IDs in order */
  itemIds: string[];
  /** Currently selected item ID */
  selectedId: string | null;
  /** Callback when selection changes */
  onSelect: (id: string) => void;
  /** Callback for confirm action */
  onConfirm: () => void;
  /** Callback for reassign action */
  onReassign: () => void;
  /** Callback for create new action */
  onCreate: () => void;
  /** Callback for merge action */
  onMerge: () => void;
  /** Callback for ignore action */
  onIgnore: () => void;
  /** Callback for search focus */
  onSearch: () => void;
  /** Whether keyboard shortcuts are enabled */
  enabled?: boolean;
  /** Whether an action panel is open */
  isPanelOpen?: boolean;
}

/**
 * Keyboard shortcut handler for triage workflow
 * 
 * Shortcuts:
 * - j / ArrowDown: Next item
 * - k / ArrowUp: Previous item
 * - c: Confirm match
 * - r: Open reassign search
 * - n: Create new product
 * - m: Open merge dialog
 * - x: Ignore item
 * - /: Focus search
 * - Esc: Close panel / clear selection
 */
export function useKeyboardShortcuts({
  itemIds,
  selectedId,
  onSelect,
  onConfirm,
  onReassign,
  onCreate,
  onMerge,
  onIgnore,
  onSearch,
  enabled = true,
  isPanelOpen = false,
}: KeyboardHandlerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't handle if shortcuts are disabled
      if (!enabled) return;

      // Don't handle if typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // But still handle Escape
        if (e.key === 'Escape') {
          (target as HTMLInputElement).blur();
          return;
        }
        return;
      }

      // If a panel is open, only handle Escape
      if (isPanelOpen) {
        return;
      }

      const currentIndex = selectedId ? itemIds.indexOf(selectedId) : -1;

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          if (itemIds.length > 0) {
            const nextIndex = currentIndex < itemIds.length - 1 ? currentIndex + 1 : 0;
            onSelect(itemIds[nextIndex]);
          }
          break;

        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          if (itemIds.length > 0) {
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : itemIds.length - 1;
            onSelect(itemIds[prevIndex]);
          }
          break;

        case 'c':
          e.preventDefault();
          if (selectedId) {
            onConfirm();
          }
          break;

        case 'r':
          e.preventDefault();
          if (selectedId) {
            onReassign();
          }
          break;

        case 'n':
          e.preventDefault();
          if (selectedId) {
            onCreate();
          }
          break;

        case 'm':
          e.preventDefault();
          if (selectedId) {
            onMerge();
          }
          break;

        case 'x':
          e.preventDefault();
          if (selectedId) {
            onIgnore();
          }
          break;

        case '/':
          e.preventDefault();
          onSearch();
          break;

        case 'Escape':
          e.preventDefault();
          // Clear selection or close any open state
          if (selectedId) {
            // Don't clear selection, just blur any focused element
            (document.activeElement as HTMLElement)?.blur();
          }
          break;

        default:
          break;
      }
    },
    [
      enabled,
      isPanelOpen,
      itemIds,
      selectedId,
      onSelect,
      onConfirm,
      onReassign,
      onCreate,
      onMerge,
      onIgnore,
      onSearch,
    ]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Visual keyboard shortcut hints component
 */
export function KeyboardHints({ className }: { className?: string }) {
  const shortcuts = [
    { key: 'j/k', action: 'Navigate' },
    { key: 'c', action: 'Confirm' },
    { key: 'r', action: 'Reassign' },
    { key: 'n', action: 'Create' },
    { key: 'm', action: 'Merge' },
    { key: 'x', action: 'Ignore' },
    { key: '/', action: 'Search' },
  ];

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium">Shortcuts:</span>
        {shortcuts.map(({ key, action }) => (
          <span key={key} className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">
              {key}
            </kbd>
            <span>{action}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

