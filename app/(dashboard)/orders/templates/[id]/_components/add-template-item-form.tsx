'use client';

import { useState } from 'react';
import { addTemplateItemAction } from '../../actions';

interface AddTemplateItemFormProps {
  templateId: string;
  items: { id: string; name: string; sku: string | null; unit: string | null }[];
  suppliers: {
    id: string;
    name: string;
    isPreferred: boolean;
    isBlocked: boolean;
    accountNumber: string | null;
  }[];
}

export function AddTemplateItemForm({ templateId, items, suppliers }: AddTemplateItemFormProps) {
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [supplierId, setSupplierId] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!itemId) {
      setError('Please select an item');
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.set('templateId', templateId);
    formData.set('itemId', itemId);
    formData.set('defaultQuantity', quantity.toString());
    formData.set('supplierId', supplierId);

    const result = await addTemplateItemAction(null, formData);

    if (result && 'error' in result) {
      setError(result.error || 'An error occurred');
      setIsSubmitting(false);
    } else {
      // Success - reset form
      setItemId('');
      setQuantity(1);
      setSupplierId('');
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        All available items have been added to this template
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Add Item to Template</h3>
      
      {error ? (
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-[2fr_1fr_2fr_auto]">
        <div className="space-y-1">
          <label htmlFor="itemId" className="text-xs text-slate-600 dark:text-slate-400">
            Item
          </label>
          <select
            id="itemId"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">Select an item...</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} {item.sku ? `(${item.sku})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="quantity" className="text-xs text-slate-600 dark:text-slate-400">
            Quantity
          </label>
          <input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="supplierId" className="text-xs text-slate-600 dark:text-slate-400">
            Supplier (optional)
          </label>
          <select
            id="supplierId"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">No supplier</option>
            {suppliers.map((supplier) => {
              const preferredMark = supplier.isPreferred ? '⭐ ' : '';
              const blockedMark = supplier.isBlocked ? '🚫 ' : '';
              const accountInfo = supplier.accountNumber ? ` (${supplier.accountNumber})` : '';
              
              return (
                <option key={supplier.id} value={supplier.id}>
                  {blockedMark}{preferredMark}{supplier.name}{accountInfo}
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={isSubmitting || !itemId}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </form>
  );
}

