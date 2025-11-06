'use client';

import { useState } from 'react';
import Link from 'next/link';

import { createTemplateAction } from '../../actions';

interface NewTemplateFormClientProps {
  items: {
    id: string;
    name: string;
    sku: string | null;
    unit: string | null;
    defaultSupplierId: string | null;
  }[];
  suppliers: { id: string; name: string }[];
}

export function NewTemplateFormClient({ items, suppliers }: NewTemplateFormClientProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedItems, setSelectedItems] = useState<
    { itemId: string; defaultQuantity: number; supplierId: string | null }[]
  >([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddItem = (itemId: string) => {
    if (selectedItems.some((i) => i.itemId === itemId)) {
      return; // Already added
    }

    // Get default supplier from item
    const item = items.find((i) => i.id === itemId);
    const defaultSupplierId = item?.defaultSupplierId || null;

    setSelectedItems([
      ...selectedItems,
      { itemId, defaultQuantity: 1, supplierId: defaultSupplierId },
    ]);
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter((i) => i.itemId !== itemId));
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    setSelectedItems(
      selectedItems.map((i) => (i.itemId === itemId ? { ...i, defaultQuantity: quantity } : i))
    );
  };

  const handleUpdateSupplier = (itemId: string, supplierId: string | null) => {
    setSelectedItems(
      selectedItems.map((i) => (i.itemId === itemId ? { ...i, supplierId } : i))
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!name.trim()) {
      setError('Please enter a template name');
      setIsSubmitting(false);
      return;
    }

    if (selectedItems.length === 0) {
      setError('Please add at least one item');
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.set('name', name.trim());
    formData.set('description', description.trim());
    formData.set('items', JSON.stringify(selectedItems));

    try {
      const result = await createTemplateAction(null, formData);
      if (result && 'error' in result) {
        setError(result.error);
        setIsSubmitting(false);
      }
      // If successful, the action will redirect
    } catch (err) {
      setError('Failed to create template');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              href="/orders/templates"
              className="text-sm text-slate-400 transition hover:text-slate-200"
            >
              ← Back to Templates
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-white">New Order Template</h1>
          <p className="text-sm text-slate-300">
            Create a reusable template for frequently ordered items
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-700 bg-rose-900/20 p-4 text-sm text-rose-300">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Template Details */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Template Details</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm text-slate-400">
                Template Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Monthly Supplies"
                required
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm text-slate-400">
                Description (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Add notes about this template..."
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
            </div>
          </div>
        </div>

        {/* Items Selection */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="border-b border-slate-800 bg-slate-950/40 p-4">
            <h2 className="text-lg font-semibold text-white">Template Items</h2>
          </div>

          {selectedItems.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              <p className="font-medium text-slate-200">No items added yet</p>
              <p className="mt-2">Add items to this template using the dropdown below</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-800 bg-slate-950/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Item
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Default Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Supplier
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedItems.map((selectedItem) => {
                    const item = items.find((i) => i.id === selectedItem.itemId);

                    return (
                      <tr key={selectedItem.itemId}>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-200">{item?.name}</span>
                            {item?.sku ? (
                              <span className="text-xs text-slate-500">{item.sku}</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            min="1"
                            value={selectedItem.defaultQuantity}
                            onChange={(e) =>
                              handleUpdateQuantity(
                                selectedItem.itemId,
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-20 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-center text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                          />
                          {item?.unit ? (
                            <span className="ml-2 text-slate-500">{item.unit}</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={selectedItem.supplierId || ''}
                            onChange={(e) =>
                              handleUpdateSupplier(
                                selectedItem.itemId,
                                e.target.value || null
                              )
                            }
                            className="w-full max-w-xs rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                          >
                            <option value="">No supplier</option>
                            {suppliers.map((supplier) => (
                              <option key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(selectedItem.itemId)}
                            className="text-sm text-rose-400 transition hover:text-rose-300"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Add Item Dropdown */}
          <div className="border-t border-slate-800 bg-slate-950/40 p-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Add Item</label>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddItem(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              >
                <option value="">Select an item to add...</option>
                {items
                  .filter((item) => !selectedItems.some((si) => si.itemId === item.id))
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} {item.sku ? `(${item.sku})` : ''}
                    </option>
                  ))}
              </select>
              {items.filter((item) => !selectedItems.some((si) => si.itemId === item.id))
                .length === 0 && selectedItems.length > 0 ? (
                <p className="text-xs text-slate-500">All available items have been added</p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Link
            href="/orders/templates"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || selectedItems.length === 0}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Template'}
          </button>
        </div>
      </form>
    </div>
  );
}

