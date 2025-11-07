'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function Error({
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
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-rose-900/20 p-6">
            <AlertTriangle className="h-12 w-12 text-rose-500" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-white">Something went wrong</h1>
          <p className="text-slate-400">
            We&apos;re sorry, but an unexpected error occurred. Our team has been notified and
            we&apos;re working to fix the issue.
          </p>
        </div>

        {error.digest && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-500">Error ID: {error.digest}</p>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900/60 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800/60 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

