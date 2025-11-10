'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';
import { updateTemplateItemAction } from '../../actions';

interface EditTemplateItemFormProps {
  templateItemId: string;
  currentQuantity: number;
  currentSupplierId: string | null;
  suppliers: { id: string; name: string }[];
  itemUnit: string | null;
}

export function EditTemplateItemForm({
  templateItemId,
  currentQuantity,
  currentSupplierId,
  suppliers,
  itemUnit,
}: EditTemplateItemFormProps) {
  const [quantity, setQuantity] = useState(currentQuantity);
  const [supplierId, setSupplierId] = useState(currentSupplierId || '');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const changed =
      quantity !== currentQuantity ||
      supplierId !== (currentSupplierId || '');
    setHasChanges(changed);
  }, [quantity, supplierId, currentQuantity, currentSupplierId]);

  const handleBlur = async () => {
    if (!hasChanges) return;

    const formData = new FormData();
    formData.set('templateItemId', templateItemId);
    formData.set('defaultQuantity', quantity.toString());
    formData.set('supplierId', supplierId);

    try {
      await updateTemplateItemAction(formData);
      setHasChanges(false);
      toast.success('Item updated');
    } catch (error) {
      // Revert on error
      setQuantity(currentQuantity);
      setSupplierId(currentSupplierId || '');
      toast.error('Failed to update item');
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <input
        type="number"
        min="1"
        value={quantity}
        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
        onBlur={handleBlur}
        className="w-20 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-center text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
      />
      {itemUnit ? (
        <span className="text-slate-500">{itemUnit}</span>
      ) : null}
      {hasChanges ? (
        <span className="text-xs text-amber-400">*</span>
      ) : null}
    </div>
  );
}

