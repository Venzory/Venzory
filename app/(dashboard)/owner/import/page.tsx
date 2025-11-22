import { requireActivePractice } from '@/lib/auth';
import { isPlatformOwner } from '@/lib/owner-guard';
import { notFound } from 'next/navigation';

export default async function OwnerImportPage() {
  const { session } = await requireActivePractice();

  if (!isPlatformOwner(session.user.email)) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Bulk Import
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Centrally manage product data imports.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <svg
            className="h-6 w-6 text-slate-600 dark:text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-medium text-slate-900 dark:text-white">
          Import Functionality Disabled
        </h3>
        <p className="mx-auto max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Bulk product imports are currently disabled pending security review and refactoring.
          Please contact the engineering team to run manual imports via CLI.
        </p>
      </div>
    </div>
  );
}

