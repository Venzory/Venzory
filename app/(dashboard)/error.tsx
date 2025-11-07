'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-rose-900/20 p-6 dark:bg-rose-500/10">
            <AlertTriangle className="h-12 w-12 text-rose-600 dark:text-rose-500" />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Oops! Something went wrong
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            We encountered an unexpected error while loading this page. Our team has been notified.
          </p>
        </div>

        {error.digest && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Error ID: {error.digest}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white dark:hover:bg-slate-800/60 dark:focus:ring-offset-slate-950"
          >
            Back to Dashboard Home
          </Link>
        </div>
      </div>
    </div>
  );
}

