'use client';

import { useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Building2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  IssueBadges, 
  deriveIssues, 
  getConfidenceColor, 
  formatConfidence 
} from './issue-badges';
import type { TriageItem } from '../actions';

interface TriageListProps {
  items: TriageItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

export function TriageList({ items, selectedId, onSelect, className }: TriageListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current && listRef.current) {
      const listRect = listRef.current.getBoundingClientRect();
      const itemRect = selectedRef.current.getBoundingClientRect();
      
      if (itemRect.top < listRect.top || itemRect.bottom > listRect.bottom) {
        selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedId]);

  if (items.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
        <div className="rounded-full bg-emerald-100 p-4 dark:bg-emerald-900/30">
          <Package className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
          All caught up!
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          No items need review at this time.
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={listRef}
      className={cn('flex flex-col gap-2 overflow-y-auto', className)}
      role="listbox"
      aria-label="Items needing review"
    >
      {items.map((item, index) => {
        const isSelected = item.id === selectedId;
        const issues = deriveIssues(item);
        
        return (
          <button
            key={item.id}
            ref={isSelected ? selectedRef : null}
            onClick={() => onSelect(item.id)}
            role="option"
            aria-selected={isSelected}
            className={cn(
              'relative flex flex-col gap-2 rounded-lg border p-3 text-left transition-all',
              'hover:border-admin/50 hover:bg-slate-50 dark:hover:bg-slate-800/50',
              'focus:outline-none focus:ring-2 focus:ring-admin/50',
              isSelected
                ? 'border-admin bg-admin/5 ring-1 ring-admin/30 dark:bg-admin/10'
                : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/30'
            )}
          >
            {/* Index badge for keyboard nav */}
            <span className="absolute right-2 top-2 text-[10px] font-mono text-slate-400 dark:text-slate-500">
              {index + 1}
            </span>

            {/* Supplier info */}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Building2 className="h-3 w-3" />
              <span className="truncate">{item.supplierName}</span>
            </div>

            {/* Item name */}
            <div className="pr-6">
              <h4 className="font-medium text-slate-900 dark:text-white line-clamp-2">
                {item.supplierItemName || item.productName}
              </h4>
              {item.supplierSku && (
                <p className="mt-0.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                  SKU: {item.supplierSku}
                </p>
              )}
            </div>

            {/* Linked product */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">→</span>
              <span className="truncate text-slate-700 dark:text-slate-300">
                {item.productName}
              </span>
              {item.productGtin && (
                <span className="font-mono text-slate-400 dark:text-slate-500">
                  {item.productGtin}
                </span>
              )}
            </div>

            {/* Issues and confidence */}
            <div className="flex items-center justify-between gap-2">
              <IssueBadges issues={issues} maxVisible={2} />
              <span className={cn('text-xs font-medium', getConfidenceColor(item.matchConfidence))}>
                {formatConfidence(item.matchConfidence)}
              </span>
            </div>

            {/* Time */}
            <div className="text-[10px] text-slate-400 dark:text-slate-500">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface TriageFiltersBarProps {
  issueType: string;
  supplierId: string;
  suppliers: Array<{ id: string; name: string; pendingCount: number }>;
  onIssueTypeChange: (type: string) => void;
  onSupplierChange: (id: string) => void;
  total: number;
}

export function TriageFiltersBar({
  issueType,
  supplierId,
  suppliers,
  onIssueTypeChange,
  onSupplierChange,
  total,
}: TriageFiltersBarProps) {
  const issueTypes = [
    { value: 'all', label: 'All Issues' },
    { value: 'needs-review', label: 'Needs Review' },
    { value: 'low-confidence', label: 'Low Confidence' },
    { value: 'no-gtin', label: 'No GTIN' },
    { value: 'fuzzy-match', label: 'Fuzzy Match' },
  ];

  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Triage Queue
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {total} items
        </span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {issueTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => onIssueTypeChange(type.value)}
            className={cn(
              'px-2 py-1 text-xs font-medium rounded-full transition-colors',
              issueType === type.value
                ? 'bg-admin text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            )}
          >
            {type.label}
          </button>
        ))}
      </div>

      {suppliers.length > 0 && (
        <select
          value={supplierId}
          onChange={(e) => onSupplierChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          <option value="">All Suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.pendingCount})
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

