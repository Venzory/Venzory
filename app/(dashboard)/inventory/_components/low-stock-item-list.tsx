'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { createOrdersFromLowStockAction } from '../actions';

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  unit: string | null;
  defaultSupplier: { id: string; name: string } | null;
  inventory: {
    locationId: string;
    quantity: number;
    reorderPoint: number | null;
    reorderQuantity: number | null;
    location: { id: string; name: string; code: string | null };
  }[];
}

interface LowStockInfo {
  isLowStock: boolean;
  suggestedQuantity: number;
  lowStockLocations: string[];
}

interface LowStockItemListProps {
  items: InventoryItem[];
  suppliers: { id: string; name: string }[];
  canManage: boolean;
  hasActiveFilters: boolean;
  lowStockInfo: Record<string, LowStockInfo>;
  deleteItemAction: (itemId: string) => Promise<void>;
  upsertItemInlineAction: (formData: FormData) => Promise<void>;
}

export function LowStockItemList({
  items,
  suppliers,
  canManage,
  hasActiveFilters,
  lowStockInfo,
  deleteItemAction,
  upsertItemInlineAction,
}: LowStockItemListProps) {
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdOrders, setCreatedOrders] = useState<{ id: string; supplierName: string }[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleToggleItem = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAllLowStock = () => {
    const lowStockItemIds = items
      .filter((item) => lowStockInfo[item.id]?.isLowStock && item.defaultSupplier)
      .map((item) => item.id);
    setSelectedItemIds(new Set(lowStockItemIds));
  };

  const handleDeselectAll = () => {
    setSelectedItemIds(new Set());
  };

  const handleCreateOrders = () => {
    setSuccessMessage(null);
    setErrorMessage(null);
    setCreatedOrders([]);

    startTransition(async () => {
      const result = await createOrdersFromLowStockAction(Array.from(selectedItemIds));

      if ('error' in result && result.error) {
        setErrorMessage(result.error);
      } else if ('success' in result && result.success) {
        setSuccessMessage(result.message);
        setCreatedOrders(result.orders);
        setSelectedItemIds(new Set()); // Clear selection after success
      }
    });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center text-sm text-slate-400">
        {hasActiveFilters ? (
          <>
            <p className="font-medium text-slate-200">No items match your filters</p>
            <p className="mt-2">Try adjusting your search or filter criteria to see more results.</p>
          </>
        ) : (
          <>
            <p className="font-medium text-slate-200">No items yet</p>
            <p className="mt-2">
              {canManage
                ? 'Add your first inventory item using the form on the right.'
                : 'An administrator needs to add items before they appear here.'}
            </p>
          </>
        )}
      </div>
    );
  }

  const lowStockItems = items.filter((item) => lowStockInfo[item.id]?.isLowStock);
  const selectableLowStockItems = lowStockItems.filter((item) => item.defaultSupplier);

  return (
    <div className="space-y-4">
      {/* Success/Error Messages */}
      {successMessage && createdOrders.length > 0 && (
        <div className="rounded-xl border border-green-800 bg-green-900/20 p-4">
          <p className="font-semibold text-green-300">{successMessage}</p>
          <div className="mt-3 space-y-2">
            {createdOrders.map((order) => (
              <div key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="text-sm text-green-400 hover:text-green-300 underline"
                >
                  View order for {order.supplierName} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-rose-800 bg-rose-900/20 p-4">
          <p className="text-sm text-rose-300">{errorMessage}</p>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {canManage && lowStockItems.length > 0 && (
        <div className="rounded-xl border border-amber-800 bg-amber-900/20 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-300">
                {lowStockItems.length} low-stock item{lowStockItems.length !== 1 ? 's' : ''} detected
              </p>
              {selectedItemIds.size > 0 && (
                <p className="text-xs text-amber-400">
                  {selectedItemIds.size} item{selectedItemIds.size !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSelectAllLowStock}
                className="rounded-lg border border-amber-700 bg-amber-900/40 px-3 py-1.5 text-xs font-medium text-amber-200 transition hover:bg-amber-900/60"
              >
                Select all low-stock
              </button>
              {selectedItemIds.size > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800/60"
                  >
                    Deselect all
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateOrders}
                    disabled={isPending}
                    className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? 'Creating orders...' : 'Create orders from selected items'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Item List */}
      {items.map((item) => {
        const totalQuantity = item.inventory?.reduce((sum, row) => sum + row.quantity, 0) || 0;
        const itemLowStockInfo = lowStockInfo[item.id];
        const isLowStock = itemLowStockInfo?.isLowStock || false;
        const canSelect = canManage && isLowStock && item.defaultSupplier;
        const isSelected = selectedItemIds.has(item.id);

        return (
          <div
            key={item.id}
            className={`rounded-xl border p-5 transition ${
              isLowStock
                ? 'border-amber-700 bg-amber-900/10'
                : 'border-slate-800 bg-slate-900/60'
            }`}
          >
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div className="flex items-start gap-3 flex-1">
                {/* Checkbox */}
                {canManage && (
                  <div className="pt-1">
                    {canSelect ? (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleItem(item.id)}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-sky-600 focus:ring-2 focus:ring-sky-500/30 focus:ring-offset-0 cursor-pointer"
                      />
                    ) : (
                      <div className="h-4 w-4" /> // Spacer for alignment
                    )}
                  </div>
                )}

                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-semibold text-white">{item.name}</h2>
                    {item.sku ? (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                        {item.sku}
                      </span>
                    ) : null}
                    {isLowStock && (
                      <span className="rounded-full bg-amber-900/60 border border-amber-700 px-2 py-0.5 text-xs font-medium text-amber-300">
                        Low stock
                      </span>
                    )}
                  </div>
                  {item.description ? (
                    <p className="text-sm text-slate-300">{item.description}</p>
                  ) : null}
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Total on hand: <span className="text-slate-200">{totalQuantity}</span>
                  </p>
                  {item.defaultSupplier ? (
                    <p className="text-xs text-slate-400">
                      Default supplier:{' '}
                      <Link
                        href={`/suppliers#${item.defaultSupplier.id}`}
                        className="text-sky-400 hover:text-sky-300"
                      >
                        {item.defaultSupplier.name}
                      </Link>
                    </p>
                  ) : isLowStock ? (
                    <p className="text-xs text-amber-400">
                      ⚠ No default supplier set
                    </p>
                  ) : null}
                  {isLowStock && itemLowStockInfo.suggestedQuantity > 0 && (
                    <p className="text-xs text-amber-300">
                      Suggested order quantity: {itemLowStockInfo.suggestedQuantity}
                    </p>
                  )}
                </div>
              </div>

              {canManage ? (
                <form action={deleteItemAction.bind(null, item.id)} className="self-start">
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-rose-500 hover:text-rose-300"
                  >
                    Delete
                  </button>
                </form>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Locations
                </h3>
                {item.inventory?.length ? (
                  <ul className="space-y-1 text-sm text-slate-300">
                    {item.inventory.map((row) => {
                      const isLocationLowStock =
                        row.reorderPoint !== null && row.quantity < row.reorderPoint;
                      return (
                        <li
                          key={row.locationId}
                          className="flex items-center justify-between"
                        >
                          <span>
                            {row.location.name}
                            {row.location.code ? ` (${row.location.code})` : ''}
                            {isLocationLowStock && (
                              <span className="ml-2 text-xs text-amber-400">
                                ⚠
                              </span>
                            )}
                          </span>
                          <span className={isLocationLowStock ? 'text-amber-300' : 'text-slate-100'}>
                            {row.quantity}
                            {row.reorderPoint !== null && ` / ${row.reorderPoint}`}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">No stock recorded yet.</p>
                )}
              </div>

              {canManage ? (
                <details className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-200">
                  <summary className="cursor-pointer text-sm font-medium text-slate-200">
                    Edit item
                  </summary>
                  <form action={upsertItemInlineAction} className="mt-3 space-y-3">
                    <input type="hidden" name="itemId" value={item.id} />
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400" htmlFor={`name-${item.id}`}>
                        Name
                      </label>
                      <input
                        id={`name-${item.id}`}
                        name="name"
                        defaultValue={item.name}
                        required
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                      />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-slate-400" htmlFor={`sku-${item.id}`}>
                          SKU
                        </label>
                        <input
                          id={`sku-${item.id}`}
                          name="sku"
                          defaultValue={item.sku ?? ''}
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-slate-400" htmlFor={`unit-${item.id}`}>
                          Unit
                        </label>
                        <input
                          id={`unit-${item.id}`}
                          name="unit"
                          defaultValue={item.unit ?? ''}
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400" htmlFor={`description-${item.id}`}>
                        Description
                      </label>
                      <textarea
                        id={`description-${item.id}`}
                        name="description"
                        rows={2}
                        defaultValue={item.description ?? ''}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400" htmlFor={`supplier-${item.id}`}>
                        Default supplier
                      </label>
                      <select
                        id={`supplier-${item.id}`}
                        name="defaultSupplierId"
                        defaultValue={item.defaultSupplier?.id ?? 'none'}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                      >
                        <option value="none">No default</option>
                        {suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
                    >
                      Save changes
                    </button>
                  </form>
                </details>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

