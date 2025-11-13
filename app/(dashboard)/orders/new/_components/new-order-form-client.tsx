'use client';

import { useState } from 'react';
import Link from 'next/link';

import { createDraftOrderAction } from '../../actions';
import { ItemSelector, type ItemForSelection } from '../../_components/item-selector';
import type { PracticeSupplierWithRelations } from '@/src/domain/models/suppliers';

interface NewOrderFormClientProps {
  practiceSuppliers: PracticeSupplierWithRelations[];
  items: {
    id: string;
    name: string;
    sku: string | null;
    unit: string | null;
    defaultSupplierId: string | null;
    defaultPracticeSupplierId: string | null;
    supplierItems: { 
      supplierId: string; 
      practiceSupplierId: string | null;
      unitPrice: any;
    }[];
  }[];
  preSelectedSupplierId?: string;
}

export function NewOrderFormClient({ practiceSuppliers, items, preSelectedSupplierId }: NewOrderFormClientProps) {
  const [selectedPracticeSupplierId, setSelectedPracticeSupplierId] = useState(preSelectedSupplierId || '');
  const [selectedItems, setSelectedItems] = useState<
    { itemId: string; quantity: number; unitPrice: number }[]
  >([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddItem = (itemId: string, defaultPrice: number) => {
    if (selectedItems.some((i) => i.itemId === itemId)) {
      return; // Already added
    }

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
    setFieldErrors({});
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.set('practiceSupplierId', selectedPracticeSupplierId);
    formData.set('items', JSON.stringify(selectedItems));

    try {
      const result = await createDraftOrderAction(null, formData);
      if (result && 'errors' in result && result.errors) {
        // Field-level validation errors
        setFieldErrors(result.errors);
        setIsSubmitting(false);
      } else if (result && 'error' in result) {
        // Form-level error
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
        <div className="rounded-lg border border-rose-800 bg-rose-900/30 p-4">
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      ) : null}

      {selectedItems.some((item) => item.unitPrice === 0) && (
        <div className="rounded-lg border border-amber-800 bg-amber-900/30 p-4">
          <p className="text-sm font-semibold text-amber-300">⚠ Missing Unit Prices</p>
          <p className="mt-1 text-sm text-amber-300">
            Some items have no unit price set. Please enter prices for accurate order totals.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Supplier Selection */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Supplier</h2>
          
          {practiceSuppliers.length === 0 ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                No suppliers configured. Please contact your administrator to set up suppliers.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="practiceSupplierId" className="text-sm text-slate-700 dark:text-slate-400">
                Select Supplier *
              </label>
              <select
                id="practiceSupplierId"
                value={selectedPracticeSupplierId}
                onChange={(e) => {
                  setSelectedPracticeSupplierId(e.target.value);
                  setSelectedItems([]); // Clear items when supplier changes
                }}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">Choose a supplier...</option>
                {practiceSuppliers.map((ps) => {
                  const displayName = ps.customLabel || ps.globalSupplier.name;
                  const accountInfo = ps.accountNumber ? ` (Account: ${ps.accountNumber})` : '';
                  const preferredMark = ps.isPreferred ? '⭐ ' : '';
                  return (
                    <option key={ps.id} value={ps.id}>
                      {preferredMark}{displayName}{accountInfo}
                    </option>
                  );
                })}
              </select>
              
              {fieldErrors.supplierId?.[0] && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{fieldErrors.supplierId[0]}</p>
              )}
              
              {selectedPracticeSupplierId && (() => {
                const selectedPs = practiceSuppliers.find(ps => ps.id === selectedPracticeSupplierId);
                return selectedPs?.orderingNotes ? (
                  <div className="mt-2 rounded-lg border border-blue-300 bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-900/20">
                    <p className="text-xs font-medium text-blue-900 dark:text-blue-200">Ordering Notes:</p>
                    <p className="mt-1 text-xs text-blue-800 dark:text-blue-300">{selectedPs.orderingNotes}</p>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {!selectedPracticeSupplierId && practiceSuppliers.length > 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Select a supplier to see available items
            </p>
          ) : null}
        </div>

        {/* Items Selection */}
        {selectedPracticeSupplierId ? (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
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
                  <thead className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
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
                            <div className="inline-flex items-center gap-2">
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
                                  className={`w-24 rounded border px-2 py-1 text-right transition-colors focus:outline-none focus:ring-1 ${
                                    selectedItem.unitPrice === 0
                                      ? 'border-amber-500 bg-amber-50 text-amber-900 focus:border-amber-600 focus:ring-amber-500/30 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-200'
                                      : 'border-slate-300 bg-white text-slate-900 focus:border-sky-500 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                                  }`}
                                />
                              </div>
                              {selectedItem.unitPrice === 0 && (
                                <span className="text-xs text-amber-600 dark:text-amber-400" title="No price set">
                                  ⚠
                                </span>
                              )}
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

            {/* Add Item Selector */}
            <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-400">
                  Add Item to Order
                </label>
                <ItemSelector
                  items={items as ItemForSelection[]}
                  practiceSupplierId={selectedPracticeSupplierId}
                  onSelect={handleAddItem}
                  excludeItemIds={selectedItems.map((si) => si.itemId)}
                  placeholder="Search items by name or SKU..."
                />
                {fieldErrors.items?.[0] && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{fieldErrors.items[0]}</p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Notes and Reference */}
        {selectedPracticeSupplierId ? (
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
                  className="max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
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
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !selectedPracticeSupplierId || selectedItems.length === 0}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              'Create Draft Order'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

