'use client';

import { useState, useRef, useEffect } from 'react';
import { decimalToNumber } from '@/lib/prisma-transforms';
import { useDebounce } from '@/hooks/use-debounce';

export interface ItemForSelection {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  defaultPracticeSupplierId?: string | null;
  supplierItems: Array<{
    practiceSupplierId?: string | null;
    unitPrice: any;
  }>;
}

interface ItemSelectorProps {
  items: ItemForSelection[];
  practiceSupplierId: string | null;
  onSelect: (itemId: string, defaultPrice: number) => void;
  excludeItemIds?: string[];
  placeholder?: string;
}

export function ItemSelector({
  items,
  practiceSupplierId,
  onSelect,
  excludeItemIds = [],
  placeholder = 'Search items by name or SKU...',
}: ItemSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce the search term to reduce expensive filtering operations
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Filter items by supplier and search term
  const availableItems = items
    .filter((item) => {
      // Filter by supplier if one is specified
      const matchesSupplier = !practiceSupplierId ||
        item.supplierItems.some((si) => si.practiceSupplierId === practiceSupplierId) ||
        item.defaultPracticeSupplierId === practiceSupplierId;
      
      // Filter out already selected items
      const notExcluded = !excludeItemIds.includes(item.id);
      
      // Filter by debounced search term
      const matchesSearch =
        debouncedSearchTerm === '' ||
        item.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));

      return matchesSupplier && notExcluded && matchesSearch;
    })
    .slice(0, 50); // Limit results for performance

  // Get unit price for an item from supplier
  const getUnitPrice = (item: ItemForSelection): number => {
    const supplierItem = item.supplierItems.find((si) => si.practiceSupplierId === practiceSupplierId);
    if (supplierItem?.unitPrice) {
      return decimalToNumber(supplierItem.unitPrice) || 0;
    }
    return 0;
  };

  // Handle item selection
  const handleSelect = (item: ItemForSelection) => {
    const defaultPrice = getUnitPrice(item);
    onSelect(item.id, defaultPrice);
    setSearchTerm('');
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      e.preventDefault();
      return;
    }

    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < availableItems.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && availableItems[focusedIndex]) {
          handleSelect(availableItems[focusedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && dropdownRef.current) {
      const focusedElement = dropdownRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  return (
    <div className="relative z-50">
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
          setFocusedIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
      />

      {isOpen && availableItems.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-[9999] mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-300 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
        >
          {availableItems.map((item, index) => {
            const unitPrice = getUnitPrice(item);
            const isFocused = index === focusedIndex;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setFocusedIndex(index)}
                className={`w-full px-3 py-2 text-left transition-colors ${
                  isFocused
                    ? 'bg-sky-100 dark:bg-sky-900/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {item.name}
                    </div>
                    {item.sku && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        SKU: {item.sku}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end text-right">
                    {unitPrice > 0 ? (
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        €{unitPrice.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        No price
                      </span>
                    )}
                    {item.unit && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        per {item.unit}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {isOpen && searchTerm && availableItems.length === 0 && (
        <div className="absolute z-[9999] mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-500 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          No items found matching &quot;{searchTerm}&quot;
        </div>
      )}

      {isOpen && !searchTerm && availableItems.length === 0 && (
        <div className="absolute z-[9999] mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-500 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          {excludeItemIds.length > 0
            ? 'All available items have been added'
            : 'No items available for this supplier'}
        </div>
      )}
    </div>
  );
}

