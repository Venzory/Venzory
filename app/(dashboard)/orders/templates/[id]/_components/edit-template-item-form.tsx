'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';
import { updateTemplateItemAction } from '../../actions';

interface EditTemplateItemFormProps {
  templateItemId: string;
  currentQuantity: number;
  currentPracticeSupplierId: string | null;
  suppliers: {
    id: string;
    name: string;
    isPreferred: boolean;
    isBlocked: boolean;
    accountNumber: string | null;
  }[];
  itemUnit: string | null;
  mode?: 'quantity' | 'supplier';
}

export function EditTemplateItemForm({
  templateItemId,
  currentQuantity,
  currentPracticeSupplierId,
  suppliers,
  itemUnit,
  mode = 'quantity',
}: EditTemplateItemFormProps) {
  const [quantity, setQuantity] = useState(currentQuantity);
  const [practiceSupplierId, setPracticeSupplierId] = useState(currentPracticeSupplierId || '');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const changed =
      quantity !== currentQuantity ||
      practiceSupplierId !== (currentPracticeSupplierId || '');
    setHasChanges(changed);
  }, [quantity, practiceSupplierId, currentQuantity, currentPracticeSupplierId]);

  const handleBlur = async () => {
    if (!hasChanges) return;

    const formData = new FormData();
    formData.set('templateItemId', templateItemId);
    formData.set('defaultQuantity', quantity.toString());
    formData.set('practiceSupplierId', practiceSupplierId);

    try {
      await updateTemplateItemAction(formData);
      setHasChanges(false);
      toast.success('Item updated');
    } catch (error) {
      // Revert on error
      setQuantity(currentQuantity);
      setPracticeSupplierId(currentPracticeSupplierId || '');
      toast.error('Failed to update item');
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      {mode === 'quantity' && (
        <>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            onBlur={handleBlur}
            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-center text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          {itemUnit ? (
            <span className="text-slate-500 dark:text-slate-400">{itemUnit}</span>
          ) : null}
        </>
      )}

      {mode === 'supplier' && (
        <select
          value={practiceSupplierId}
          onChange={(e) => {
            setPracticeSupplierId(e.target.value);
            // Trigger update on next effect/blur, or we can rely on the effect + blur on the select
            // But select usually needs explicit blur or we can trigger save on change?
            // For consistency with quantity, let's let the user change it and then blur to save,
            // OR we can just trigger save on blur.
            // Since setPracticeSupplierId is async, we can't call handleBlur immediately here with the new value if handleBlur uses state.
            // But handleBlur uses state closure? No, it uses component state which is updated on render.
          }}
          onBlur={handleBlur}
          className="w-full max-w-[200px] rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">No supplier</option>
          {suppliers.map((supplier) => {
            const preferredMark = supplier.isPreferred ? '⭐ ' : '';
            const blockedMark = supplier.isBlocked ? '🚫 ' : '';
            const accountInfo = supplier.accountNumber ? ` (${supplier.accountNumber})` : '';
            
            return (
              <option key={supplier.id} value={supplier.id}>
                {blockedMark}{preferredMark}{supplier.name}{accountInfo}
              </option>
            );
          })}
        </select>
      )}

      {hasChanges ? (
        <span className="text-xs text-amber-500 dark:text-amber-400">*</span>
      ) : null}
    </div>
  );
}
