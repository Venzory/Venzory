'use client';

import { useState } from 'react';
import { useConfirm } from '@/hooks/use-confirm';
import { toast } from '@/lib/toast';
import { updateOrderItemAction, removeOrderItemAction } from '../../actions';

export function EditableOrderItem({
  orderId,
  itemId,
  quantity,
  unitPrice,
  itemName,
  itemSku,
  itemUnit,
}: {
  orderId: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  itemName: string;
  itemSku: string | null;
  itemUnit: string | null;
}) {
  const confirm = useConfirm();
  const [isRemoving, setIsRemoving] = useState(false);
  const lineTotal = unitPrice * quantity;

  const handleRemove = async () => {
    const confirmed = await confirm({
      title: 'Remove Item',
      message: `Are you sure you want to remove "${itemName}" from this order?`,
      confirmLabel: 'Remove',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    setIsRemoving(true);
    try {
      await removeOrderItemAction(orderId, itemId);
      toast.success('Item removed from order');
    } catch (error: any) {
      console.error('Failed to remove item:', error);
      toast.error(error?.message || 'Failed to remove item');
      setIsRemoving(false);
    }
  };

  return (
    <tr>
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <span className="font-medium text-slate-200">{itemName}</span>
          {itemSku ? <span className="text-xs text-slate-500">{itemSku}</span> : null}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <form action={updateOrderItemAction} className="inline-flex items-center gap-2">
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="itemId" value={itemId} />
          <input type="hidden" name="unitPrice" value={unitPrice} />
          <input
            name="quantity"
            type="number"
            min="1"
            defaultValue={quantity}
            className="w-20 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-center text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          />
          <span className="text-slate-400">{itemUnit || 'units'}</span>
        </form>
      </td>
      <td className="px-4 py-3 text-right">
        <form action={updateOrderItemAction} className="inline-flex items-center gap-1">
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="itemId" value={itemId} />
          <input type="hidden" name="quantity" value={quantity} />
          <span className="text-slate-400">€</span>
          <input
            name="unitPrice"
            type="number"
            min="0"
            step="0.01"
            defaultValue={unitPrice}
            className="w-24 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-right text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          />
        </form>
      </td>
      <td className="px-4 py-3 text-right font-medium text-slate-200">
        {lineTotal > 0 ? `€${lineTotal.toFixed(2)}` : '-'}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={handleRemove}
          disabled={isRemoving}
          className="text-sm text-rose-400 transition hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRemoving ? 'Removing...' : 'Remove'}
        </button>
      </td>
    </tr>
  );
}

