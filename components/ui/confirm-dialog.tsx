'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'neutral';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'neutral',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Prevent body scroll when dialog is open
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

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const confirmButtonClass =
    variant === 'danger'
      ? 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 dark:bg-rose-600 dark:hover:bg-rose-700'
      : 'bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-500 dark:bg-sky-600 dark:hover:bg-sky-700';

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 animate-fade-in"
      onClick={onCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <h2
            id="dialog-title"
            className="text-xl font-semibold text-slate-900 dark:text-white"
          >
            {title}
          </h2>
          <button
            onClick={onCancel}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="min-h-[48px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`min-h-[48px] rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmButtonClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

