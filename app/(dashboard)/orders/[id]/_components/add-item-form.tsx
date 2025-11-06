'use client';

import { addOrderItemInlineAction } from '../../actions';

interface AddItemFormProps {
  orderId: string;
  items: Array<{
    id: string;
    name: string;
    sku: string | null;
    supplierItems?: Array<{
      unitPrice: number | null;
    }>;
  }>;
}

export function AddItemForm({ orderId, items }: AddItemFormProps) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-medium text-slate-200">Add Item to Order</summary>
      <form action={addOrderItemInlineAction} className="mt-4 grid gap-4 sm:grid-cols-4">
        <input type="hidden" name="orderId" value={orderId} />
        <div className="sm:col-span-2 space-y-1">
          <label htmlFor="itemId" className="text-xs text-slate-400">
            Select Item
          </label>
          <select
            id="itemId"
            name="itemId"
            required
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            onChange={(e) => {
              const selectedItem = items.find((item) => item.id === e.target.value);
              const priceInput = e.target.form?.querySelector(
                'input[name="unitPrice"]'
              ) as HTMLInputElement;
              if (priceInput && selectedItem?.supplierItems?.[0]?.unitPrice) {
                priceInput.value = selectedItem.supplierItems[0].unitPrice.toString();
              }
            }}
          >
            <option value="">Choose an item...</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} {item.sku ? `(${item.sku})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="quantity" className="text-xs text-slate-400">
            Quantity
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min="1"
            defaultValue="1"
            required
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="unitPrice" className="text-xs text-slate-400">
            Unit Price (€)
          </label>
          <input
            id="unitPrice"
            name="unitPrice"
            type="number"
            min="0"
            step="0.01"
            defaultValue=""
            placeholder="0.00"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </div>
        <div className="sm:col-span-4">
          <button
            type="submit"
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
          >
            Add Item
          </button>
        </div>
      </form>
    </details>
  );
}

