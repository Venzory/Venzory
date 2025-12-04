'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';

interface MyCatalogFiltersProps {
  initialSearch?: string;
  initialSupplier?: string;
  initialLowStock?: boolean;
  suppliers: Array<{ id: string; name: string }>;
}

export function MyCatalogFilters({
  initialSearch = '',
  initialSupplier = '',
  initialLowStock = false,
  suppliers,
}: MyCatalogFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  const [search, setSearch] = useState(initialSearch);
  const [supplier, setSupplier] = useState(initialSupplier);
  const [lowStock, setLowStock] = useState(initialLowStock);

  const handleSearch = () => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      
      if (search) {
        params.set('q', search);
      } else {
        params.delete('q');
      }
      
      if (supplier) {
        params.set('supplier', supplier);
      } else {
        params.delete('supplier');
      }

      if (lowStock) {
        params.set('lowStock', 'true');
      } else {
        params.delete('lowStock');
      }

      router.push(`/my-items?${params.toString()}`);
    });
  };

  const handleClear = () => {
    setSearch('');
    setSupplier('');
    setLowStock(false);
    startTransition(() => {
      router.push('/app/my-items');
    });
  };

  const hasFilters = search || supplier || lowStock;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor="search"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Search Items
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="search"
              type="text"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full rounded-md border border-slate-300 bg-white pl-9 pr-4 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>
        </div>

        <div className="w-full sm:w-64">
          <label
            htmlFor="supplier"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Filter by Supplier
          </label>
          <select
            id="supplier"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSearch}
            disabled={isPending}
            variant="primary"
          >
            {isPending ? 'Searching...' : 'Search'}
          </Button>
          
        {hasFilters && (
          <Button
            onClick={handleClear}
            disabled={isPending}
            variant="secondary"
          >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={lowStock}
            onChange={(e) => setLowStock(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Show only low stock items
          </span>
        </label>
      </div>
    </div>
  );
}

