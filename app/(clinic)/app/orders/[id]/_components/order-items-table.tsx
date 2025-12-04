'use client';

import { ChevronRight } from 'lucide-react';

import { ProductDetailDrawer } from '@/components/product';
import { useProductDrawer } from '@/hooks/use-product-drawer';

interface OrderItem {
  id: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  item?: {
    name: string;
    sku?: string | null;
    unit?: string | null;
    productId?: string | null;
  } | null;
}

interface OrderItemsTableProps {
  items: OrderItem[];
  total: number;
}

export function OrderItemsTable({ items, total }: OrderItemsTableProps) {
  const { selectedProductId, isOpen, openDrawer, closeDrawer } = useProductDrawer();

  return (
    <>
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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {items.map((orderItem) => {
              const lineTotal = orderItem.unitPrice * orderItem.quantity;
              const productId = orderItem.item?.productId;

              return (
                <tr key={orderItem.id}>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      {productId ? (
                        <button
                          type="button"
                          onClick={() => openDrawer(productId)}
                          className="group flex items-center gap-1 font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline cursor-pointer text-left"
                        >
                          {orderItem.item?.name}
                          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ) : (
                        <span className="font-medium text-slate-900 dark:text-slate-200">
                          {orderItem.item?.name}
                        </span>
                      )}
                      {orderItem.item?.sku ? (
                        <span className="text-xs text-slate-500 dark:text-slate-500">
                          {orderItem.item.sku}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-slate-900 dark:text-slate-200">
                      {orderItem.quantity} {orderItem.item?.unit || 'units'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-slate-900 dark:text-slate-200">
                      {orderItem.unitPrice > 0 ? `€${orderItem.unitPrice.toFixed(2)}` : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-200">
                    {lineTotal > 0 ? `€${lineTotal.toFixed(2)}` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40">
            <tr>
              <td 
                colSpan={3} 
                className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-200"
              >
                Total
              </td>
              <td className="px-4 py-3 text-right text-lg font-bold text-slate-900 dark:text-white">
                {total > 0 ? `€${total.toFixed(2)}` : '-'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Product Detail Drawer */}
      <ProductDetailDrawer
        productId={selectedProductId}
        isOpen={isOpen}
        onClose={closeDrawer}
      />
    </>
  );
}

