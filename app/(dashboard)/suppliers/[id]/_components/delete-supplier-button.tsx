'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

import { useConfirm } from '@/hooks/use-confirm';
import { toast } from '@/lib/toast';
import { unlinkPracticeSupplierAction } from '../../actions';

interface DeleteSupplierButtonProps {
  supplierId: string;
}

export function DeleteSupplierButton({ supplierId }: DeleteSupplierButtonProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Remove Supplier',
      message: "This will remove the supplier from your practice. Your existing orders and item records will be preserved, but you won't be able to create new orders with this supplier unless you add them back.",
      confirmLabel: 'Remove from Practice',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await unlinkPracticeSupplierAction(supplierId);
      toast.success('Supplier removed from practice');
      // Action handles redirect, but we can ensure client state is clean
    } catch (error) {
      console.error('Failed to remove supplier:', error);
      const message = error instanceof Error ? error.message : 'Failed to remove supplier';
      toast.error(message);
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:bg-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-900/60"
    >
      {isDeleting ? (
        <>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-rose-600 border-t-transparent dark:border-rose-400" />
          Removing...
        </>
      ) : (
        <>
          <Trash2 className="h-4 w-4" />
          Remove from Practice
        </>
      )}
    </button>
  );
}

