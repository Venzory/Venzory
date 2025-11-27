'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

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
  
  // Debounce the search term to avoid excessive URL updates
  const debouncedSearch = useDebounce(search, 300);

  // Sync state with URL on mount
  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  // Update URL when debounced search value changes
  useEffect(() => {
    // Skip if we're waiting for the debounce timer (value is unstable)
    if (search !== debouncedSearch) {
      return;
    }

    const currentQ = searchParams.get('q') || '';
    
    // Skip if the value matches the current URL (prevents loops and overwrite on navigation)
    if (debouncedSearch === currentQ) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    
    if (debouncedSearch) {
      params.set('q', debouncedSearch);
    } else {
      params.delete('q');
    }
    
    // Reset to page 1 when search changes
    params.delete('page');
    
    router.push(`/inventory?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, search]);

  const updateSearchParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      
      // Reset to page 1 when filters change to avoid empty results
      params.delete('page');
      
      router.push(`/inventory?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSearchParams('location', e.target.value);
  };

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSearchParams('supplier', e.target.value);
  };

  const handleLowStockChange = (checked: boolean) => {
    updateSearchParams('lowStock', checked ? 'true' : '');
  };

  const handleClearFilters = () => {
    setSearch('');
    router.push('/inventory');
  };

  const hasActiveFilters = !!(search || initialLocation || initialSupplier || initialLowStock);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-3">
          <Select
            value={initialLocation}
            onChange={handleLocationChange}
            className="min-w-[160px]"
          >
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
                {location.code ? ` (${location.code})` : ''}
              </option>
            ))}
          </Select>

          <Select
            value={initialSupplier}
            onChange={handleSupplierChange}
            className="min-w-[160px]"
          >
            <option value="">All suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Checkbox
          checked={initialLowStock}
          onCheckedChange={handleLowStockChange}
          label="Show only low stock items"
        />

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <X className="mr-1 h-4 w-4" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
