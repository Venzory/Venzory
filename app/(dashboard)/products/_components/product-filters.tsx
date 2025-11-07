'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

export function ProductFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQuery = searchParams.get('q') ?? '';
  const currentStatus = searchParams.get('status') ?? '';

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('q') as string;
    const status = formData.get('status') as string;

    const params = new URLSearchParams();
    if (query?.trim()) {
      params.set('q', query.trim());
    }
    if (status && status !== 'all') {
      params.set('status', status);
    }

    startTransition(() => {
      router.push(`/products?${params.toString()}`);
    });
  };

  const handleClear = () => {
    startTransition(() => {
      router.push('/products');
    });
  };

  const hasActiveFilters = currentQuery || currentStatus;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <label htmlFor="search-query" className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Search products
          </label>
          <input
            id="search-query"
            name="q"
            type="text"
            placeholder="Search by name, brand, or GTIN..."
            defaultValue={currentQuery}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-2 sm:w-48">
          <label htmlFor="filter-status" className="text-xs font-medium text-slate-600 dark:text-slate-400">
            GS1 Status
          </label>
          <select
            id="filter-status"
            name="status"
            defaultValue={currentStatus || 'all'}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="all">All statuses</option>
            <option value="UNVERIFIED">Unverified</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="FAILED">Failed</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? 'Filtering...' : 'Filter'}
          </button>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={handleClear}
              disabled={isPending}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Clear
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

