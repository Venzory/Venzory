import { requireActivePractice } from '@/lib/auth';
import { isPlatformOwner } from '@/lib/owner-guard';
import { notFound } from 'next/navigation';
import { getGlobalSuppliers, getImportHistory } from './actions';
import { ImportPageClient } from './_components/import-page-client';

export default async function OwnerImportPage() {
  const { session } = await requireActivePractice();

  if (!isPlatformOwner(session.user.email)) {
    notFound();
  }

  // Fetch data for the page
  const [suppliers, history] = await Promise.all([
    getGlobalSuppliers(),
    getImportHistory(20),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Bulk Import
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Import supplier catalogs via CSV. Products are matched by GTIN and enriched with GS1 data.
        </p>
      </div>

      {suppliers.length === 0 ? (
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-medium text-slate-900 dark:text-white">
            No Suppliers Found
          </h3>
          <p className="mx-auto max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Please create at least one global supplier before importing catalogs.
            Go to Owner &gt; Suppliers to add suppliers.
          </p>
        </div>
      ) : (
        <ImportPageClient suppliers={suppliers} initialHistory={history} />
      )}
    </div>
  );
}
