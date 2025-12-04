'use client';

import { useState, useTransition } from 'react';
import { Send, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { submitCorrectionsAction } from '../actions';

interface SubmitCorrectionsDialogProps {
  draftCount: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SubmitCorrectionsDialog({
  draftCount,
  isOpen,
  onClose,
  onSuccess,
}: SubmitCorrectionsDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = () => {
    startTransition(async () => {
      const response = await submitCorrectionsAction();
      
      if (response.success) {
        setResult({
          success: true,
          message: `Successfully submitted ${response.submittedCount} correction${response.submittedCount !== 1 ? 's' : ''} for review.`,
        });
        // Auto-close after success
        setTimeout(() => {
          onSuccess();
          setResult(null);
        }, 2000);
      } else {
        setResult({
          success: false,
          message: response.error ?? 'Failed to submit corrections',
        });
      }
    });
  };

  const handleClose = () => {
    if (!isPending) {
      setResult(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        {/* Close button */}
        <button
          onClick={handleClose}
          disabled={isPending}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        {result ? (
          <div className="text-center">
            {result.success ? (
              <>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                  Corrections Submitted
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {result.message}
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
                  <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                  Submission Failed
                </h3>
                <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">
                  {result.message}
                </p>
                <button
                  onClick={() => setResult(null)}
                  className="mt-4 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Try Again
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/30">
                <Send className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Submit Corrections
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {draftCount} correction{draftCount !== 1 ? 's' : ''} ready to submit
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-900/20">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium">Review before submitting</p>
                  <p className="mt-1 text-amber-700 dark:text-amber-300">
                    Once submitted, corrections cannot be modified until reviewed by an administrator.
                    GTIN changes will be validated against the GS1 database.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleClose}
                disabled={isPending}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit for Review
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

