'use client';

import { useState } from 'react';
import Link from 'next/link';

import { createDraftOrderAction } from '../../actions';

interface NewOrderFormClientProps {
  suppliers: { id: string; name: string }[];
  items: {
    id: string;
    name: string;
    sku: string | null;
    unit: string | null;
    defaultSupplierId: string | null;
    supplierItems: { supplierId: string; unitPrice: any }[];
  }[];
}

export function NewOrderFormClient({ suppliers, items }: NewOrderFormClientProps) {
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedItems, setSelectedItems] = useState<
    { itemId: string; quantity: number; unitPrice: number }[]
  >([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddItem = (itemId: string) => {
    if (selectedItems.some((i) => i.itemId === itemId)) {
      return; // Already added
    }

    // Get default price from supplier item
    const item = items.find((i) => i.id === itemId);
    const supplierItem = item?.supplierItems.find((si) => si.supplierId === selectedSupplier);
    const defaultPrice = supplierItem?.unitPrice
      ? parseFloat(supplierItem.unitPrice.toString())
      : 0;

    setSelectedItems([...selectedItems, { itemId, quantity: 1, unitPrice: defaultPrice }]);
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter((i) => i.itemId !== itemId));
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    setSelectedItems(
      selectedItems.map((i) => (i.itemId === itemId ? { ...i, quantity } : i))
    );
  };

  const handleUpdatePrice = (itemId: string, unitPrice: number) => {
    setSelectedItems(
      selectedItems.map((i) => (i.itemId === itemId ? { ...i, unitPrice } : i))
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!selectedSupplier) {
      setError('Please select a supplier');
      setIsSubmitting(false);
      return;
    }

    if (selectedItems.length === 0) {
      setError('Please add at least one item');
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set('supplierId', selectedSupplier);
    formData.set('items', JSON.stringify(selectedItems));

    try {
      const result = await createDraftOrderAction(null, formData);
      if (result && 'error' in result) {
        setError(result.error);
        setIsSubmitting(false);
      }
      // If successful, the action will redirect
    } catch (err) {
      setError('Failed to create order');
      setIsSubmitting(false);
    }
  };

  const total = selectedItems.reduce((sum, item) => {
    return sum + item.quantity * item.unitPrice;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              className="text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              ← Back to Orders
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">New Order</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">Create a new draft purchase order</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-700 bg-rose-900/20 p-4 text-sm text-rose-300">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Supplier Selection */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Supplier</h2>
          <div className="space-y-2">
            <label htmlFor="supplierId" className="text-sm text-slate-700 dark:text-slate-400">
              Select Supplier *
            </label>
            <select
              id="supplierId"
              value={selectedSupplier}
              onChange={(e) => {
                setSelectedSupplier(e.target.value);
                setSelectedItems([]); // Clear items when supplier changes
              }}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">Choose a supplier...</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          {!selectedSupplier ? (
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Select a supplier to see available items
            </p>
          ) : null}
        </div>

        {/* Items Selection */}
        {selectedSupplier ? (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
            <div className="border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Order Items</h2>
            </div>

            {selectedItems.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-600 dark:text-slate-400">
                <p className="font-medium text-slate-900 dark:text-slate-200">No items added yet</p>
                <p className="mt-2">Add items to this order using the dropdown below</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">
                        Item
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">
                        Total
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {selectedItems.map((selectedItem) => {
                      const item = items.find((i) => i.id === selectedItem.itemId);
                      const lineTotal = selectedItem.quantity * selectedItem.unitPrice;

                      return (
                        <tr key={selectedItem.itemId}>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900 dark:text-slate-200">{item?.name}</span>
                              {item?.sku ? (
                                <span className="text-xs text-slate-500 dark:text-slate-500">{item.sku}</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              min="1"
                              value={selectedItem.quantity}
                              onChange={(e) =>
                                handleUpdateQuantity(
                                  selectedItem.itemId,
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-center text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <span className="text-slate-600 dark:text-slate-400">€</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={selectedItem.unitPrice}
                                onChange={(e) =>
                                  handleUpdatePrice(
                                    selectedItem.itemId,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-right text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-200">
                            €{lineTotal.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(selectedItem.itemId)}
                              className="text-sm text-rose-600 transition hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-200">
                        Total
                      </td>
                      <td className="px-4 py-3 text-right text-lg font-bold text-slate-900 dark:text-white">
                        €{total.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Add Item Dropdown */}
            <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="space-y-2">
                <label className="text-sm text-slate-700 dark:text-slate-400">Add Item</label>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddItem(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="">Select an item to add...</option>
                  {items
                    .filter(
                      (item) =>
                        // Match items by supplier items OR default supplier
                        item.supplierItems.some((si) => si.supplierId === selectedSupplier) ||
                        item.defaultSupplierId === selectedSupplier
                    )
                    .filter((item) => !selectedItems.some((si) => si.itemId === item.id))
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} {item.sku ? `(${item.sku})` : ''}
                      </option>
                    ))}
                </select>
                {items.filter(
                  (item) =>
                    (item.supplierItems.some((si) => si.supplierId === selectedSupplier) ||
                      item.defaultSupplierId === selectedSupplier) &&
                    !selectedItems.some((si) => si.itemId === item.id)
                ).length === 0 &&
                selectedItems.length > 0 ? (
                  <p className="text-xs text-slate-500">All available items have been added</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* Notes and Reference */}
        {selectedSupplier ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Additional Information</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="reference" className="text-sm text-slate-700 dark:text-slate-400">
                  Reference Number (optional)
                </label>
                <input
                  id="reference"
                  name="reference"
                  placeholder="PO-12345"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm text-slate-700 dark:text-slate-400">
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  placeholder="Add any notes about this order..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Link
            href="/orders"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !selectedSupplier || selectedItems.length === 0}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Draft Order'}
          </button>
        </div>
      </form>
    </div>
  );
}

