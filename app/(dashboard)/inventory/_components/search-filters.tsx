'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface SearchFiltersProps {
  initialSearch?: string;
  initialLocation?: string;
  initialSupplier?: string;
  initialLowStock?: boolean;
  locations: { id: string; name: string; code: string | null }[];
  suppliers: { id: string; name: string }[];
}

export function SearchFilters({
  initialSearch = '',
  initialLocation = '',
  initialSupplier = '',
  initialLowStock = false,
  locations,
  suppliers,
}: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);

  // Sync state with URL on mount
  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  const updateSearchParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      
      router.push(`/inventory?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      updateSearchParams('q', search);
    }
  };

  const handleSearchBlur = () => {
    // Update on blur if value changed
    if (search !== initialSearch) {
      updateSearchParams('q', search);
    }
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSearchParams('location', e.target.value);
  };

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSearchParams('supplier', e.target.value);
  };

  const handleLowStockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSearchParams('lowStock', e.target.checked ? 'true' : '');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onBlur={handleSearchBlur}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>
        
        <div className="flex gap-3">
          <select
            value={initialLocation}
            onChange={handleLocationChange}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
                {location.code ? ` (${location.code})` : ''}
              </option>
            ))}
          </select>

          <select
            value={initialSupplier}
            onChange={handleSupplierChange}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">All suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={initialLowStock}
            onChange={handleLowStockChange}
            className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand dark:border-slate-600"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Show only low stock items
          </span>
        </label>
      </div>
    </div>
  );
}

