'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { createOrdersFromTemplateAction } from '../../../actions';
import { decimalToNumber } from '@/lib/prisma-transforms';

interface TemplateItem {
  id: string;
  defaultQuantity: number;
  practiceSupplier: { id: string; customLabel: string | null; globalSupplier: { id: string; name: string } } | null;
  item: {
    id: string;
    name: string;
    sku: string | null;
    unit: string | null;
    defaultPracticeSupplierId: string | null;
    practiceSupplierItems: { practiceSupplierId: string | null; unitPrice: any }[];
  };
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  items: TemplateItem[];
}

interface Supplier {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  defaultPracticeSupplierId: string | null;
  practiceSupplierItems: { practiceSupplierId: string | null; unitPrice: any }[];
}

interface TemplatePreviewClientProps {
  template: Template;
  allSuppliers: Supplier[];
  allItems: Item[];
}

type OrderItem = {
  itemId: string;
  quantity: number;
  unitPrice: number | null;
};

export function TemplatePreviewClient({
  template,
  allSuppliers,
  allItems,
}: TemplatePreviewClientProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdOrders, setCreatedOrders] = useState<{ id: string; supplierName: string }[]>([]);

  // Group template items by supplier
  const groupedBySupplier = new Map<string, OrderItem[]>();
  
  for (const templateItem of template.items) {
    // Determine supplier: from template item, or fallback to item's default supplier
    const practiceSupplierId = templateItem.practiceSupplier?.id || templateItem.item.defaultPracticeSupplierId;
    
    if (!practiceSupplierId) {
      continue; // Skip items without a supplier
    }

    // Get unit price from supplier items
    const supplierItem = templateItem.item.practiceSupplierItems.find(
      (si) => si.practiceSupplierId === practiceSupplierId
    );
    const unitPrice = decimalToNumber(supplierItem?.unitPrice);

    if (!groupedBySupplier.has(practiceSupplierId)) {
      groupedBySupplier.set(practiceSupplierId, []);
    }

    groupedBySupplier.get(practiceSupplierId)!.push({
      itemId: templateItem.item.id,
      quantity: templateItem.defaultQuantity,
      unitPrice,
    });
  }

  const [supplierGroups, setSupplierGroups] = useState<
    Map<string, OrderItem[]>
  >(groupedBySupplier);

  const handleUpdateQuantity = (practiceSupplierId: string, itemId: string, quantity: number) => {
    setSupplierGroups((prev) => {
      const newGroups = new Map(prev);
      const items = newGroups.get(practiceSupplierId);
      if (items) {
        const updatedItems = items.map((item) =>
          item.itemId === itemId ? { ...item, quantity } : item
        );
        newGroups.set(practiceSupplierId, updatedItems);
      }
      return newGroups;
    });
  };

  const handleUpdatePrice = (practiceSupplierId: string, itemId: string, unitPrice: number) => {
    setSupplierGroups((prev) => {
      const newGroups = new Map(prev);
      const items = newGroups.get(practiceSupplierId);
      if (items) {
        const updatedItems = items.map((item) =>
          item.itemId === itemId ? { ...item, unitPrice } : item
        );
        newGroups.set(practiceSupplierId, updatedItems);
      }
      return newGroups;
    });
  };

  const handleRemoveItem = (practiceSupplierId: string, itemId: string) => {
    setSupplierGroups((prev) => {
      const newGroups = new Map(prev);
      const items = newGroups.get(practiceSupplierId);
      if (items) {
        const updatedItems = items.filter((item) => item.itemId !== itemId);
        if (updatedItems.length === 0) {
          newGroups.delete(practiceSupplierId);
        } else {
          newGroups.set(practiceSupplierId, updatedItems);
        }
      }
      return newGroups;
    });
  };

  const handleAddItem = (practiceSupplierId: string, itemId: string) => {
    const item = allItems.find((i) => i.id === itemId);
    if (!item) return;

    // Check if item already exists in this supplier group
    const existingItems = supplierGroups.get(practiceSupplierId) || [];
    if (existingItems.some((i) => i.itemId === itemId)) {
      return; // Already added
    }

    // Get unit price from supplier items
    const supplierItem = item.practiceSupplierItems.find((si) => si.practiceSupplierId === practiceSupplierId);
    const unitPrice = decimalToNumber(supplierItem?.unitPrice);

    setSupplierGroups((prev) => {
      const newGroups = new Map(prev);
      const items = newGroups.get(practiceSupplierId) || [];
      newGroups.set(practiceSupplierId, [
        ...items,
        { itemId, quantity: 1, unitPrice },
      ]);
      return newGroups;
    });
  };

  const handleSubmit = async () => {
    setError('');
    setSuccessMessage(null);
    setCreatedOrders([]);

    if (supplierGroups.size === 0) {
      setError('No items to order. Please add items or go back to edit the template.');
      return;
    }

    setIsSubmitting(true);

    // Convert Map to array format for the action
    const orderData = Array.from(supplierGroups.entries()).map(([practiceSupplierId, items]) => ({
      practiceSupplierId,
      items,
    }));

    const result = await createOrdersFromTemplateAction(template.id, orderData);

    if ('error' in result && result.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else if ('success' in result && result.success) {
      setSuccessMessage(result.message);
      setCreatedOrders(result.orders || []);
      setIsSubmitting(false);

      // Redirect after a short delay
      setTimeout(() => {
        if (result.orders && result.orders.length === 1) {
          router.push(`/orders/${result.orders[0].id}`);
        } else {
          router.push('/orders');
        }
      }, 2000);
    }
  };

  if (successMessage && createdOrders.length > 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-emerald-300 bg-emerald-100 p-6 space-y-4 dark:border-emerald-700 dark:bg-emerald-900/20">
          <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">Orders Created Successfully!</h2>
          <p className="text-sm text-emerald-700 dark:text-emerald-200">{successMessage}</p>
          <div className="space-y-2">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Created orders:</p>
            <ul className="space-y-2">
              {createdOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/orders/${order.id}`}
                    className="text-sm text-sky-600 transition hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                  >
                    Order for {order.supplierName} →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              href={`/orders/templates/${template.id}`}
              className="text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              ← Back to Template
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Create Orders from Template: {template.name}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Review and adjust quantities before creating draft orders
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-300 bg-rose-100 p-4 text-sm text-rose-800 dark:border-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {supplierGroups.size === 0 ? (
        <div className="rounded-xl border border-amber-300 bg-amber-100 p-6 text-center dark:border-amber-700 dark:bg-amber-900/20">
          <p className="text-lg font-medium text-amber-900 dark:text-amber-200">No items with suppliers</p>
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
            All items in this template need a supplier assigned. Go back and edit the template to
            add suppliers to items.
          </p>
          <Link
            href={`/orders/templates/${template.id}`}
            className="mt-4 inline-block rounded-lg border border-amber-400 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-200 dark:border-amber-600 dark:text-amber-200 dark:hover:bg-amber-900/30"
          >
            Edit Template
          </Link>
        </div>
      ) : (
        <>
          {Array.from(supplierGroups.entries()).map(([practiceSupplierId, items]) => {
            const supplier = allSuppliers.find((s) => s.id === practiceSupplierId);
            if (!supplier) return null;

            const total = items.reduce((sum, item) => {
              return sum + item.quantity * (item.unitPrice || 0);
            }, 0);

            return (
              <div
                key={practiceSupplierId}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div className="border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{supplier.name}</h2>
                  <p className="text-sm text-slate-600 mt-1 dark:text-slate-400">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </p>
                </div>

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
                      {items.map((orderItem) => {
                        const item = allItems.find((i) => i.id === orderItem.itemId);
                        if (!item) return null;

                        const lineTotal = orderItem.quantity * (orderItem.unitPrice || 0);

                        return (
                          <tr key={orderItem.itemId}>
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-900 dark:text-slate-200">{item.name}</span>
                                {item.sku ? (
                                  <span className="text-xs text-slate-500 dark:text-slate-500">{item.sku}</span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <input
                                type="number"
                                min="1"
                                value={orderItem.quantity}
                                onChange={(e) =>
                                  handleUpdateQuantity(
                                    practiceSupplierId,
                                    orderItem.itemId,
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-center text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                              />
                              {item.unit ? (
                                <span className="ml-2 text-slate-500 dark:text-slate-500">{item.unit}</span>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-1">
                                <span className="text-slate-600 dark:text-slate-400">€</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={orderItem.unitPrice || 0}
                                  onChange={(e) =>
                                    handleUpdatePrice(
                                      practiceSupplierId,
                                      orderItem.itemId,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-right text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-200">
                              €{lineTotal.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(practiceSupplierId, orderItem.itemId)}
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
                          Subtotal for {supplier.name}
                        </td>
                        <td className="px-4 py-3 text-right text-lg font-bold text-slate-900 dark:text-white">
                          €{total.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Add Item to Supplier Group */}
                <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-700 dark:text-slate-400">
                      Add another item for {supplier.name}
                    </label>
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddItem(practiceSupplierId, e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <option value="">Select an item to add...</option>
                      {allItems
                        .filter(
                          (item) =>
                            // Match items by supplier items OR default supplier
                            (item.practiceSupplierItems.some((si) => si.practiceSupplierId === practiceSupplierId) ||
                              item.defaultPracticeSupplierId === practiceSupplierId) &&
                            !items.some((oi) => oi.itemId === item.id)
                        )
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} {item.sku ? `(${item.sku})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Link
              href={`/orders/templates/${template.id}`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </Link>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || supplierGroups.size === 0}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? 'Creating Orders...'
                : `Create ${supplierGroups.size} Draft ${supplierGroups.size === 1 ? 'Order' : 'Orders'}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
