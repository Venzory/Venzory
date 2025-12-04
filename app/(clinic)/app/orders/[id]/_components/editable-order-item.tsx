'use client';

import { useState, useTransition } from 'react';
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
  const [isPendingQty, startQtyTransition] = useTransition();
  const [isPendingPrice, startPriceTransition] = useTransition();
  
  // Optimistic state for quantity and price
  const [optimisticQuantity, setOptimisticQuantity] = useState(quantity);
  const [optimisticUnitPrice, setOptimisticUnitPrice] = useState(unitPrice);
  
  // Calculate line total with optimistic values
  const lineTotal = optimisticUnitPrice * optimisticQuantity;

  const handleQuantityChange = async (newQuantity: number) => {
    // Guard against invalid values - ensure positive integer
    const validQuantity = Math.max(1, Math.floor(newQuantity) || 1);
    if (validQuantity === quantity || isPendingQty) return;
    
    // Optimistically update the UI immediately
    const previousQuantity = optimisticQuantity;
    setOptimisticQuantity(validQuantity);
    
    startQtyTransition(async () => {
      const formData = new FormData();
      formData.set('orderId', orderId);
      formData.set('itemId', itemId);
      formData.set('quantity', validQuantity.toString());
      formData.set('unitPrice', optimisticUnitPrice.toString());
      
      try {
        await updateOrderItemAction({}, formData);
      } catch (error: unknown) {
        // Rollback on error
        setOptimisticQuantity(previousQuantity);
        console.error('Failed to update quantity:', error);
        const message = error instanceof Error ? error.message : 'Failed to update quantity';
        toast.error(message);
      }
    });
  };

  const handlePriceChange = async (newPrice: number) => {
    // Guard against invalid values - ensure non-negative, handle NaN
    const validPrice = Math.max(0, newPrice || 0);
    if (validPrice === unitPrice || isPendingPrice) return;
    
    // Optimistically update the UI immediately
    const previousPrice = optimisticUnitPrice;
    setOptimisticUnitPrice(validPrice);
    
    startPriceTransition(async () => {
      const formData = new FormData();
      formData.set('orderId', orderId);
      formData.set('itemId', itemId);
      formData.set('quantity', optimisticQuantity.toString());
      formData.set('unitPrice', validPrice.toString());
      
      try {
        await updateOrderItemAction({}, formData);
      } catch (error: unknown) {
        // Rollback on error
        setOptimisticUnitPrice(previousPrice);
        console.error('Failed to update price:', error);
        const message = error instanceof Error ? error.message : 'Failed to update price';
        toast.error(message);
      }
    });
  };

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
    } catch (error: unknown) {
      console.error('Failed to remove item:', error);
      const message = error instanceof Error ? error.message : 'Failed to remove item';
      toast.error(message);
      setIsRemoving(false);
    }
  };

  return (
    <tr className={isRemoving ? 'opacity-50 transition-opacity' : ''}>
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <span className={`font-medium text-slate-900 dark:text-slate-200 ${isRemoving ? 'line-through' : ''}`}>
            {itemName}
          </span>
          {itemSku ? <span className="text-xs text-slate-500 dark:text-slate-500">{itemSku}</span> : null}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-2">
          <input
            type="number"
            min="1"
            value={optimisticQuantity}
            disabled={isPendingQty || isRemoving}
            onChange={(e) => {
              const newValue = parseInt(e.target.value) || 1;
              setOptimisticQuantity(newValue);
            }}
            onBlur={(e) => {
              const newValue = parseInt(e.target.value) || 1;
              if (newValue !== quantity) {
                handleQuantityChange(newValue);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const newValue = parseInt(e.currentTarget.value) || 1;
                if (newValue !== quantity) {
                  handleQuantityChange(newValue);
                }
                e.currentTarget.blur();
              }
            }}
            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-center text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <span className="text-slate-600 dark:text-slate-400">{itemUnit || 'units'}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-1">
          <span className="text-slate-600 dark:text-slate-400">€</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={optimisticUnitPrice}
            disabled={isPendingPrice || isRemoving}
            onChange={(e) => {
              const newValue = parseFloat(e.target.value) || 0;
              setOptimisticUnitPrice(newValue);
            }}
            onBlur={(e) => {
              const newValue = parseFloat(e.target.value) || 0;
              if (newValue !== unitPrice) {
                handlePriceChange(newValue);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const newValue = parseFloat(e.currentTarget.value) || 0;
                if (newValue !== unitPrice) {
                  handlePriceChange(newValue);
                }
                e.currentTarget.blur();
              }
            }}
            className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-right text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </td>
      <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-200">
        {lineTotal > 0 ? `€${lineTotal.toFixed(2)}` : '-'}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={handleRemove}
          disabled={isRemoving}
          className="text-sm text-rose-600 transition hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-400 dark:hover:text-rose-300"
        >
          {isRemoving ? 'Removing...' : 'Remove'}
        </button>
      </td>
    </tr>
  );
}

