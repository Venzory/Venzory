'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { toast } from '@/lib/toast';
import { updateStockSettingsAction } from '../actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import type { FormState } from '@/lib/form-types';

interface StockLevelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
  };
  location: {
    id: string;
    name: string;
    reorderPoint: number | null;
    reorderQuantity: number | null;
    maxStock: number | null;
  };
}

const initialState: FormState = {};

export function StockLevelDialog({
  isOpen,
  onClose,
  item,
  location,
}: StockLevelDialogProps) {
  const [state, formAction] = useActionState(updateStockSettingsAction, initialState);
  
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
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Close and toast on success
  useEffect(() => {
    if (state.success) {
      toast.success('Stock levels updated');
      onClose();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
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
        <form action={formAction}>
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="locationId" value={location.id} />

          {/* Header */}
          <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2
                id="dialog-title"
                className="text-xl font-semibold text-slate-900 dark:text-white"
              >
                Stock Levels
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {item.name} at {location.name}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <Input
              label="Min Stock (Reorder Point)"
              name="reorderPoint"
              type="number"
              defaultValue={location.reorderPoint ?? ''}
              placeholder="e.g. 10"
              min="0"
              error={state.errors?.reorderPoint?.[0]}
            />
            <p className="text-xs text-slate-500 -mt-3">
              When stock falls below this level, the item will be flagged for reorder.
            </p>

            <Input
              label="Max Stock"
              name="maxStock"
              type="number"
              defaultValue={location.maxStock ?? ''}
              placeholder="e.g. 50"
              min="0"
              error={state.errors?.maxStock?.[0]}
            />
            <p className="text-xs text-slate-500 -mt-3">
              Target stock level. Used to calculate suggested order quantity.
            </p>

            <Input
              label="Reorder Quantity"
              name="reorderQuantity"
              type="number"
              defaultValue={location.reorderQuantity ?? ''}
              placeholder="Optional"
              min="1"
              error={state.errors?.reorderQuantity?.[0]}
            />
            <p className="text-xs text-slate-500 -mt-3">
              Fixed quantity to order (overrides Max Stock calculation if set).
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <SubmitButton variant="primary" className="min-h-[40px]">
              Save Changes
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}

