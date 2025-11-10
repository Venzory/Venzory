'use client';

import { useConfirm } from '@/hooks/use-confirm';
import { toast } from '@/lib/toast';
import { removeTemplateItemAction } from '../../actions';

export function RemoveTemplateItemButton({ templateItemId }: { templateItemId: string }) {
  const confirm = useConfirm();

  const handleRemove = async () => {
    const confirmed = await confirm({
      title: 'Remove Item',
      message: 'Remove this item from the template?',
      confirmLabel: 'Remove',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      await removeTemplateItemAction(templateItemId);
      toast.success('Item removed from template');
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  return (
    <button
      onClick={handleRemove}
      className="text-sm text-rose-400 transition hover:text-rose-300"
    >
      Remove
    </button>
  );
}

