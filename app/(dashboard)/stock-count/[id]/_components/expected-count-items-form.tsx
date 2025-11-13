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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [formKey, setFormKey] = useState(0);
  const [state, formAction] = useActionState(addCountLineAction, null);

  const currentItem = expectedItems[currentIndex];
  const isLastItem = currentIndex === expectedItems.length - 1;

  // Handle successful submission
  useEffect(() => {
    if (state?.success) {
      onSuccess();
      if (!isLastItem) {
        setCurrentIndex((prev) => prev + 1);
        setFormKey((prev) => prev + 1);
      }
    }
  }, [state, onSuccess, isLastItem]);

  const handleSkip = () => {
    if (!isLastItem) {
      setCurrentIndex((prev) => prev + 1);
      setFormKey((prev) => prev + 1);
    }
  };

  const handleCountAndNext = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const form = event.currentTarget.form;
    if (form) {
      const formData = new FormData(form);
      formAction(formData);
    }
  };

  return (
    <div className="space-y-3">
      {/* Progress indicator */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600 dark:text-slate-400">
          Item {currentIndex + 1} of {expectedItems.length}
        </span>
        <div className="flex gap-1">
          {expectedItems.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 w-8 rounded-full ${
                idx < currentIndex
                  ? 'bg-green-600'
                  : idx === currentIndex
                    ? 'bg-sky-600'
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
            <div className="mt-1">
              <p className="text-xs font-medium text-sky-700 dark:text-sky-400">
                System Quantity: {currentItem.systemQuantity} {currentItem.unit || 'units'}
              </p>
            </div>
          </div>
        </div>

        {isLastItem && state?.success ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="h-12 w-12 text-green-400" />
            <p className="text-lg font-medium text-green-400">All items counted!</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
            >
              View Results
            </button>
          </div>
        ) : (
          <form key={formKey} action={formAction} className="space-y-3">
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="itemId" value={currentItem.itemId} />

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
                  defaultValue={currentItem.systemQuantity}
                  autoFocus
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
                  onClick={handleSkip}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Skip for Now
                </button>
              )}
              <button
                type="button"
                onClick={handleCountAndNext}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
              >
                {isLastItem ? 'Count & Finish' : 'Count & Next'}
                {!isLastItem && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

