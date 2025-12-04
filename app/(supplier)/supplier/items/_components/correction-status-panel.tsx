'use client';

import { Clock, CheckCircle2, XCircle, FileEdit, Send } from 'lucide-react';

interface CorrectionStatusPanelProps {
  stats: {
    draft: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  onSubmit?: () => void;
  isSubmitting?: boolean;
}

export function CorrectionStatusPanel({ 
  stats, 
  onSubmit,
  isSubmitting = false,
}: CorrectionStatusPanelProps) {
  const totalActive = stats.draft + stats.pending;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Status counts */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <FileEdit className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Draft</div>
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {stats.draft}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Pending</div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {stats.pending}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Approved</div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {stats.approved}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-900/30">
              <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Rejected</div>
              <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                {stats.rejected}
              </div>
            </div>
          </div>
        </div>

        {/* Submit button */}
        {stats.draft > 0 && onSubmit && (
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {stats.draft} correction{stats.draft !== 1 ? 's' : ''} ready to submit
            </div>
            <button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
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
        )}
      </div>

      {/* Info text */}
      {totalActive === 0 && (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          No pending corrections. Edit items below to propose changes.
        </p>
      )}

      {stats.pending > 0 && (
        <p className="mt-4 text-sm text-blue-700 dark:text-blue-300">
          {stats.pending} correction{stats.pending !== 1 ? 's are' : ' is'} awaiting admin review.
        </p>
      )}
    </div>
  );
}

