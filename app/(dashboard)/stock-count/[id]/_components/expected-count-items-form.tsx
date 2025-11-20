'use client';

import { useState, useEffect, useActionState } from 'react';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import { addCountLineAction } from '../../actions';

interface ExpectedCountItem {
  itemId: string;
  itemName: string;
  itemSku: string | null;
  unit: string | null;
  systemQuantity: number;
}

interface ExpectedCountItemsFormProps {
  sessionId: string;
  expectedItems: ExpectedCountItem[];
  onSuccess: () => void;
}

export function ExpectedCountItemsForm({
  sessionId,
  expectedItems,
  onSuccess,
}: ExpectedCountItemsFormProps) {
  // Index management
  const [currentIndex, setCurrentIndex] = useState(0);

  // Ensure index is within bounds (safe handling if list shrinks)
  const safeIndex = Math.min(currentIndex, Math.max(0, expectedItems.length - 1));
  const currentItem = expectedItems[safeIndex];
  
  // If list is empty (all done), currentItem is undefined
  const isAllDone = expectedItems.length === 0;
  const isLastItem = safeIndex === expectedItems.length - 1;

  const handleSkip = () => {
    if (safeIndex < expectedItems.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSuccess = () => {
    onSuccess(); // Triggers router.refresh() which removes the counted item
    // We do NOT increment index here. 
    // When the item is removed, the next item naturally slides into the current index.
    // If we were at the last item, safeIndex will clamp it.
  };

  if (isAllDone) {
    return (
      <div className="rounded-lg border-2 border-sky-500 bg-sky-50 p-8 dark:border-sky-600 dark:bg-sky-950/30">
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-400" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">All items counted!</h3>
          <p className="text-slate-600 dark:text-slate-400">
            You have counted all expected items for this location.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            Refresh Results
          </button>
        </div>
      </div>
    );
  }

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
                  ? 'bg-green-600'
                  : idx === safeIndex
                    ? 'bg-sky-600'
                    : 'bg-slate-300 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Render the form for the current item with a key to reset state on change */}
      {currentItem && (
        <SingleItemCountForm
          key={currentItem.itemId}
          sessionId={sessionId}
          item={currentItem}
          isLastItem={isLastItem}
          onSuccess={handleSuccess}
          onSkip={handleSkip}
        />
      )}
    </div>
  );
}

interface SingleItemCountFormProps {
  sessionId: string;
  item: ExpectedCountItem;
  isLastItem: boolean;
  onSuccess: () => void;
  onSkip: () => void;
}

function SingleItemCountForm({
  sessionId,
  item,
  isLastItem,
  onSuccess,
  onSkip,
}: SingleItemCountFormProps) {
  const [state, formAction] = useActionState(addCountLineAction, null);

  useEffect(() => {
    if (state?.success) {
      onSuccess();
    }
  }, [state, onSuccess]);

  return (
    <div className="rounded-lg border-2 border-sky-500 bg-sky-50 p-4 dark:border-sky-600 dark:bg-sky-950/30">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {item.itemName}
        </h3>
        {item.itemSku && (
          <p className="text-xs text-slate-600 dark:text-slate-400">{item.itemSku}</p>
        )}
        <div className="mt-1">
          <p className="text-xs font-medium text-sky-700 dark:text-sky-400">
            System Quantity: {item.systemQuantity} {item.unit || 'units'}
          </p>
        </div>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="itemId" value={item.itemId} />

        {state?.error && (
          <div className="rounded-lg border border-rose-800 bg-rose-900/30 p-4">
            <p className="text-sm text-rose-300">{state.error}</p>
          </div>
        )}

        {state?.success && state?.variance !== undefined && (
          <div
            className={`rounded-lg border p-4 ${
              state.variance === 0
                ? 'border-green-800 bg-green-900/30'
                : state.variance > 0
                  ? 'border-amber-800 bg-amber-900/30'
                  : 'border-rose-800 bg-rose-900/30'
            }`}
          >
            <p
              className={`text-sm font-medium ${
                state.variance === 0
                  ? 'text-green-300'
                  : state.variance > 0
                    ? 'text-amber-300'
                    : 'text-rose-300'
              }`}
            >
              {state.variance === 0
                ? '✓ No variance'
                : state.variance > 0
                  ? `+${state.variance} overage`
                  : `${state.variance} shortage`}
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-800 dark:text-slate-300">
              Counted Quantity *
            </label>
            <input
              type="number"
              name="countedQuantity"
              required
              min="0"
              step="1"
              defaultValue={item.systemQuantity}
              autoFocus
              onFocus={(e) => e.target.select()}
              className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-xs font-medium text-slate-800 dark:text-slate-300">
              Notes (optional)
            </label>
            <input
              type="text"
              name="notes"
              placeholder="e.g. damaged items, expired stock"
              className="w-full max-w-lg rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-3 mt-2 dark:border-slate-700">
          {!isLastItem && (
            <button
              type="button"
              onClick={onSkip}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Skip for Now
            </button>
          )}
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            {isLastItem ? 'Count & Finish' : 'Count & Next'}
            {!isLastItem && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
