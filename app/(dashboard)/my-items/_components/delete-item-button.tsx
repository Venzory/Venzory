'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';

import { useConfirm } from '@/hooks/use-confirm';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { deleteItemAction } from '@/app/(dashboard)/inventory/actions';

interface DeleteItemButtonProps {
  itemId: string;
  itemName: string;
}

export function DeleteItemButton({ itemId, itemName }: DeleteItemButtonProps) {
  const confirm = useConfirm();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Item',
      message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      confirmLabel: 'Delete Item',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteItemAction(itemId);
      toast.success('Item deleted successfully');
    } catch (error) {
      console.error('Failed to delete item:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete item';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
      onClick={handleDelete}
      disabled={isDeleting}
      title="Delete item"
    >
      <Trash2 className="h-4 w-4" />
      <span className="sr-only">Delete</span>
    </Button>
  );
}

