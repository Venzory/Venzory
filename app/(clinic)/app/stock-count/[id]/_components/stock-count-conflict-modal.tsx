'use client';

import { X, AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

export interface InventoryChange {
  itemId: string;
  itemName: string;
  systemAtCount: number;
  systemNow: number;
  difference: number;
}

interface StockCountConflictModalProps {
  isOpen: boolean;
  changes: InventoryChange[];
  isAdmin: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function StockCountConflictModal({
  isOpen,
  changes,
  isAdmin,
  onClose,
  onConfirm,
}: StockCountConflictModalProps) {
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
        className="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800 animate-scale-in max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 rounded-full bg-amber-100 p-3 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h2
                id="conflict-title"
                className="text-xl font-semibold text-slate-900 dark:text-white"
              >
                Inventory Changed During Count
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                The system inventory for the following items has changed since you started counting.
                {isAdmin
                  ? ' Please review the changes below. You can force apply your count or close to review.'
                  : ' Inventory has changed. Please recount the flagged items to resolve.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content - Scrollable Table */}
        <div className="p-6 overflow-y-auto">
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    Item Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    System (Start)
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    System (Now)
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    Difference
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
                {changes.map((change) => (
                  <tr key={change.itemId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                      {change.itemName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-500 dark:text-slate-400">
                      {change.systemAtCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-500 dark:text-slate-400">
                      {change.systemNow}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          change.difference > 0
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {change.difference > 0 ? '+' : ''}
                        {change.difference}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-xl">
          <button
            onClick={onClose}
            className="min-h-[48px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Close & Review
          </button>
          {isAdmin && (
            <button
              onClick={onConfirm}
              className="min-h-[48px] rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 dark:bg-rose-600 dark:hover:bg-rose-700"
            >
              Force Apply Adjustments
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

