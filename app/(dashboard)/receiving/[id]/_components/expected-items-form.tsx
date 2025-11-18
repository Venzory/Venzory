'use client';

import { useState, useEffect } from 'react';
import { useActionState } from 'react';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import { addReceiptLineAction } from '../../actions';

interface ExpectedItem {
  itemId: string;
  itemName: string;
  itemSku: string | null;
  orderedQuantity: number;
  alreadyReceived: number;
  remainingQuantity: number;
  unit: string | null;
}

interface ExpectedItemsFormProps {
  receiptId: string;
  expectedItems: ExpectedItem[];
  receivedItemIds: Set<string>;
  onSuccess: () => void;
}

export function ExpectedItemsForm({
  receiptId,
  expectedItems,
  receivedItemIds,
  onSuccess,
}: ExpectedItemsFormProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [state, formAction] = useActionState(addReceiptLineAction, null);
  const [formKey, setFormKey] = useState(0);

  // Ensure currentIndex is within bounds
  const safeIndex = Math.min(currentIndex, expectedItems.length - 1);
  const currentItem = expectedItems[safeIndex];
  const isLastItem = safeIndex === expectedItems.length - 1;
  const alreadyReceived = currentItem ? receivedItemIds.has(currentItem.itemId) : false;
  const isFullyReceived = currentItem ? currentItem.remainingQuantity === 0 : false;

  // Reset form and move to next item on success
  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        if (isLastItem) {
          onSuccess();
        } else {
          setCurrentIndex((prev) => prev + 1);
          setFormKey((prev) => prev + 1); // Force form reset
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state?.success, isLastItem, onSuccess]);

  // Guard against empty or invalid expectedItems
  if (!expectedItems || expectedItems.length === 0) {
    return null;
  }
  
  // Guard against invalid currentItem
  if (!currentItem || !currentItem.itemId) {
    return null;
  }

  const handleSkip = () => {
    if (!isLastItem) {
      setCurrentIndex((prev) => prev + 1);
      setFormKey((prev) => prev + 1);
    }
  };

  return (
    <div className="space-y-3">
      {/* Progress indicator */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600 dark:text-slate-400">
          Item {safeIndex + 1} of {expectedItems.length}
        </span>
        <div className="flex gap-1">
          {expectedItems.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 w-8 rounded-full ${
                idx < safeIndex
                  ? 'bg-green-500'
                  : idx === safeIndex
                    ? 'bg-sky-500'
                    : 'bg-slate-300 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Current item card */}
      <div className="rounded-lg border-2 border-sky-500 bg-sky-50 p-4 dark:border-sky-600 dark:bg-sky-950/30">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {currentItem.itemName}
            </h3>
            {currentItem.itemSku && (
              <p className="text-xs text-slate-600 dark:text-slate-400">{currentItem.itemSku}</p>
            )}
            <div className="mt-1 space-y-0.5">
              <p className="text-xs font-medium text-sky-700 dark:text-sky-400">
                Ordered: {currentItem.orderedQuantity} {currentItem.unit || 'units'}
              </p>
              {currentItem.alreadyReceived > 0 && (
                <>
                  <p className="text-xs text-green-400">
                    Already received: {currentItem.alreadyReceived} {currentItem.unit || 'units'}
                  </p>
                  <p className="text-xs font-semibold text-amber-400">
                    Remaining: {currentItem.remainingQuantity} {currentItem.unit || 'units'}
                  </p>
                </>
              )}
            </div>
          </div>
          {isFullyReceived && (
            <div className="flex items-center gap-2 rounded-full bg-green-900/30 px-3 py-1 text-sm text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Fully Received
            </div>
          )}
        </div>

        {isFullyReceived ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSkip}
              disabled={isLastItem}
              className="flex items-center gap-2 rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-600 disabled:opacity-50"
            >
              {isLastItem ? 'All items received' : 'Next Item'}
              {!isLastItem && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          <form key={formKey} action={formAction} className="space-y-3">
            <input type="hidden" name="receiptId" value={receiptId} />
            <input type="hidden" name="itemId" value={currentItem.itemId} />

            {state?.error && (
              <div className="rounded-lg bg-rose-900/20 border border-rose-800 p-4">
                <p className="text-sm text-rose-300">{state.error}</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              {/* Quantity */}
              <div className="space-y-2">
                <label
                  htmlFor="quantity"
                  className="block text-sm font-medium text-slate-800 dark:text-slate-200"
                >
                  Received Quantity *
                </label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  required
                  min="1"
                  step="1"
                  defaultValue={currentItem.alreadyReceived > 0 ? currentItem.remainingQuantity : currentItem.orderedQuantity}
                  className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  autoFocus
                />
              </div>

              {/* Batch/Lot Number */}
              <div className="space-y-2">
                <label
                  htmlFor="batchNumber"
                  className="block text-sm font-medium text-slate-800 dark:text-slate-200"
                >
                  Batch / Lot Number
                </label>
                <input
                  type="text"
                  id="batchNumber"
                  name="batchNumber"
                  maxLength={128}
                  placeholder="e.g. LOT12345"
                  className="max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600"
                />
              </div>

              {/* Expiry Date */}
              <div className="space-y-2">
                <label
                  htmlFor="expiryDate"
                  className="block text-sm font-medium text-slate-800 dark:text-slate-200"
                >
                  Expiry Date (THT)
                </label>
                <input
                  type="date"
                  id="expiryDate"
                  name="expiryDate"
                  className="w-40 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-end mt-2">
              {!isLastItem && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Skip for Now
                </button>
              )}
              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                {isLastItem ? 'Receive Last Item' : 'Receive & Next'}
                {!isLastItem && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

