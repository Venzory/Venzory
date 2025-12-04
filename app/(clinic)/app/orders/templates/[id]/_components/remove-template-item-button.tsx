'use client';

import { useConfirm } from '@/hooks/use-confirm';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { removeTemplateItemAction } from '../../actions';

export function RemoveTemplateItemButton({ templateItemId }: { templateItemId: string }) {
  const confirm = useConfirm();

  const handleRemove = async () => {
    const confirmed = await confirm({
      title: 'Remove Item',
      message: 'Remove this item from the template? This won\'t affect any existing orders created from this template.',
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
    <Button
      onClick={handleRemove}
      variant="ghost"
      size="sm"
      className="text-rose-400 hover:text-rose-300"
    >
      Remove
    </Button>
  );
}

