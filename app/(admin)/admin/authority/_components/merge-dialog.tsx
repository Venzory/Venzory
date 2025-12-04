'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { GitMerge, AlertTriangle, Loader2, Search, X, ArrowRight, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchProducts, mergeProducts } from '../actions';
import { useToast } from '@/hooks/use-toast';

interface MergeDialogProps {
  sourceProductId: string;
  sourceProductName: string;
  sourceProductGtin: string | null;
  onComplete: () => void;
  onCancel: () => void;
  className?: string;
}

export function MergeDialog({
  sourceProductId,
  sourceProductName,
  sourceProductGtin,
  onComplete,
  onCancel,
  className,
}: MergeDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{
    id: string;
    name: string;
    gtin: string | null;
    brand: string | null;
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<{
    id: string;
    name: string;
    gtin: string | null;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 2) {
      setResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const products = await searchProducts(query);
        // Filter out the source product
        setResults(products.filter((p) => p.id !== sourceProductId));
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, sourceProductId]);

  const handleMerge = () => {
    if (!selectedTarget) return;

    startTransition(async () => {
      const result = await mergeProducts(sourceProductId, selectedTarget.id);
      if (result.success) {
        toast({
          title: 'Products merged',
          description: `Merged ${result.mergedCount} items into ${selectedTarget.name}.`,
        });
        onComplete();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className={cn('flex flex-col', className)} onKeyDown={handleKeyDown}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-orange-100 p-1.5 dark:bg-orange-900/30">
            <GitMerge className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Merge Products
          </h3>
        </div>
        <button
          onClick={onCancel}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Warning */}
      <div className="mx-4 mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/20">
        <div className="flex gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300">
            <p className="font-medium">This action cannot be undone.</p>
            <p className="mt-1">
              The source product will be deleted and all linked supplier items and practice items 
              will be moved to the target product.
            </p>
          </div>
        </div>
      </div>

      {/* Source Product */}
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Source (will be deleted)
        </p>
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="font-medium text-slate-900 dark:text-white">
              {sourceProductName}
            </span>
          </div>
          {sourceProductGtin && (
            <p className="mt-1 text-xs font-mono text-slate-500 dark:text-slate-400">
              {sourceProductGtin}
            </p>
          )}
        </div>
      </div>

      {/* Arrow */}
      <div className="flex justify-center py-2">
        <ArrowRight className="h-5 w-5 text-slate-400" />
      </div>

      {/* Target Selection */}
      <div className="px-4 pb-4 flex-1 overflow-hidden flex flex-col">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Target (will receive all data)
        </p>

        {selectedTarget ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-medium text-slate-900 dark:text-white">
                  {selectedTarget.name}
                </span>
              </div>
              <button
                onClick={() => setSelectedTarget(null)}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Change
              </button>
            </div>
            {selectedTarget.gtin && (
              <p className="mt-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                {selectedTarget.gtin}
              </p>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search target product..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-10 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-admin" />
              )}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg dark:border-slate-700">
              {results.length === 0 ? (
                <p className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  {query.length < 2
                    ? 'Enter at least 2 characters to search'
                    : isSearching
                    ? 'Searching...'
                    : 'No products found'}
                </p>
              ) : (
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                  {results.map((product) => (
                    <li key={product.id}>
                      <button
                        onClick={() => setSelectedTarget(product)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="font-medium text-slate-900 dark:text-white">
                          {product.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {product.gtin && (
                            <span className="font-mono">{product.gtin}</span>
                          )}
                          {product.brand && <span>{product.brand}</span>}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg dark:text-slate-300 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleMerge}
          disabled={isPending || !selectedTarget}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          <GitMerge className="h-4 w-4" />
          Merge Products
        </button>
      </div>
    </div>
  );
}

