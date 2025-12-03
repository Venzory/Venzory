'use client';

import { useState, useTransition } from 'react';
import { 
  CheckCircle, 
  RefreshCw, 
  Plus, 
  X, 
  Loader2,
  Search
} from 'lucide-react';
import { 
  confirmMatch, 
  changeProduct, 
  createProductAndLink, 
  markIgnored,
  searchProducts
} from '../actions';
import { useToast } from '@/hooks/use-toast';

interface ReviewItem {
  id: string;
  supplierName: string;
  productName: string;
  productId: string;
  productGtin: string | null;
  supplierSku: string | null;
  supplierItemName: string | null;
  matchMethod: string;
  matchConfidence: number | null;
}

interface ReviewActionsProps {
  item: ReviewItem;
  onActionComplete?: () => void;
}

export function ReviewActions({ item, onActionComplete }: ReviewActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast } = useToast();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await confirmMatch(item.id);
      if (result.success) {
        toast({ title: 'Match confirmed', description: 'The supplier item match has been verified.' });
        onActionComplete?.();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    });
  };

  const handleIgnore = () => {
    startTransition(async () => {
      const result = await markIgnored(item.id);
      if (result.success) {
        toast({ title: 'Item ignored', description: 'The supplier item has been deactivated.' });
        onActionComplete?.();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleConfirm}
        disabled={isPending}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
        title="Confirm current match"
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
        Confirm
      </button>
      
      <button
        onClick={() => setShowChangeModal(true)}
        disabled={isPending}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-admin bg-admin-light rounded hover:bg-admin/20 dark:bg-admin/20 dark:text-admin dark:hover:bg-admin/30 transition-colors disabled:opacity-50"
        title="Change to different product"
      >
        <RefreshCw className="h-3 w-3" />
        Change
      </button>
      
      <button
        onClick={() => setShowCreateModal(true)}
        disabled={isPending}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
        title="Create new product"
      >
        <Plus className="h-3 w-3" />
        Create
      </button>
      
      <button
        onClick={handleIgnore}
        disabled={isPending}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 bg-slate-50 rounded hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        title="Ignore this item"
      >
        <X className="h-3 w-3" />
        Ignore
      </button>

      {showChangeModal && (
        <ChangeProductModal
          item={item}
          onClose={() => setShowChangeModal(false)}
          onComplete={onActionComplete}
        />
      )}

      {showCreateModal && (
        <CreateProductModal
          item={item}
          onClose={() => setShowCreateModal(false)}
          onComplete={onActionComplete}
        />
      )}
    </div>
  );
}

interface ModalProps {
  item: ReviewItem;
  onClose: () => void;
  onComplete?: () => void;
}

function ChangeProductModal({ item, onClose, onComplete }: ModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{id: string; name: string; gtin: string | null; brand: string | null}>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleSearch = async () => {
    if (query.length < 2) return;
    setIsSearching(true);
    try {
      const products = await searchProducts(query);
      setResults(products);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (productId: string) => {
    startTransition(async () => {
      const result = await changeProduct(item.id, productId);
      if (result.success) {
        toast({ title: 'Product changed', description: 'The supplier item has been linked to the new product.' });
        onClose();
        onComplete?.();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
          Change Product Link
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Search for a product to link to &ldquo;{item.supplierItemName || item.productName}&rdquo;
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by GTIN or name..."
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || query.length < 2}
            className="px-4 py-2 bg-admin text-white rounded-lg hover:bg-admin-hover disabled:opacity-50 transition-colors"
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </button>
        </div>

        <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center">
              {query.length >= 2 ? 'No products found' : 'Enter at least 2 characters to search'}
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {results.map((product) => (
                <li key={product.id}>
                  <button
                    onClick={() => handleSelect(product.id)}
                    disabled={isPending}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    <div className="font-medium text-slate-900 dark:text-white">{product.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {product.gtin && <span className="font-mono mr-2">{product.gtin}</span>}
                      {product.brand && <span>{product.brand}</span>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateProductModal({ item, onClose, onComplete }: ModalProps) {
  const [formData, setFormData] = useState({
    name: item.supplierItemName || item.productName || '',
    gtin: item.productGtin || '',
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
      const result = await createProductAndLink(item.id, {
        name: formData.name.trim(),
        gtin: formData.gtin.trim() || null,
        brand: formData.brand.trim() || null,
        description: formData.description.trim() || null,
      });
      
      if (result.success) {
        toast({ 
          title: 'Product created', 
          description: 'New product has been created and linked.' 
        });
        onClose();
        onComplete?.();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
          Create New Product
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Create a new product and link the supplier item to it.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              GTIN (optional)
            </label>
            <input
              type="text"
              value={formData.gtin}
              onChange={(e) => setFormData(prev => ({ ...prev, gtin: e.target.value }))}
              placeholder="13-digit barcode"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-white"
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
              onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description (optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-admin rounded-lg hover:bg-admin-hover disabled:opacity-50 transition-colors inline-flex items-center gap-2"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create & Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

