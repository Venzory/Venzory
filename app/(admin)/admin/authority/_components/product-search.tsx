'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { Search, Loader2, Plus, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchProducts, reassignProduct, createProductAndLink } from '../actions';
import { useToast } from '@/hooks/use-toast';

interface ProductResult {
  id: string;
  name: string;
  gtin: string | null;
  brand: string | null;
  gs1VerificationStatus: string;
}

interface ProductSearchProps {
  supplierItemId: string;
  currentProductId: string;
  supplierItemName: string | null;
  onComplete: () => void;
  onCancel: () => void;
  className?: string;
}

export function ProductSearch({
  supplierItemId,
  currentProductId,
  supplierItemName,
  onComplete,
  onCancel,
  className,
}: ProductSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
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
        setResults(products);
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
  }, [query]);

  const handleSelect = (productId: string) => {
    if (productId === currentProductId) {
      toast({ 
        title: 'Same product', 
        description: 'This item is already linked to this product.',
        variant: 'destructive' 
      });
      return;
    }

    startTransition(async () => {
      const result = await reassignProduct(supplierItemId, productId);
      if (result.success) {
        toast({ title: 'Product reassigned', description: 'The supplier item has been linked to the new product.' });
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

  if (showCreateForm) {
    return (
      <CreateProductForm
        supplierItemId={supplierItemId}
        initialName={supplierItemName || query}
        onComplete={onComplete}
        onCancel={() => setShowCreateForm(false)}
        className={className}
      />
    );
  }

  return (
    <div className={cn('flex flex-col', className)} onKeyDown={handleKeyDown}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white">
          Reassign Product
        </h3>
        <button
          onClick={onCancel}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by GTIN, name, or brand..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-10 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white placeholder:text-slate-400"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-admin" />
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Type at least 2 characters to search
        </p>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {results.length === 0 ? (
          <div className="p-4 text-center">
            {query.length >= 2 && !isSearching ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No products found for &ldquo;{query}&rdquo;
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create New Product
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {query.length < 2 ? 'Start typing to search...' : 'Searching...'}
              </p>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {results.map((product) => (
              <li key={product.id}>
                <button
                  onClick={() => handleSelect(product.id)}
                  disabled={isPending}
                  className={cn(
                    'w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    product.id === currentProductId && 'bg-admin/5 dark:bg-admin/10'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-white truncate">
                          {product.name}
                        </span>
                        {product.id === currentProductId && (
                          <span className="text-xs text-admin">(current)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {product.gtin && (
                          <span className="font-mono">{product.gtin}</span>
                        )}
                        {product.brand && (
                          <span>{product.brand}</span>
                        )}
                      </div>
                    </div>
                    <GS1Badge status={product.gs1VerificationStatus} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer - Quick Create */}
      {results.length > 0 && (
        <div className="border-t border-slate-200 p-4 dark:border-slate-700">
          <button
            onClick={() => setShowCreateForm(true)}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-600 hover:border-purple-400 hover:text-purple-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-purple-500 dark:hover:text-purple-400 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create New Product Instead
          </button>
        </div>
      )}
    </div>
  );
}

interface CreateProductFormProps {
  supplierItemId: string;
  initialName: string;
  onComplete: () => void;
  onCancel: () => void;
  className?: string;
}

function CreateProductForm({
  supplierItemId,
  initialName,
  onComplete,
  onCancel,
  className,
}: CreateProductFormProps) {
  const [formData, setFormData] = useState({
    name: initialName,
    gtin: '',
    brand: '',
    description: '',
  });
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Product name is required', variant: 'destructive' });
      return;
    }

    startTransition(async () => {
      const result = await createProductAndLink(supplierItemId, {
        name: formData.name.trim(),
        gtin: formData.gtin.trim() || null,
        brand: formData.brand.trim() || null,
        description: formData.description.trim() || null,
      });

      if (result.success) {
        toast({
          title: 'Product created',
          description: 'New product has been created and linked.',
        });
        onComplete();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    });
  };

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white">
          Create New Product
        </h3>
        <button
          onClick={onCancel}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            GTIN (optional)
          </label>
          <input
            type="text"
            value={formData.gtin}
            onChange={(e) => setFormData((prev) => ({ ...prev, gtin: e.target.value }))}
            placeholder="13-digit barcode"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            If provided, GS1 enrichment will be triggered automatically.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Brand (optional)
          </label>
          <input
            type="text"
            value={formData.brand}
            onChange={(e) => setFormData((prev) => ({ ...prev, brand: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Description (optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            rows={2}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white resize-none"
          />
        </div>
      </form>

      {/* Footer */}
      <div className="flex justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        >
          Back to Search
        </button>
        <button
          onClick={handleSubmit}
          disabled={isPending || !formData.name.trim()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Create & Link
        </button>
      </div>
    </div>
  );
}

function GS1Badge({ status }: { status: string }) {
  const configs: Record<string, { icon: typeof CheckCircle2; className: string }> = {
    VERIFIED: {
      icon: CheckCircle2,
      className: 'text-emerald-600 dark:text-emerald-400',
    },
    PENDING: {
      icon: Loader2,
      className: 'text-amber-600 dark:text-amber-400',
    },
    UNVERIFIED: {
      icon: AlertTriangle,
      className: 'text-slate-400 dark:text-slate-500',
    },
    FAILED: {
      icon: AlertTriangle,
      className: 'text-red-600 dark:text-red-400',
    },
  };

  const config = configs[status] || configs.UNVERIFIED;
  const Icon = config.icon;

  return <Icon className={cn('h-4 w-4 flex-shrink-0', config.className)} />;
}

