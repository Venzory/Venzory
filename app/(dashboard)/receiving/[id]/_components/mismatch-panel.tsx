'use client';

import { useState, useCallback } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  X,
  Check,
  Loader2,
  FileWarning,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { SlideOver } from '@/components/ui/slide-over';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/use-confirm';

export type DiscrepancyType = 'NONE' | 'SHORT' | 'OVER' | 'DAMAGE' | 'SUBSTITUTION' | 'PENDING_BACKORDER';

export interface MismatchItem {
  itemId: string;
  itemName: string;
  itemSku: string | null;
  orderedQuantity: number;
  receivedQuantity: number;
  discrepancy: DiscrepancyType;
  unit: string | null;
}

// Output type for selected mismatches with notes
export interface SelectedMismatch {
  itemId: string;
  type: DiscrepancyType;
  orderedQuantity: number;
  receivedQuantity: number;
  note?: string;
}

interface MismatchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  items: MismatchItem[];
  onConfirmWithMismatches: (selectedMismatches: SelectedMismatch[]) => Promise<void>;
  onIgnoreAndProceed: () => Promise<void>;
  isSubmitting?: boolean;
}

function getDiscrepancyIcon(type: DiscrepancyType) {
  switch (type) {
    case 'SHORT':
      return <ArrowDown className="h-4 w-4" />;
    case 'OVER':
      return <ArrowUp className="h-4 w-4" />;
    case 'DAMAGE':
      return <AlertTriangle className="h-4 w-4" />;
    case 'SUBSTITUTION':
      return <RefreshCw className="h-4 w-4" />;
    case 'PENDING_BACKORDER':
      return <Clock className="h-4 w-4" />;
    default:
      return null;
  }
}

function getDiscrepancyBadgeVariant(type: DiscrepancyType) {
  switch (type) {
    case 'SHORT':
      return 'warning';
    case 'OVER':
      return 'info';
    case 'DAMAGE':
      return 'destructive';
    case 'SUBSTITUTION':
      return 'secondary';
    case 'PENDING_BACKORDER':
      return 'outline';
    default:
      return 'outline';
  }
}

function getDiscrepancyLabel(type: DiscrepancyType, ordered: number, received: number) {
  switch (type) {
    case 'SHORT':
      return `Short (${ordered - received} missing)`;
    case 'OVER':
      return `Over (+${received - ordered} extra)`;
    case 'DAMAGE':
      return 'Damaged';
    case 'SUBSTITUTION':
      return 'Substitution';
    case 'PENDING_BACKORDER':
      return `Backorder (${ordered - received} pending)`;
    default:
      return 'Unknown';
  }
}

interface ItemState {
  selected: boolean;
  note: string;
}

export function MismatchPanel({
  isOpen,
  onClose,
  items,
  onConfirmWithMismatches,
  onIgnoreAndProceed,
  isSubmitting = false,
}: MismatchPanelProps) {
  const confirm = useConfirm();

  // Track selection and notes per item
  const [itemStates, setItemStates] = useState<Map<string, ItemState>>(() => {
    const states = new Map<string, ItemState>();
    for (const item of items) {
      // By default, all items are selected for logging
      states.set(item.itemId, { selected: true, note: '' });
    }
    return states;
  });

  // Reset states when items change
  const resetStates = useCallback(() => {
    const states = new Map<string, ItemState>();
    for (const item of items) {
      states.set(item.itemId, { selected: true, note: '' });
    }
    setItemStates(states);
  }, [items]);

  // Toggle selection for an item
  const toggleSelection = useCallback((itemId: string) => {
    setItemStates((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId);
      if (current) {
        newMap.set(itemId, { ...current, selected: !current.selected });
      }
      return newMap;
    });
  }, []);

  // Update note for an item
  const updateNote = useCallback((itemId: string, note: string) => {
    setItemStates((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId);
      if (current) {
        newMap.set(itemId, { ...current, note });
      }
      return newMap;
    });
  }, []);

  // Select/deselect all
  const selectAll = useCallback(() => {
    setItemStates((prev) => {
      const newMap = new Map(prev);
      for (const [id, state] of newMap) {
        newMap.set(id, { ...state, selected: true });
      }
      return newMap;
    });
  }, []);

  const deselectAll = useCallback(() => {
    setItemStates((prev) => {
      const newMap = new Map(prev);
      for (const [id, state] of newMap) {
        newMap.set(id, { ...state, selected: false });
      }
      return newMap;
    });
  }, []);

  // Count selected items
  const selectedCount = Array.from(itemStates.values()).filter((s) => s.selected).length;
  const allSelected = selectedCount === items.length;
  const noneSelected = selectedCount === 0;

  // Summary counts
  const shortItems = items.filter((i) => i.discrepancy === 'SHORT');
  const overItems = items.filter((i) => i.discrepancy === 'OVER');
  const damageItems = items.filter((i) => i.discrepancy === 'DAMAGE');
  const substitutionItems = items.filter((i) => i.discrepancy === 'SUBSTITUTION');

  // Handle confirm with logging
  const handleConfirmWithMismatches = useCallback(async () => {
    const selectedMismatches: SelectedMismatch[] = items
      .filter((item) => itemStates.get(item.itemId)?.selected)
      .map((item) => ({
        itemId: item.itemId,
        type: item.discrepancy,
        orderedQuantity: item.orderedQuantity,
        receivedQuantity: item.receivedQuantity,
        note: itemStates.get(item.itemId)?.note || undefined,
      }));

    await onConfirmWithMismatches(selectedMismatches);
  }, [items, itemStates, onConfirmWithMismatches]);

  // Handle ignore and proceed with confirmation
  const handleIgnoreAndProceed = useCallback(async () => {
    const confirmed = await confirm({
      title: 'Skip Mismatch Logging?',
      message: `You have ${items.length} discrepanc${items.length === 1 ? 'y' : 'ies'}. Are you sure you want to confirm the receipt without logging them for future reference?`,
      confirmLabel: 'Yes, Skip Logging',
      variant: 'danger',
    });

    if (confirmed) {
      await onIgnoreAndProceed();
    }
  }, [confirm, items.length, onIgnoreAndProceed]);

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title="Review Discrepancies"
      description={`${items.length} item${items.length !== 1 ? 's' : ''} with quantity mismatches`}
      size="lg"
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={handleIgnoreAndProceed}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileWarning className="mr-2 h-4 w-4" />
              )}
              Ignore & Proceed
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmWithMismatches}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              {selectedCount > 0 ? `Log ${selectedCount} & Confirm` : 'Confirm Receipt'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
            <div className="flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Short</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-100">
              {shortItems.length}
            </p>
          </div>

          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-900/20">
            <div className="flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <span className="text-sm font-medium text-sky-800 dark:text-sky-200">Over</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-sky-900 dark:text-sky-100">
              {overItems.length}
            </p>
          </div>

          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-800 dark:bg-rose-900/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              <span className="text-sm font-medium text-rose-800 dark:text-rose-200">Damage</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-rose-900 dark:text-rose-100">
              {damageItems.length}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Subst.</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {substitutionItems.length}
            </p>
          </div>
        </div>

        {/* Selection Controls */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Select Discrepancies to Log
          </h4>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              disabled={allSelected}
              className="text-xs text-sky-600 hover:text-sky-700 disabled:text-slate-400 dark:text-sky-400 dark:hover:text-sky-300"
            >
              Select All
            </button>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <button
              type="button"
              onClick={deselectAll}
              disabled={noneSelected}
              className="text-xs text-sky-600 hover:text-sky-700 disabled:text-slate-400 dark:text-sky-400 dark:hover:text-sky-300"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Discrepancy List with Checkboxes and Notes */}
        <div className="space-y-3">
          {items.map((item) => {
            const state = itemStates.get(item.itemId) ?? { selected: true, note: '' };

            return (
              <div
                key={item.itemId}
                className={`rounded-lg border p-4 transition-colors ${
                  state.selected
                    ? 'border-sky-300 bg-sky-50/50 dark:border-sky-700 dark:bg-sky-900/20'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <label className="mt-1 flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={state.selected}
                      onChange={() => toggleSelection(item.itemId)}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-700"
                    />
                  </label>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {item.itemName}
                        </p>
                        {item.itemSku && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {item.itemSku}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={getDiscrepancyBadgeVariant(item.discrepancy) as any}
                        className="gap-1 flex-shrink-0"
                      >
                        {getDiscrepancyIcon(item.discrepancy)}
                        {getDiscrepancyLabel(
                          item.discrepancy,
                          item.orderedQuantity,
                          item.receivedQuantity
                        )}
                      </Badge>
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <span>
                        Ordered: <strong>{item.orderedQuantity}</strong> {item.unit || 'units'}
                      </span>
                      <span>
                        Received: <strong>{item.receivedQuantity}</strong> {item.unit || 'units'}
                      </span>
                    </div>

                    {/* Note Textarea (shown when selected) */}
                    {state.selected && (
                      <div className="mt-3">
                        <textarea
                          value={state.note}
                          onChange={(e) => updateNote(item.itemId, e.target.value)}
                          placeholder="Add a note about this discrepancy (optional)..."
                          rows={2}
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          maxLength={500}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Note */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <strong>Tip:</strong> Logged discrepancies can be viewed and managed later under{' '}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Receiving → Mismatches
            </span>
            . You can mark them as resolved or flag them for supplier follow-up.
          </p>
        </div>
      </div>
    </SlideOver>
  );
}
