'use client';

import { useState } from 'react';
import { Package, Pencil, Check, X } from 'lucide-react';
import type { SupplierItem, Product } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';

type SupplierItemWithProduct = SupplierItem & {
  product: {
    id: string;
    name: string;
    gtin: string | null;
    brand: string | null;
  };
};

interface PricingTableProps {
  items: SupplierItemWithProduct[];
}

export function PricingTable({ items }: PricingTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    unitPrice: string;
    minOrderQty: string;
    currency: string;
  }>({ unitPrice: '', minOrderQty: '', currency: 'EUR' });

  const handleEdit = (item: SupplierItemWithProduct) => {
    setEditingId(item.id);
    setEditValues({
      unitPrice: item.unitPrice?.toString() || '',
      minOrderQty: item.minOrderQty?.toString() || '1',
      currency: item.currency || 'EUR',
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({ unitPrice: '', minOrderQty: '', currency: 'EUR' });
  };

  const handleSave = async (itemId: string) => {
    // TODO: Implement API call to save pricing
    console.log('Saving pricing for item:', itemId, editValues);
    setEditingId(null);
  };

  if (items.length === 0) {
    return (
      <div className="p-8 text-center">
        <Package className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          No products in your catalog yet. Upload a catalog to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Product
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              SKU
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              GTIN
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Unit Price
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Min Qty
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="px-4 py-3">
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">
                    {item.supplierName || item.product.name}
                  </div>
                  {item.product.brand && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {item.product.brand}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                {item.supplierSku || '-'}
              </td>
              <td className="px-4 py-3 text-sm font-mono text-slate-600 dark:text-slate-400">
                {item.product.gtin || '-'}
              </td>
              <td className="px-4 py-3 text-right">
                {editingId === item.id ? (
                  <div className="flex items-center justify-end gap-1">
                    <select
                      value={editValues.currency}
                      onChange={(e) => setEditValues({ ...editValues, currency: e.target.value })}
                      className="w-16 rounded border border-slate-300 px-1 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value="EUR">€</option>
                      <option value="USD">$</option>
                      <option value="GBP">£</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      value={editValues.unitPrice}
                      onChange={(e) => setEditValues({ ...editValues, unitPrice: e.target.value })}
                      className="w-24 rounded border border-slate-300 px-2 py-1 text-right text-sm dark:border-slate-700 dark:bg-slate-800"
                      placeholder="0.00"
                    />
                  </div>
                ) : (
                  <span className={`text-sm font-medium ${item.unitPrice ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                    {item.unitPrice ? `${item.currency === 'EUR' ? '€' : item.currency === 'USD' ? '$' : '£'}${item.unitPrice.toFixed(2)}` : '-'}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {editingId === item.id ? (
                  <input
                    type="number"
                    min="1"
                    value={editValues.minOrderQty}
                    onChange={(e) => setEditValues({ ...editValues, minOrderQty: e.target.value })}
                    className="w-16 rounded border border-slate-300 px-2 py-1 text-right text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                ) : (
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {item.minOrderQty || 1}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {editingId === item.id ? (
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleSave(item.id)}
                      className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleCancel}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEdit(item)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

