'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Search, Filter, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface SupplierCatalogFiltersProps {
  suppliers: { id: string; name: string }[];
  initialSearch?: string;
  initialSupplier?: string;
  initialStatus?: 'all' | 'active' | 'inactive';
}

export function SupplierCatalogFilters({
  suppliers,
  initialSearch = '',
  initialSupplier = 'all',
  initialStatus = 'active',
}: SupplierCatalogFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);
  const [supplier, setSupplier] = useState(initialSupplier);
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>(initialStatus);

  const handleApply = () => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);

      if (search) {
        params.set('q', search);
      } else {
        params.delete('q');
      }

      if (supplier && supplier !== 'all') {
        params.set('supplier', supplier);
      } else {
        params.delete('supplier');
      }

      if (status && status !== 'all') {
        params.set('status', status);
      } else {
        params.delete('status');
      }

      params.delete('page');

      router.push(`/global-supplier-catalog?${params.toString()}`);
    });
  };

  const handleClear = () => {
    setSearch('');
    setSupplier('all');
    setStatus('active');
    startTransition(() => {
      router.push('/global-supplier-catalog');
    });
  };

  const hasFilters =
    Boolean(search) || (supplier && supplier !== 'all') || (status && status !== 'all');

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label
            htmlFor="supplier-search"
            className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Search Products
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="supplier-search"
              type="text"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pl-9 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              placeholder="Search by product, brand, GTIN or SKU..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleApply()}
            />
          </div>
        </div>

        <div className="w-full lg:w-64">
          <label
            htmlFor="supplier-filter"
            className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Supplier
          </label>
          <select
            id="supplier-filter"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            value={supplier}
            onChange={(event) => setSupplier(event.target.value)}
          >
            <option value="all">All Suppliers</option>
            {suppliers.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full lg:w-48">
          <label
            htmlFor="status-filter"
            className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Status
          </label>
          <select
            id="status-filter"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            value={status}
            onChange={(event) => setStatus(event.target.value as 'all' | 'active' | 'inactive')}
          >
            <option value="all">All entries</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button variant="primary" disabled={isPending} onClick={handleApply} className="flex-1">
            <Filter className="mr-2 h-4 w-4" />
            Apply
          </Button>
          {hasFilters && (
            <Button variant="secondary" onClick={handleClear} disabled={isPending}>
              <X className="mr-1 h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

