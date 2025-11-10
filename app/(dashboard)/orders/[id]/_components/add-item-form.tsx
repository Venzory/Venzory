'use client';

import { useState, useTransition } from 'react';
import { addOrderItemAction } from '../../actions';
import { ItemSelector, type ItemForSelection } from '../../_components/item-selector';

interface AddItemFormProps {
  orderId: string;
  supplierId: string;
  items: Array<{
    id: string;
    name: string;
    sku: string | null;
    unit: string | null;
    defaultSupplierId: string | null;
    supplierItems?: Array<{
      supplierId: string;
      unitPrice: number | null;
    }>;
  }>;
}

export function AddItemForm({ orderId, supplierId, items }: AddItemFormProps) {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedItemPrice, setSelectedItemPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  const handleItemSelect = (itemId: string, defaultPrice: number) => {
    setSelectedItemId(itemId);
    setSelectedItemPrice(defaultPrice);
    setUnitPrice(defaultPrice);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!selectedItemId) {
      setError('Please select an item');
      return;
    }

    if (quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set('orderId', orderId);
      formData.set('itemId', selectedItemId);
      formData.set('quantity', quantity.toString());
      formData.set('unitPrice', unitPrice.toString());

      const result = await addOrderItemAction(undefined, formData);
      
      if (result && 'error' in result) {
        setError(result.error);
      } else {
        // Reset form on success
        setSelectedItemId('');
        setSelectedItemPrice(0);
        setQuantity(1);
        setUnitPrice(0);
      }
    });
  };

  const selectedItem = items.find((item) => item.id === selectedItemId);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        Add Item to Order
      </h3>

      {error && (
        <div className="rounded-lg border border-rose-700 bg-rose-900/20 p-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-12">
          {/* Item Selector */}
          <div className="sm:col-span-6 space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-400">
              Select Item *
            </label>
            <ItemSelector
              items={items as ItemForSelection[]}
              supplierId={supplierId}
              onSelect={handleItemSelect}
              excludeItemIds={[]}
              placeholder="Search items by name or SKU..."
            />
            {selectedItem && (
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Selected: <span className="font-medium">{selectedItem.name}</span>
                {selectedItem.sku && <span className="text-slate-500"> ({selectedItem.sku})</span>}
              </p>
            )}
          </div>

          {/* Quantity */}
          <div className="sm:col-span-3 space-y-1">
            <label htmlFor="quantity" className="text-xs font-medium text-slate-700 dark:text-slate-400">
              Quantity *
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Unit Price */}
          <div className="sm:col-span-3 space-y-1">
            <label htmlFor="unitPrice" className="text-xs font-medium text-slate-700 dark:text-slate-400">
              Unit Price (€)
            </label>
            <input
              id="unitPrice"
              name="unitPrice"
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            {selectedItem && quantity > 0 && unitPrice > 0 && (
              <span>
                Line total: <span className="font-semibold">€{(quantity * unitPrice).toFixed(2)}</span>
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={isPending || !selectedItemId}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Adding...' : 'Add Item'}
          </button>
        </div>
      </form>
    </div>
  );
}
